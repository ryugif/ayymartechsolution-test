import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  ConversationEmptyException,
  LlmUnavailableException,
  ProjectNotFoundException,
} from '../exceptions/app.exception';
import { LlmService } from '../llm/llm.service';
import { SUMMARY_REQUEST } from '../llm/promts';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { ChatService } from './chat.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('../llm/llm.service', () => ({ LlmService: class LlmService {} }));
jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

const HISTORY_LIMIT = 3;
const PROJECT = {
  id: 'p1',
  title: 'SUV interior',
  description: 'warm earth tones',
};
const SAVED_USER = { id: 'saved-user' };
const SAVED_ANSWER = { id: 'saved-answer' };

const row = (n: number, role: 'USER' | 'ASSISTANT', content: string) => ({
  id: `m${n}`,
  projectId: 'p1',
  role,
  type: 'CHAT',
  content,
  createdAt: new Date(n),
});

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of gen) out.push(item);
  return out;
}

function setup() {
  const prisma = {
    message: { findMany: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
    project: { update: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const projects = { getOwned: jest.fn().mockResolvedValue(PROJECT) };
  const llm = { generate: jest.fn(), stream: jest.fn() };
  const config = { get: jest.fn().mockReturnValue(String(HISTORY_LIMIT)) };
  const service = new ChatService(
    prisma as unknown as PrismaService,
    projects as unknown as ProjectsService,
    llm as unknown as LlmService,
    config as unknown as ConfigService,
  );
  return { prisma, projects, llm, service };
}

describe('ChatService', () => {
  beforeAll(() => Logger.overrideLogger(false));

  describe('send', () => {
    it('sends the project context and the newest CHAT messages, oldest first', async () => {
      const { prisma, projects, llm, service } = setup();
      // the database returns newest first
      prisma.message.findMany.mockResolvedValue([
        row(3, 'USER', 'third'),
        row(2, 'ASSISTANT', 'second'),
        row(1, 'USER', 'first'),
      ]);
      llm.generate.mockResolvedValue('answer');
      prisma.message.create
        .mockResolvedValueOnce(SAVED_USER)
        .mockResolvedValueOnce(SAVED_ANSWER);

      await service.send('u1', 'p1', 'new question');

      expect(projects.getOwned).toHaveBeenCalledWith('u1', 'p1');
      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: 'p1', type: 'CHAT' },
          orderBy: { createdAt: 'desc' },
          take: HISTORY_LIMIT,
        }),
      );
      expect(llm.generate).toHaveBeenCalledWith(
        expect.stringMatching(/SUV interior[\s\S]*warm earth tones/),
        [
          { role: 'user', text: 'first' },
          { role: 'model', text: 'second' },
          { role: 'user', text: 'third' },
          { role: 'user', text: 'new question' },
        ],
      );
    });

    it('saves nothing when the model call fails', async () => {
      const { prisma, llm, service } = setup();
      prisma.message.findMany.mockResolvedValue([]);
      llm.generate.mockRejectedValue(new LlmUnavailableException());

      await expect(service.send('u1', 'p1', 'hi')).rejects.toBeInstanceOf(
        LlmUnavailableException,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.message.create).not.toHaveBeenCalled();
    });

    it('saves question and answer in one transaction, answer one millisecond later', async () => {
      const { prisma, llm, service } = setup();
      prisma.message.findMany.mockResolvedValue([]);
      llm.generate.mockResolvedValue('answer');
      prisma.message.create
        .mockResolvedValueOnce(SAVED_USER)
        .mockResolvedValueOnce(SAVED_ANSWER);

      const result = await service.send('u1', 'p1', 'new question');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const [question, answer] = prisma.message.create.mock.calls.map(
        (call) => call[0].data,
      );
      expect(question).toMatchObject({
        role: 'USER',
        type: 'CHAT',
        content: 'new question',
      });
      expect(answer).toMatchObject({
        role: 'ASSISTANT',
        type: 'CHAT',
        content: 'answer',
      });
      // equal timestamps would make the order of the two messages random
      expect(answer.createdAt.getTime() - question.createdAt.getTime()).toBe(1);
      expect(result).toEqual({
        userMessage: SAVED_USER,
        assistantMessage: SAVED_ANSWER,
      });
    });
  });

  describe('summarise', () => {
    it('refuses when there is nothing to summarise', async () => {
      const { prisma, llm, service } = setup();
      prisma.message.findMany.mockResolvedValue([]);

      await expect(service.summarise('u1', 'p1')).rejects.toBeInstanceOf(
        ConversationEmptyException,
      );
      expect(llm.generate).not.toHaveBeenCalled();
    });

    it('asks the model with the history and stores the result as a SUMMARY', async () => {
      const { prisma, llm, service } = setup();
      prisma.message.findMany.mockResolvedValue([
        row(2, 'ASSISTANT', 'a'),
        row(1, 'USER', 'q'),
      ]);
      llm.generate.mockResolvedValue('**Decisions** ...');
      prisma.message.create.mockResolvedValue({ id: 's1' });

      await service.summarise('u1', 'p1');

      expect(llm.generate).toHaveBeenCalledWith(expect.any(String), [
        { role: 'user', text: 'q' },
        { role: 'model', text: 'a' },
        { role: 'user', text: SUMMARY_REQUEST },
      ]);
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: 'p1',
          role: 'ASSISTANT',
          type: 'SUMMARY',
          content: '**Decisions** ...',
        }),
      });
    });
  });

  describe('reset', () => {
    it('deletes only the messages of the owned project', async () => {
      const { prisma, projects, service } = setup();
      prisma.message.deleteMany.mockResolvedValue({ count: 4 });

      await service.reset('u1', 'p1');

      expect(projects.getOwned).toHaveBeenCalledWith('u1', 'p1');
      expect(prisma.message.deleteMany).toHaveBeenCalledWith({
        where: { projectId: 'p1' },
      });
    });

    it('deletes nothing when the project is not owned', async () => {
      const { prisma, projects, service } = setup();
      projects.getOwned.mockRejectedValue(new ProjectNotFoundException());

      await expect(service.reset('u1', 'foreign')).rejects.toBeInstanceOf(
        ProjectNotFoundException,
      );
      expect(prisma.message.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('streamReply', () => {
    it('streams tokens, then saves the exchange once the answer is complete', async () => {
      const { prisma, llm, service } = setup();
      prisma.message.findMany.mockResolvedValue([]);
      prisma.message.create
        .mockResolvedValueOnce(SAVED_USER)
        .mockResolvedValueOnce(SAVED_ANSWER);
      llm.stream.mockImplementation(async function* () {
        yield 'Hel';
        yield 'lo';
      });

      const events = await collect(
        service.streamReply('u1', 'p1', 'hi', new AbortController().signal),
      );

      expect(events).toEqual([
        { event: 'token', data: { text: 'Hel' } },
        { event: 'token', data: { text: 'lo' } },
        {
          event: 'done',
          data: { userMessage: SAVED_USER, assistantMessage: SAVED_ANSWER },
        },
      ]);
      expect(prisma.message.create.mock.calls[1][0].data.content).toBe('Hello');
    });

    it('saves nothing when the client stops the stream', async () => {
      const { prisma, llm, service } = setup();
      prisma.message.findMany.mockResolvedValue([]);
      const controller = new AbortController();
      llm.stream.mockImplementation(async function* () {
        yield 'Hel';
        controller.abort(); // the user pressed Stop
      });

      const events = await collect(
        service.streamReply('u1', 'p1', 'hi', controller.signal),
      );

      expect(events).toEqual([{ event: 'token', data: { text: 'Hel' } }]);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.message.create).not.toHaveBeenCalled();
    });

    it('does not call the model for a project the user does not own', async () => {
      const { llm, projects, service } = setup();
      projects.getOwned.mockRejectedValue(new ProjectNotFoundException());

      await expect(
        collect(
          service.streamReply(
            'u1',
            'foreign',
            'hi',
            new AbortController().signal,
          ),
        ),
      ).rejects.toBeInstanceOf(ProjectNotFoundException);
      expect(llm.stream).not.toHaveBeenCalled();
    });
  });
});

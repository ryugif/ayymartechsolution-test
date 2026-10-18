import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConversationEmptyException } from '../exceptions/app.exception';
import { LlmService, LlmTurn } from '../llm/llm.service';
import { SUMMARY_REQUEST, buildSystemPrompt } from '../llm/promts';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { ChatEvent } from '../types/chat';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly historyLimit: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly llm: LlmService,
    config: ConfigService,
  ) {
    this.historyLimit = Number(config.get('CHAT_HISTORY_LIMIT') ?? 40);
  }

  async list(userId: string, projectId: string) {
    await this.projects.getOwned(userId, projectId);
    return this.prisma.message.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async send(userId: string, projectId: string, content: string) {
    const project = await this.projects.getOwned(userId, projectId);
    const history = await this.loadHistory(projectId);

    const reply = await this.llm.generate(buildSystemPrompt(project), [
      ...history,
      { role: 'user', text: content },
    ]);

    // Explicit timestamps: two rows in one transaction can share a "now"
    const t = Date.now();
    const [userMessage, assistantMessage] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          projectId,
          role: 'USER',
          type: 'CHAT',
          content,
          createdAt: new Date(t),
        },
      }),
      this.prisma.message.create({
        data: {
          projectId,
          role: 'ASSISTANT',
          type: 'CHAT',
          content: reply,
          createdAt: new Date(t + 1),
        },
      }),
      this.prisma.project.update({
        where: { id: projectId },
        data: { updatedAt: new Date() },
      }),
    ]);
    return { userMessage, assistantMessage };
  }

  async summarise(userId: string, projectId: string) {
    const project = await this.projects.getOwned(userId, projectId);
    const history = await this.loadHistory(projectId);
    if (history.length === 0) throw new ConversationEmptyException();

    const text = await this.llm.generate(buildSystemPrompt(project), [
      ...history,
      { role: 'user', text: SUMMARY_REQUEST },
    ]);
    return this.prisma.message.create({
      data: { projectId, role: 'ASSISTANT', type: 'SUMMARY', content: text },
    });
  }

  async reset(userId: string, projectId: string) {
    await this.projects.getOwned(userId, projectId);
    const { count } = await this.prisma.message.deleteMany({
      where: { projectId },
    });
    this.logger.log(
      `Conversation reset for project ${projectId}, ${count} messages removed`,
    );
  }

  // Only CHAT messages go to the model, last N, oldest first
  private async loadHistory(projectId: string): Promise<LlmTurn[]> {
    const rows = await this.prisma.message.findMany({
      where: { projectId, type: 'CHAT' },
      orderBy: { createdAt: 'desc' },
      take: this.historyLimit,
    });
    return rows.reverse().map((m) => ({
      role: m.role === 'USER' ? 'user' : 'model',
      text: m.content,
    }));
  }

  private async saveExchange(
    projectId: string,
    content: string,
    reply: string,
  ) {
    const t = Date.now();
    const [userMessage, assistantMessage] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          projectId,
          role: 'USER',
          type: 'CHAT',
          content,
          createdAt: new Date(t),
        },
      }),
      this.prisma.message.create({
        data: {
          projectId,
          role: 'ASSISTANT',
          type: 'CHAT',
          content: reply,
          createdAt: new Date(t + 1),
        },
      }),
      this.prisma.project.update({
        where: { id: projectId },
        data: { updatedAt: new Date() },
      }),
    ]);
    return { userMessage, assistantMessage };
  }

  async *streamReply(
    userId: string,
    projectId: string,
    content: string,
    signal: AbortSignal,
  ): AsyncGenerator<ChatEvent> {
    const project = await this.projects.getOwned(userId, projectId);
    const history = await this.loadHistory(projectId);

    let reply = '';
    for await (const text of this.llm.stream(
      buildSystemPrompt(project),
      [...history, { role: 'user', text: content }],
      signal,
    )) {
      reply += text;
      yield { event: 'token', data: { text } };
    }
    if (signal.aborted) return; // stopped by client, save nothing

    yield {
      event: 'done',
      data: await this.saveExchange(projectId, content, reply),
    };
  }

  async *streamSummary(
    userId: string,
    projectId: string,
    signal: AbortSignal,
  ): AsyncGenerator<ChatEvent> {
    const project = await this.projects.getOwned(userId, projectId);
    const history = await this.loadHistory(projectId);
    if (history.length === 0) throw new ConversationEmptyException();

    let text = '';
    for await (const chunk of this.llm.stream(
      buildSystemPrompt(project),
      [...history, { role: 'user', text: SUMMARY_REQUEST }],
      signal,
    )) {
      text += chunk;
      yield { event: 'token', data: { text: chunk } };
    }
    if (signal.aborted) return;

    const message = await this.prisma.message.create({
      data: { projectId, role: 'ASSISTANT', type: 'SUMMARY', content: text },
    });
    yield { event: 'done', data: { message } };
  }
}

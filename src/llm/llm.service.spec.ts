import { GoogleGenAI } from '@google/genai';
import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  LlmResponseBlockedException,
  LlmUnavailableException,
} from '../exceptions/app.exception';
import { LlmService, type LlmTurn } from './llm.service';

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(() => ({
    models: { generateContent: jest.fn(), generateContentStream: jest.fn() },
  })),
}));
jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

const TURNS: LlmTurn[] = [{ role: 'user', text: 'hi' }];

async function* chunks(...texts: (string | undefined)[]) {
  for (const text of texts) yield { text };
}

async function collect(gen: AsyncGenerator<string>) {
  const out: string[] = [];
  for await (const part of gen) out.push(part);
  return out;
}

function setup() {
  const config = {
    getOrThrow: (key: string) =>
      key === 'GEMINI_MODEL' ? 'test-model' : 'test-key',
  };
  const service = new LlmService(config as unknown as ConfigService);
  const sdk = (GoogleGenAI as unknown as jest.Mock).mock.results.at(-1)
    ?.value as {
    models: { generateContent: jest.Mock; generateContentStream: jest.Mock };
  };
  return { service, models: sdk.models };
}

describe('LlmService', () => {
  beforeAll(() => Logger.overrideLogger(false));

  describe('generate', () => {
    it('sends the model, the system prompt and the turns in Gemini format', async () => {
      const { service, models } = setup();
      models.generateContent.mockResolvedValue({ text: 'Try cognac leather' });

      const text = await service.generate('SYSTEM', [
        { role: 'user', text: 'hi' },
        { role: 'model', text: 'hello' },
      ]);

      expect(text).toBe('Try cognac leather');
      expect(models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'test-model',
          contents: [
            { role: 'user', parts: [{ text: 'hi' }] },
            { role: 'model', parts: [{ text: 'hello' }] },
          ],
          config: expect.objectContaining({ systemInstruction: 'SYSTEM' }),
        }),
      );
    });

    it('maps an SDK failure to LlmUnavailableException', async () => {
      const { service, models } = setup();
      models.generateContent.mockRejectedValue(new Error('429 rate limited'));

      await expect(service.generate('S', TURNS)).rejects.toBeInstanceOf(
        LlmUnavailableException,
      );
    });

    it.each([[undefined], ['   ']])(
      'maps an empty or blocked reply (%p) to LlmResponseBlockedException',
      async (text) => {
        const { service, models } = setup();
        models.generateContent.mockResolvedValue({ text });

        await expect(service.generate('S', TURNS)).rejects.toBeInstanceOf(
          LlmResponseBlockedException,
        );
      },
    );
  });

  describe('stream', () => {
    it('yields text chunks in order and skips empty ones', async () => {
      const { service, models } = setup();
      models.generateContentStream.mockResolvedValue(
        chunks('Hel', undefined, 'lo'),
      );

      expect(await collect(service.stream('S', TURNS))).toEqual(['Hel', 'lo']);
    });

    it('maps an SDK failure to LlmUnavailableException', async () => {
      const { service, models } = setup();
      models.generateContentStream.mockRejectedValue(new Error('network down'));

      await expect(collect(service.stream('S', TURNS))).rejects.toBeInstanceOf(
        LlmUnavailableException,
      );
    });

    it('throws LlmResponseBlockedException when the stream carries no text', async () => {
      const { service, models } = setup();
      models.generateContentStream.mockResolvedValue(chunks(undefined));

      await expect(collect(service.stream('S', TURNS))).rejects.toBeInstanceOf(
        LlmResponseBlockedException,
      );
    });

    it('ends quietly, not with an error, when the client aborted', async () => {
      const { service, models } = setup();
      const controller = new AbortController();
      controller.abort();
      models.generateContentStream.mockRejectedValue(new Error('aborted'));

      await expect(
        collect(service.stream('S', TURNS, controller.signal)),
      ).resolves.toEqual([]);
    });
  });
});

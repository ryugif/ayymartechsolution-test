import { GoogleGenAI } from '@google/genai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LlmResponseBlockedException,
  LlmUnavailableException,
} from '../exceptions/app.exception';

export type LlmTurn = { role: 'user' | 'model'; text: string };

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor(config: ConfigService) {
    this.ai = new GoogleGenAI({
      apiKey: config.getOrThrow<string>('GEMINI_API_KEY'),
      httpOptions: { timeout: 30_000 },
    });
    this.model = config.getOrThrow<string>('GEMINI_MODEL');
  }

  async generate(system: string, turns: LlmTurn[]): Promise<string> {
    const started = Date.now();
    let text: string | undefined;
    try {
      const res = await this.ai.models.generateContent({
        model: this.model,
        contents: turns.map((t) => ({
          role: t.role,
          parts: [{ text: t.text }],
        })),
        config: { systemInstruction: system },
      });
      text = res.text;
    } catch (err) {
      this.logger.error(
        `Gemini call failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new LlmUnavailableException();
    }
    if (!text?.trim()) {
      this.logger.warn('Gemini returned empty or blocked response');
      throw new LlmResponseBlockedException();
    }
    this.logger.log(`Gemini ok in ${Date.now() - started}ms`);
    return text;
  }

  async *stream(
    system: string,
    turns: LlmTurn[],
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    const started = Date.now();
    let emitted = false;
    try {
      const stream = await this.ai.models.generateContentStream({
        model: this.model,
        contents: turns.map((t) => ({
          role: t.role,
          parts: [{ text: t.text }],
        })),
        config: { systemInstruction: system, abortSignal: signal },
      });
      for await (const chunk of stream) {
        if (chunk.text) {
          emitted = true;
          yield chunk.text;
        }
      }
    } catch (err) {
      if (signal?.aborted) return; // user pressed stop, not an error
      this.logger.error(
        `Gemini stream failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new LlmUnavailableException();
    }
    if (!emitted) {
      this.logger.warn('Gemini stream produced no text');
      throw new LlmResponseBlockedException();
    }
    this.logger.log(`Gemini stream ok in ${Date.now() - started}ms`);
  }
}

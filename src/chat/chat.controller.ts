import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { type AuthUser, CurrentUser } from '../auth/current-user.decorator';
import {
  ResponseMessage,
  SkipEnvelope,
} from '../decorators/response-message.decorator';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { type FastifyReply } from 'fastify/types/reply';
import { ChatEvent } from '../types/chat';
import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../types/error-code';

@Controller('projects/:projectId')
export class ChatController {
  constructor(private readonly chat: ChatService) {}
  private readonly logger = new Logger(ChatController.name);

  @Get('messages')
  list(@CurrentUser() user: AuthUser, @Param('projectId') projectId: string) {
    return this.chat.list(user.id, projectId);
  }

  @Post('messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chat.send(user.id, projectId, dto.content);
  }

  @Post('summary')
  summarise(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ) {
    return this.chat.summarise(user.id, projectId);
  }

  @Delete('messages')
  @ResponseMessage('Conversation reset')
  reset(@CurrentUser() user: AuthUser, @Param('projectId') projectId: string) {
    return this.chat.reset(user.id, projectId);
  }

  @Post('messages/stream')
  @SkipEnvelope()
  async sendStream(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: SendMessageDto,
    @Res() reply: FastifyReply,
  ) {
    const ac = this.abortOnDisconnect(reply);
    await this.pipe(
      reply,
      this.chat.streamReply(user.id, projectId, dto.content, ac.signal),
    );
  }

  @Post('summary/stream')
  @SkipEnvelope()
  async summaryStream(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Res() reply: FastifyReply,
  ) {
    const ac = this.abortOnDisconnect(reply);
    await this.pipe(
      reply,
      this.chat.streamSummary(user.id, projectId, ac.signal),
    );
  }

  private abortOnDisconnect(reply: FastifyReply) {
    const ac = new AbortController();
    reply.raw.on('close', () => {
      if (!reply.raw.writableEnded) ac.abort();
    });
    return ac;
  }

  private async pipe(reply: FastifyReply, events: AsyncGenerator<ChatEvent>) {
    // Pre-flight: any error here is still a normal JSON error via the global filter
    let step = await events.next();

    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    reply.raw.flushHeaders();

    const write = (event: string, data: unknown) =>
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    try {
      while (!step.done) {
        write(step.value.event, step.value.data);
        step = await events.next();
      }
    } catch (err) {
      const body =
        err instanceof AppException
          ? { message: err.message, code: err.code }
          : {
              message: 'Internal server error',
              code: ErrorCode.INTERNAL_ERROR,
            };
      this.logger.error(
        `Stream failed: ${body.code}`,
        err instanceof Error ? err.stack : undefined,
      );
      write('error', body);
    } finally {
      reply.raw.end();
    }
  }
}

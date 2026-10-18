import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map } from 'rxjs';
import {
  RESPONSE_MESSAGE_KEY,
  SKIP_ENVELOPE_KEY,
} from '../decorators/response-message.decorator';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler) {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(SKIP_ENVELOPE_KEY, targets))
      return next.handle();
    const message = this.reflector.get<string | undefined>(
      RESPONSE_MESSAGE_KEY,
      ctx.getHandler(),
    );
    return next.handle().pipe(
      map((data: unknown) => ({
        data: data ?? null,
        ...(message && { message }),
      })),
    );
  }
}

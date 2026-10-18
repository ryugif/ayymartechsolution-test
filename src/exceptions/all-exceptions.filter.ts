import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ApiErrorBody } from '../types/api-response';
import { AppException } from './app.exception';
import { ErrorCode } from '../types/error-code';

const STATUS_CODE_MAP: Record<number, ErrorCode> = {
  401: ErrorCode.AUTH_REQUIRED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  429: ErrorCode.TOO_MANY_REQUESTS,
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const { status, body } = this.build(exception);

    if (status >= 500) {
      this.logger.error(
        `${status} ${body.code}: ${body.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`${status} ${body.code}: ${body.message}`);
    }

    if (reply.raw.headersSent) {
      reply.raw.end(); // stream already open, cannot send JSON
      return;
    }
    void reply.status(status).send(body);
  }

  private build(exception: unknown): { status: number; body: ApiErrorBody } {
    if (exception instanceof AppException) {
      const { code, errors } = exception;
      return {
        status: exception.getStatus(),
        body: { message: exception.message, code, ...(errors && { errors }) },
      };
    }
    if (exception instanceof HttpException) {
      // framework errors: unknown route, payload too large, etc.
      const status = exception.getStatus();
      return {
        status,
        body: {
          message: exception.message,
          code:
            STATUS_CODE_MAP[status] ??
            (status >= 500
              ? ErrorCode.INTERNAL_ERROR
              : ErrorCode.VALIDATION_ERROR),
        },
      };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        message: 'Internal server error',
        code: ErrorCode.INTERNAL_ERROR,
      },
    };
  }
}

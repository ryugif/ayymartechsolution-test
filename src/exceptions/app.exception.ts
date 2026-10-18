import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../types/error-code';

export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    status: HttpStatus,
    readonly errors?: Record<string, string[]>,
  ) {
    super({ message, code, errors }, status);
  }
}

export class ValidationException extends AppException {
  constructor(errors: Record<string, string[]>) {
    super(
      ErrorCode.VALIDATION_ERROR,
      'Validation failed',
      HttpStatus.BAD_REQUEST,
      errors,
    );
  }
}
export class AuthRequiredException extends AppException {
  constructor() {
    super(
      ErrorCode.AUTH_REQUIRED,
      'Authentication required',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
export class InvalidCredentialsException extends AppException {
  constructor() {
    super(
      ErrorCode.INVALID_CREDENTIALS,
      'Invalid email or password',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
export class ProjectNotFoundException extends AppException {
  constructor() {
    super(
      ErrorCode.PROJECT_NOT_FOUND,
      'Project not found',
      HttpStatus.NOT_FOUND,
    );
  }
}
export class LlmUnavailableException extends AppException {
  constructor() {
    super(
      ErrorCode.LLM_UNAVAILABLE,
      'AI assistant is unavailable, try again',
      HttpStatus.BAD_GATEWAY,
    );
  }
}
export class LlmResponseBlockedException extends AppException {
  constructor() {
    super(
      ErrorCode.LLM_RESPONSE_BLOCKED,
      'The assistant could not answer this request',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

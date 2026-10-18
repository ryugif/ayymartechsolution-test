import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from './dto/error-response.dto';

const DESCRIPTIONS: Record<number, string> = {
  400: 'Validation failed (VALIDATION_ERROR, field messages in errors)',
  401: 'Not logged in (AUTH_REQUIRED) or wrong credentials (INVALID_CREDENTIALS)',
  404: 'Not found, also returned for other users projects (PROJECT_NOT_FOUND)',
  409: 'Nothing to summarise yet (CONVERSATION_EMPTY)',
  422: 'Model answer blocked or empty (LLM_RESPONSE_BLOCKED)',
  502: 'AI provider unavailable (LLM_UNAVAILABLE)',
};

/** Documents error responses with the shared error body. */
export const ApiErrors = (...statuses: number[]) =>
  applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({
        status,
        description: DESCRIPTIONS[status] ?? 'Error',
        type: ErrorResponseDto,
      }),
    ),
  );

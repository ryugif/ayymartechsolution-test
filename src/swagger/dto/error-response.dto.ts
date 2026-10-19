import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ErrorCode } from '../../types/error-code';

/** Error body returned by every failing endpoint. */
export class ErrorResponseDto {
  /** Human readable message. */
  message!: string;

  /** Stable machine readable code. Clients branch on this, not on the message. */
  @ApiProperty({ enum: ErrorCode, enumName: 'ErrorCode' })
  code!: ErrorCode;

  /** Field errors, only on validation failures. Keys are field paths. */
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'array', items: { type: 'string' } },
    example: { title: ['title should not be empty'] },
  })
  errors?: Record<string, string[]>;
}

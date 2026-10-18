import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

/** Documents a success response wrapped as `{ data, message? }`. */
export const ApiEnvelope = <T extends Type<unknown>>(
  model: T,
  options: { isArray?: boolean; status?: number } = {},
) =>
  applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status: options.status ?? 200,
      schema: {
        type: 'object',
        required: ['data'],
        properties: {
          data: options.isArray
            ? { type: 'array', items: { $ref: getSchemaPath(model) } }
            : { $ref: getSchemaPath(model) },
          message: { type: 'string' },
        },
      },
    }),
  );

/** Documents a success response with no payload: `{ data: null, message }`. */
export const ApiEnvelopeEmpty = (message: string, status = 200) =>
  ApiResponse({
    status,
    schema: {
      type: 'object',
      properties: {
        data: { type: 'null', nullable: true },
        message: { type: 'string', example: message },
      },
    },
  });

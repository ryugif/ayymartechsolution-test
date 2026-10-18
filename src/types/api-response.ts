import { ErrorCode } from './error-code';

export type ApiSuccess<T> = { data: T; message?: string; code?: string };
export type ApiErrorBody = {
  message: string;
  code: ErrorCode;
  errors?: Record<string, string[]>;
};

import { ValidationError } from 'class-validator';
import { ValidationException } from './app.exception';

function flatten(
  errors: ValidationError[],
  parent = '',
  out: Record<string, string[]> = {},
) {
  for (const e of errors) {
    const path = parent ? `${parent}.${e.property}` : e.property;
    if (e.constraints) out[path] = Object.values(e.constraints);
    if (e.children?.length) flatten(e.children, path, out);
  }
  return out;
}

export const validationExceptionFactory = (errors: ValidationError[]) =>
  new ValidationException(flatten(errors));

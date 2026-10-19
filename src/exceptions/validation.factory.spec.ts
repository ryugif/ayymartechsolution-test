import { ValidationError } from 'class-validator';
import { ValidationException } from './app.exception';
import { validationExceptionFactory } from './validation.factory';

describe('validationExceptionFactory', () => {
  it('collects the messages of each field', () => {
    const errors = [
      {
        property: 'title',
        constraints: {
          isNotEmpty: 'title should not be empty',
          maxLength: 'too long',
        },
      },
    ] as ValidationError[];

    const exception = validationExceptionFactory(errors);

    expect(exception).toBeInstanceOf(ValidationException);
    expect(exception.errors).toEqual({
      title: ['title should not be empty', 'too long'],
    });
  });

  it('flattens nested errors into dotted paths', () => {
    const errors = [
      {
        property: 'meta',
        children: [
          {
            property: 'size',
            constraints: { isInt: 'size must be an integer' },
          },
        ],
      },
    ] as ValidationError[];

    const exception = validationExceptionFactory(errors);

    expect(exception.errors).toEqual({
      'meta.size': ['size must be an integer'],
    });
  });
});

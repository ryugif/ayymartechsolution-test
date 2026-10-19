import { ArgumentsHost, Logger, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ProjectNotFoundException, ValidationException } from './app.exception';
import { ErrorCode } from '../types/error-code';

function run(exception: unknown, headersSent = false) {
  const reply = {
    raw: { headersSent, end: jest.fn() },
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => reply }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return reply;
}

describe('AllExceptionsFilter', () => {
  beforeAll(() => Logger.overrideLogger(false));

  it('turns an app exception into { message, code } with its status', () => {
    const reply = run(new ProjectNotFoundException());

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({
      message: 'Project not found',
      code: ErrorCode.PROJECT_NOT_FOUND,
    });
  });

  it('includes the field errors for a validation exception', () => {
    const reply = run(
      new ValidationException({ title: ['title should not be empty'] }),
    );

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({
      message: 'Validation failed',
      code: ErrorCode.VALIDATION_ERROR,
      errors: { title: ['title should not be empty'] },
    });
  });

  it('hides the message of an unexpected error', () => {
    const reply = run(new Error('password for db is hunter2'));

    expect(reply.status).toHaveBeenCalledWith(500);
    const body = reply.send.mock.calls[0][0];
    expect(body).toEqual({
      message: 'Internal server error',
      code: ErrorCode.INTERNAL_ERROR,
    });
    expect(JSON.stringify(body)).not.toContain('hunter2');
  });

  it('maps a framework error such as an unknown route to NOT_FOUND', () => {
    const reply = run(new NotFoundException('Cannot GET /nope'));

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send.mock.calls[0][0].code).toBe(ErrorCode.NOT_FOUND);
  });

  it('ends the connection instead of sending JSON when a stream is already open', () => {
    const reply = run(new ProjectNotFoundException(), true);

    expect(reply.raw.end).toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });
});

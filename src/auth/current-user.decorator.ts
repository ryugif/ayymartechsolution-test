import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthUser = { id: string; email: string };
type RequestWithUser = { user: AuthUser };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    return req.user;
  },
);

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { AuthUser } from '../auth/current-user.decorator';
import {
  AuthRequiredException,
  InvalidCredentialsException,
} from '../exceptions/app.exception';

type RequestWithAuth = {
  headers: { authorization?: string };
  cookies?: Record<string, string | undefined>;
  user?: AuthUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwt: JwtService,
    private reflector: Reflector,
  ) {}

  private extractToken(req: RequestWithAuth): string | undefined {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    if (type === 'Bearer' && token) return token;
    return req.cookies?.access_token;
  }

  async canActivate(ctx: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<RequestWithAuth>();
    const token = this.extractToken(req);
    if (!token) throw new AuthRequiredException();
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        email: string;
      }>(token);
      req.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new InvalidCredentialsException();
    }
  }
}

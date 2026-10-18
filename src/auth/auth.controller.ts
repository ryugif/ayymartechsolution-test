import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { type AuthUser, CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';
import { ResponseMessage } from '../decorators/response-message.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ResponseMessage('Logged in')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const { token, user } = await this.auth.login(dto.email, dto.password);
    reply.setCookie('access_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('COOKIE_SECURE') === 'true',
      path: '/',
      maxAge: Number(this.config.get('JWT_EXPIRES_IN_SECONDS')),
    });
    return user;
  }

  @Post('logout')
  @HttpCode(200)
  @ResponseMessage('Logged out')
  logout(@Res({ passthrough: true }) reply: FastifyReply) {
    reply.clearCookie('access_token', { path: '/' });
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}

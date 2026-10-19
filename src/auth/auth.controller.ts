import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type FastifyReply } from 'fastify';
import { ResponseMessage } from '../decorators/response-message.decorator';
import { ApiEnvelope } from '../swagger/api-envelope.decorator';
import { AuthService } from './auth.service';
import { type AuthUser, CurrentUser } from './current-user.decorator';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';
import { EmptyReponseDto } from '../swagger/dto/empty-response.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private config: ConfigService,
  ) {}

  /**
   * Authenticate a user with email and password, returning a JWT token if successful. The token is set in an HTTP-only cookie for subsequent requests.
   * @param dto - The login credentials (email and password).
   * @param reply - The Fastify reply object, used to set cookies.
   * @returns An object containing the user information, JWT token, and expiration time.
   * @throws InvalidCredentialsException if the email or password is incorrect.
   */
  @Public()
  @Post('login')
  @HttpCode(200)
  @ResponseMessage('Logged in')
  @ApiEnvelope(LoginResponseDto, { status: 200 })
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
    return {
      user,
      accessToken: token,
      expiresIn: Number(this.config.get('JWT_EXPIRES_IN_SECONDS')),
    };
  }

  /**
   * Log out the current user by clearing the JWT access token cookie. This effectively invalidates the user's session on the client side.
   * @param reply - The Fastify reply object, used to clear cookies.
   * @returns void
   */
  @Post('logout')
  @HttpCode(200)
  @ResponseMessage('Logged out')
  @ApiEnvelope(EmptyReponseDto, { status: 200 })
  logout(@Res({ passthrough: true }) reply: FastifyReply) {
    reply.clearCookie('access_token', { path: '/' });
  }

  /**
   * Get the current authenticated user's information. This endpoint requires a valid JWT token to be present in the request, either in the Authorization header or as an HTTP-only cookie.
   * @param user - The current authenticated user, injected by the CurrentUser decorator.
   * @returns The authenticated user's information, including id and email.
   */
  @Get('me')
  @ApiEnvelope(UserResponseDto, { status: 200 })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}

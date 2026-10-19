import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class LoginResponseDto {
  /** User object */
  @ApiProperty({ description: 'User object', type: () => UserResponseDto })
  user!: UserResponseDto;

  /** JWT access token */
  @ApiProperty({ description: 'JWT access token' })
  accessToken!: string;

  /** Expiration time in seconds */
  @ApiProperty({ description: 'Expiration time in seconds' })
  expiresIn!: number;
}

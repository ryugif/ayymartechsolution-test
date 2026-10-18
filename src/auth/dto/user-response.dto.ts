import { ApiProperty } from '@nestjs/swagger';

/** The logged in user. Never includes the password hash. */
export class UserResponseDto {
  /** User id (uuid). */
  @ApiProperty({ description: 'User id (uuid)' })
  id!: string;

  /** Login email. */
  @ApiProperty({ description: 'Login email' })
  email!: string;
}

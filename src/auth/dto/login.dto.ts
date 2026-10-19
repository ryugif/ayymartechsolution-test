export class CreateAuthDto {}
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @ApiProperty({ description: 'Login email', format: 'email' })
  email!: string;

  @IsString()
  @MinLength(8)
  @ApiProperty({ description: 'Login password', minLength: 8 })
  password!: string;
}

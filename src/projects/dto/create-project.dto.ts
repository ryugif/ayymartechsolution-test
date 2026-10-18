import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateProjectDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @ApiProperty({
    description: 'Short project title',
    maxLength: 120,
  })
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @ApiProperty({
    description:
      'Design context given to the AI, for example "warm earth tones, matte leather"',
    maxLength: 2000,
    nullable: true,
  })
  description?: string;
}

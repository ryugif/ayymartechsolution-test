import { ApiProperty } from '@nestjs/swagger';

/** A design project owned by the current user. */
export class ProjectResponseDto {
  /** Project id (uuid). */
  @ApiProperty({ description: 'Project id (uuid)' })
  id!: string;

  /** Short project title. */
  @ApiProperty({ description: 'Short project title' })
  title!: string;

  /** Design context given to the AI, for example "warm earth tones, matte leather". */
  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  /** Creation time. */
  @ApiProperty({ description: 'Creation time' })
  createdAt!: Date;

  /** Last change time, also bumped when a chat message is added. */
  @ApiProperty({ description: 'Last change time' })
  updatedAt!: Date;

  /** When the project was archived, or null if it is active. */
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  archivedAt!: Date | null;
}

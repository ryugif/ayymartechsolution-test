import { ApiProperty } from '@nestjs/swagger';

/** One chat entry or saved summary. */
export class MessageResponseDto {
  /** Message id (uuid). */
  @ApiProperty({ description: 'Message id (uuid)' })
  id!: string;

  /** Project the message belongs to. */
  @ApiProperty({ description: 'Project the message belongs to' })
  projectId!: string;

  /** Who wrote it. */
  @ApiProperty({ enum: ['USER', 'ASSISTANT'] })
  role!: 'USER' | 'ASSISTANT';

  /** CHAT is normal conversation. SUMMARY is a saved decision summary. */
  @ApiProperty({ enum: ['CHAT', 'SUMMARY'] })
  type!: 'CHAT' | 'SUMMARY';

  /** Markdown text. */
  @ApiProperty({ description: 'Markdown text' })
  content!: string;

  /** Creation time, used for ordering. */
  @ApiProperty({ description: 'Creation time' })
  createdAt!: Date;
}

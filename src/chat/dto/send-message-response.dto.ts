import { ApiProperty } from '@nestjs/swagger';
import { MessageResponseDto } from './message-response.dto';

/** Result of sending a chat message: the saved question and the saved answer. */
export class SendMessageResponseDto {
  /** The message the user sent. */
  @ApiProperty({ type: () => MessageResponseDto })
  userMessage!: MessageResponseDto;

  /** The assistant answer, saved after generation finished. */
  @ApiProperty({ type: () => MessageResponseDto })
  assistantMessage!: MessageResponseDto;
}

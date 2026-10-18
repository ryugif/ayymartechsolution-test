import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { type AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { ResponseMessage } from '../decorators/response-message.decorator';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('projects/:projectId')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('messages')
  list(@CurrentUser() user: AuthUser, @Param('projectId') projectId: string) {
    return this.chat.list(user.id, projectId);
  }

  @Post('messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chat.send(user.id, projectId, dto.content);
  }

  @Post('summary')
  summarise(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ) {
    return this.chat.summarise(user.id, projectId);
  }

  @Delete('messages')
  @ResponseMessage('Conversation reset')
  reset(@CurrentUser() user: AuthUser, @Param('projectId') projectId: string) {
    return this.chat.reset(user.id, projectId);
  }
}

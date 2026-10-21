import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChatGateway } from '../../modules/chat/chat.gateway';
import { ChatService } from '../../modules/chat/chat.service';

@ApiTags('Admin / Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
@Controller('admin/chat')
export class AdminChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly gateway: ChatGateway,
  ) {}

  @Get('conversations')
  conversations() {
    return this.chat.staffConversations();
  }

  @Get('conversations/:id/messages')
  messages(@Param('id') id: string) {
    return this.chat.staffMessages(id);
  }

  @Post('conversations/:id/messages')
  async send(@Param('id') id: string, @Body('body') body: string, @CurrentUser() user: AuthUser) {
    const message = await this.chat.send({ conversationId: id, senderId: user.id, senderRole: 'STAFF', body });
    this.gateway.broadcast(id, message);
    return message;
  }
}

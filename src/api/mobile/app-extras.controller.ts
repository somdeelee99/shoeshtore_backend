import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ChatGateway } from '../../modules/chat/chat.gateway';
import { ChatService } from '../../modules/chat/chat.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';

@ApiTags('App / Chat & Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('app')
export class AppExtrasController {
  constructor(
    private readonly chat: ChatService,
    private readonly notifications: NotificationsService,
    private readonly gateway: ChatGateway,
  ) {}

  @Get('chat/conversation')
  conversation(@CurrentUser() user: AuthUser) {
    return this.chat.customerConversation(user.id);
  }

  @Get('chat/messages')
  messages(@CurrentUser() user: AuthUser) {
    return this.chat.customerMessages(user.id);
  }

  @Post('chat/messages')
  async send(@CurrentUser() user: AuthUser, @Body('body') body: string) {
    const conversation = await this.chat.conversationForCustomer(user.id);
    const message = await this.chat.send({
      conversationId: conversation.id,
      senderId: user.id,
      senderRole: 'CUSTOMER',
      body,
    });
    this.gateway.broadcast(conversation.id, message);
    return message;
  }

  @Get('notifications')
  notificationsList(@CurrentUser() user: AuthUser) {
    return this.notifications.list(user.id);
  }

  @Get('notifications/unread-count')
  unread(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user.id);
  }

  @Patch('notifications/:id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }

  @Post('notifications/read-all')
  markAll(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.id);
  }
}

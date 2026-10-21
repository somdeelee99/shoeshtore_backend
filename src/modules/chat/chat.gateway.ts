import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

/**
 * Realtime chat used by the admin website (Chat / Support screen)
 * and the Flutter app (Chat FAB + conversation screen).
 *
 * Rooms: `conversation:{id}` for both sides, `staff` for the admin inbox.
 */
@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*' },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly chat: ChatService) {}

  handleConnection(socket: Socket) {
    this.logger.log(`socket connected: ${socket.id}`);
  }

  handleDisconnect(socket: Socket) {
    this.logger.log(`socket disconnected: ${socket.id}`);
  }

  @SubscribeMessage('chat:join')
  async join(@ConnectedSocket() socket: Socket, @MessageBody() body: { conversationId: string; role: 'CUSTOMER' | 'STAFF' }) {
    socket.join(`conversation:${body.conversationId}`);
    if (body.role === 'STAFF') socket.join('staff');
    return { joined: body.conversationId };
  }

  /** Payload: { conversationId, senderId, senderRole, body } */
  @SubscribeMessage('chat:send')
  async send(@MessageBody() body: { conversationId: string; senderId?: string; senderRole: 'CUSTOMER' | 'STAFF'; body: string }) {
    const message = await this.chat.send(body);
    this.server.to(`conversation:${body.conversationId}`).emit('chat:message', message);
    this.server.to('staff').emit('chat:inbox', { conversationId: body.conversationId, message });
    return message;
  }

  @SubscribeMessage('chat:typing')
  typing(@MessageBody() body: { conversationId: string; role: string; isTyping: boolean }) {
    this.server.to(`conversation:${body.conversationId}`).emit('chat:typing', body);
  }

  /** Used by REST controllers to broadcast a message sent over HTTP. */
  broadcast(conversationId: string, message: unknown) {
    if (!this.server) return;
    this.server.to(`conversation:${conversationId}`).emit('chat:message', message);
    this.server.to('staff').emit('chat:inbox', { conversationId, message });
  }
}

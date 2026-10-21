import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  /** Admin inbox — every conversation with its customer + last message. */
  async staffConversations() {
    const conversations = await this.prisma.chatConversation.findMany({
      orderBy: { lastMessageAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, avatar: true, phone: true } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
    return conversations.map((c) => ({
      id: c.id,
      customer: c.customer,
      lastMessage: c.messages[0]?.body ?? c.lastMessage,
      lastMessageAt: c.lastMessageAt,
      unread: c.unreadForStaff,
    }));
  }

  async staffMessages(conversationId: string) {
    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { unreadForStaff: 0 },
    });
    return this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, name: true, avatar: true, role: true } } },
    });
  }

  async customerConversation(customerId: string) {
    const conversation = await this.prisma.chatConversation.upsert({
      where: { customerId },
      update: {},
      create: { customerId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 100 } },
    });
    await this.prisma.chatConversation.update({ where: { id: conversation.id }, data: { unreadForCustomer: 0 } });
    return conversation;
  }

  /** Mobile: the customer's own thread, with sender details for bubbles. */
  async customerMessages(customerId: string) {
    const conversation = await this.prisma.chatConversation.upsert({
      where: { customerId },
      update: {},
      create: { customerId },
    });
    await this.prisma.chatConversation.update({ where: { id: conversation.id }, data: { unreadForCustomer: 0 } });
    return this.prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, name: true, avatar: true, role: true } } },
    });
  }

  async send(params: {
    conversationId: string;
    senderId?: string;
    senderRole: 'CUSTOMER' | 'STAFF';
    body: string;
  }) {
    const conversation = await this.prisma.chatConversation.findUnique({ where: { id: params.conversationId } });
    if (!conversation) throw new NotFoundException('ບໍ່ພົບຫ້ອງສົນທະນາ');

    const message = await this.prisma.chatMessage.create({
      data: params,
      include: { sender: { select: { id: true, name: true, avatar: true, role: true } } },
    });
    await this.prisma.chatConversation.update({
      where: { id: params.conversationId },
      data: {
        lastMessage: params.body,
        lastMessageAt: new Date(),
        ...(params.senderRole === 'CUSTOMER'
          ? { unreadForStaff: { increment: 1 } }
          : { unreadForCustomer: { increment: 1 } }),
      },
    });
    return message;
  }

  async conversationForCustomer(customerId: string) {
    return this.prisma.chatConversation.upsert({
      where: { customerId },
      update: {},
      create: { customerId },
    });
  }

  unreadSummary(customerId: string) {
    return this.prisma.chatConversation.findUnique({ where: { customerId }, select: { unreadForCustomer: true } });
  }
}

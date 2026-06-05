import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";

type ConversationType = "C2C" | "SYSTEM";

interface ConversationRow {
  conversationId: bigint | number;
  type: ConversationType;
  participantA: bigint | number;
  participantB: bigint | number;
  lastMessage: string | null;
  lastMessageAt: Date | null;
}

interface MessageRow {
  messageId: bigint | number;
  senderId: bigint | number;
  content: string;
  msgType: string;
  isRead: boolean | number;
  createdAt: Date;
}

@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) {}

  async getConversations(userId: number) {
    const rows = await this.prisma.$queryRaw<ConversationRow[]>`
      SELECT
        conversation_id AS conversationId,
        type,
        participant_a AS participantA,
        participant_b AS participantB,
        last_message AS lastMessage,
        last_message_at AS lastMessageAt
      FROM conversations
      WHERE participant_a = ${BigInt(userId)} OR participant_b = ${BigInt(userId)}
      ORDER BY last_message_at DESC, conversation_id DESC
      LIMIT 50
    `;

    return rows.map((row) => {
      const participantA = Number(row.participantA);
      const participantB = Number(row.participantB);
      return {
        conversationId: Number(row.conversationId),
        type: row.type,
        participantA,
        participantB,
        lastMessage: row.lastMessage,
        lastMessageAt: row.lastMessageAt ? new Date(row.lastMessageAt).toISOString() : null,
        targetUserId: participantA === userId ? participantB : participantA
      };
    });
  }

  async getMessages(userId: number, conversationId: number, take = 50, skip = 0) {
    const conversations = await this.prisma.$queryRaw<ConversationRow[]>`
      SELECT
        conversation_id AS conversationId,
        type,
        participant_a AS participantA,
        participant_b AS participantB,
        last_message AS lastMessage,
        last_message_at AS lastMessageAt
      FROM conversations
      WHERE conversation_id = ${BigInt(conversationId)}
      LIMIT 1
    `;
    const conversation = conversations[0];
    if (!conversation) {
      return [];
    }

    const isParticipant =
      conversation.type === "SYSTEM" ||
      Number(conversation.participantA) === userId ||
      Number(conversation.participantB) === userId;
    if (!isParticipant) {
      return [];
    }

    const limit = Math.max(1, Math.min(200, Number.isFinite(take) ? Math.floor(take) : 50));
    const offset = Math.max(0, Number.isFinite(skip) ? Math.floor(skip) : 0);

    const rows = await this.prisma.$queryRaw<MessageRow[]>`
      SELECT
        message_id AS messageId,
        sender_id AS senderId,
        content,
        msg_type AS msgType,
        is_read AS isRead,
        created_at AS createdAt
      FROM messages
      WHERE conversation_id = ${BigInt(conversationId)}
      ORDER BY created_at DESC, message_id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return rows.reverse().map((row) => ({
      messageId: Number(row.messageId),
      senderId: Number(row.senderId),
      content: row.content,
      msgType: row.msgType,
      isRead: Boolean(row.isRead),
      createdAt: new Date(row.createdAt).toISOString(),
      isSelf: Number(row.senderId) === userId
    }));
  }

  async ensureConversation(userIdA: number, userIdB: number, type: ConversationType = "C2C") {
    const p1 = Math.min(userIdA, userIdB);
    const p2 = Math.max(userIdA, userIdB);

    const existingRows = await this.prisma.$queryRaw<Array<{ conversationId: bigint | number }>>`
      SELECT conversation_id AS conversationId
      FROM conversations
      WHERE participant_a = ${BigInt(p1)}
        AND participant_b = ${BigInt(p2)}
      LIMIT 1
    `;

    if (existingRows[0]?.conversationId) {
      return Number(existingRows[0].conversationId);
    }

    await this.prisma.$executeRaw`
      INSERT INTO conversations (
        type,
        participant_a,
        participant_b,
        created_at,
        updated_at
      )
      VALUES (
        ${type},
        ${BigInt(p1)},
        ${BigInt(p2)},
        NOW(),
        NOW()
      )
    `;

    const idRows = await this.prisma.$queryRaw<Array<{ conversationId: bigint | number }>>`
      SELECT LAST_INSERT_ID() AS conversationId
    `;

    return Number(idRows[0]?.conversationId ?? 0);
  }

  async saveMessage(
    conversationId: number,
    senderId: number,
    content: string,
    msgType: string = "text"
  ) {
    await this.prisma.$executeRaw`
      INSERT INTO messages (
        conversation_id,
        sender_id,
        content,
        msg_type,
        is_read,
        created_at
      )
      VALUES (
        ${BigInt(conversationId)},
        ${BigInt(senderId)},
        ${content},
        ${msgType},
        ${false},
        NOW()
      )
    `;

    // 使用 LAST_INSERT_ID() 获取本次插入记录，避免并发下误取到其他请求的最新消息。
    const idRows = await this.prisma.$queryRaw<Array<{ messageId: bigint | number }>>`
      SELECT LAST_INSERT_ID() AS messageId
    `;
    const insertedMessageIdRaw = idRows[0]?.messageId;
    if (insertedMessageIdRaw === undefined || insertedMessageIdRaw === null) {
      throw new Error("消息写入失败：未获取到 messageId");
    }
    const insertedMessageId = BigInt(insertedMessageIdRaw);

    const messageRows = await this.prisma.$queryRaw<
      Array<{ messageId: bigint | number; createdAt: Date }>
    >`
      SELECT message_id AS messageId, created_at AS createdAt
      FROM messages
      WHERE message_id = ${insertedMessageId}
      LIMIT 1
    `;

    await this.prisma.$executeRaw`
      UPDATE conversations
      SET last_message = ${content.slice(0, 50)},
          last_message_at = NOW(),
          updated_at = NOW()
      WHERE conversation_id = ${BigInt(conversationId)}
    `;

    const latestMessage = messageRows[0];
    if (!latestMessage) {
      throw new Error("消息写入失败：未查询到已插入消息");
    }

    return {
      messageId: Number(latestMessage.messageId),
      senderId,
      content,
      msgType,
      isRead: false,
      createdAt: new Date(latestMessage.createdAt).toISOString()
    };
  }
}

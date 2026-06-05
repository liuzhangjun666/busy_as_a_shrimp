import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { MessageService } from "./message.service";
import { JwtService } from "@nestjs/jwt";
import { Logger } from "@nestjs/common";

@WebSocketGateway({
  cors: {
    origin: "*"
  },
  namespace: "/chat"
})
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessageGateway.name);
  private userSockets = new Map<number, string[]>();

  constructor(
    private readonly messageService: MessageService,
    private readonly jwtService: JwtService
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token?.replace("Bearer ", "");
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      client.data.userId = userId;

      const sockets = this.userSockets.get(userId) || [];
      sockets.push(client.id);
      this.userSockets.set(userId, sockets);

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (e) {
      this.logger.error("WebSocket Auth Error", e);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId) || [];
      const updated = sockets.filter((id) => id !== client.id);
      if (updated.length > 0) {
        this.userSockets.set(userId, updated);
      } else {
        this.userSockets.delete(userId);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("sendMessage")
  async handleSendMessage(
    @MessageBody() data: { targetUserId: number; content: string; msgType?: string },
    @ConnectedSocket() client: Socket
  ) {
    const senderId = client.data.userId;
    if (!senderId) return { success: false, error: "Unauthorized" };

    const conversationId = await this.messageService.ensureConversation(
      senderId,
      data.targetUserId,
      "C2C"
    );
    const msg = await this.messageService.saveMessage(
      conversationId,
      senderId,
      data.content,
      data.msgType || "text"
    );

    // 发送给目标用户（支持多端登录）
    const targetSockets = this.userSockets.get(data.targetUserId) || [];
    targetSockets.forEach((socketId) => {
      this.server.to(socketId).emit("receiveMessage", {
        ...msg,
        conversationId
      });
    });

    // 多端同步给发送方自己
    const senderSockets = this.userSockets.get(senderId) || [];
    senderSockets.forEach((socketId) => {
      if (socketId !== client.id) {
        this.server.to(socketId).emit("receiveMessage", {
          ...msg,
          conversationId
        });
      }
    });

    return { success: true, data: msg };
  }

  // 暴露给系统后台调用的推送接口
  async pushSystemMessage(targetUserId: number, content: string, msgType: string = "text") {
    const SYSTEM_USER_ID = 0;
    const conversationId = await this.messageService.ensureConversation(
      SYSTEM_USER_ID,
      targetUserId,
      "SYSTEM"
    );
    const msg = await this.messageService.saveMessage(
      conversationId,
      SYSTEM_USER_ID,
      content,
      msgType
    );

    const targetSockets = this.userSockets.get(targetUserId) || [];
    targetSockets.forEach((socketId) => {
      this.server.to(socketId).emit("receiveMessage", {
        ...msg,
        conversationId
      });
    });
  }
}

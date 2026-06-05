import { Controller, Get, Post, Query, Body, UseGuards, Request } from "@nestjs/common";
import { MessageService } from "./message.service";
import { MessageGateway } from "./message.gateway";
import { AuthGuard } from "@nestjs/passport";

@Controller("message")
@UseGuards(AuthGuard("jwt"))
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly messageGateway: MessageGateway
  ) {}

  @Get("conversations")
  async getConversations(@Request() req: { user: { userId: string | number } }) {
    const userId = Number(req.user.userId);
    return this.messageService.getConversations(userId);
  }

  @Get("history")
  async getMessages(
    @Request() req: { user: { userId: string | number } },
    @Query("conversationId") conversationId: string,
    @Query("take") take?: string,
    @Query("skip") skip?: string
  ) {
    const userId = Number(req.user.userId);
    return this.messageService.getMessages(
      userId,
      Number(conversationId),
      take ? Number(take) : 50,
      skip ? Number(skip) : 0
    );
  }

  // 研发测试通道：快速给自己发送一条系统消息以验证模块
  @Post("debug-system-push")
  async debugSystemPush(
    @Request() req: { user: { userId: string | number } },
    @Body("content") content: string
  ) {
    const userId = Number(req.user.userId);
    const text = content || "这是一条用来验证完整性的自动系统通知测试内容！";
    await this.messageGateway.pushSystemMessage(userId, text, "text");
    return { success: true, message: "System push dispatched." };
  }
}

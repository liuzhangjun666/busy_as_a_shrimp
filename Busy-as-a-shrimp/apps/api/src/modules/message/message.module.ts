import { Module } from "@nestjs/common";
import { MessageService } from "./message.service";
import { MessageController } from "./message.controller";
import { MessageGateway } from "./message.gateway";
import { PrismaService } from "../../common/prisma.service";
import { UserModule } from "../user/user.module";

@Module({
  imports: [UserModule],
  providers: [PrismaService, MessageService, MessageGateway],
  controllers: [MessageController],
  exports: [MessageService, MessageGateway]
})
export class MessageModule {}

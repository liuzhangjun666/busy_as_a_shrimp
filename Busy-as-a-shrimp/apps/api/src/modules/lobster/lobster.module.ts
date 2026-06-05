import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HttpModule } from "@nestjs/axios";
import { LobsterController } from "./lobster.controller";
import { LobsterService } from "./lobster.service";
import { LobsterScheduler } from "./lobster.scheduler";
import { LobsterProducer } from "./lobster.producer";
import { LobsterConsumer } from "./lobster.consumer";
import { LobsterCyberTaskService } from "./lobster-cyber-task.service";
import { DeerFlowGatewayService } from "./deerflow-gateway.service";
import { PrismaService } from "../../common/prisma.service";
import { RabbitMQGlobalModule } from "../common/rabbitmq.module";

const isLobsterMqDisabled = process.env.LOBSTER_MQ_DISABLED === "true";

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({ timeout: 30000 }),
    ...(isLobsterMqDisabled ? [] : [RabbitMQGlobalModule])
  ],
  controllers: [LobsterController],
  providers: [
    LobsterService,
    LobsterCyberTaskService,
    DeerFlowGatewayService,
    LobsterScheduler,
    ...(isLobsterMqDisabled ? [] : [LobsterProducer, LobsterConsumer]),
    PrismaService
  ],
  exports: [LobsterService, LobsterCyberTaskService, DeerFlowGatewayService]
})
export class LobsterModule {}

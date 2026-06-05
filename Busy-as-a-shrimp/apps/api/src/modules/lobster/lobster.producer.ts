import { Injectable } from "@nestjs/common";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";

@Injectable()
export class LobsterProducer {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  // 发布任务触发消息
  async publishTask(payload: {
    userId: string;
    personality: string;
    city?: string;
    taskLogId: string;
  }) {
    await this.amqpConnection.publish("lobster.tasks", "deerflow.task.trigger", payload);
  }

  // 发布审核结果消息
  async publishReviewResult(payload: { taskId: string; approved: boolean; feedback?: string }) {
    await this.amqpConnection.publish("lobster.tasks", "deerflow.task.verify", payload);
  }
}

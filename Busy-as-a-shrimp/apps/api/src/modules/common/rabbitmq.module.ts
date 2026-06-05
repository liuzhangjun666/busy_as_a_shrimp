import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";

/**
 * RabbitMQ 全局连接模块
 *
 * 消息拓扑：
 * ┌─────────────────┐    publish     ┌──────────────────────┐
 * │  NestJS Producer │ ────────────► │  lobster.tasks 交换机 │ (topic)
 * └─────────────────┘                └──────────┬───────────┘
 *                                                 │
 *                    ┌────────────────────────────┼────────────────────────────┐
 *                    │ routing key                 │ routing key                │
 *                    ▼                             ▼                            │
 *         ┌──────────────────┐          ┌───────────────────┐                   │
 *         │ deerflow.trigger  │          │ deerflow.verify    │                   │
 *         │ 队列 (DeerFlow消费)│          │ 队列 (DeerFlow消费)  │                   │
 *         └──────────────────┘          └───────────────────┘                   │
 *                                                                       │
 * ┌─────────────────┐    publish     ┌──────────────────────┐           │
 * │  DeerFlow 推送   │ ────────────► │ lobster.results 交换机│ (topic)◄──┘
 * └─────────────────┘                └──────────┬───────────┘
 *                                                 │
 *                                    ┌────────────┴──────────────────┐
 *                                    │ routing key                     │
 *                                    ▼                                ▼
 *                         ┌─────────────────────┐        ┌─────────────────────┐
 *                         │ result.push 队列      │        │ result.status 队列    │ ◄─── 新增
 *                         │ (NestJS Consumer)     │        │ (NestJS Consumer)    │
 *                         └─────────────────────┘        └─────────────────────┘
 *                                                                  │
 *                                    ┌─────────────────────────────┘
 *                                    │ routing key
 *                                    ▼
 *                         ┌─────────────────────┐
 *                         │ result.hp 队列        │ ◄─── 新增
 *                         │ (NestJS Consumer)    │
 *                         └─────────────────────┘
 *
 * 失败消息 → lobster.dlx (fanout) → lobster.dlx.queue (死信归档)
 */
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // ========== 交换机 ==========
        exchanges: [
          {
            name: "lobster.tasks",
            type: "topic",
            durable: true,
            options: { alternateExchange: undefined }
          },
          {
            name: "lobster.results",
            type: "topic",
            durable: true,
            options: { alternateExchange: undefined }
          },
          {
            name: "lobster.reviews",
            type: "topic",
            durable: true,
            options: { alternateExchange: undefined }
          },
          // 死信交换机：收集所有消费失败的消息
          {
            name: "lobster.dlx",
            type: "fanout",
            durable: true
          }
        ],

        // ========== 队列与路由绑定 ==========
        queues: [
          // DeerFlow 消费：任务触发
          {
            name: "lobster.deerflow.trigger",
            durable: true,
            options: { deadLetterExchange: "lobster.dlx", deadLetterRoutingKey: "" }
          },
          // DeerFlow 消费：审核结果回调
          {
            name: "lobster.deerflow.verify",
            durable: true,
            options: { deadLetterExchange: "lobster.dlx", deadLetterRoutingKey: "" }
          },
          // NestJS 消费：DeerFlow 结果推送 (机会/内容数据)
          {
            name: "lobster.nestjs.result.push",
            durable: true,
            options: { deadLetterExchange: "lobster.dlx", deadLetterRoutingKey: "" }
          },
          // NestJS 消费：任务状态变更通知
          {
            name: "lobster.nestjs.result.status",
            durable: true,
            options: { deadLetterExchange: "lobster.dlx", deadLetterRoutingKey: "" }
          },
          // NestJS 消费：HP 变动事件
          {
            name: "lobster.nestjs.result.hp",
            durable: true,
            options: { deadLetterExchange: "lobster.dlx", deadLetterRoutingKey: "" }
          },
          // 死信归档队列
          {
            name: "lobster.dlx.queue",
            durable: true
          }
        ],

        // ========== 路由键绑定 ==========
        queueBindings: [
          // lobster.tasks 交换机的绑定
          {
            exchange: "lobster.tasks",
            targetQueue: "lobster.deerflow.trigger",
            routingKey: "deerflow.task.trigger"
          },
          {
            exchange: "lobster.tasks",
            targetQueue: "lobster.deerflow.verify",
            routingKey: "deerflow.task.verify"
          },
          // lobster.results 交换机的绑定
          {
            exchange: "lobster.results",
            targetQueue: "lobster.nestjs.result.push",
            routingKey: "deerflow.result.push"
          },
          {
            exchange: "lobster.results",
            targetQueue: "lobster.nestjs.result.status",
            routingKey: "deerflow.result.status"
          },
          {
            exchange: "lobster.results",
            targetQueue: "lobster.nestjs.result.hp",
            routingKey: "deerflow.result.hp"
          },
          // 死信交换机绑定
          {
            exchange: "lobster.dlx",
            targetQueue: "lobster.dlx.queue",
            routingKey: ""
          }
        ],

        // ========== 并发消费配置 ==========
        prefetchCount: 10,

        // ========== URI 连接字符串 ==========
        uri: `amqp://${config.get("RABBITMQ_USER", "airp")}:${config.get(
          "RABBITMQ_PASSWORD",
          "airp"
        )}@${config.get("RABBITMQ_HOST", "localhost")}:${config.get("RABBITMQ_PORT", "5672")}`,

        connectionInitOptions: {
          timeout: 15000,
          wait: false
        },

        reconnectTimeInSeconds: 10,

        defaultRpcTimeout: 30000,

        enableDirectReplyTo: true
      })
    })
  ],
  exports: [RabbitMQModule]
})
export class RabbitMQGlobalModule {}

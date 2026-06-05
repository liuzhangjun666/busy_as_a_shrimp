import { Injectable, Logger } from "@nestjs/common";
import { RabbitHandler } from "@golevelup/nestjs-rabbitmq";
import { LobsterService } from "./lobster.service";

/**
 * DeerFlow 结果推送 Consumer
 *
 * 消费来自 lobster.results 交换机、路由键 result.push 的消息。
 * DeerFlow 完成任务执行后，通过此通道将结果推送给 NestJS。
 *
 * 消息格式（DeerFlow → NestJS）：
 * {
 *   taskId: string;          // DeerFlow 任务 ID
 *   runId: string;           // LangGraph Run ID
 *   userId: string | number;
 *   status: 'completed' | 'failed' | 'partial';
 *   result?: {
 *     opportunities?: Array<{...}>;  // 发现的机会
 *     contentDraft?: string;         // 内容草稿
 *     metrics?: {                   // 执行指标
 *       pagesVisited: number;
 *       dataPointsCollected: number;
 *       durationMs: number;
 *     };
 *   };
 *   error?: string;
 *   executedAt: string;      // ISO datetime
 * }
 */
@Injectable()
export class LobsterConsumer {
  private readonly logger = new Logger(LobsterConsumer.name);

  constructor(private readonly lobsterService: LobsterService) {}

  /**
   * 消费 DeerFlow 推送的结果
   * - 写入 opportunities 表
   * - 更新 lobster_task_logs 状态
   * - 触发 HP 变动
   * - 记录审计日志
   */
  // @ts-expect-error - golevelup/nestjs-rabbitmq v9 装饰器返回类型与 async 方法不兼容（已知库 bug）
  @RabbitHandler({
    exchange: "lobster.results",
    routingKey: "result.push",
    queue: "lobster.nestjs.result.push",
    queueOptions: {
      durable: true,
      deadLetterExchange: "lobster.dlx",
      deadLetterRoutingKey: ""
    },
    type: "subscribe"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
  async handleResultPush(payload: Record<string, unknown>): Promise<unknown> {
    this.logger.log(
      `[Consumer] 收到 DeerFlow 推送结果: taskId=${payload.taskId}, userId=${payload.userId}, status=${payload.status}`
    );

    try {
      const result = await this.lobsterService.handleDeerflowResultFromQueue({
        taskId: payload.taskId as string,
        runId: payload.runId as string,
        userId: String(payload.userId),
        status: payload.status as "completed" | "failed" | "partial",
        result: payload.result as Record<string, unknown>[] | undefined,
        error: payload.error as string | undefined,
        executedAt: payload.executedAt as string
      });

      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[Consumer] 处理 DeerFlow 结果失败: ${message}`,
        error instanceof Error ? error.stack : ""
      );
      throw error;
    }
  }
}

"""
RabbitMQ Consumer —— 接收来自 NestJS 的任务触发和审核结果消息

消费的队列：
  1. lobster.deerflow.trigger   → 触发 DeerFlow 执行扫描任务
  2. lobster.deerflow.verify    → 审核结果回调，恢复被暂停的 Run

架构：
  NestJS → [lobster.tasks 交换机] → [lobster.deerfly.trigger 队列] → Python AI Engine
                                                    ↓
                                              DeerFlowClient.trigger_scan()
"""

import asyncio
import json
import logging
from typing import Any

import aio_pika

from .config import settings
from .deerflow_client import deerflow_client, sign_callback
from .openclaw_skill import openclaw_skill

logger = logging.getLogger("ai-engine.mq_consumer")

DLX_EXCHANGE = "lobster.dlx"
DLX_ROUTING_KEY = ""


class LobsterMQConsumer:
    """龙虾分身 RabbitMQ 消费者"""

    def __init__(self):
        self.url = (
            f"amqp://{settings.rabbitmq_user}:{settings.rabbitmq_pass}"
            f"@{settings.rabbitmq_host}:{settings.rabbitmq_port}/"
        )
        self._running = False

    async def start(self) -> None:
        """启动消费者连接"""
        logger.info(f"[MQ] 连接 RabbitMQ: {settings.rabbitmq_host}:{settings.rabbitmq_port}")
        self._running = True

        connection = await aio_pika.connect_robust(self.url)

        async with connection:
            channel = await connection.channel()
            await channel.set_qos(prefetch_count=5)  # 并发消费数

            # ========== 注册队列消费 ==========
            # 1. 任务触发队列
            trigger_queue = await channel.declare_queue(
                "lobster.deerflow.trigger",
                durable=True,
                arguments={
                    "x-dead-letter-exchange": DLX_EXCHANGE,
                    "x-dead-letter-routing-key": DLX_ROUTING_KEY,
                },
            )
            await trigger_queue.consume(self._on_trigger_message)

            # 2. 审核结果回调队列
            verify_queue = await channel.declare_queue(
                "lobster.deerflow.verify",
                durable=True,
                arguments={
                    "x-dead-letter-exchange": DLX_EXCHANGE,
                    "x-dead-letter-routing-key": DLX_ROUTING_KEY,
                },
            )
            await verify_queue.consume(self._on_verify_message)

            logger.info("[MQ] 消费者已启动，监听 deerflow.task.trigger 和 deerflow.task.verify")

            # 保持运行
            while self._running:
                await asyncio.sleep(1)

    async def stop(self) -> None:
        """停止消费者"""
        self._running = False

    async def _on_trigger_message(self, message: aio_pika.IncomingMessage) -> None:
        """处理任务触发消息"""
        try:
            body = json.loads(message.body.decode())
            user_id = body.get("userId")
            personality = body.get("personality", "city")
            city = body.get("city")
            task_log_id = body.get("taskLogId")

            logger.info(
                f"[MQ][Trigger] 收到任务触发: userId={user_id}, "
                f"personality={personality}, city={city}, taskLogId={task_log_id}"
            )

            # 调用 DeerFlow 执行任务
            result = await deerflow_client.trigger_scan(
                user_id=user_id,
                personality=personality,
                city=city,
            )

            logger.info(f"[MQ][Trigger] DeerFlow 响应: {json.dumps(result, ensure_ascii=False)[:200]}")

            await message.ack()

        except json.JSONDecodeError as e:
            logger.error(f"[MQ][Trigger] JSON 解析失败: {e}")
            await message.nack(requeue=False)
        except Exception as e:
            logger.error(f"[MQ][Trigger] 处理失败: {e}", exc_info=True)
            await message.nack(requeue=True)  # 重试

    async def _on_verify_message(self, message: aio_pika.IncomingMessage) -> None:
        """处理审核结果回调消息"""
        try:
            body = json.loads(message.body.decode())
            task_id = body.get("taskId")
            approved = body.get("approved", False)
            feedback = body.get("feedback")

            logger.info(
                f"[MQ][Verify] 收到审核结果: taskId={task_id}, approved={approved}"
            )

            # TODO: 从 task_log 中获取 threadId/runId，然后调用 resume_run
            # 当前需要查询数据库获取关联信息
            result = {
                "taskId": task_id,
                "approved": approved,
                "status": "review_received",
            }

            logger.info(f"[MQ][Verify] 处理完成: {result}")

            await message.ack()

        except Exception as e:
            logger.error(f"[MQ][Verify] 处理失败: {e}", exc_info=True)
            await message.nack(requeue=False)


# 全局单例
mq_consumer = LobsterMQConsumer()


# 兼容旧版 main.py 的启动函数
async def start_consumer() -> None:
    """供 FastAPI startup 事件调用"""
    await mq_consumer.start()


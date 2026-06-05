import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";
import { PrismaService } from "../../common/prisma.service";

/**
 * 使用 LangGraph Server Two-Step API 与 DeerFlow 通信：
 *   Step 1: POST /api/threads          → 创建独立对话线程
 *   Step 2: POST /api/threads/{id}/runs → 将任务投入线程后台执行
 *
 * 适用场景：智能匹配 lobster-smart-matcher（异步后台跑，不等待结果）
 */
@Injectable()
export class LobsterCyberTaskService {
  private readonly logger = new Logger(LobsterCyberTaskService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  private get deerflowApiBase() {
    const url = this.configService.get<string>("DEERFLOW_BASE_URL");
    this.fileLog(`Loaded DeerFlow URL: ${url}`);
    return url ?? "http://localhost:2026";
  }

  private get deerflowAssistantId() {
    const assistantId = this.configService.get<string>("DEERFLOW_ASSISTANT_ID")?.trim();
    const graphId = this.configService.get<string>("DEERFLOW_GRAPH_ID")?.trim();
    return assistantId || graphId || "lead_agent";
  }

  private get campusScanUrl() {
    const url = this.configService.get<string>("AI_ENGINE_BASE_URL");
    if (!url) {
      return "http://localhost:8088/scan/campus";
    }

    const normalized = url.trim().replace(/\/$/, "");
    if (normalized.endsWith("/scan/campus")) {
      return normalized;
    }

    return `${normalized}/scan/campus`;
  }

  private buildGatewayUrl(path: string): string {
    const base = this.deerflowApiBase.replace(/\/$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    if (normalizedPath.startsWith("/api/")) return `${base}${normalizedPath}`;
    // If DEERFLOW_BASE_URL already includes an /api segment (e.g. /api or /api/langgraph),
    // append the path directly and avoid duplicating "/api".
    if (/\/api(?:\/|$)/.test(base)) return `${base}${normalizedPath}`;
    return `${base}/api${normalizedPath}`;
  }

  private get deerflowHeaders() {
    const apiKey = this.configService.get<string>("DEERFLOW_API_KEY");
    this.fileLog(`Loaded API Key suffix: ${apiKey ? apiKey.substring(apiKey.length - 4) : "NONE"}`);
    return {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-Api-Key": apiKey, Authorization: `Bearer ${apiKey}` } : {})
    };
  }

  private get aiEngineHeaders() {
    return {
      "Content-Type": "application/json"
    };
  }

  private fileLog(message: string) {
    const logPath = path.join(process.cwd(), "debug.log");
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[CyberTask][${timestamp}] ${message}\n`);
  }

  private describeHttpError(error: unknown): string {
    if (!error || typeof error !== "object") {
      return String(error);
    }

    const code = (error as { code?: unknown }).code;
    const message = (error as { message?: unknown }).message;
    const status = (error as { response?: { status?: unknown } }).response?.status;
    const data = (error as { response?: { data?: unknown } }).response?.data;

    const codePart = typeof code === "string" ? `code=${code}` : "";
    const statusPart = typeof status === "number" ? `status=${status}` : "";
    const messagePart = typeof message === "string" ? `message=${message}` : "";
    const dataPart = data ? `response=${JSON.stringify(data)}` : "";

    return [codePart, statusPart, messagePart, dataPart].filter(Boolean).join(", ");
  }

  async triggerCampusScan(params: {
    userId: string;
    scanType: string;
    city?: string;
    keyword?: string;
    limit?: number;
  }): Promise<{ success: boolean; taskId?: string; message?: string }> {
    const payload = {
      userId: params.userId,
      scanType: params.scanType,
      city: params.city,
      keyword: params.keyword,
      limit: params.limit
    };

    this.fileLog(`[CampusScan] Trigger payload: ${JSON.stringify(payload)}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post<{
          success?: boolean;
          taskId?: string;
          message?: string;
          status?: string;
          code?: number;
        }>(this.campusScanUrl, payload, {
          headers: this.aiEngineHeaders,
          timeout: 10000
        })
      );

      const data = response.data ?? {};
      const success =
        data.success === true ||
        data.code === 200 ||
        data.status?.toLowerCase() === "task_received";

      return {
        success,
        taskId: data.taskId,
        message: data.message ?? data.status ?? (success ? "task_received" : "task_failed")
      };
    } catch (error: unknown) {
      const detail = this.describeHttpError(error);
      this.fileLog(`[CampusScan] Trigger failed: ${detail}`);
      this.logger.error(
        `[CampusScan] request failed, url=${this.campusScanUrl}, payload=${JSON.stringify(
          payload
        )}, detail=${detail}`
      );
      throw new BadGatewayException(
        `校园抓取服务不可用，请确认 AI 引擎服务已启动并可访问（${this.campusScanUrl}）`
      );
    }
  }

  /**
   * 为指定用户触发智能匹配 Agent
   * 通过 LangGraph Thread/Run 两步法在后台异步执行，执行完后 DeerFlow 通过
   * HMAC 签名回调 POST /api/v1/lobster/push-result 把结果写回 NestJS。
   */
  /**
   * 为指定用户触发智能匹配 Agent
   */
  async triggerMatchAgent(
    userId: string,
    userProfile?: string,
    demandPool?: string
  ): Promise<{ threadId: string; runId: string }> {
    try {
      const profileText = userProfile ?? `用户ID: ${userId}，技能方向待完善`;
      const demandText = demandPool ?? "暂无需求池数据，请稍后重试";

      const prompt = `请执行技能：lobster-smart-matcher。
【用户画像】：${profileText}
【需求池】：${demandText}`;

      this.fileLog(`Triggering Match Agent for user: ${userId}`);

      const threadId = uuidv4();
      const threadRes = await firstValueFrom(
        this.httpService.post<{ thread_id: string }>(
          this.buildGatewayUrl("/threads"),
          { thread_id: threadId },
          { headers: this.deerflowHeaders }
        )
      );
      const resolvedThreadId = threadRes.data?.thread_id ?? threadId;

      const baseUrl =
        this.configService.get<string>("APP_PUBLIC_BASE_URL")?.trim() ||
        this.configService.get<string>("NESTJS_BASE_URL")?.trim() ||
        "http://localhost:8081";
      // 路径规范化：如果 baseUrl 已经包含了 /api/v1，则不再重复拼接前缀
      const webhookSuffix = "/lobster/webhook/callback";
      const fullWebhookUrl = baseUrl.includes("/api/v1")
        ? `${baseUrl.replace(/\/$/, "")}${webhookSuffix}`
        : `${baseUrl.replace(/\/$/, "")}/api/v1${webhookSuffix}`;
      const callbackToken = this.configService.get<string>("DEERFLOW_CALLBACK_TOKEN")?.trim();
      const webhookUrlWithToken =
        callbackToken && callbackToken.length > 0
          ? `${fullWebhookUrl}${fullWebhookUrl.includes("?") ? "&" : "?"}callback_token=${encodeURIComponent(callbackToken)}`
          : fullWebhookUrl;
      const sanitizedWebhookUrl =
        callbackToken && callbackToken.length > 0
          ? webhookUrlWithToken.replace(/(callback_token=)[^&]+/, "$1***")
          : webhookUrlWithToken;

      const runPayload = {
        assistant_id: this.deerflowAssistantId,
        input: {
          messages: [{ role: "user", content: prompt }]
        },
        webhook: webhookUrlWithToken,
        config: {
          recursion_limit: 100,
          metadata: {
            userId,
            taskType: "smart_matcher"
          }
        }
      };

      const runRes = await firstValueFrom(
        this.httpService.post<{ run_id: string }>(
          this.buildGatewayUrl(`/threads/${resolvedThreadId}/runs`),
          runPayload,
          { headers: this.deerflowHeaders }
        )
      );

      const runId = runRes.data?.run_id ?? "unknown";
      this.fileLog(`✅ Run created: ${runId}`);
      this.fileLog(`Payload sent: ${JSON.stringify(runPayload)}`); // 增加调试日志以确认结构

      // 核心持久化逻辑：记录任务日志并更新用户状态
      const bUserId = BigInt(userId);
      const lobster = await this.prisma.lobsterStatus.findUnique({ where: { userId: bUserId } });

      if (lobster) {
        await this.prisma.$transaction([
          this.prisma.lobsterTaskLog.create({
            data: {
              lobsterId: lobster.lobsterId,
              taskType: "smart_matcher",
              personality: "match",
              status: "running",
              deerflowRunId: runId,
              inputJson: JSON.parse(
                JSON.stringify({
                  ...runPayload,
                  webhook: sanitizedWebhookUrl
                })
              ),
              startedAt: new Date()
            }
          }),
          this.prisma.lobsterStatus.update({
            where: { userId: bUserId },
            data: { status: "executing", lastExecutedAt: new Date() }
          })
        ]);
        this.fileLog(`🚀 Task persistence successful for user: ${userId}`);
      } else {
        this.fileLog(`⚠️ No LobsterStatus found for user: ${userId}, skipped persistence`);
      }

      return { threadId: resolvedThreadId, runId };
    } catch (error: unknown) {
      const detail = this.describeHttpError(error);
      const errMsg = error instanceof Error ? error.message : String(error);
      this.fileLog(`[TriggerMatchAgent] failed: ${detail || errMsg}`);

      const maybeHttpError =
        !!(error as { response?: unknown })?.response || !!(error as { code?: unknown })?.code;
      if (maybeHttpError) {
        const gatewayRoot = this.buildGatewayUrl("/threads").replace(/\/threads$/, "");
        this.logger.error(
          `[TriggerMatchAgent] request failed, gateway=${gatewayRoot}, userId=${userId}, detail=${detail}`
        );
        throw new BadGatewayException(
          `智能匹配服务不可用，请确认 DeerFlow 网关已启动并可访问（${gatewayRoot}）`
        );
      }
      throw error;
    }
  }

  /**
   * 恢复被 interrupt() 暂停的 Run（人工审核后调用）
   */
  async resumeRun(
    threadId: string,
    runId: string,
    approved: boolean,
    feedback?: string
  ): Promise<void> {
    this.logger.log(`[CyberTask] 恢复 Run ${runId}，approved=${approved}`);
    await firstValueFrom(
      this.httpService.post(
        this.buildGatewayUrl(`/threads/${threadId}/runs/${runId}/resume`),
        {
          command: "resume",
          input: { approved, feedback }
        },
        { headers: this.deerflowHeaders }
      )
    );
  }

  /**
   * 查询 Run 的当前状态（带 404 重试机制，解决远端索引延迟带来的竞态问题）
   */
  async getRunStatus(
    threadId: string,
    runId: string,
    retryCount = 0
  ): Promise<{ status: string; output?: unknown }> {
    try {
      // 切换到 Thread 级别查询以避免 405 错误
      const res = await firstValueFrom(
        this.httpService.get<{ status: string; values?: unknown }>(
          this.buildGatewayUrl(`/threads/${threadId}`),
          { headers: this.deerflowHeaders }
        )
      );

      const threadStatus = res.data?.status; // busy, idle, error, interrupted
      let mappedStatus = "pending";

      if (threadStatus === "busy") mappedStatus = "running";
      else if (threadStatus === "idle") mappedStatus = "completed";
      else if (threadStatus === "error") mappedStatus = "failed";
      else if (threadStatus === "interrupted") mappedStatus = "requires_action";

      return {
        status: mappedStatus,
        output: res.data?.values // Thread 级别通常在 values 中包含状态
      };
    } catch (error: unknown) {
      const err = error as { response?: { status: number } };
      if (err.response?.status === 404 && retryCount < 5) {
        this.fileLog(`⚠️ Run ${runId} 尚未就绪 (404), 3秒后进行第 ${retryCount + 1} 次重试...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return this.getRunStatus(threadId, runId, retryCount + 1);
      }
      const errMsg = error instanceof Error ? error.message : String(error);
      this.fileLog(`❌ getRunStatus failed: ${errMsg}`);
      throw error;
    }
  }
}

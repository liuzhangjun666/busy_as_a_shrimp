import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Headers,
  Query,
  Sse,
  MessageEvent,
  Logger
} from "@nestjs/common";
import { Observable } from "rxjs";
import { ok } from "../../common/api-response";
import { LobsterService } from "./lobster.service";
import { LobsterCyberTaskService } from "./lobster-cyber-task.service";
import { JwtAuthGuard } from "../user/guards/jwt-auth.guard";
import { CurrentUser } from "../user/decorators/current-user.decorator";
import { DeerFlowSignatureGuard } from "./guards/deerflow-signature.guard";
import {
  ActivateLobsterDto,
  TriggerTaskDto,
  ReviewCallbackDto,
  DeerFlowPushResultDto,
  DeerFlowHpEventDto,
  DeerFlowTaskStatusDto,
  DeerFlowWebhookCallbackDto,
  UserBatchQueryDto,
  CreateReviewTaskDto,
  ReviewActionDto,
  GetOpportunitiesQueryDto,
  ScanCampusBodyDto
} from "./dto/lobster.dto";

interface ICurrentUser {
  userId: string | bigint;
}

@Controller("lobster")
export class LobsterController {
  private readonly logger = new Logger(LobsterController.name);

  constructor(
    private readonly lobsterService: LobsterService,
    private readonly cyberTaskService: LobsterCyberTaskService
  ) {}

  // ===== 用户端端点（需 JWT） =====

  @Post("activate")
  @UseGuards(JwtAuthGuard)
  async activate(@CurrentUser() user: ICurrentUser, @Body() dto: ActivateLobsterDto) {
    const result = await this.lobsterService.activate(BigInt(user.userId), dto);
    return ok(result, "赛博分身已激活");
  }

  @Get("status")
  @UseGuards(JwtAuthGuard)
  async getStatus(@CurrentUser() user: ICurrentUser) {
    const result = await this.lobsterService.getStatus(BigInt(user.userId));
    return ok(result);
  }

  @Post("trigger")
  @UseGuards(JwtAuthGuard)
  async triggerTask(@CurrentUser() user: ICurrentUser, @Body() dto: TriggerTaskDto) {
    const result = await this.lobsterService.triggerTask(BigInt(user.userId), dto);
    return ok(result, "任务已触发");
  }

  @Post("reset-status")
  @UseGuards(JwtAuthGuard)
  async resetStatus(@CurrentUser() user: ICurrentUser) {
    const result = await this.lobsterService.resetStatus(BigInt(user.userId));
    return ok(result, result.reset ? "赛博分身状态已重置" : result.message);
  }

  @Put("review/:taskId")
  @UseGuards(JwtAuthGuard)
  async review(
    @CurrentUser() user: ICurrentUser,
    @Param("taskId") taskId: string,
    @Body() dto: ReviewCallbackDto
  ) {
    const result = await this.lobsterService.submitReview(BigInt(user.userId), taskId, dto);
    return ok(result, "审核已提交");
  }

  @Get("opportunities")
  @UseGuards(JwtAuthGuard)
  async getOpportunities(
    @CurrentUser() user: ICurrentUser,
    @Query() query: GetOpportunitiesQueryDto
  ) {
    const safePage = query.page ?? 1;
    const safeSize = query.size ?? 20;
    const sourceType = query.sourceType?.trim();

    const result = await this.lobsterService.getOpportunities(
      BigInt(user.userId),
      sourceType || undefined,
      safePage,
      safeSize
    );
    return ok(result);
  }

  @Get("task-logs")
  @UseGuards(JwtAuthGuard)
  async getTaskLogs(@CurrentUser() user: ICurrentUser) {
    const result = await this.lobsterService.getTaskLogs(BigInt(user.userId));
    return ok(result);
  }

  @Get("hp-logs")
  @UseGuards(JwtAuthGuard)
  async getHpLogs(
    @CurrentUser() user: ICurrentUser,
    @Query("page") page = "1",
    @Query("size") size = "20"
  ) {
    const result = await this.lobsterService.getHpLogs(
      BigInt(user.userId),
      Math.max(1, parseInt(page, 10)),
      Math.min(50, parseInt(size, 10))
    );
    return ok(result);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@CurrentUser() user: ICurrentUser) {
    const result = await this.lobsterService.getMyProfile(BigInt(user.userId));
    return ok(result);
  }

  @Get("reviews")
  @UseGuards(JwtAuthGuard)
  async getReviews(
    @CurrentUser() user: ICurrentUser,
    @Query("page") page = "1",
    @Query("size") size = "10"
  ) {
    const result = await this.lobsterService.getReviews(
      BigInt(user.userId),
      Math.max(1, parseInt(page, 10)),
      Math.min(50, parseInt(size, 10))
    );
    return ok(result);
  }

  @Get("matches")
  @UseGuards(JwtAuthGuard)
  async getMatches(
    @CurrentUser() user: ICurrentUser,
    @Query("page") page = "1",
    @Query("size") size = "10"
  ) {
    const result = await this.lobsterService.getMatches(
      BigInt(user.userId),
      Math.max(1, parseInt(page, 10)),
      Math.min(50, parseInt(size, 10))
    );
    return ok(result);
  }

  // ===== DeerFlow 回调端点（HMAC 签名验证 / API Key） =====

  @Get("profile/:userId")
  @UseGuards(DeerFlowSignatureGuard)
  async getProfile(@Param("userId") userId: string) {
    const result = await this.lobsterService.getProfile(BigInt(userId));
    return ok(result);
  }

  @Post("push-result")
  @UseGuards(DeerFlowSignatureGuard)
  async pushResult(@Body() dto: DeerFlowPushResultDto) {
    const result = await this.lobsterService.handlePushResult(dto);
    return ok(result, "结果已接收");
  }

  @Post("hp-event")
  @UseGuards(DeerFlowSignatureGuard)
  async hpEvent(@Body() dto: DeerFlowHpEventDto) {
    const result = await this.lobsterService.handleHpEvent(dto);
    return ok(result, "HP事件已处理");
  }

  @Post("task-status")
  @UseGuards(DeerFlowSignatureGuard)
  async taskStatus(@Body() dto: DeerFlowTaskStatusDto) {
    const result = await this.lobsterService.handleTaskStatus(dto);
    return ok(result, "任务状态已更新");
  }

  @Post("webhook/callback")
  @UseGuards(DeerFlowSignatureGuard)
  async webhookCallback(
    @Body() body: DeerFlowWebhookCallbackDto,
    @Headers("x-deerflow-signature") _signature: string,
    @Headers("x-deerflow-timestamp") _timestamp: string
  ) {
    const result = await this.lobsterService.handleWebhookCallback(body);
    return ok(result, "回调已接收");
  }

  // ===== 批量与审核扩展 (路线图 4.2-4.5) =====

  /**
   * 批量获取用户画像及分身状态 (供 AI 调度器调用)
   */
  @Get("users/batch")
  @UseGuards(DeerFlowSignatureGuard)
  async getUsersBatch(@Query() query: UserBatchQueryDto) {
    const result = await this.lobsterService.getUsersBatch(query);
    return ok(result);
  }

  /**
   * 接收来自 DeerFlow 的“人工审核”挂起请求 (带 Signature 卫兵)
   */
  @Post("review/pending")
  @UseGuards(DeerFlowSignatureGuard)
  async reviewPending(@Body() dto: CreateReviewTaskDto) {
    const result = await this.lobsterService.handleReviewPending(dto);
    return ok(result, "人工审核任务已排队");
  }

  /**
   * 获取审核任务状态
   */
  @Get("review/:id")
  @UseGuards(JwtAuthGuard)
  async getReviewTask(@CurrentUser() user: ICurrentUser, @Param("id") id: string) {
    const result = await this.lobsterService.getReviewTask(BigInt(user.userId), BigInt(id));
    return ok(result);
  }

  /**
   * 用户提交审核动作
   */
  @Post("review/:id/action")
  @UseGuards(JwtAuthGuard)
  async processReviewAction(
    @CurrentUser() user: ICurrentUser,
    @Param("id") id: string,
    @Body() action: ReviewActionDto
  ) {
    const result = await this.lobsterService.processReviewAction(
      BigInt(user.userId),
      BigInt(id),
      action
    );
    return ok(result, "审核决策已提交并已驱动远端引擎");
  }

  // ===== 自动化驱动扩展 =====

  @Post("trigger-http")
  @UseGuards(JwtAuthGuard)
  async triggerHttp(@CurrentUser() user: ICurrentUser, @Body() body: { taskType: string }) {
    const result = await this.lobsterService.triggerAutomationHttp(
      user.userId.toString(),
      body.taskType
    );
    return ok(result, "AI 分身已通过 HTTP 直接启动");
  }

  @Sse("trigger-stream")
  @UseGuards(JwtAuthGuard)
  triggerStream(
    @CurrentUser() user: ICurrentUser,
    @Query("taskType") taskType: string
  ): Observable<MessageEvent> {
    return this.lobsterService.triggerStreamHttp(user.userId.toString(), taskType ?? "daily_scan");
  }

  @Post("trigger-match")
  @UseGuards(JwtAuthGuard)
  async triggerMatch(
    @CurrentUser() user: ICurrentUser,
    @Body() body: { userProfile?: string; demandPool?: string }
  ) {
    const result = await this.cyberTaskService.triggerMatchAgent(
      user.userId.toString(),
      body.userProfile,
      body.demandPool
    );
    return ok(result, "赛博分身已在后台启动，等待回调结果");
  }

  @Post("scan-campus")
  @UseGuards(JwtAuthGuard)
  async scanCampus(@CurrentUser() user: ICurrentUser, @Body() body: ScanCampusBodyDto) {
    const result = await this.cyberTaskService.triggerCampusScan({
      userId: user.userId.toString(),
      scanType: body.scanType?.trim() || "city",
      city: body.city?.trim() || undefined,
      keyword: body.keyword?.trim() || undefined,
      limit: body.limit ?? 30
    });

    return ok(result, "校招抓取任务已下发");
  }

  @Get("run-status/:threadId/:runId")
  @UseGuards(JwtAuthGuard)
  async getRunStatus(@Param("threadId") threadId: string, @Param("runId") runId: string) {
    const result = await this.cyberTaskService.getRunStatus(threadId, runId);
    return ok(result);
  }

  @Post("resume-run")
  @UseGuards(JwtAuthGuard)
  async resumeRun(
    @Body() body: { threadId: string; runId: string; approved: boolean; feedback?: string }
  ) {
    await this.cyberTaskService.resumeRun(body.threadId, body.runId, body.approved, body.feedback);
    return ok(null, "审核结果已提交，赛博分身继续执行");
  }
}

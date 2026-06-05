import { BadRequestException, ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CaptainLevel, CommissionStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { LocalComplianceProvider } from "./providers/local.provider";
import { AliyunComplianceProvider } from "./providers/aliyun.provider";
import {
  ComplianceProvider,
  ComplianceResult,
  ImageCheckOptions,
  TextCheckOptions
} from "./providers/base.provider";

type PrismaClientLike = PrismaService | Prisma.TransactionClient;
type RiskAction = "pass" | "review" | "block" | "disposed";
type RiskEventType =
  | "same_ip_limit"
  | "abnormal_device"
  | "invite_chain_detection"
  | "brush_order_disposal"
  | "violation_penalty"
  | "account_unban";

type ViolationResponseCode = "VIOLATION_WARNING" | "VIOLATION_MUTED" | "VIOLATION_BANNED";
type ViolationScene =
  | "resource_upload"
  | "resource_update"
  | "content_generate"
  | "content_publish"
  | "admin_user_status";
type ViolationPenaltyLevel = "warning" | "mute" | "ban";

interface RiskEventLogInput {
  userId?: bigint | null;
  eventType: RiskEventType;
  action: RiskAction;
  detail?: Record<string, unknown>;
  client?: PrismaClientLike;
}

export interface RegistrationRiskInput {
  ip?: string | null;
  deviceFingerprint?: string | null;
}

export interface InviteRiskInput {
  inviterId: bigint;
  inviteeId: bigint;
  inviteCode: string;
}

export interface InviteRiskResult {
  isValid: boolean;
  reasons: string[];
  inviteRecordId: bigint | null;
  recordCreated: boolean;
}

export interface WritePolicyInput {
  userId: bigint;
  scene: ViolationScene;
  texts?: string[];
}

export interface ReviewTextsDecision {
  passed: boolean;
  reason?: string;
  engine: string;
  service?: string;
}

const DEFAULT_SAME_IP_LIMIT = 3;
const DEFAULT_SAME_DEVICE_LIMIT = 2;
const DEFAULT_INVITE_CHAIN_DEPTH_LIMIT = 6;
const VIOLATION_WINDOW_DAYS = 30;
const VIOLATION_MUTE_HOURS = 72;
const STRONG_BRUSH_ORDER_REASONS = new Set([
  "same_ip_pair",
  "same_device_pair",
  "invite_cycle",
  "invite_chain_depth_exceeded"
]);

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly localProvider: LocalComplianceProvider,
    private readonly aliyunProvider: AliyunComplianceProvider,
    private readonly configService: ConfigService
  ) {}

  async checkText(content: string, options?: TextCheckOptions): Promise<void> {
    const { result } = await this.runTextModeration(content, options);
    if (!result.success) {
      throw new BadRequestException(result.message || "Content moderation check failed");
    }
  }

  async reviewTexts(texts: string[], options?: TextCheckOptions): Promise<ReviewTextsDecision> {
    const normalizedTexts = texts.map((item) => item.trim()).filter((item) => item.length > 0);
    let engine = this.getActiveProvider().getName();

    for (const text of normalizedTexts) {
      const reviewResult = await this.runTextModeration(text, options);
      engine = reviewResult.engine;

      if (!reviewResult.result.success) {
        return {
          passed: false,
          reason: reviewResult.result.message || "鍐呭瀹℃牳鏈€氳繃",
          engine: reviewResult.engine,
          service: reviewResult.result.service
        };
      }
    }

    return {
      passed: true,
      engine
    };
  }

  async checkImage(
    image: string,
    options?: ImageCheckOptions
  ): Promise<{ service?: string; engine?: string }> {
    const { result, engine } = await this.runImageModeration(image, options);
    if (!result.success) {
      throw new BadRequestException(result.message || "Image moderation check failed");
    }

    return { service: result.service, engine };
  }

  async inspectImage(
    imageUrl: string,
    scene: ImageCheckOptions["scene"] = "generic"
  ): Promise<{ engine: string; service?: string }> {
    const result = await this.checkImage(imageUrl, { scene });
    return {
      engine: result.engine ?? this.getActiveProvider().getName(),
      service: result.service
    };
  }

  async checkTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.checkText(tag);
    }
  }

  async enforceWritePolicy(input: WritePolicyInput): Promise<void> {
    const userState = await this.getUserWriteState(input.userId);
    const now = new Date();

    if (userState.status === "banned") {
      this.throwViolationError("VIOLATION_BANNED", "账号已被封禁");
    }

    if (userState.speakMutedUntil && userState.speakMutedUntil.getTime() > now.getTime()) {
      this.throwViolationError(
        "VIOLATION_MUTED",
        "当前处于禁言期，禁止发布",
        userState.speakMutedUntil
      );
    }

    const texts = (input.texts ?? []).map((item) => item.trim()).filter((item) => item.length > 0);
    if (texts.length === 0) {
      return;
    }

    for (const text of texts) {
      const { result } = await this.runTextModeration(text, { scene: input.scene });
      if (result.success) {
        continue;
      }

      await this.applyViolationPenalty({
        userId: input.userId,
        scene: input.scene,
        reason: result.message || "内容合规校验未通过"
      });
    }
  }

  async recordUnban(
    userId: bigint,
    reason: string = "admin_status_active",
    client?: PrismaClientLike
  ): Promise<void> {
    const prismaClient = client ?? this.prisma;
    const safeReason = this.normalizeViolationReason(reason);
    const detail = {
      reason: safeReason,
      source: "admin_update_user_status"
    };

    await this.createViolationEvent(prismaClient, {
      userId,
      scene: "admin_user_status",
      reason: safeReason,
      decision: "unban"
    });

    await this.logRiskEvent({
      client: prismaClient,
      userId,
      eventType: "account_unban",
      action: "pass",
      detail
    });
  }

  async checkRegistrationRisk(input: RegistrationRiskInput): Promise<void> {
    const ip = this.normalizeIp(input.ip);
    const deviceFingerprint = this.normalizeDeviceFingerprint(input.deviceFingerprint);

    if (ip) {
      const sameIpCount = await this.countByRegisterIp(ip);
      const ipLimit = this.readPositiveInt("RISK_SAME_IP_LIMIT", DEFAULT_SAME_IP_LIMIT);
      if (sameIpCount >= ipLimit) {
        await this.logRiskEvent({
          eventType: "same_ip_limit",
          action: "block",
          detail: { ip, sameIpCount, ipLimit }
        });
        throw new BadRequestException("注册触发同 IP 风控限制，已拦截");
      }
    }

    if (deviceFingerprint) {
      const sameDeviceCount = await this.countByDeviceFingerprint(deviceFingerprint);
      const deviceLimit = this.readPositiveInt("RISK_SAME_DEVICE_LIMIT", DEFAULT_SAME_DEVICE_LIMIT);
      if (sameDeviceCount >= deviceLimit) {
        await this.logRiskEvent({
          eventType: "abnormal_device",
          action: "block",
          detail: { deviceFingerprint, sameDeviceCount, deviceLimit }
        });
        throw new BadRequestException("注册触发同设备风控限制，已拦截");
      }
    }
  }

  async recordUserDevice(
    userId: bigint,
    ip?: string | null,
    deviceFingerprint?: string | null
  ): Promise<void> {
    const registerIp = this.normalizeIp(ip) ?? "unknown";
    const normalizedFingerprint = this.normalizeDeviceFingerprint(deviceFingerprint);

    try {
      await this.prisma.$executeRaw`
        INSERT INTO user_devices (user_id, register_ip, device_fingerprint, created_at)
        VALUES (${userId}, ${registerIp}, ${normalizedFingerprint}, NOW())
      `;
    } catch (error) {
      if (this.isMissingTableError(error)) {
        return;
      }
      throw error;
    }
  }

  async evaluateInviteRisk(input: InviteRiskInput): Promise<InviteRiskResult> {
    return this.prisma.$transaction(async (tx) => {
      const reasons: string[] = [];

      // 锁定 invitee 行，保证“查重 + 判定 + 落库”串行，避免并发双写。
      const inviteeRows = await tx.$queryRaw<Array<{ userId: bigint; lastIp: string | null }>>`
        SELECT user_id AS userId, last_ip AS lastIp
        FROM users
        WHERE user_id = ${input.inviteeId}
        FOR UPDATE
      `;
      const invitee = inviteeRows[0] ?? null;

      const [inviter, existingInvite, inviterFingerprint, inviteeFingerprint] = await Promise.all([
        tx.user.findUnique({
          where: { userId: input.inviterId },
          select: { userId: true, lastIp: true }
        }),
        tx.inviteRecord.findFirst({
          where: { inviteeId: input.inviteeId },
          orderBy: { recordId: "desc" },
          select: { recordId: true }
        }),
        this.getLatestDeviceFingerprint(input.inviterId, tx),
        this.getLatestDeviceFingerprint(input.inviteeId, tx)
      ]);

      if (!inviter || !invitee) {
        reasons.push("user_not_found");
      }
      if (existingInvite) {
        reasons.push("duplicate_invitee");
      }

      if (
        !existingInvite &&
        inviter?.lastIp &&
        invitee?.lastIp &&
        inviter.lastIp === invitee.lastIp
      ) {
        reasons.push("same_ip_pair");
      }
      if (
        !existingInvite &&
        inviterFingerprint &&
        inviteeFingerprint &&
        inviterFingerprint === inviteeFingerprint
      ) {
        reasons.push("same_device_pair");
      }

      if (!existingInvite && inviter && invitee) {
        const chainState = await this.inspectInviteChain(input.inviterId, input.inviteeId, tx);
        if (chainState.hasCycle) {
          reasons.push("invite_cycle");
        }

        const chainDepthLimit = this.readPositiveInt(
          "RISK_INVITE_CHAIN_DEPTH_LIMIT",
          DEFAULT_INVITE_CHAIN_DEPTH_LIMIT
        );
        if (chainState.depth > chainDepthLimit) {
          reasons.push("invite_chain_depth_exceeded");
        }
      }

      const uniqueReasons = [...new Set(reasons)];
      const isValid = uniqueReasons.length === 0;
      const recordCreated = !existingInvite && inviter !== null && invitee !== null;

      let inviteRecordId: bigint | null = existingInvite?.recordId ?? null;
      if (recordCreated) {
        const inviteRecord = await tx.inviteRecord.create({
          data: {
            inviterId: input.inviterId,
            inviteeId: input.inviteeId,
            inviteCode: input.inviteCode.slice(0, 8),
            isValid
          }
        });
        inviteRecordId = inviteRecord.recordId;
      }

      if (!isValid) {
        await this.logRiskEvent({
          client: tx,
          userId: input.inviterId,
          eventType: "invite_chain_detection",
          action: "block",
          detail: {
            inviterId: input.inviterId.toString(),
            inviteeId: input.inviteeId.toString(),
            reasons: uniqueReasons,
            inviteRecordId: inviteRecordId?.toString() ?? null,
            recordCreated
          }
        });

        const strongReasons = this.filterStrongBrushOrderReasons(uniqueReasons);
        if (strongReasons.length > 0 && inviteRecordId) {
          await this.disposeBrushOrder({
            client: tx,
            inviterId: input.inviterId,
            inviteRecordId,
            reasons: strongReasons
          });
        }
      }

      return {
        isValid,
        reasons: uniqueReasons,
        inviteRecordId,
        recordCreated
      };
    });
  }

  rules() {
    return {
      uploadFirewall: true,
      contentPreCheck: true,
      dealIsolation: true,
      antiFraud: ["same_ip_limit", "abnormal_device", "invite_chain_detection"],
      antiFraudExecutionEnabled: true,
      antiFraudThresholds: {
        sameIpRegisterLimit: this.readPositiveInt("RISK_SAME_IP_LIMIT", DEFAULT_SAME_IP_LIMIT),
        sameDeviceRegisterLimit: this.readPositiveInt(
          "RISK_SAME_DEVICE_LIMIT",
          DEFAULT_SAME_DEVICE_LIMIT
        ),
        inviteChainDepthLimit: this.readPositiveInt(
          "RISK_INVITE_CHAIN_DEPTH_LIMIT",
          DEFAULT_INVITE_CHAIN_DEPTH_LIMIT
        )
      },
      violationWindowDays: VIOLATION_WINDOW_DAYS,
      violationMuteHours: VIOLATION_MUTE_HOURS,
      scanEngine: this.getActiveProvider().getName()
    };
  }

  private getActiveProvider(): ComplianceProvider {
    const provider = (this.configService.get<string>("COMPLIANCE_PROVIDER") ?? "aliyun")
      .trim()
      .toLowerCase();
    if (provider === "local") {
      return this.localProvider;
    }
    return this.aliyunProvider;
  }

  private async runTextModeration(
    content: string,
    options?: TextCheckOptions
  ): Promise<{ result: ComplianceResult; engine: string }> {
    const primaryProvider = this.getActiveProvider();

    try {
      const result = await primaryProvider.checkText(content, options);
      return { result, engine: primaryProvider.getName() };
    } catch (error) {
      const fallback = await this.tryLocalTextFallback(primaryProvider, content, options, error);
      if (fallback) {
        return fallback;
      }
      throw error;
    }
  }

  private async runImageModeration(
    image: string,
    options?: ImageCheckOptions
  ): Promise<{ result: ComplianceResult; engine: string }> {
    const primaryProvider = this.getActiveProvider();

    try {
      const result = await primaryProvider.checkImage(image, options);
      return { result, engine: primaryProvider.getName() };
    } catch (error) {
      const fallback = await this.tryLocalImageFallback(primaryProvider, image, options, error);
      if (fallback) {
        return fallback;
      }
      throw error;
    }
  }

  private async tryLocalTextFallback(
    primaryProvider: ComplianceProvider,
    content: string,
    options: TextCheckOptions | undefined,
    error: unknown
  ): Promise<{ result: ComplianceResult; engine: string } | null> {
    if (!this.canFallbackToLocal(primaryProvider, error)) {
      return null;
    }

    this.logger.warn(
      `[compliance-fallback] text moderation downgraded to local provider; reason=${this.describeError(error)}`
    );
    const result = await this.localProvider.checkText(content, options);
    return { result, engine: this.localProvider.getName() };
  }

  private async tryLocalImageFallback(
    primaryProvider: ComplianceProvider,
    image: string,
    options: ImageCheckOptions | undefined,
    error: unknown
  ): Promise<{ result: ComplianceResult; engine: string } | null> {
    if (!this.canFallbackToLocal(primaryProvider, error)) {
      return null;
    }

    this.logger.warn(
      `[compliance-fallback] image moderation downgraded to local provider; reason=${this.describeError(error)}`
    );
    const result = await this.localProvider.checkImage(image, options);
    return { result, engine: this.localProvider.getName() };
  }

  private canFallbackToLocal(primaryProvider: ComplianceProvider, error: unknown): boolean {
    if (primaryProvider !== this.aliyunProvider) {
      return false;
    }

    if (!this.readBooleanConfig("COMPLIANCE_FALLBACK_TO_LOCAL_ON_UNAVAILABLE", true)) {
      return false;
    }

    const normalized = this.describeError(error).toLowerCase();
    const fallbackHints = [
      "temporarily unavailable",
      "service unavailable",
      "timeout",
      "timed out",
      "econn",
      "enotfound",
      "socket hang up",
      "network",
      "arrears",
      "in arrears",
      "insufficient balance",
      "recharge",
      "no permission",
      "forbidden",
      "quota"
    ];

    return fallbackHints.some((token) => normalized.includes(token));
  }

  private readBooleanConfig(key: string, fallback: boolean): boolean {
    const raw = this.configService.get<string>(key);
    if (raw === undefined) {
      return fallback;
    }

    const normalized = raw.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }

    return fallback;
  }

  private describeError(error: unknown): string {
    if (error instanceof BadRequestException) {
      const response = error.getResponse();
      if (typeof response === "string" && response.trim()) {
        return response.trim();
      }
      if (response && typeof response === "object") {
        const payload = response as { message?: string | string[]; error?: string };
        if (Array.isArray(payload.message) && payload.message.length > 0) {
          return payload.message.join(" ");
        }
        if (typeof payload.message === "string" && payload.message.trim()) {
          return payload.message.trim();
        }
        if (typeof payload.error === "string" && payload.error.trim()) {
          return payload.error.trim();
        }
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    if (typeof error === "string" && error.trim()) {
      return error.trim();
    }

    try {
      return JSON.stringify(error);
    } catch {
      return "unknown_error";
    }
  }

  private async applyViolationPenalty(input: {
    userId: bigint;
    scene: ViolationScene;
    reason: string;
  }): Promise<void> {
    const now = new Date();
    const safeReason = this.normalizeViolationReason(input.reason);
    let penalty: ViolationPenaltyLevel = "warning";
    let muteUntil: Date | null = null;

    await this.prisma.$transaction(async (tx) => {
      // 通过用户行锁保证“计数 -> 判级 -> 写事件”串行，避免并发降级处罚。
      const lockedRows = await tx.$queryRaw<
        Array<{
          status: string;
          speakMutedUntil: Date | string | null;
        }>
      >`
        SELECT status, speak_muted_until AS speakMutedUntil
        FROM users
        WHERE user_id = ${input.userId}
        FOR UPDATE
      `;

      const lockedUser = lockedRows[0];
      if (!lockedUser) {
        throw new BadRequestException("用户不存在");
      }

      const lockedMutedUntil = this.parseDate(lockedUser.speakMutedUntil);
      if (lockedUser.status === "banned") {
        this.throwViolationError("VIOLATION_BANNED", "账号已被封禁");
      }
      if (lockedMutedUntil && lockedMutedUntil.getTime() > now.getTime()) {
        this.throwViolationError("VIOLATION_MUTED", "当前处于禁言期，禁止发布", lockedMutedUntil);
      }

      penalty = await this.resolvePenaltyLevel(tx, input.userId, now);
      muteUntil =
        penalty === "mute" ? new Date(now.getTime() + VIOLATION_MUTE_HOURS * 60 * 60 * 1000) : null;

      await this.createViolationEvent(tx, {
        userId: input.userId,
        scene: input.scene,
        reason: safeReason,
        decision: penalty
      });

      if (penalty === "mute") {
        await tx.$executeRaw`
          UPDATE users
          SET speak_muted_until = ${muteUntil}
          WHERE user_id = ${input.userId}
        `;
      }

      if (penalty === "ban") {
        await tx.user.update({
          where: { userId: input.userId },
          data: {
            status: "banned" as never
          }
        });

        await tx.$executeRaw`
          UPDATE users
          SET speak_muted_until = NULL
          WHERE user_id = ${input.userId}
        `;
      }

      await this.logRiskEvent({
        client: tx,
        userId: input.userId,
        eventType: "violation_penalty",
        action: "block",
        detail: {
          scene: input.scene,
          reason: safeReason,
          decision: penalty,
          mutedUntil: muteUntil?.toISOString() ?? null
        }
      });
    });

    if (penalty === "warning") {
      this.throwViolationError("VIOLATION_WARNING", "内容违规，已警告并拦截");
    }

    if (penalty === "mute") {
      this.throwViolationError("VIOLATION_MUTED", "内容违规，已禁言并拦截", muteUntil);
    }

    this.throwViolationError("VIOLATION_BANNED", "内容违规，账号已封禁");
  }

  private async resolvePenaltyLevel(
    client: PrismaClientLike,
    userId: bigint,
    now: Date
  ): Promise<ViolationPenaltyLevel> {
    const rollingStart = new Date(now.getTime() - VIOLATION_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const rows = await client.$queryRaw<Array<{ total: bigint | number }>>`
      SELECT COUNT(1) AS total
      FROM violation_events
      WHERE user_id = ${userId}
        AND created_at >= ${rollingStart}
        AND decision IN ('warning', 'mute', 'ban')
    `;

    const violationCount = Number(rows[0]?.total ?? 0);

    if (violationCount >= 2) {
      return "ban";
    }

    if (violationCount === 1) {
      return "mute";
    }

    return "warning";
  }

  private async getUserWriteState(userId: bigint): Promise<{
    status: string;
    speakMutedUntil: Date | null;
  }> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        status: string;
        speakMutedUntil: Date | string | null;
      }>
    >`
      SELECT status, speak_muted_until AS speakMutedUntil
      FROM users
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      throw new BadRequestException("用户不存在");
    }

    return {
      status: row.status,
      speakMutedUntil: this.parseDate(row.speakMutedUntil)
    };
  }

  private async createViolationEvent(
    client: PrismaClientLike,
    input: {
      userId: bigint;
      scene: ViolationScene;
      reason: string;
      decision: ViolationPenaltyLevel | "unban";
    }
  ): Promise<void> {
    await client.$executeRaw`
      INSERT INTO violation_events (user_id, scene, reason, decision, created_at)
      VALUES (${input.userId}, ${input.scene}, ${input.reason}, ${input.decision}, NOW())
    `;
  }

  private throwViolationError(
    code: ViolationResponseCode,
    message: string,
    mutedUntil?: Date | null
  ): never {
    throw new ForbiddenException({
      code,
      message,
      mutedUntil: mutedUntil ? mutedUntil.toISOString() : null
    });
  }

  private normalizeViolationReason(reason: string): string {
    const cleaned = reason.trim().replace(/\s+/g, " ");
    if (!cleaned) {
      return "内容合规校验未通过";
    }
    return cleaned.slice(0, 255);
  }

  private parseDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value;
    }

    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private async inspectInviteChain(
    inviterId: bigint,
    inviteeId: bigint,
    client: PrismaClientLike = this.prisma
  ): Promise<{ depth: number; hasCycle: boolean }> {
    const visited = new Set<string>([inviteeId.toString()]);
    let depth = 1;
    let current = inviterId;

    while (true) {
      const marker = current.toString();
      if (visited.has(marker)) {
        return { depth, hasCycle: true };
      }
      visited.add(marker);

      const parentLink = await client.inviteRecord.findFirst({
        where: {
          inviteeId: current,
          isValid: true
        },
        orderBy: { createdAt: "desc" },
        select: { inviterId: true }
      });

      if (!parentLink) {
        return { depth, hasCycle: false };
      }

      depth += 1;
      if (
        depth >
        this.readPositiveInt("RISK_INVITE_CHAIN_DEPTH_LIMIT", DEFAULT_INVITE_CHAIN_DEPTH_LIMIT)
      ) {
        return { depth, hasCycle: false };
      }

      current = parentLink.inviterId;
    }
  }

  private async disposeBrushOrder(input: {
    client?: PrismaClientLike;
    inviterId: bigint;
    inviteRecordId: bigint;
    reasons: string[];
  }): Promise<void> {
    try {
      const runDisposal = async (tx: PrismaClientLike) => {
        // 同一邀请记录只允许生成一条处罚单，避免重复处罚。
        const existingRows = await tx.$queryRaw<Array<{ penaltyId: bigint | number }>>`
          SELECT penalty_id AS penaltyId
          FROM brush_order_penalties
          WHERE invite_record_id = ${input.inviteRecordId}
          LIMIT 1
        `;
        if (existingRows.length > 0) {
          return;
        }

        const userRows = await tx.$queryRaw<Array<{ captainLevel: CaptainLevel }>>`
          SELECT captain_level AS captainLevel
          FROM users
          WHERE user_id = ${input.inviterId}
          FOR UPDATE
        `;
        const userRow = userRows[0];
        if (!userRow) {
          throw new BadRequestException("用户不存在");
        }

        const commissionRows = await tx.$queryRaw<
          Array<{
            commissionId: bigint | number;
            status: CommissionStatus;
            commissionAmount: Prisma.Decimal | string | number;
          }>
        >`
          SELECT
            commission_id AS commissionId,
            status,
            commission_amount AS commissionAmount
          FROM captain_commissions
          WHERE captain_id = ${input.inviterId}
            AND status IN ('pending', 'active')
          FOR UPDATE
        `;

        await tx.$executeRaw`
          INSERT INTO brush_order_penalties
          (
            user_id,
            invite_record_id,
            trigger_reasons,
            before_captain_level,
            status,
            applied_at
          )
          VALUES
          (
            ${input.inviterId},
            ${input.inviteRecordId},
            ${JSON.stringify(input.reasons)},
            ${userRow.captainLevel},
            ${"applied"},
            NOW()
          )
        `;

        const penaltyIdRows = await tx.$queryRaw<Array<{ penaltyId: bigint | number }>>`
          SELECT LAST_INSERT_ID() AS penaltyId
        `;
        const penaltyIdRaw = penaltyIdRows[0]?.penaltyId;
        if (!penaltyIdRaw) {
          throw new BadRequestException("刷单处罚单创建失败");
        }
        const penaltyId = BigInt(penaltyIdRaw);

        for (const row of commissionRows) {
          await tx.$executeRaw`
            INSERT INTO brush_order_penalty_commissions
            (
              penalty_id,
              commission_id,
              before_status,
              before_amount
            )
            VALUES
            (
              ${penaltyId},
              ${BigInt(row.commissionId)},
              ${row.status},
              ${row.commissionAmount}
            )
          `;
        }

        await tx.user.updateMany({
          where: { userId: input.inviterId },
          data: { captainLevel: CaptainLevel.normal }
        });

        if (commissionRows.length > 0) {
          await tx.captainCommission.updateMany({
            where: {
              captainId: input.inviterId,
              status: { in: [CommissionStatus.pending, CommissionStatus.active] }
            },
            data: {
              status: CommissionStatus.invalid,
              commissionAmount: new Prisma.Decimal(0)
            }
          });
        }

        await this.logRiskEvent({
          client: tx,
          userId: input.inviterId,
          eventType: "brush_order_disposal",
          action: "disposed",
          detail: {
            inviterId: input.inviterId.toString(),
            inviteRecordId: input.inviteRecordId.toString(),
            penaltyId: penaltyId.toString(),
            reasons: input.reasons,
            affectedCommissionCount: commissionRows.length
          }
        });
      };

      if (input.client) {
        await runDisposal(input.client);
        return;
      }

      await this.prisma.$transaction(async (tx) => {
        await runDisposal(tx);
      });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        return;
      }
      throw error;
    }
  }

  private filterStrongBrushOrderReasons(reasons: string[]): string[] {
    return [...new Set(reasons.filter((reason) => STRONG_BRUSH_ORDER_REASONS.has(reason)))];
  }

  private async countByDeviceFingerprint(deviceFingerprint: string): Promise<number> {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ total: bigint | number }>>`
        SELECT COUNT(DISTINCT user_id) AS total
        FROM user_devices
        WHERE device_fingerprint = ${deviceFingerprint}
      `;

      return Number(rows[0]?.total ?? 0);
    } catch (error) {
      if (this.isMissingTableError(error)) {
        return 0;
      }
      throw error;
    }
  }

  private async countByRegisterIp(ip: string): Promise<number> {
    try {
      const rows = await this.prisma.$queryRaw<Array<{ total: bigint | number }>>`
        SELECT COUNT(DISTINCT user_id) AS total
        FROM user_devices
        WHERE register_ip = ${ip}
      `;

      return Number(rows[0]?.total ?? 0);
    } catch (error) {
      if (this.isMissingTableError(error)) {
        return this.prisma.user.count({ where: { lastIp: ip } });
      }
      throw error;
    }
  }

  private async getLatestDeviceFingerprint(
    userId: bigint,
    client: PrismaClientLike = this.prisma
  ): Promise<string | null> {
    try {
      const rows = await client.$queryRaw<Array<{ deviceFingerprint: string | null }>>`
        SELECT device_fingerprint AS deviceFingerprint
        FROM user_devices
        WHERE user_id = ${userId}
          AND device_fingerprint IS NOT NULL
        ORDER BY created_at DESC, device_id DESC
        LIMIT 1
      `;

      return this.normalizeDeviceFingerprint(rows[0]?.deviceFingerprint ?? null);
    } catch (error) {
      if (this.isMissingTableError(error)) {
        return null;
      }
      throw error;
    }
  }

  private async logRiskEvent(input: RiskEventLogInput): Promise<void> {
    const client = input.client ?? this.prisma;
    const detailJson = input.detail ? JSON.stringify(input.detail) : null;
    try {
      await client.$executeRaw`
        INSERT INTO risk_control_events (user_id, event_type, action, detail, created_at)
        VALUES (${input.userId ?? null}, ${input.eventType}, ${input.action}, ${detailJson}, NOW())
      `;
    } catch (error) {
      if (this.isMissingTableError(error)) {
        return;
      }
      throw error;
    }
  }

  private normalizeIp(ip?: string | null): string | null {
    const raw = (ip ?? "").trim();
    if (!raw) {
      return null;
    }

    const first = raw.split(",")[0]?.trim() ?? "";
    if (!first) {
      return null;
    }

    if (first === "::1") {
      return "127.0.0.1";
    }

    return first.replace(/^::ffff:/, "").slice(0, 50);
  }

  private normalizeDeviceFingerprint(deviceFingerprint?: string | null): string | null {
    const normalized = (deviceFingerprint ?? "").trim();
    if (!normalized) {
      return null;
    }
    return normalized.slice(0, 191);
  }

  private readPositiveInt(envName: string, fallback: number): number {
    const raw = process.env[envName];
    if (!raw) {
      return fallback;
    }

    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }

  private isMissingTableError(error: unknown): boolean {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2010") {
      const meta = error.meta as { code?: string; message?: string } | undefined;
      return meta?.code === "1146" || String(meta?.message ?? "").includes("doesn't exist");
    }

    const message = error instanceof Error ? error.message : String(error);
    return message.includes("doesn't exist");
  }

  private isDuplicateKeyError(error: unknown): boolean {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2010") {
      const meta = error.meta as { code?: string; message?: string } | undefined;
      return meta?.code === "1062" || String(meta?.message ?? "").includes("Duplicate entry");
    }

    const message = error instanceof Error ? error.message : String(error);
    return message.includes("Duplicate entry");
  }
}

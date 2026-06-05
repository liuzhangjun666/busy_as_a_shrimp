import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { createHash } from "crypto";
import {
  CaptainLevel as PrismaCaptainLevel,
  Prisma,
  ResourceStatus,
  SubmissionStatus
} from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import {
  AdminUserStatus,
  CaptainLevel,
  CreateDictTypeDto,
  CreateDictDataDto,
  DictStatus,
  BrushOrderPenaltyStatus,
  QueryBrushOrderPenaltiesDto,
  QueryResourcesDto,
  QueryUsersDto,
  ReviewBrushOrderPenaltyDto,
  UpdateDictTypeDto,
  UpdateDictDataDto,
  CreateBountyTaskDto,
  QueryAiBriefsDto,
  CreateAiBriefDto,
  QuerySoloSignalsDto,
  CreateSoloSignalDto,
  GrantCampusUnlockDto
} from "./dto/admin.dto";

type ExtendedPrisma = PrismaService & {
  announcement: {
    count: () => Promise<number>;
    create: (args: { data: { content: string; publisher: string } }) => Promise<{
      noticeId: bigint;
      content: string;
      publisher: string;
      createdAt: Date;
    }>;
    findMany: (args: { orderBy: { createdAt: "desc" }; take: number }) => Promise<
      Array<{
        noticeId: bigint;
        content: string;
        publisher: string;
        createdAt: Date;
      }>
    >;
    delete: (args: { where: { noticeId: bigint } }) => Promise<{
      noticeId: bigint;
    }>;
  };
};

export interface AdminDictType {
  dictId: number;
  dictName: string;
  dictType: string;
  status: DictStatus;
  remark?: string;
}

export interface AdminDictData {
  dictDataId: number;
  dictCode: string;
  dictLabel: string;
  dictValue: string;
  dictSort: number;
  status: DictStatus;
  remark?: string;
}

export interface BrushOrderPenaltyItem {
  penaltyId: number;
  userId: number;
  inviteRecordId: number;
  triggerReasons: string[];
  beforeCaptainLevel: PrismaCaptainLevel;
  status: BrushOrderPenaltyStatus;
  reviewedBy?: number;
  reviewNote?: string;
  appliedAt: string;
  reviewedAt?: string;
  rolledBackAt?: string;
  affectedCommissionCount: number;
}

export interface BrushOrderPenaltyListResult {
  list: BrushOrderPenaltyItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AdminUserListResult {
  list: Array<{
    userId: number;
    phoneMasked: string;
    role: "service" | "resource" | "both";
    city: string;
    memberLevel: "free" | "monthly" | "yearly" | "lifetime";
    status: "active" | "frozen" | "banned";
    createdAt: string;
    captainLevel: "normal" | "advanced" | "gold";
  }>;
  page: number;
  pageSize: number;
  total: number;
}

export interface AdminResourceListResult {
  list: Array<{
    resourceId: number;
    userId: number;
    resourceType: "skill" | "location" | "account" | "time";
    tags: string[];
    tagsZh: string[];
    areaCode?: string;
    priceRange?: { min?: number; max?: number };
    status: "pending" | "active" | "inactive" | "rejected";
    createdAt: string;
    verifiedAt?: string;
    reviewReason?: string;
    reviewEngine?: string;
  }>;
  page: number;
  pageSize: number;
  total: number;
}

export interface AdminAiBriefItem {
  id: string;
  title: string;
  summary?: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  createdAt: string;
}

export interface AdminSoloSignalItem {
  id: string;
  title: string;
  summary?: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  incomeSnippet?: string;
  createdAt: string;
}

function normalizeTagList(value: Prisma.JsonValue): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => normalizeTagList(item))
      .filter((item, index, items) => items.indexOf(item) === index);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (typeof value === "number") {
    return [String(value)];
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap((item) => normalizeTagList(item as Prisma.JsonValue));
  }

  return [];
}

function normalizePriceRange(
  value: Prisma.JsonValue | null
): { min?: number; max?: number } | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, Prisma.JsonValue>;
  const min = Number(record.min);
  const max = Number(record.max);
  const result: { min?: number; max?: number } = {};

  if (Number.isFinite(min)) {
    result.min = min;
  }
  if (Number.isFinite(max)) {
    result.max = max;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

type ActivationStepForLabel = "resource" | "skill" | "goal";

const ACTIVATION_RESOURCE_CODE_LABEL: Record<string, string> = {
  skill: "资源",
  location: "场地/位置",
  account: "账号/流量",
  time: "时间/劳动力"
};

const ACTIVATION_STEP_LABEL: Record<ActivationStepForLabel, string> = {
  resource: "激活资源",
  skill: "激活技能",
  goal: "激活愿望"
};

function buildActivationCodeLabelMap(value: Prisma.JsonValue | null) {
  const result: Record<ActivationStepForLabel, Map<string, string>> = {
    resource: new Map<string, string>(),
    skill: new Map<string, string>(),
    goal: new Map<string, string>()
  };

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return result;
  }

  const payload = value as {
    stepDetails?: {
      resource?: Array<{ code?: unknown; label?: unknown }>;
      skill?: Array<{ code?: unknown; label?: unknown }>;
      goal?: Array<{ code?: unknown; label?: unknown }>;
    };
  };

  const append = (
    stepKey: ActivationStepForLabel,
    items?: Array<{ code?: unknown; label?: unknown }>
  ) => {
    if (!Array.isArray(items)) {
      return;
    }
    for (const item of items) {
      const code = typeof item.code === "string" ? item.code.trim() : "";
      const label = typeof item.label === "string" ? item.label.trim() : "";
      if (code && label) {
        result[stepKey].set(code, label);
      }
    }
  };

  append("resource", payload.stepDetails?.resource);
  append("skill", payload.stepDetails?.skill);
  append("goal", payload.stepDetails?.goal);
  return result;
}

function translateResourceTag(
  tag: string,
  activationLabels: Record<ActivationStepForLabel, Map<string, string>>
): string {
  if (!tag) {
    return tag;
  }

  const prefixMappings: Array<{
    prefix: string;
    step: ActivationStepForLabel;
  }> = [
    { prefix: "activation_resource:", step: "resource" },
    { prefix: "activation_skill:", step: "skill" },
    { prefix: "activation_goal:", step: "goal" }
  ];

  for (const mapping of prefixMappings) {
    if (!tag.startsWith(mapping.prefix)) {
      continue;
    }
    const code = tag.slice(mapping.prefix.length);
    const labelFromActivation = activationLabels[mapping.step].get(code);
    const fallback =
      mapping.step === "resource" ? ACTIVATION_RESOURCE_CODE_LABEL[code] || code : code;
    return `${ACTIVATION_STEP_LABEL[mapping.step]}：${labelFromActivation || fallback}`;
  }

  if (tag.startsWith("activation_custom_module:")) {
    const remain = tag.slice("activation_custom_module:".length);
    const parts = remain.split(":");
    if (parts.length >= 2) {
      const stepKey = parts[0] as ActivationStepForLabel;
      const moduleName = parts.slice(1).join(":");
      if (stepKey in ACTIVATION_STEP_LABEL) {
        return `自定义模块（${ACTIVATION_STEP_LABEL[stepKey]}）：${moduleName}`;
      }
    }
    return `自定义模块：${remain}`;
  }

  const semanticPrefixMap: Record<string, string> = {
    skill: "技能",
    region: "地区",
    core_skill: "核心资源",
    core_location: "核心场地",
    core_account: "核心账号",
    core_time: "核心时间"
  };

  const splitIndex = tag.indexOf(":");
  if (splitIndex > 0) {
    const prefix = tag.slice(0, splitIndex);
    const rawValue = tag.slice(splitIndex + 1);
    const zhPrefix = semanticPrefixMap[prefix];
    if (zhPrefix) {
      return `${zhPrefix}：${rawValue}`;
    }
  }

  return tag;
}

function normalizeOptionalText(value?: string): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidDictStatus(value: string): value is DictStatus {
  return value === "normal" || value === "disabled";
}

import { ResourceService } from "../resource/resource.service";
import { TaskService } from "../task/task.service";
import { ComplianceService } from "../compliance/compliance.service";
import { CampusUnlockService } from "../campus-unlock/campus-unlock.service";

@Injectable()
export class AdminService {
  private get extendedPrisma() {
    return this.prisma as unknown as ExtendedPrisma;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly resourceService: ResourceService,
    private readonly taskService: TaskService,
    private readonly complianceService: ComplianceService,
    private readonly campusUnlockService: CampusUnlockService
  ) {}

  async users(filters: QueryUsersDto): Promise<AdminUserListResult> {
    const { status, role } = filters;
    const page = this.normalizePositiveInt(filters.page, 1);
    const pageSize = Math.min(this.normalizePositiveInt(filters.pageSize, 20), 100);
    const skip = (page - 1) * pageSize;
    const where: Prisma.UserWhereInput = {};

    if (status) {
      where.status = status as never;
    }
    if (role) {
      where.role = role as never;
    }

    const [total, list] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: {
          userId: true,
          maskedPhone: true,
          role: true,
          city: true,
          memberLevel: true,
          status: true,
          createdAt: true,
          captainLevel: true
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize
      })
    ]);

    return {
      list: list.map((user) => ({
        userId: Number(user.userId),
        phoneMasked: user.maskedPhone || "hidden",
        role: user.role,
        city: user.city || "Unknown",
        memberLevel: user.memberLevel,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        captainLevel: user.captainLevel
      })),
      page,
      pageSize,
      total
    };
  }

  async updateUserStatus(id: number, status: AdminUserStatus) {
    const current = await this.prisma.user.findUnique({
      where: { userId: BigInt(id) },
      select: {
        userId: true,
        status: true
      }
    });

    if (!current) {
      throw new NotFoundException(`user ${id} not found`);
    }

    const shouldUnban =
      status === "active" && (current.status === "banned" || current.status === "frozen");

    const updated = shouldUnban
      ? await this.prisma.$transaction(async (tx) => {
          const updatedUser = await tx.user.update({
            where: { userId: BigInt(id) },
            data: {
              status: status as never
            }
          });

          await tx.$executeRaw`
            UPDATE users
            SET speak_muted_until = NULL
            WHERE user_id = ${updatedUser.userId}
          `;

          await this.complianceService.recordUnban(updatedUser.userId, "admin_status_active", tx);

          return updatedUser;
        })
      : await this.prisma.user.update({
          where: { userId: BigInt(id) },
          data: {
            status: status as never
          }
        });

    return {
      userId: Number(updated.userId),
      status: updated.status
    };
  }

  async brushOrderPenalties(
    query: QueryBrushOrderPenaltiesDto
  ): Promise<BrushOrderPenaltyListResult> {
    const page = this.normalizePositiveInt(query.page, 1);
    const pageSize = Math.min(this.normalizePositiveInt(query.pageSize, 20), 100);
    const userId = this.normalizeBigIntId(query.userId);
    const status = this.normalizePenaltyStatus(query.status);
    const offset = (page - 1) * pageSize;

    const whereParts: Prisma.Sql[] = [];
    if (status) {
      whereParts.push(Prisma.sql`p.status = ${status}`);
    }
    if (userId !== null) {
      whereParts.push(Prisma.sql`p.user_id = ${userId}`);
    }
    const whereSql =
      whereParts.length > 0 ? Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}` : Prisma.sql``;

    const totalRows = await this.prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
      SELECT COUNT(1) AS total
      FROM brush_order_penalties p
      ${whereSql}
    `);
    const total = Number(totalRows[0]?.total ?? 0);

    const rows = await this.prisma.$queryRaw<
      Array<{
        penaltyId: bigint | number;
        userId: bigint | number;
        inviteRecordId: bigint | number;
        triggerReasons: Prisma.JsonValue | string | null;
        beforeCaptainLevel: PrismaCaptainLevel;
        status: BrushOrderPenaltyStatus;
        reviewedBy: bigint | number | null;
        reviewNote: string | null;
        appliedAt: Date;
        reviewedAt: Date | null;
        rolledBackAt: Date | null;
        affectedCommissionCount: bigint | number;
      }>
    >(Prisma.sql`
      SELECT
        p.penalty_id AS penaltyId,
        p.user_id AS userId,
        p.invite_record_id AS inviteRecordId,
        p.trigger_reasons AS triggerReasons,
        p.before_captain_level AS beforeCaptainLevel,
        p.status AS status,
        p.reviewed_by AS reviewedBy,
        p.review_note AS reviewNote,
        p.applied_at AS appliedAt,
        p.reviewed_at AS reviewedAt,
        p.rolled_back_at AS rolledBackAt,
        COUNT(s.id) AS affectedCommissionCount
      FROM brush_order_penalties p
      LEFT JOIN brush_order_penalty_commissions s
        ON s.penalty_id = p.penalty_id
      ${whereSql}
      GROUP BY
        p.penalty_id,
        p.user_id,
        p.invite_record_id,
        p.trigger_reasons,
        p.before_captain_level,
        p.status,
        p.reviewed_by,
        p.review_note,
        p.applied_at,
        p.reviewed_at,
        p.rolled_back_at
      ORDER BY p.penalty_id DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `);

    return {
      list: rows.map((row) => this.toBrushOrderPenaltyItem(row)),
      page,
      pageSize,
      total
    };
  }

  async reviewBrushOrderPenalty(
    penaltyId: number,
    payload: ReviewBrushOrderPenaltyDto,
    reviewerId: number
  ): Promise<BrushOrderPenaltyItem> {
    if (!Number.isInteger(penaltyId) || penaltyId <= 0) {
      throw new BadRequestException("penaltyId is invalid");
    }
    if (!Number.isInteger(reviewerId) || reviewerId <= 0) {
      throw new BadRequestException("reviewerId is invalid");
    }
    if (payload.decision !== "confirm" && payload.decision !== "rollback") {
      throw new BadRequestException("decision is invalid");
    }

    const normalizedNote = normalizeOptionalText(payload.note)?.slice(0, 255) ?? null;
    const reviewer = BigInt(reviewerId);
    const targetId = BigInt(penaltyId);

    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          penaltyId: bigint | number;
          userId: bigint | number;
          beforeCaptainLevel: PrismaCaptainLevel;
          status: BrushOrderPenaltyStatus;
        }>
      >`
        SELECT
          penalty_id AS penaltyId,
          user_id AS userId,
          before_captain_level AS beforeCaptainLevel,
          status
        FROM brush_order_penalties
        WHERE penalty_id = ${targetId}
        LIMIT 1
        FOR UPDATE
      `;
      const target = rows[0];
      if (!target) {
        throw new NotFoundException(`鏈壘鍒板缃氬崟 ${penaltyId}`);
      }

      if (payload.decision === "confirm") {
        if (target.status !== "applied") {
          throw new BadRequestException("浠?applied 鐘舵€佸彲鎵ц纭");
        }

        await tx.$executeRaw`
          UPDATE brush_order_penalties
          SET
            status = ${"confirmed"},
            reviewed_by = ${reviewer},
            review_note = ${normalizedNote},
            reviewed_at = NOW()
          WHERE penalty_id = ${targetId}
        `;

        await tx.$executeRaw`
          INSERT INTO risk_control_events (user_id, event_type, action, detail, created_at)
          VALUES
          (
            ${BigInt(target.userId)},
            ${"brush_order_disposal"},
            ${"review"},
            ${JSON.stringify({
              penaltyId,
              decision: "confirm",
              reviewerId,
              note: normalizedNote
            })},
            NOW()
          )
        `;
      } else {
        if (target.status === "rolled_back") {
          throw new ConflictException("璇ュ缃氬崟宸插洖婊氾紝绂佹閲嶅鍥炴粴");
        }

        const snapshotRows = await tx.$queryRaw<
          Array<{
            commissionId: bigint | number;
            beforeStatus: string;
            beforeAmount: string | number;
          }>
        >`
          SELECT
            commission_id AS commissionId,
            before_status AS beforeStatus,
            before_amount AS beforeAmount
          FROM brush_order_penalty_commissions
          WHERE penalty_id = ${targetId}
          FOR UPDATE
        `;

        // 鍥炴粴鏃跺厛鎭㈠璧勬牸锛屽啀鎸夊揩鐓ч€愭潯鎭㈠浣ｉ噾鐘舵€佷笌閲戦銆?
        await tx.user.updateMany({
          where: { userId: BigInt(target.userId) },
          data: { captainLevel: target.beforeCaptainLevel as never }
        });

        for (const row of snapshotRows) {
          await tx.$executeRaw`
            UPDATE captain_commissions
            SET
              status = ${row.beforeStatus},
              commission_amount = ${row.beforeAmount}
            WHERE commission_id = ${BigInt(row.commissionId)}
          `;
        }

        await tx.$executeRaw`
          UPDATE brush_order_penalties
          SET
            status = ${"rolled_back"},
            reviewed_by = ${reviewer},
            review_note = ${normalizedNote},
            reviewed_at = NOW(),
            rolled_back_at = NOW()
          WHERE penalty_id = ${targetId}
        `;

        await tx.$executeRaw`
          INSERT INTO risk_control_events (user_id, event_type, action, detail, created_at)
          VALUES
          (
            ${BigInt(target.userId)},
            ${"brush_order_disposal"},
            ${"review"},
            ${JSON.stringify({
              penaltyId,
              decision: "rollback",
              reviewerId,
              note: normalizedNote,
              restoredCommissionCount: snapshotRows.length
            })},
            NOW()
          )
        `;
      }

      const detailRows = await tx.$queryRaw<
        Array<{
          penaltyId: bigint | number;
          userId: bigint | number;
          inviteRecordId: bigint | number;
          triggerReasons: Prisma.JsonValue | string | null;
          beforeCaptainLevel: PrismaCaptainLevel;
          status: BrushOrderPenaltyStatus;
          reviewedBy: bigint | number | null;
          reviewNote: string | null;
          appliedAt: Date;
          reviewedAt: Date | null;
          rolledBackAt: Date | null;
          affectedCommissionCount: bigint | number;
        }>
      >`
        SELECT
          p.penalty_id AS penaltyId,
          p.user_id AS userId,
          p.invite_record_id AS inviteRecordId,
          p.trigger_reasons AS triggerReasons,
          p.before_captain_level AS beforeCaptainLevel,
          p.status AS status,
          p.reviewed_by AS reviewedBy,
          p.review_note AS reviewNote,
          p.applied_at AS appliedAt,
          p.reviewed_at AS reviewedAt,
          p.rolled_back_at AS rolledBackAt,
          COUNT(s.id) AS affectedCommissionCount
        FROM brush_order_penalties p
        LEFT JOIN brush_order_penalty_commissions s
          ON s.penalty_id = p.penalty_id
        WHERE p.penalty_id = ${targetId}
        GROUP BY
          p.penalty_id,
          p.user_id,
          p.invite_record_id,
          p.trigger_reasons,
          p.before_captain_level,
          p.status,
          p.reviewed_by,
          p.review_note,
          p.applied_at,
          p.reviewed_at,
          p.rolled_back_at
      `;

      return this.toBrushOrderPenaltyItem(detailRows[0]);
    });
  }

  async resources(filters: QueryResourcesDto): Promise<AdminResourceListResult> {
    const { status } = filters;
    const page = this.normalizePositiveInt(filters.page, 1);
    const pageSize = Math.min(this.normalizePositiveInt(filters.pageSize, 20), 100);
    const skip = (page - 1) * pageSize;
    const where: Prisma.ResourceWhereInput = {};

    if (status) {
      where.status = status as ResourceStatus;
    }

    const [total, list] = await Promise.all([
      this.prisma.resource.count({ where }),
      this.prisma.resource.findMany({
        where,
        orderBy: { lastUpdate: "desc" },
        skip,
        take: pageSize
      })
    ]);

    return {
      list: list.map((resource) => {
        const tags = normalizeTagList(resource.tags);
        const activationLabels = buildActivationCodeLabelMap(
          (resource as { activationDetails?: Prisma.JsonValue | null }).activationDetails ?? null
        );

        return {
          resourceId: Number(resource.resourceId),
          userId: Number(resource.userId),
          resourceType: resource.resourceType,
          tags,
          tagsZh: tags.map((tag) => translateResourceTag(tag, activationLabels)),
          areaCode: resource.areaCode ?? undefined,
          priceRange: normalizePriceRange(resource.priceRange),
          status: resource.status,
          createdAt: (resource.lastUpdate ?? resource.verifiedAt)?.toISOString() ?? "",
          verifiedAt: resource.verifiedAt?.toISOString(),
          reviewReason:
            (resource as { reviewReason?: string | null }).reviewReason?.trim() || undefined,
          reviewEngine:
            (resource as { reviewEngine?: string | null }).reviewEngine?.trim() || undefined
        };
      }),
      page,
      pageSize,
      total
    };
  }

  async dictTypes(): Promise<AdminDictType[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        dict_id: bigint | number;
        dict_name: string;
        dict_type: string;
        status: DictStatus;
        remark: string | null;
      }>
    >`SELECT dict_id, dict_name, dict_type, status, remark FROM dict_types ORDER BY dict_id ASC`;

    return rows.map((item) => ({
      dictId: Number(item.dict_id),
      dictName: item.dict_name,
      dictType: item.dict_type,
      status: item.status,
      remark: item.remark ?? undefined
    }));
  }

  private async getDictTypeById(dictId: number): Promise<AdminDictType | null> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        dict_id: bigint | number;
        dict_name: string;
        dict_type: string;
        status: DictStatus;
        remark: string | null;
      }>
    >`
      SELECT dict_id, dict_name, dict_type, status, remark
      FROM dict_types
      WHERE dict_id = ${dictId}
      LIMIT 1
    `;

    const item = rows[0];
    if (!item) {
      return null;
    }

    return {
      dictId: Number(item.dict_id),
      dictName: item.dict_name,
      dictType: item.dict_type,
      status: item.status,
      remark: item.remark ?? undefined
    };
  }

  async createDictType(payload: CreateDictTypeDto): Promise<AdminDictType> {
    const dictName = payload.dictName?.trim();
    const dictType = payload.dictType?.trim();
    const status = payload.status;

    if (!dictName || !dictType) {
      throw new BadRequestException("dictName/dictType 涓嶈兘涓虹┖");
    }
    if (!isValidDictStatus(status)) {
      throw new BadRequestException("status 浠呮敮鎸?normal/disabled");
    }

    const exists = await this.prisma.$queryRaw<Array<{ dict_id: bigint | number }>>`
      SELECT dict_id
      FROM dict_types
      WHERE dict_type = ${dictType}
      LIMIT 1
    `;
    if (exists.length > 0) {
      throw new BadRequestException(`Dict type ${dictType} already exists`);
    }

    await this.prisma.$executeRaw`
      INSERT INTO dict_types
      (dict_name, dict_type, status, remark, created_at, updated_at)
      VALUES
      (${dictName}, ${dictType}, ${status}, ${normalizeOptionalText(payload.remark)}, NOW(), NOW())
    `;

    const insertResult = await this.prisma.$queryRaw<Array<{ lastInsertId: number | bigint }>>`
      SELECT LAST_INSERT_ID() AS lastInsertId
    `;
    const createdId = Number(insertResult[0]?.lastInsertId ?? 0);
    const created = await this.getDictTypeById(createdId);

    if (!created) {
      throw new NotFoundException("failed to read dict type after creation");
    }

    return created;
  }

  async updateDictType(dictId: number, payload: UpdateDictTypeDto): Promise<AdminDictType> {
    const dictName = payload.dictName?.trim();
    const dictType = payload.dictType?.trim();
    const status = payload.status;

    if (!Number.isInteger(dictId) || dictId <= 0) {
      throw new BadRequestException("dictId is invalid");
    }
    if (!dictName || !dictType) {
      throw new BadRequestException("dictName/dictType 涓嶈兘涓虹┖");
    }
    if (!isValidDictStatus(status)) {
      throw new BadRequestException("status 浠呮敮鎸?normal/disabled");
    }

    const current = await this.getDictTypeById(dictId);
    if (!current) {
      throw new NotFoundException(`Dict type dict_id=${dictId} not found`);
    }

    const duplicated = await this.prisma.$queryRaw<Array<{ dict_id: bigint | number }>>`
      SELECT dict_id
      FROM dict_types
      WHERE dict_type = ${dictType}
        AND dict_id <> ${dictId}
      LIMIT 1
    `;
    if (duplicated.length > 0) {
      throw new BadRequestException(`Dict type ${dictType} already exists`);
    }

    await this.prisma.$transaction(async (tx) => {
      const affected = await tx.$executeRaw`
        UPDATE dict_types
        SET
          dict_name = ${dictName},
          dict_type = ${dictType},
          status = ${status},
          remark = ${normalizeOptionalText(payload.remark)},
          updated_at = NOW()
        WHERE dict_id = ${dictId}
      `;
      if (Number(affected) < 1) {
        throw new NotFoundException(`Dict type dict_id=${dictId} not found`);
      }

      if (current.dictType !== dictType) {
        await tx.$executeRaw`
          UPDATE dict_data
          SET dict_type = ${dictType}, updated_at = NOW()
          WHERE dict_type = ${current.dictType}
        `;
      }
    });

    const updated = await this.getDictTypeById(dictId);
    if (!updated) {
      throw new NotFoundException(`Dict type dict_id=${dictId} not found after update`);
    }

    return updated;
  }

  async deleteDictType(dictId: number): Promise<{ dictId: number }> {
    if (!Number.isInteger(dictId) || dictId <= 0) {
      throw new BadRequestException("dictId is invalid");
    }

    const target = await this.getDictTypeById(dictId);
    if (!target) {
      throw new NotFoundException(`Dict type dict_id=${dictId} not found`);
    }

    const dataCountRows = await this.prisma.$queryRaw<Array<{ total: bigint | number }>>`
      SELECT COUNT(1) AS total
      FROM dict_data
      WHERE dict_type = ${target.dictType}
    `;
    const dataCount = Number(dataCountRows[0]?.total ?? 0);
    if (dataCount > 0) {
      throw new BadRequestException("璇ュ瓧鍏哥被鍨嬩笅瀛樺湪瀛楀吀椤癸紝涓嶈兘鍒犻櫎");
    }

    const affected = await this.prisma.$executeRaw`
      DELETE FROM dict_types
      WHERE dict_id = ${dictId}
    `;

    if (Number(affected) < 1) {
      throw new NotFoundException(`Dict type dict_id=${dictId} not found`);
    }

    return { dictId };
  }

  async dictData(dictType?: string): Promise<AdminDictData[]> {
    if (!dictType) {
      return [];
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        dict_data_id: bigint | number;
        dict_code: string;
        dict_label: string;
        dict_value: string;
        dict_sort: number | bigint;
        status: DictStatus;
        remark: string | null;
      }>
    >`
      SELECT dict_data_id, dict_code, dict_label, dict_value, dict_sort, status, remark
      FROM dict_data
      WHERE dict_type = ${dictType}
      ORDER BY dict_sort ASC
    `;

    return rows.map((item) => ({
      dictDataId: Number(item.dict_data_id),
      dictCode: item.dict_code,
      dictLabel: item.dict_label,
      dictValue: item.dict_value,
      dictSort: Number(item.dict_sort),
      status: item.status,
      remark: item.remark ?? undefined
    }));
  }

  private async getDictDataById(dictDataId: number): Promise<AdminDictData | null> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        dict_data_id: bigint | number;
        dict_code: string;
        dict_label: string;
        dict_value: string;
        dict_sort: number | bigint;
        status: DictStatus;
        remark: string | null;
      }>
    >`
      SELECT dict_data_id, dict_code, dict_label, dict_value, dict_sort, status, remark
      FROM dict_data
      WHERE dict_data_id = ${dictDataId}
      LIMIT 1
    `;

    const item = rows[0];
    if (!item) {
      return null;
    }

    return {
      dictDataId: Number(item.dict_data_id),
      dictCode: item.dict_code,
      dictLabel: item.dict_label,
      dictValue: item.dict_value,
      dictSort: Number(item.dict_sort),
      status: item.status,
      remark: item.remark ?? undefined
    };
  }

  async createDictData(payload: CreateDictDataDto): Promise<AdminDictData> {
    const dictType = payload.dictType?.trim();
    const dictCode = payload.dictCode?.trim();
    const dictLabel = payload.dictLabel?.trim();
    const dictValue = payload.dictValue?.trim();
    const status = payload.status;
    const dictSort = Number(payload.dictSort);

    if (!dictType || !dictCode || !dictLabel || !dictValue) {
      throw new BadRequestException("dictType/dictCode/dictLabel/dictValue 涓嶈兘涓虹┖");
    }
    if (!isValidDictStatus(status)) {
      throw new BadRequestException("status 浠呮敮鎸?normal/disabled");
    }
    if (!Number.isFinite(dictSort)) {
      throw new BadRequestException("dictSort must be a number");
    }

    await this.prisma.$executeRaw`
      INSERT INTO dict_data
      (dict_type, dict_code, dict_label, dict_value, dict_sort, status, remark, created_at, updated_at)
      VALUES
      (${dictType}, ${dictCode}, ${dictLabel}, ${dictValue}, ${dictSort}, ${status}, ${normalizeOptionalText(payload.remark)}, NOW(), NOW())
    `;

    const insertResult = await this.prisma.$queryRaw<Array<{ lastInsertId: number | bigint }>>`
      SELECT LAST_INSERT_ID() AS lastInsertId
    `;
    const createdId = Number(insertResult[0]?.lastInsertId ?? 0);
    const created = await this.getDictDataById(createdId);

    if (!created) {
      throw new NotFoundException("瀛楀吀椤瑰垱寤哄悗璇诲彇澶辫触");
    }

    return created;
  }

  async updateDictData(dictDataId: number, payload: UpdateDictDataDto): Promise<AdminDictData> {
    const dictCode = payload.dictCode?.trim();
    const dictLabel = payload.dictLabel?.trim();
    const dictValue = payload.dictValue?.trim();
    const status = payload.status;
    const dictSort = Number(payload.dictSort);

    if (!Number.isInteger(dictDataId) || dictDataId <= 0) {
      throw new BadRequestException("dictDataId is invalid");
    }
    if (!dictCode || !dictLabel || !dictValue) {
      throw new BadRequestException("dictCode/dictLabel/dictValue 涓嶈兘涓虹┖");
    }
    if (!isValidDictStatus(status)) {
      throw new BadRequestException("status 浠呮敮鎸?normal/disabled");
    }
    if (!Number.isFinite(dictSort)) {
      throw new BadRequestException("dictSort must be a number");
    }

    const affected = await this.prisma.$executeRaw`
      UPDATE dict_data
      SET
        dict_code = ${dictCode},
        dict_label = ${dictLabel},
        dict_value = ${dictValue},
        dict_sort = ${dictSort},
        status = ${status},
        remark = ${normalizeOptionalText(payload.remark)},
        updated_at = NOW()
      WHERE dict_data_id = ${dictDataId}
    `;

    if (Number(affected) < 1) {
      throw new NotFoundException(`鏈壘鍒?dict_data_id=${dictDataId} 鐨勫瓧鍏搁」`);
    }

    const updated = await this.getDictDataById(dictDataId);
    if (!updated) {
      throw new NotFoundException(`鏇存柊鍚庢湭鎵惧埌 dict_data_id=${dictDataId} 鐨勫瓧鍏搁」`);
    }

    return updated;
  }

  async deleteDictData(dictDataId: number): Promise<{ dictDataId: number }> {
    if (!Number.isInteger(dictDataId) || dictDataId <= 0) {
      throw new BadRequestException("dictDataId is invalid");
    }

    const affected = await this.prisma.$executeRaw`
      DELETE FROM dict_data
      WHERE dict_data_id = ${dictDataId}
    `;

    if (Number(affected) < 1) {
      throw new NotFoundException(`鏈壘鍒?dict_data_id=${dictDataId} 鐨勫瓧鍏搁」`);
    }

    return { dictDataId };
  }

  async reviewResource(id: number, decision: "approve" | "reject", reason?: string) {
    if (decision === "approve") {
      const updated = await this.resourceService.approveResource(BigInt(id), "manual:admin");
      return {
        resourceId: Number(updated.resourceId),
        status: updated.status,
        note: "已人工审核通过"
      };
    }

    const updated = await this.resourceService.rejectResource(
      BigInt(id),
      reason?.trim() || "人工审核未通过",
      "manual:admin"
    );

    return {
      resourceId: Number(updated.resourceId),
      status: updated.status,
      note: updated.reviewReason || reason
    };
  }

  async matches() {
    const list = await this.prisma.match.findMany({
      orderBy: { matchId: "desc" },
      take: 50
    });

    return list.map((item) => ({
      matchId: Number(item.matchId),
      needId: Number(item.needId),
      resourceId: Number(item.resourceId),
      score: Number(item.matchScore),
      status: item.status,
      pushTime: item.pushTime?.toISOString(),
      feedback: item.feedback ?? undefined
    }));
  }

  async stats() {
    const [totalUsers, totalResources, totalMatches, activeCaptains, announcementCount] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.resource.count(),
        this.prisma.match.count(),
        this.prisma.user.count({ where: { role: { in: ["service", "both"] } } }),
        this.extendedPrisma.announcement.count()
      ]);

    return {
      totalUsers,
      activeUsers: Math.floor(totalUsers * 0.85),
      totalResources,
      pendingResources: Math.floor(totalResources * 0.1),
      activeCaptains,
      matchRate: totalResources > 0 ? Math.floor((totalMatches / totalResources) * 100) : 0,
      announcementCount
    };
  }

  async announce(title: string, type: string, content: string, publisher: string) {
    const safeTitle = title.trim() || "绯荤粺鍏憡";
    const safeType = type.trim() || "notice";
    const created = await this.extendedPrisma.announcement.create({
      data: {
        content,
        publisher: publisher || "admin"
      }
    });

    return {
      id: created.noticeId.toString(),
      title: safeTitle,
      type: safeType,
      content: created.content,
      publishedBy: created.publisher,
      publishedAt: created.createdAt.toISOString()
    };
  }

  async announcements() {
    const list = await this.extendedPrisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      take: 20
    });

    const campusAlertMarker = "[campus_data_update_alert]";

    return list.map((item) => {
      const isCampusStaleAlert = item.content.includes(campusAlertMarker);
      const normalizedContent = isCampusStaleAlert
        ? item.content.replace(campusAlertMarker, "").trim()
        : item.content;

      return {
        id: item.noticeId.toString(),
        title: isCampusStaleAlert
          ? "校招信息更新提醒"
          : normalizedContent.slice(0, 20) || "系统公告",
        type: isCampusStaleAlert ? "warning" : "notice",
        content: normalizedContent,
        publishedBy: item.publisher,
        publishedAt: item.createdAt.toISOString()
      };
    });
  }

  async aiBriefs(query: QueryAiBriefsDto): Promise<AdminAiBriefItem[]> {
    const limit = Math.min(this.normalizePositiveInt(query.limit, 50), 200);
    const list = await this.prisma.aiBrief.findMany({
      orderBy: [{ publishedAt: "desc" }, { aiBriefId: "desc" }],
      take: limit
    });

    return list.map((item) => ({
      id: item.aiBriefId.toString(),
      title: item.title,
      summary: item.summary ?? undefined,
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
      publishedAt: item.publishedAt.toISOString(),
      createdAt: item.createdAt.toISOString()
    }));
  }

  async createAiBrief(payload: CreateAiBriefDto): Promise<AdminAiBriefItem> {
    const title = payload.title?.trim();
    const sourceName = payload.sourceName?.trim();
    const sourceUrl = payload.sourceUrl?.trim();
    const summary = normalizeOptionalText(payload.summary)?.slice(0, 2000) ?? null;

    if (!title || !sourceName || !sourceUrl) {
      throw new BadRequestException("title/sourceName/sourceUrl 不能为空");
    }

    if (!this.isValidHttpUrl(sourceUrl)) {
      throw new BadRequestException("sourceUrl 必须是有效的 http(s) 链接");
    }

    const publishedAt = payload.publishedAt ? new Date(payload.publishedAt) : new Date();
    if (Number.isNaN(publishedAt.getTime())) {
      throw new BadRequestException("publishedAt 格式不合法");
    }

    const externalId = this.buildAiBriefExternalId(sourceName, sourceUrl, title);
    const saved = await this.prisma.aiBrief.upsert({
      where: { externalId },
      create: {
        externalId,
        sourceName,
        title,
        summary,
        sourceUrl,
        publishedAt
      },
      update: {
        sourceName,
        title,
        summary,
        sourceUrl,
        publishedAt
      }
    });

    return {
      id: saved.aiBriefId.toString(),
      title: saved.title,
      summary: saved.summary ?? undefined,
      sourceName: saved.sourceName,
      sourceUrl: saved.sourceUrl,
      publishedAt: saved.publishedAt.toISOString(),
      createdAt: saved.createdAt.toISOString()
    };
  }

  async soloSignals(query: QuerySoloSignalsDto): Promise<AdminSoloSignalItem[]> {
    const limit = Math.min(this.normalizePositiveInt(query.limit, 50), 200);
    const list = await this.prisma.soloSignal.findMany({
      orderBy: [{ publishedAt: "desc" }, { soloSignalId: "desc" }],
      take: limit
    });

    return list.map((item) => ({
      id: item.soloSignalId.toString(),
      title: item.title,
      summary: item.summary ?? undefined,
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
      publishedAt: item.publishedAt.toISOString(),
      incomeSnippet: item.incomeSnippet ?? undefined,
      createdAt: item.createdAt.toISOString()
    }));
  }

  async createSoloSignal(payload: CreateSoloSignalDto): Promise<AdminSoloSignalItem> {
    const title = payload.title?.trim();
    const sourceName = payload.sourceName?.trim();
    const sourceUrl = payload.sourceUrl?.trim();
    const summary = normalizeOptionalText(payload.summary)?.slice(0, 2000) ?? null;
    const incomeSnippet = normalizeOptionalText(payload.incomeSnippet)?.slice(0, 500) ?? null;

    if (!title || !sourceName || !sourceUrl) {
      throw new BadRequestException("title/sourceName/sourceUrl 不能为空");
    }

    if (!this.isValidHttpUrl(sourceUrl)) {
      throw new BadRequestException("sourceUrl 必须是有效的 http(s) 链接");
    }

    const publishedAt = payload.publishedAt ? new Date(payload.publishedAt) : new Date();
    if (Number.isNaN(publishedAt.getTime())) {
      throw new BadRequestException("publishedAt 格式不合法");
    }

    const externalId = this.buildSoloSignalExternalId(sourceName, sourceUrl, title);
    const saved = await this.prisma.soloSignal.upsert({
      where: { externalId },
      create: {
        externalId,
        sourceName,
        title,
        summary,
        sourceUrl,
        publishedAt,
        incomeSnippet
      },
      update: {
        sourceName,
        title,
        summary,
        sourceUrl,
        publishedAt,
        incomeSnippet
      }
    });

    return {
      id: saved.soloSignalId.toString(),
      title: saved.title,
      summary: saved.summary ?? undefined,
      sourceName: saved.sourceName,
      sourceUrl: saved.sourceUrl,
      publishedAt: saved.publishedAt.toISOString(),
      incomeSnippet: saved.incomeSnippet ?? undefined,
      createdAt: saved.createdAt.toISOString()
    };
  }
  async grantCampusUnlock(payload: GrantCampusUnlockDto) {
    const userId = Number(payload.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException("userId 不合法");
    }

    return this.campusUnlockService.grantUnlock(BigInt(userId), payload.note);
  }

  async deleteAnnouncement(id: string) {
    const noticeId = BigInt(id);
    await this.extendedPrisma.announcement.delete({
      where: { noticeId }
    });
    return { id };
  }

  async captainRanking() {
    const ranking = await this.prisma.inviteRecord.groupBy({
      by: ["inviterId"],
      _count: {
        recordId: true
      },
      orderBy: {
        _count: {
          recordId: "desc"
        }
      },
      take: 10
    });

    const inviterIds = ranking.map((item) => item.inviterId);
    const users = await this.prisma.user.findMany({
      where: { userId: { in: inviterIds } },
      select: {
        userId: true,
        captainLevel: true
      }
    });
    const userMap = new Map(users.map((item) => [item.userId.toString(), item]));

    return ranking.map((item) => {
      const user = userMap.get(item.inviterId.toString());
      const level = user?.captainLevel || "normal";
      const commissionRate = level === "gold" ? 0.15 : level === "advanced" ? 0.1 : 0.05;

      return {
        captainId: Number(item.inviterId),
        name: `Captain ${item.inviterId.toString().slice(-4)}`,
        level,
        score: item._count.recordId * 100,
        monthInvites: item._count.recordId,
        commissionRate
      };
    });
  }

  async updateCaptainLevel(id: number, level: CaptainLevel) {
    const updated = await this.prisma.user.update({
      where: { userId: BigInt(id) },
      data: { captainLevel: level } as Prisma.UserUpdateInput
    });

    return {
      captainId: Number(updated.userId),
      level: updated.captainLevel
    };
  }

  async tasks() {
    const list = await this.prisma.bountyTask.findMany({
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return list.map((item) => ({
      taskId: Number(item.taskId),
      title: item.title,
      points: Number(item.points),
      status: item.status,
      difficulty: item.difficulty
    }));
  }

  async createTask(payload: CreateBountyTaskDto) {
    const task = await this.prisma.bountyTask.create({
      data: {
        title: payload.title,
        content: payload.content,
        points: payload.points,
        difficulty: (payload.difficulty as "EASY" | "MEDIUM" | "HARD" | "EXPERT") || "MEDIUM",
        status: "PUBLISHED"
      }
    });
    return {
      taskId: Number(task.taskId),
      title: task.title,
      status: task.status
    };
  }

  async submissions() {
    const list = await this.prisma.taskSubmission.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return list.map((item) => ({
      submissionId: Number(item.submissionId),
      userId: Number(item.userId),
      taskId: Number(item.taskId),
      proof: item.proof || "",
      status: item.status,
      createdAt: item.createdAt.toISOString()
    }));
  }

  async reviewSubmission(submissionId: number, decision: "approve" | "reject") {
    if (!Number.isInteger(submissionId) || submissionId <= 0) {
      throw new BadRequestException("submissionId invalid");
    }
    if (decision !== "approve" && decision !== "reject") {
      throw new BadRequestException("decision invalid");
    }

    const target = await this.prisma.taskSubmission.findUnique({
      where: { submissionId: BigInt(submissionId) }
    });
    if (!target || target.status !== SubmissionStatus.PENDING) {
      throw new BadRequestException("submission not found or status invalid");
    }

    if (decision === "approve") {
      await this.taskService.approveSubmission(BigInt(submissionId));
      return {
        submissionId,
        status: SubmissionStatus.APPROVED
      };
    }

    const updated = await this.prisma.taskSubmission.update({
      where: { submissionId: BigInt(submissionId) },
      data: { status: SubmissionStatus.REJECTED }
    });
    return {
      submissionId: Number(updated.submissionId),
      status: updated.status
    };
  }

  private toBrushOrderPenaltyItem(row: {
    penaltyId: bigint | number;
    userId: bigint | number;
    inviteRecordId: bigint | number;
    triggerReasons: Prisma.JsonValue | string | null;
    beforeCaptainLevel: PrismaCaptainLevel;
    status: BrushOrderPenaltyStatus;
    reviewedBy: bigint | number | null;
    reviewNote: string | null;
    appliedAt: Date;
    reviewedAt: Date | null;
    rolledBackAt: Date | null;
    affectedCommissionCount: bigint | number;
  }): BrushOrderPenaltyItem {
    return {
      penaltyId: Number(row.penaltyId),
      userId: Number(row.userId),
      inviteRecordId: Number(row.inviteRecordId),
      triggerReasons: this.normalizeStringArray(row.triggerReasons),
      beforeCaptainLevel: row.beforeCaptainLevel,
      status: row.status,
      reviewedBy: row.reviewedBy === null ? undefined : Number(row.reviewedBy),
      reviewNote: row.reviewNote ?? undefined,
      appliedAt: row.appliedAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString(),
      rolledBackAt: row.rolledBackAt?.toISOString(),
      affectedCommissionCount: Number(row.affectedCommissionCount)
    };
  }

  private normalizeStringArray(value: Prisma.JsonValue | string | null): string[] {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value.map((item) => String(item));
    }

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item));
        }
      } catch {
        return [value];
      }
      return [value];
    }

    if (typeof value === "object") {
      return Object.values(value).map((item) => String(item));
    }

    return [String(value)];
  }

  private buildAiBriefExternalId(sourceName: string, sourceUrl: string, title: string): string {
    return createHash("sha256").update(`manual|${sourceName}|${sourceUrl}|${title}`).digest("hex");
  }

  private buildSoloSignalExternalId(sourceName: string, sourceUrl: string, title: string): string {
    return createHash("sha256").update(`manual|${sourceName}|${sourceUrl}|${title}`).digest("hex");
  }

  private isValidHttpUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  private normalizePositiveInt(value: unknown, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }
    return parsed;
  }

  private normalizeBigIntId(value: unknown): bigint | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException("userId is invalid");
    }
    return BigInt(parsed);
  }

  private normalizePenaltyStatus(value: unknown): BrushOrderPenaltyStatus | undefined {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    if (value === "applied" || value === "confirmed" || value === "rolled_back") {
      return value;
    }
    throw new BadRequestException("status is invalid");
  }
}

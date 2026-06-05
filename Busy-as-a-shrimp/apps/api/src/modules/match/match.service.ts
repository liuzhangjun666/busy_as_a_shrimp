import { BadRequestException, Injectable } from "@nestjs/common";
import { MatchStatus, Prisma, ResourceStatus } from "@prisma/client";
import { decryptPhone } from "../../common/phone-crypto";
import { PrismaService } from "../../common/prisma.service";
import { MessageGateway } from "../message/message.gateway";
import { MatchListQueryDto, RunMatchDto, RunResourcePoolMatchDto } from "./dto/match.dto";

type PriceRange = { min: number; max: number };

type NeedProfile = {
  needId: number;
  locationTags: string[];
  skillTags: string[];
  timeTags: string[];
  priceRange: PriceRange;
  collectedAt: string;
  nextCollectionAt: string;
  nextPushAt: string;
  source: string;
};

type PoolResource = {
  resourceId: bigint;
  userId: bigint;
  resourceType: string;
  resourceTypes: Prisma.JsonValue | null;
  tags: Prisma.JsonValue;
  areaCode: string | null;
  priceRange: Prisma.JsonValue | null;
  activationDetails: Prisma.JsonValue | null;
  lastUpdate: Date | null;
  user: {
    userId: bigint;
    nickname: string | null;
    maskedPhone: string | null;
    phoneEncrypted: string | null;
    city: string | null;
    district: string | null;
  };
};

type PoolProfile = {
  tokens: string[];
  locationTokens: string[];
  typeTokens: string[];
  priceRanges: PriceRange[];
};

type ResourcePoolMatchMetadata = {
  source?: string;
  confirmationStatus?: "pending" | "confirmed" | "invalid";
  targetStatus?: "PENDING" | "CONFIRMED" | "REJECTED";
  rejectedBy?: "self" | "target";
  confirmedAt?: string | null;
  rejectedAt?: string | null;
  pairKey?: string;
  counterpartMatchId?: string | null;
  requester?: {
    userId?: string;
    nickname?: string | null;
    maskedPhone?: string | null;
    phoneEncrypted?: string | null;
    city?: string | null;
    district?: string | null;
    resourceType?: string | null;
    resourceTypes?: string[];
    tags?: string[];
    areaCode?: string | null;
  };
  uploader?: {
    userId?: string;
    nickname?: string | null;
    maskedPhone?: string | null;
    phoneEncrypted?: string | null;
  };
} & Record<string, unknown>;

const SCORE_WEIGHT = {
  location: 0.3,
  skill: 0.35,
  time: 0.2,
  price: 0.15
} as const;

const LOCATION_POOL = ["shanghai", "beijing", "guangzhou", "shenzhen", "hangzhou", "chengdu"];

const SKILL_POOL = [
  "short-video",
  "live-stream",
  "script-writing",
  "editing",
  "mcn-operation",
  "private-domain"
];

const TIME_POOL = ["weekday-day", "weekday-night", "weekend", "long-term"];

const NEED_COLLECTION_INTERVAL_HOURS = 6;
const RESOURCE_POOL_MATCH_TITLE_PREFIX = "资源池匹配：";
const RESOURCE_POOL_MATCH_THRESHOLD = 20;

@Injectable()
export class MatchService {
  private readonly needProfileCache = new Map<number, NeedProfile>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageGateway: MessageGateway
  ) {}

  async run(userId: bigint, payload: RunMatchDto) {
    const resources = await this.prisma.resource.findMany({
      where: {
        userId,
        status: ResourceStatus.active
      },
      select: {
        resourceId: true,
        areaCode: true,
        tags: true,
        priceRange: true
      }
    });

    const taskId = `match-${Date.now()}`;
    if (resources.length === 0) {
      return {
        taskId,
        needId: payload.needId,
        status: "queued",
        matchedCount: 0,
        reason: "no active resource found"
      };
    }

    const profile = this.resolveNeedProfile(payload);
    const resourceIds = resources.map((resource) => resource.resourceId);

    const doneCounts = await this.prisma.match.groupBy({
      by: ["resourceId"],
      where: {
        resourceId: { in: resourceIds },
        status: MatchStatus.done
      },
      _count: { matchId: true }
    });
    const doneCountMap = new Map(
      doneCounts.map((item) => [item.resourceId.toString(), item._count.matchId])
    );

    const scored = resources
      .map((resource) => {
        const tags = this.normalizeTags(resource.tags);
        const locationTags = this.extractLocationTags(resource.areaCode, tags);
        const timeTags = this.extractTimeTags(tags);
        const skillTags = this.extractSkillTags(tags);
        const priceRange = this.parsePriceRange(resource.priceRange);

        const locationScore =
          profile.locationTags.length === 0
            ? 70
            : this.calcOverlapScore(profile.locationTags, locationTags);
        const skillScore =
          profile.skillTags.length === 0 ? 70 : this.calcOverlapScore(profile.skillTags, skillTags);
        const timeScore =
          profile.timeTags.length === 0 ? 70 : this.calcOverlapScore(profile.timeTags, timeTags);
        const priceScore = this.calcPriceScore(profile.priceRange, priceRange);

        const baseScore =
          locationScore * SCORE_WEIGHT.location +
          skillScore * SCORE_WEIGHT.skill +
          timeScore * SCORE_WEIGHT.time +
          priceScore * SCORE_WEIGHT.price;

        const doneCount = doneCountMap.get(resource.resourceId.toString()) ?? 0;
        const qualityBonus = Math.min(12, doneCount * 1.5);
        const finalScore = this.toTwoDecimals(Math.min(100, baseScore + qualityBonus));

        return {
          resourceId: resource.resourceId,
          score: finalScore,
          locationTags,
          skillTags,
          timeTags
        };
      })
      .filter((item) => item.score >= 25)
      .sort((a, b) => b.score - a.score)
      .slice(0, payload.topK ?? 20);

    await this.prisma.match.deleteMany({
      where: {
        needId: BigInt(payload.needId),
        resourceId: { in: resourceIds },
        status: { in: [MatchStatus.pushed, MatchStatus.viewed, MatchStatus.invalid] }
      }
    });

    if (scored.length > 0) {
      await this.prisma.match.createMany({
        data: scored.map((item) => ({
          needId: BigInt(payload.needId),
          resourceId: item.resourceId,
          matchScore: new Prisma.Decimal(item.score.toFixed(2)),
          status: MatchStatus.pushed,
          pushTime: this.nextPushTime()
        }))
      });
    }

    return {
      taskId,
      needId: payload.needId,
      status: "queued",
      matchedCount: scored.length,
      dimensions: {
        locationTags: profile.locationTags,
        skillTags: profile.skillTags,
        timeTags: profile.timeTags,
        priceRange: profile.priceRange
      },
      schedule: {
        collectedAt: profile.collectedAt,
        nextCollectionAt: profile.nextCollectionAt,
        nextPushAt: profile.nextPushAt
      }
    };
  }

  async runResourcePool(userId: bigint, payload: RunResourcePoolMatchDto = {}) {
    const topK = Math.min(50, Math.max(1, payload.topK ?? 20));
    const taskId = `resource-pool-${Date.now()}`;

    const [user, ownResources, poolResources] = await Promise.all([
      this.prisma.user.findUnique({
        where: { userId },
        select: {
          userId: true,
          nickname: true,
          maskedPhone: true,
          phoneEncrypted: true,
          city: true,
          district: true
        }
      }),
      this.prisma.resource.findMany({
        where: {
          userId,
          status: ResourceStatus.active
        },
        select: {
          resourceId: true,
          userId: true,
          resourceType: true,
          resourceTypes: true,
          tags: true,
          areaCode: true,
          priceRange: true,
          activationDetails: true,
          lastUpdate: true,
          user: {
            select: {
              userId: true,
              nickname: true,
              maskedPhone: true,
              phoneEncrypted: true,
              city: true,
              district: true
            }
          }
        }
      }),
      this.prisma.resource.findMany({
        where: {
          status: ResourceStatus.active,
          userId: { not: userId }
        },
        include: {
          user: {
            select: {
              userId: true,
              nickname: true,
              maskedPhone: true,
              phoneEncrypted: true,
              city: true,
              district: true
            }
          }
        },
        orderBy: { lastUpdate: "desc" },
        take: 300
      })
    ]);

    await this.prisma.$executeRaw`
      DELETE FROM lobster_match_records
      WHERE user_id = ${userId}
        AND JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.source')) = 'resource_pool'
    `;

    if (ownResources.length === 0) {
      return {
        taskId,
        status: "completed",
        source: "resource_pool",
        matchedCount: 0,
        reason: "no active resource profile"
      };
    }

    const profile = this.buildPoolProfile(
      { city: user?.city ?? null, district: user?.district ?? null },
      ownResources as PoolResource[]
    );

    const scored = (poolResources as PoolResource[])
      .map((resource) => {
        const candidate = this.buildPoolProfile(resource.user, [resource]);
        const tokenScore = this.calcFuzzyOverlapScore(profile.tokens, candidate.tokens);
        const locationScore =
          profile.locationTokens.length === 0
            ? 65
            : this.calcFuzzyOverlapScore(profile.locationTokens, candidate.locationTokens);
        const typeScore =
          profile.typeTokens.length === 0
            ? 65
            : this.calcFuzzyOverlapScore(profile.typeTokens, candidate.typeTokens);
        const priceScore = this.calcBestPriceScore(profile.priceRanges, resource.priceRange);

        const score = this.toTwoDecimals(
          Math.min(
            100,
            tokenScore * 0.55 + locationScore * 0.15 + typeScore * 0.15 + priceScore * 0.15
          )
        );
        const reasons = this.buildPoolMatchReasons(profile, candidate);

        return {
          resource,
          score,
          reasons,
          candidateTokens: candidate.tokens
        };
      })
      .filter((item) => item.score >= RESOURCE_POOL_MATCH_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    if (scored.length > 0) {
      await this.prisma.lobsterMatchRecord.createMany({
        data: scored.map((item, index) => {
          const title = this.buildPoolMatchTitle(item.resource);
          const previewTags = item.candidateTokens.slice(0, 5);
          const requesterSnapshot = this.buildRequesterSnapshot(
            {
              userId: userId.toString(),
              nickname: user?.nickname ?? null,
              maskedPhone: user?.maskedPhone ?? null,
              phoneEncrypted: user?.phoneEncrypted ?? null,
              city: user?.city ?? null,
              district: user?.district ?? null
            },
            ownResources as PoolResource[]
          );
          const pairKey = `${taskId}:${index + 1}:${item.resource.resourceId.toString()}`;

          return {
            userId,
            targetUserId: item.resource.userId,
            title,
            content: [
              `资源 #${item.resource.resourceId.toString()}`,
              `类型 ${item.resource.resourceType}`,
              item.reasons.length > 0 ? `命中 ${item.reasons.join("、")}` : "画像相似",
              previewTags.length > 0 ? `标签 ${previewTags.join("、")}` : ""
            ]
              .filter(Boolean)
              .join(" | "),
            matchScore: new Prisma.Decimal(item.score.toFixed(2)),
            metadata: this.toPrismaJson({
              source: "resource_pool",
              resourceId: item.resource.resourceId.toString(),
              resourceOwnerId: item.resource.userId.toString(),
              resourceType: item.resource.resourceType,
              resourceTypes: this.normalizeTextList(item.resource.resourceTypes),
              tags: this.normalizeTextList(item.resource.tags),
              areaCode: item.resource.areaCode,
              reasons: item.reasons,
              score: item.score,
              pairKey,
              confirmationStatus: "pending",
              targetStatus: "PENDING",
              requester: requesterSnapshot,
              uploader: {
                userId: item.resource.user.userId.toString(),
                nickname: item.resource.user.nickname,
                maskedPhone: item.resource.user.maskedPhone,
                phoneEncrypted: item.resource.user.phoneEncrypted
              }
            })
          };
        })
      });
    }

    return {
      taskId,
      status: "completed",
      source: "resource_pool",
      matchedCount: scored.length,
      profile: {
        tokens: profile.tokens.slice(0, 12),
        locationTokens: profile.locationTokens,
        typeTokens: profile.typeTokens
      },
      matches: scored.map((item) => ({
        resourceId: item.resource.resourceId.toString(),
        targetUserId: item.resource.userId.toString(),
        score: item.score,
        reasons: item.reasons
      }))
    };
  }

  async list(userId: bigint, query: MatchListQueryDto) {
    const where: Prisma.MatchWhereInput = {
      resource: {
        is: {
          userId
        }
      }
    };

    if (query.needId) {
      where.needId = BigInt(query.needId);
    }

    const rows = await this.prisma.match.findMany({
      where,
      include: {
        resource: {
          select: {
            areaCode: true,
            tags: true
          }
        }
      },
      orderBy: [{ matchScore: "desc" }, { matchId: "desc" }],
      take: 200
    });

    return rows.map((row) => {
      const tags = this.normalizeTags(row.resource.tags);
      const locationTags = this.extractLocationTags(row.resource.areaCode, tags).slice(0, 3);
      const skillTags = this.extractSkillTags(tags).slice(0, 4);
      const timeTags = this.extractTimeTags(tags).slice(0, 2);
      const status = row.status;

      return {
        matchId: Number(row.matchId),
        needId: Number(row.needId),
        resourceId: Number(row.resourceId),
        score: this.toTwoDecimals(Number(row.matchScore)),
        status,
        locationTags,
        skillTags,
        timeTags,
        contactMasked:
          status === MatchStatus.confirmed
            ? this.buildVirtualContact(Number(row.matchId))
            : this.maskContact(undefined),
        pushTime: row.pushTime?.toISOString()
      };
    });
  }

  async confirm(userId: bigint, matchId: number) {
    if (!Number.isFinite(matchId) || matchId <= 0) {
      throw new BadRequestException("invalid match id");
    }

    const match = await this.prisma.match.findUnique({
      where: { matchId: BigInt(matchId) },
      include: {
        resource: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!match) {
      return this.confirmResourcePoolMatch(userId, matchId);
    }

    if (match.resource.userId !== userId) {
      throw new BadRequestException("match record not found");
    }

    const updated = await this.prisma.match.update({
      where: { matchId: match.matchId },
      data: { status: MatchStatus.confirmed }
    });

    return {
      matchId: Number(updated.matchId),
      status: updated.status,
      virtualContact: this.buildVirtualContact(Number(updated.matchId))
    };
  }

  async reject(userId: bigint, matchId: number) {
    if (!Number.isFinite(matchId) || matchId <= 0) {
      throw new BadRequestException("invalid match id");
    }

    const match = await this.prisma.match.findUnique({
      where: { matchId: BigInt(matchId) },
      include: {
        resource: {
          select: {
            userId: true
          }
        }
      }
    });

    if (!match) {
      return this.rejectResourcePoolMatch(userId, matchId);
    }

    if (match.resource.userId !== userId) {
      throw new BadRequestException("match record not found");
    }

    const updated = await this.prisma.match.update({
      where: { matchId: match.matchId },
      data: { status: MatchStatus.invalid }
    });

    return {
      matchId: Number(updated.matchId),
      status: updated.status
    };
  }

  private buildPoolProfile(
    user: { city: string | null; district: string | null },
    resources: PoolResource[]
  ): PoolProfile {
    const resourceTokens = resources.flatMap((resource) => [
      resource.resourceType,
      resource.areaCode ?? "",
      ...this.normalizeTextList(resource.resourceTypes),
      ...this.normalizeTextList(resource.tags),
      ...this.normalizeTextList(resource.activationDetails)
    ]);
    const locationTokens = [
      user.city ?? "",
      user.district ?? "",
      ...resources.map((resource) => resource.areaCode ?? "")
    ];
    const typeTokens = resources.flatMap((resource) => [
      resource.resourceType,
      ...this.normalizeTextList(resource.resourceTypes)
    ]);
    const priceRanges = resources
      .map((resource) => this.parsePriceRange(resource.priceRange))
      .filter((range): range is PriceRange => Boolean(range));

    return {
      tokens: this.uniqueTokens(
        [...resourceTokens, ...locationTokens].flatMap((token) => this.expandTextTokens(token))
      ),
      locationTokens: this.uniqueTokens(
        locationTokens.flatMap((token) => this.expandTextTokens(token))
      ),
      typeTokens: this.uniqueTokens(typeTokens.flatMap((token) => this.expandTextTokens(token))),
      priceRanges
    };
  }

  private buildPoolMatchTitle(resource: PoolResource): string {
    const uploader =
      resource.user.nickname?.trim() ||
      resource.user.maskedPhone?.trim() ||
      `用户 #${resource.userId.toString()}`;
    const mainTag =
      this.normalizeTextList(resource.tags)
        .flatMap((tag) => this.expandTextTokens(tag))
        .find((tag) => tag.length > 1 && !tag.includes("activation_")) ?? resource.resourceType;

    return `${RESOURCE_POOL_MATCH_TITLE_PREFIX}${uploader} · ${mainTag}`;
  }

  private buildPoolMatchReasons(profile: PoolProfile, candidate: PoolProfile): string[] {
    const reasons: string[] = [];
    const sharedToken = this.findSharedToken(profile.tokens, candidate.tokens);
    const sharedLocation = this.findSharedToken(profile.locationTokens, candidate.locationTokens);
    const sharedType = this.findSharedToken(profile.typeTokens, candidate.typeTokens);

    if (sharedLocation) {
      reasons.push(`地区 ${sharedLocation}`);
    }
    if (sharedType) {
      reasons.push(`类型 ${sharedType}`);
    }
    if (sharedToken && sharedToken !== sharedLocation && sharedToken !== sharedType) {
      reasons.push(`标签 ${sharedToken}`);
    }

    return reasons.slice(0, 3);
  }

  private findSharedToken(source: string[], target: string[]): string | null {
    return (
      source.find((item) => target.some((targetItem) => this.tokensMatch(item, targetItem))) ?? null
    );
  }

  private normalizeTextList(value: Prisma.JsonValue | null): string[] {
    return this.flattenJsonValue(value).flatMap((item) => this.expandTextTokens(item));
  }

  private expandTextTokens(value: string): string[] {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    const tokens = [trimmed];
    tokens.push(
      ...trimmed
        .split(/[:：,，、|/\\\s]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    );

    return this.uniqueTokens(
      tokens
        .flatMap((token) => [token, token.replace(/[-_]/g, " ")])
        .map((token) => token.trim())
        .filter((token) => token.length > 1 || /^\d+$/.test(token))
    );
  }

  private calcFuzzyOverlapScore(source: string[], target: string[]): number {
    const sourceTokens = this.uniqueTokens(source);
    const targetTokens = this.uniqueTokens(target);
    if (sourceTokens.length === 0) {
      return 0;
    }
    if (targetTokens.length === 0) {
      return 0;
    }

    const matched = sourceTokens.filter((item) =>
      targetTokens.some((targetItem) => this.tokensMatch(item, targetItem))
    ).length;
    return Math.round((matched / sourceTokens.length) * 100);
  }

  private tokensMatch(source: string, target: string): boolean {
    const left = source.toLowerCase();
    const right = target.toLowerCase();
    if (!left || !right) {
      return false;
    }
    if (left === right) {
      return true;
    }

    const minLength = Math.min(left.length, right.length);
    return minLength >= 3 && (left.includes(right) || right.includes(left));
  }

  private calcBestPriceScore(profileRanges: PriceRange[], candidateValue: Prisma.JsonValue | null) {
    if (profileRanges.length === 0) {
      return 65;
    }

    const candidateRange = this.parsePriceRange(candidateValue);
    if (!candidateRange) {
      return 60;
    }

    return Math.max(
      ...profileRanges.map((profileRange) => this.calcPriceScore(profileRange, candidateRange))
    );
  }

  private toPrismaJson(
    payload: unknown
  ): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
    if (payload === null) return Prisma.JsonNull;
    return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
  }

  private resolveNeedProfile(payload: RunMatchDto): NeedProfile {
    const hasManualDimensions =
      (payload.locationTags?.length ?? 0) > 0 ||
      (payload.skillTags?.length ?? 0) > 0 ||
      (payload.timeTags?.length ?? 0) > 0 ||
      payload.minPrice !== undefined ||
      payload.maxPrice !== undefined;

    if (!hasManualDimensions) {
      const cached = this.needProfileCache.get(payload.needId);
      if (cached && new Date(cached.nextCollectionAt).getTime() > Date.now()) {
        return cached;
      }
      return this.collectNeedProfile(payload.needId);
    }

    const now = new Date();
    const minPrice = payload.minPrice ?? 0;
    const maxPrice = payload.maxPrice ?? Math.max(minPrice + 1000, 999999);

    const profile: NeedProfile = {
      needId: payload.needId,
      locationTags: this.uniqueTokens(payload.locationTags ?? []),
      skillTags: this.uniqueTokens(payload.skillTags ?? []),
      timeTags: this.uniqueTokens(payload.timeTags ?? []),
      priceRange: {
        min: Math.min(minPrice, maxPrice),
        max: Math.max(minPrice, maxPrice)
      },
      collectedAt: now.toISOString(),
      nextCollectionAt: new Date(
        now.getTime() + NEED_COLLECTION_INTERVAL_HOURS * 60 * 60 * 1000
      ).toISOString(),
      nextPushAt: this.nextPushTime().toISOString(),
      source: "manual-input"
    };

    this.needProfileCache.set(payload.needId, profile);
    return profile;
  }

  private collectNeedProfile(needId: number): NeedProfile {
    const now = new Date();
    const locationTag = LOCATION_POOL[needId % LOCATION_POOL.length] ?? LOCATION_POOL[0];
    const secondLocationTag =
      LOCATION_POOL[(needId + 2) % LOCATION_POOL.length] ?? LOCATION_POOL[1];
    const skillTag = SKILL_POOL[needId % SKILL_POOL.length] ?? SKILL_POOL[0];
    const secondSkillTag = SKILL_POOL[(needId + 3) % SKILL_POOL.length] ?? SKILL_POOL[1];
    const timeTag = TIME_POOL[needId % TIME_POOL.length] ?? TIME_POOL[0];

    const profile: NeedProfile = {
      needId,
      locationTags: this.uniqueTokens([locationTag, secondLocationTag]),
      skillTags: this.uniqueTokens([skillTag, secondSkillTag]),
      timeTags: this.uniqueTokens([timeTag]),
      priceRange: {
        min: 500 + (needId % 6) * 200,
        max: 1800 + (needId % 6) * 350
      },
      collectedAt: now.toISOString(),
      nextCollectionAt: new Date(
        now.getTime() + NEED_COLLECTION_INTERVAL_HOURS * 60 * 60 * 1000
      ).toISOString(),
      nextPushAt: this.nextPushTime().toISOString(),
      source: "public-compliant-source"
    };

    this.needProfileCache.set(needId, profile);
    return profile;
  }

  private normalizeTags(value: Prisma.JsonValue | null): string[] {
    const values = this.flattenJsonValue(value);
    return this.uniqueTokens(values);
  }

  private flattenJsonValue(value: Prisma.JsonValue | null): string[] {
    if (value === null || value === undefined) {
      return [];
    }
    if (typeof value === "string") {
      const token = value.trim();
      return token ? [token] : [];
    }
    if (typeof value === "number") {
      return [String(value)];
    }
    if (Array.isArray(value)) {
      return value.flatMap((item) => this.flattenJsonValue(item));
    }
    if (typeof value === "object") {
      return Object.values(value).flatMap((item) =>
        this.flattenJsonValue(item as Prisma.JsonValue)
      );
    }
    return [];
  }

  private extractLocationTags(areaCode: string | null, tags: string[]): string[] {
    const raw = [...tags, areaCode ?? ""];
    return this.uniqueTokens(
      raw.filter((token) =>
        LOCATION_POOL.some((location) => token.toLowerCase().includes(location))
      )
    );
  }

  private extractTimeTags(tags: string[]): string[] {
    return this.uniqueTokens(
      tags.filter((token) => TIME_POOL.some((time) => token.toLowerCase().includes(time)))
    );
  }

  private extractSkillTags(tags: string[]): string[] {
    return this.uniqueTokens(
      tags.filter((token) => {
        const normalized = token.toLowerCase();
        const isLocation = LOCATION_POOL.some((location) => normalized.includes(location));
        const isTime = TIME_POOL.some((time) => normalized.includes(time));
        return !isLocation && !isTime;
      })
    );
  }

  private parsePriceRange(value: Prisma.JsonValue | null): PriceRange | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    const maybeMin = Number((value as Record<string, unknown>).min);
    const maybeMax = Number((value as Record<string, unknown>).max);
    if (!Number.isFinite(maybeMin) || !Number.isFinite(maybeMax)) {
      return null;
    }

    return {
      min: Math.min(maybeMin, maybeMax),
      max: Math.max(maybeMin, maybeMax)
    };
  }

  private calcOverlapScore(source: string[], target: string[]): number {
    if (source.length === 0) {
      return 100;
    }
    if (target.length === 0) {
      return 0;
    }

    const targetSet = new Set(target.map((item) => item.toLowerCase()));
    const matched = source.filter((item) => targetSet.has(item.toLowerCase())).length;
    const ratio = matched / source.length;
    return Math.round(ratio * 100);
  }

  private calcPriceScore(needRange: PriceRange, resourceRange: PriceRange | null): number {
    if (!resourceRange) {
      return 60;
    }

    const overlapMin = Math.max(needRange.min, resourceRange.min);
    const overlapMax = Math.min(needRange.max, resourceRange.max);
    if (overlapMax < overlapMin) {
      return 0;
    }

    const overlap = overlapMax - overlapMin;
    const demandSpan = Math.max(1, needRange.max - needRange.min);
    return Math.round((overlap / demandSpan) * 100);
  }

  private nextPushTime(): Date {
    const now = new Date();
    const push = new Date(now);
    push.setHours(8, 0, 0, 0);

    if (push.getTime() <= now.getTime()) {
      push.setDate(push.getDate() + 1);
    }

    return push;
  }

  private buildVirtualContact(matchId: number): string {
    return `relay-${String(matchId).padStart(6, "0")}@airp.local`;
  }

  private maskContact(rawPhone: string | null | undefined): string {
    if (!rawPhone) {
      return "available after confirmation";
    }

    const digits = rawPhone.replace(/\D/g, "");
    if (digits.length >= 11) {
      return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
    }

    return "available after confirmation";
  }

  private uniqueTokens(tokens: string[]): string[] {
    const normalized = tokens
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map((item) => item.toLowerCase());

    return Array.from(new Set(normalized));
  }

  private toTwoDecimals(value: number): number {
    return Number(value.toFixed(2));
  }

  private async confirmResourcePoolMatch(userId: bigint, matchId: number) {
    const record = await this.prisma.lobsterMatchRecord.findUnique({
      where: { matchId: BigInt(matchId) }
    });

    if (!record || record.userId !== userId) {
      throw new BadRequestException("match record not found");
    }

    const metadata = this.toResourcePoolMatchMetadata(record.metadata);
    if (metadata.source !== "resource_pool") {
      throw new BadRequestException("match record not found");
    }

    const now = new Date().toISOString();
    const counterpart = await this.getOrCreateCounterpartPoolMatch(record, metadata);
    const counterpartMetadata = counterpart ? this.toResourcePoolMatchMetadata(counterpart.metadata) : null;
    const counterpartConfirmed = counterpartMetadata?.confirmationStatus === "confirmed";
    const counterpartRejected = counterpartMetadata?.confirmationStatus === "invalid";
    const nextMetadata: ResourcePoolMatchMetadata = {
      ...metadata,
      confirmationStatus: "confirmed",
      targetStatus: counterpartRejected ? "REJECTED" : counterpartConfirmed ? "CONFIRMED" : "PENDING",
      rejectedBy: undefined,
      confirmedAt: now,
      rejectedAt: null,
      counterpartMatchId: counterpart ? counterpart.matchId.toString() : metadata.counterpartMatchId ?? null
    };

    const updated = await this.prisma.lobsterMatchRecord.update({
      where: { matchId: record.matchId },
      data: {
        metadata: this.toPrismaJson(nextMetadata)
      }
    });

    if (counterpart) {
      const nextCounterpartMetadata: ResourcePoolMatchMetadata = {
        ...counterpartMetadata,
        source: "resource_pool",
        targetStatus: "CONFIRMED",
        rejectedBy: undefined,
        counterpartMatchId: updated.matchId.toString()
      };

      await this.prisma.lobsterMatchRecord.update({
        where: { matchId: counterpart.matchId },
        data: {
          metadata: this.toPrismaJson(nextCounterpartMetadata)
        }
      });

      if (counterpartConfirmed && !counterpartRejected) {
        await this.notifyResourcePoolMatchFullyConfirmed({
          initiatorUserId: Number(counterpart.userId),
          responderUserId: Number(updated.userId),
          initiatorTitle: counterpart.title,
          responderTitle: updated.title
        });
      }
    }

    return {
      matchId: Number(updated.matchId),
      status: "confirmed",
      targetStatus: nextMetadata.targetStatus,
      virtualContact:
        decryptPhone(metadata.uploader?.phoneEncrypted) ||
        metadata.uploader?.maskedPhone ||
        this.buildVirtualContact(Number(updated.matchId))
    };
  }

  private async rejectResourcePoolMatch(userId: bigint, matchId: number) {
    const record = await this.prisma.lobsterMatchRecord.findUnique({
      where: { matchId: BigInt(matchId) }
    });

    if (!record || record.userId !== userId) {
      throw new BadRequestException("match record not found");
    }

    const metadata = this.toResourcePoolMatchMetadata(record.metadata);
    if (metadata.source !== "resource_pool") {
      throw new BadRequestException("match record not found");
    }

    const counterpart =
      metadata.counterpartMatchId && Number.isFinite(Number(metadata.counterpartMatchId))
        ? await this.prisma.lobsterMatchRecord.findUnique({
            where: { matchId: BigInt(metadata.counterpartMatchId) }
          })
        : null;

    const updated = await this.prisma.lobsterMatchRecord.update({
      where: { matchId: record.matchId },
      data: {
        metadata: this.toPrismaJson({
          ...metadata,
          confirmationStatus: "invalid",
          targetStatus: metadata.targetStatus === "CONFIRMED" ? "CONFIRMED" : "PENDING",
          rejectedBy: "self",
          rejectedAt: new Date().toISOString()
        })
      }
    });

    if (counterpart) {
      const counterpartMetadata = this.toResourcePoolMatchMetadata(counterpart.metadata);
      await this.prisma.lobsterMatchRecord.update({
        where: { matchId: counterpart.matchId },
        data: {
            metadata: this.toPrismaJson({
              ...counterpartMetadata,
              confirmationStatus: "invalid",
              targetStatus: "REJECTED",
              rejectedBy: "target",
              rejectedAt: new Date().toISOString(),
              counterpartMatchId: updated.matchId.toString()
            })
          }
      });
    }

    return {
      matchId: Number(updated.matchId),
      status: "invalid"
    };
  }

  private async getOrCreateCounterpartPoolMatch(
    record: { matchId: bigint; userId: bigint; targetUserId: bigint | null; title: string; content: string | null; matchScore: Prisma.Decimal | null; metadata: Prisma.JsonValue | null },
    metadata: ResourcePoolMatchMetadata
  ) {
    if (metadata.counterpartMatchId && Number.isFinite(Number(metadata.counterpartMatchId))) {
      const existing = await this.prisma.lobsterMatchRecord.findUnique({
        where: { matchId: BigInt(metadata.counterpartMatchId) }
      });
      if (existing) {
        return existing;
      }
    }

    if (!record.targetUserId) {
      return null;
    }

    const requester = metadata.requester ?? null;
    const counterpartMetadata: ResourcePoolMatchMetadata = {
      source: "resource_pool",
      pairKey: metadata.pairKey,
      counterpartMatchId: record.matchId.toString(),
      confirmationStatus: "pending",
      targetStatus: "CONFIRMED",
      requester: metadata.uploader
          ? {
            userId: metadata.uploader.userId,
            nickname: metadata.uploader.nickname,
            maskedPhone: metadata.uploader.maskedPhone,
            phoneEncrypted: metadata.uploader.phoneEncrypted,
            resourceType: String(metadata.resourceType ?? ""),
            resourceTypes: Array.isArray(metadata.resourceTypes)
              ? metadata.resourceTypes.map((item) => String(item))
              : [],
            tags: Array.isArray(metadata.tags) ? metadata.tags.map((item) => String(item)) : [],
            areaCode: typeof metadata.areaCode === "string" ? metadata.areaCode : null
          }
        : undefined,
      uploader: requester
        ? {
            userId: requester.userId,
            nickname: requester.nickname,
            maskedPhone: requester.maskedPhone,
            phoneEncrypted: requester.phoneEncrypted
          }
        : undefined,
      resourceId: requester?.userId ?? null,
      resourceOwnerId: record.userId.toString(),
      resourceType: requester?.resourceType ?? metadata.resourceType,
      resourceTypes: requester?.resourceTypes ?? metadata.resourceTypes,
      tags: requester?.tags ?? metadata.tags,
      areaCode: requester?.areaCode ?? metadata.areaCode,
      reasons: Array.isArray(metadata.reasons) ? metadata.reasons : [],
      score: metadata.score
    };

    const created = await this.prisma.lobsterMatchRecord.create({
      data: {
        userId: record.targetUserId,
        targetUserId: record.userId,
        title: this.buildCounterpartPoolMatchTitle(requester, record.userId),
        content: this.buildCounterpartPoolMatchContent(requester),
        matchScore: record.matchScore,
        metadata: this.toPrismaJson(counterpartMetadata)
      }
    });

    return created;
  }

  private buildRequesterSnapshot(
    user: {
      userId: string;
      nickname: string | null;
      maskedPhone: string | null;
      phoneEncrypted: string | null;
      city: string | null;
      district: string | null;
    },
    resources: PoolResource[]
  ) {
    const firstResource = resources[0];
    const resourceTypes = this.uniqueTokens(
      resources.flatMap((resource) => [
        resource.resourceType,
        ...this.normalizeTextList(resource.resourceTypes)
      ])
    ).slice(0, 4);
    const tags = this.uniqueTokens(
      resources.flatMap((resource) => [
        ...this.normalizeTextList(resource.tags),
        ...this.normalizeTextList(resource.activationDetails)
      ])
    ).slice(0, 6);

    return {
      userId: user.userId,
      nickname: user.nickname,
      maskedPhone: user.maskedPhone,
      phoneEncrypted: user.phoneEncrypted,
      city: user.city,
      district: user.district,
      resourceType: firstResource?.resourceType ?? null,
      resourceTypes,
      tags,
      areaCode: firstResource?.areaCode ?? null
    };
  }

  private buildCounterpartPoolMatchTitle(
    requester: ResourcePoolMatchMetadata["requester"] | null,
    fallbackUserId: bigint
  ) {
    const label =
      requester?.nickname?.trim() ||
      requester?.maskedPhone?.trim() ||
      `用户 #${fallbackUserId.toString()}`;
    const highlight =
      requester?.tags?.find((item) => item && !String(item).includes("activation_")) ||
      requester?.resourceTypes?.[0] ||
      requester?.resourceType ||
      "资源合作";

    return `${RESOURCE_POOL_MATCH_TITLE_PREFIX}${label} · ${highlight}`;
  }

  private buildCounterpartPoolMatchContent(requester: ResourcePoolMatchMetadata["requester"] | null) {
    const resourceType = requester?.resourceType ?? "skill";
    const tags = (requester?.tags ?? []).slice(0, 4);

    return [
      "对方已确认合作意向",
      `资源类型：${resourceType}`,
      tags.length > 0 ? `可提供：${tags.join("、")}` : ""
    ]
      .filter(Boolean)
      .join(" | ");
  }

  private async notifyResourcePoolMatchFullyConfirmed(input: {
    initiatorUserId: number;
    responderUserId: number;
    initiatorTitle: string;
    responderTitle: string;
  }) {
    const initiatorMessage =
      "你发起的资源池合作已获得对方确认，双方联系方式现已开放，可立即开始对接。";
    const responderMessage =
      "你已确认该资源池合作，对方也已确认，双方联系方式现已开放，可立即开始对接。";

    await Promise.allSettled([
      this.messageGateway.pushSystemMessage(
        input.initiatorUserId,
        `${initiatorMessage}\n匹配对象：${input.initiatorTitle}`,
        "text"
      ),
      this.messageGateway.pushSystemMessage(
        input.responderUserId,
        `${responderMessage}\n匹配对象：${input.responderTitle}`,
        "text"
      )
    ]);
  }

  private toResourcePoolMatchMetadata(value: Prisma.JsonValue | null): ResourcePoolMatchMetadata {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return JSON.parse(JSON.stringify(value)) as ResourcePoolMatchMetadata;
  }
}

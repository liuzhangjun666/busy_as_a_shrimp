import { randomUUID } from "crypto";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { AiBriefIngestService, AiBriefIngestResult } from "./ai-brief-ingest.service";
import { SoloSignalIngestService, SoloSignalIngestResult } from "./solo-signal-ingest.service";

const SUPPORTED_DICT_API_VERSIONS = new Set(["v1"]);

export interface PublicDictItem {
  code: string;
  label: string;
  value: string;
  sort: number;
  remark?: string;
}

export interface PublicDictResult {
  type: string;
  version: string;
  updatedAt: string | null;
  items: PublicDictItem[];
}

export type AnnouncementType = "notice" | "activity" | "warning";

export interface PublicAnnouncement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  publishedAt: string;
  publishedBy: string;
}

export interface PublicAiBriefItem {
  id: string;
  title: string;
  summary?: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  createdAt: string;
}

export interface PublicAiBriefListResult {
  list: PublicAiBriefItem[];
  nextCursor: string | null;
}

export interface PublicSoloSignalItem {
  id: string;
  title: string;
  summary?: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  incomeSnippet?: string;
  createdAt: string;
}

export interface PublicSoloSignalListResult {
  list: PublicSoloSignalItem[];
  nextCursor: string | null;
}

export interface PublicCampusOpportunityItem {
  companyName: string;
  industry: string;
  logoGradient: string;
  recruitmentType: string;
  location: string;
  startDate: string;
  endDate: string;
  noWrittenTest: boolean;
  position: string;
  announcementUrl: string;
  applyUrl: string;
  sourceType: string;
}

export interface PublicCampusOpportunitiesResult {
  total: number;
  page: number;
  size: number;
  list: PublicCampusOpportunityItem[];
}

interface PublicCursor {
  publishedAt: string;
  id: string;
}

export interface InsightTranslationResult {
  title: string;
  summary?: string;
  incomeSnippet?: string;
}

export interface PublicRefreshResult {
  triggeredAt: string;
  cooldownSeconds: number;
  skipped: boolean;
  reason?: string;
  accepted?: boolean;
  running?: boolean;
  jobId?: string;
  result?: AiBriefIngestResult | SoloSignalIngestResult;
}

type RefreshModule = "ai_brief" | "solo_signal";
type RefreshStatus = "running" | "succeeded" | "failed";

export interface PublicRefreshJobStatus {
  jobId: string;
  module: RefreshModule;
  status: RefreshStatus;
  triggeredAt: string;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  result?: AiBriefIngestResult | SoloSignalIngestResult;
}

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);
  private lastAiBriefRefreshAt = 0;
  private lastSoloSignalRefreshAt = 0;
  private readonly refreshCooldownMs = 5 * 60 * 1000;
  private aiBriefRefreshRunning = false;
  private soloSignalRefreshRunning = false;
  private readonly refreshJobs = new Map<string, PublicRefreshJobStatus>();
  private aiBriefActiveJobId: string | null = null;
  private soloSignalActiveJobId: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiBriefIngestService: AiBriefIngestService,
    private readonly soloSignalIngestService: SoloSignalIngestService
  ) {}

  async getDict(type?: string, version = "v1"): Promise<PublicDictResult> {
    const dictType = type?.trim();
    if (!dictType) {
      throw new BadRequestException("type is required");
    }

    if (!SUPPORTED_DICT_API_VERSIONS.has(version)) {
      throw new BadRequestException(`unsupported version: ${version}`);
    }

    const dictRows = await this.prisma.$queryRaw<
      Array<{
        dict_type: string;
        updated_at: Date;
      }>
    >`
      SELECT dict_type, updated_at
      FROM dict_types
      WHERE dict_type = ${dictType}
        AND status = ${"normal"}
      LIMIT 1
    `;
    const dict = dictRows[0];

    if (!dict) {
      return {
        type: dictType,
        version,
        updatedAt: null,
        items: []
      };
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        dict_code: string;
        dict_label: string;
        dict_value: string;
        dict_sort: number | bigint;
        remark: string | null;
        updated_at: Date;
      }>
    >`
      SELECT dict_code, dict_label, dict_value, dict_sort, remark, updated_at
      FROM dict_data
      WHERE dict_type = ${dictType}
        AND status = ${"normal"}
      ORDER BY dict_sort ASC, dict_data_id ASC
    `;

    const latestUpdatedAt = rows.reduce<Date | null>((max, row) => {
      if (!max || row.updated_at > max) {
        return row.updated_at;
      }
      return max;
    }, dict.updated_at);

    return {
      type: dictType,
      version,
      updatedAt: latestUpdatedAt ? latestUpdatedAt.toISOString() : null,
      items: rows.map((row) => ({
        code: row.dict_code,
        label: row.dict_label,
        value: row.dict_value,
        sort: Number(row.dict_sort),
        remark: row.remark ?? undefined
      }))
    };
  }

  async getAnnouncements(): Promise<PublicAnnouncement[]> {
    const list = await this.prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return list.map((item) => ({
      id: item.noticeId.toString(),
      title: item.title || item.content.slice(0, 30) || "系统公告",
      content: item.content,
      type: (item.type as AnnouncementType) || "notice",
      publishedBy: item.publisher,
      publishedAt: item.createdAt.toISOString()
    }));
  }

  async getAiBriefs(limit?: number, cursor?: string): Promise<PublicAiBriefListResult> {
    const normalizedLimit = this.normalizeLimit(limit);
    const parsedCursor = this.parseCursor(cursor);

    const list = await this.prisma.aiBrief.findMany({
      where: parsedCursor
        ? {
            OR: [
              { publishedAt: { lt: parsedCursor.publishedAt } },
              {
                publishedAt: parsedCursor.publishedAt,
                aiBriefId: { lt: parsedCursor.id }
              }
            ]
          }
        : undefined,
      orderBy: [{ publishedAt: "desc" }, { aiBriefId: "desc" }],
      take: normalizedLimit + 1
    });

    const hasMore = list.length > normalizedLimit;
    const sliced = hasMore ? list.slice(0, normalizedLimit) : list;

    return {
      list: sliced.map((item) => ({
        id: item.aiBriefId.toString(),
        title: this.cleanPublicText(item.title),
        summary: this.cleanOptionalPublicText(item.summary),
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl,
        publishedAt: item.publishedAt.toISOString(),
        createdAt: item.createdAt.toISOString()
      })),
      nextCursor: hasMore
        ? this.encodeCursor(
            sliced[sliced.length - 1].publishedAt,
            sliced[sliced.length - 1].aiBriefId
          )
        : null
    };
  }

  async getSoloSignals(limit?: number, cursor?: string): Promise<PublicSoloSignalListResult> {
    const normalizedLimit = this.normalizeLimit(limit);
    const parsedCursor = this.parseCursor(cursor);

    const list = await this.prisma.soloSignal.findMany({
      where: parsedCursor
        ? {
            OR: [
              { publishedAt: { lt: parsedCursor.publishedAt } },
              {
                publishedAt: parsedCursor.publishedAt,
                soloSignalId: { lt: parsedCursor.id }
              }
            ]
          }
        : undefined,
      orderBy: [{ publishedAt: "desc" }, { soloSignalId: "desc" }],
      take: normalizedLimit + 1
    });

    const hasMore = list.length > normalizedLimit;
    const sliced = hasMore ? list.slice(0, normalizedLimit) : list;

    return {
      list: sliced.map((item) => ({
        id: item.soloSignalId.toString(),
        title: this.cleanPublicText(item.title),
        summary: this.cleanOptionalPublicText(item.summary),
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl,
        publishedAt: item.publishedAt.toISOString(),
        incomeSnippet: this.cleanOptionalPublicText(item.incomeSnippet),
        createdAt: item.createdAt.toISOString()
      })),
      nextCursor: hasMore
        ? this.encodeCursor(
            sliced[sliced.length - 1].publishedAt,
            sliced[sliced.length - 1].soloSignalId
          )
        : null
    };
  }

  async getCampusOpportunities(limit?: number): Promise<PublicCampusOpportunitiesResult> {
    const normalizedLimit = this.normalizeLimit(limit);
    const where = { sourceType: "campus_recruitment" as const };
    const [total, list] = await Promise.all([
      this.prisma.opportunity.count({ where }),
      this.prisma.opportunity.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { opportunityId: "desc" }],
        take: normalizedLimit
      })
    ]);

    return {
      total,
      page: 1,
      size: normalizedLimit,
      list: list.map((item) => ({
        companyName: item.companyName,
        industry: item.industry,
        logoGradient: item.logoGradient,
        recruitmentType: item.recruitmentType,
        location: item.location,
        startDate: item.startDate,
        endDate: item.endDate,
        noWrittenTest: item.noWrittenTest,
        position: item.position,
        announcementUrl: item.announcementUrl,
        applyUrl: item.applyUrl,
        sourceType: item.sourceType
      }))
    };
  }

  async translateInsight(payload: {
    title: string;
    summary?: string;
    incomeSnippet?: string;
    scene?: "ai_brief" | "solo_signal";
  }): Promise<InsightTranslationResult> {
    const title = this.cleanPublicText(payload.title);
    const summary = this.cleanOptionalPublicText(payload.summary);
    const incomeSnippet = this.cleanOptionalPublicText(payload.incomeSnippet);

    if (!title) {
      throw new BadRequestException("title is required");
    }

    const fields = [
      { key: "title", value: title },
      { key: "summary", value: summary },
      { key: "incomeSnippet", value: incomeSnippet }
    ].filter((item) => Boolean(item.value)) as Array<{ key: keyof InsightTranslationResult; value: string }>;

    if (fields.every((item) => this.shouldKeepOriginal(item.value))) {
      return {
        title,
        summary,
        incomeSnippet
      };
    }

    const translated = await this.translateFields(
      fields,
      payload.scene === "solo_signal" ? "AI 一人公司公开案例" : "AI 快报资讯"
    );

    return {
      title: translated.title ?? title,
      summary: translated.summary ?? summary,
      incomeSnippet: translated.incomeSnippet ?? incomeSnippet
    };
  }

  async refreshAiBriefs(): Promise<PublicRefreshResult> {
    const now = Date.now();
    if (this.aiBriefRefreshRunning) {
      return {
        triggeredAt: new Date(this.lastAiBriefRefreshAt || now).toISOString(),
        cooldownSeconds: 0,
        skipped: true,
        accepted: false,
        running: true,
        jobId: this.aiBriefActiveJobId ?? undefined,
        reason: "AI快报正在后台同步，请稍后刷新列表查看结果"
      };
    }

    const diff = now - this.lastAiBriefRefreshAt;
    if (diff < this.refreshCooldownMs) {
      return {
        triggeredAt: new Date(this.lastAiBriefRefreshAt).toISOString(),
        cooldownSeconds: Math.ceil((this.refreshCooldownMs - diff) / 1000),
        skipped: true,
        accepted: false,
        running: false,
        reason: "AI快报刚刚同步过，请稍后再试"
      };
    }

    this.lastAiBriefRefreshAt = now;
    this.aiBriefRefreshRunning = true;
    const job = this.createRefreshJob("ai_brief", now);
    this.aiBriefActiveJobId = job.jobId;
    void this.runAiBriefRefresh(job.jobId);
    return {
      triggeredAt: new Date(now).toISOString(),
      cooldownSeconds: Math.ceil(this.refreshCooldownMs / 1000),
      skipped: false,
      accepted: true,
      running: true,
      jobId: job.jobId,
      reason: "AI快报后台同步已启动，稍后刷新列表查看结果"
    };
  }

  async refreshSoloSignals(): Promise<PublicRefreshResult> {
    const now = Date.now();
    if (this.soloSignalRefreshRunning) {
      return {
        triggeredAt: new Date(this.lastSoloSignalRefreshAt || now).toISOString(),
        cooldownSeconds: 0,
        skipped: true,
        accepted: false,
        running: true,
        jobId: this.soloSignalActiveJobId ?? undefined,
        reason: "AI一人公司正在后台同步，请稍后刷新列表查看结果"
      };
    }

    const diff = now - this.lastSoloSignalRefreshAt;
    if (diff < this.refreshCooldownMs) {
      return {
        triggeredAt: new Date(this.lastSoloSignalRefreshAt).toISOString(),
        cooldownSeconds: Math.ceil((this.refreshCooldownMs - diff) / 1000),
        skipped: true,
        accepted: false,
        running: false,
        reason: "AI一人公司刚刚同步过，请稍后再试"
      };
    }

    this.lastSoloSignalRefreshAt = now;
    this.soloSignalRefreshRunning = true;
    const job = this.createRefreshJob("solo_signal", now);
    this.soloSignalActiveJobId = job.jobId;
    void this.runSoloSignalRefresh(job.jobId);
    return {
      triggeredAt: new Date(now).toISOString(),
      cooldownSeconds: Math.ceil(this.refreshCooldownMs / 1000),
      skipped: false,
      accepted: true,
      running: true,
      jobId: job.jobId,
      reason: "AI一人公司后台同步已启动，稍后刷新列表查看结果"
    };
  }

  getAiBriefRefreshStatus(jobId: string): PublicRefreshJobStatus {
    return this.getRefreshJobStatus(jobId, "ai_brief");
  }

  getSoloSignalRefreshStatus(jobId: string): PublicRefreshJobStatus {
    return this.getRefreshJobStatus(jobId, "solo_signal");
  }

  private createRefreshJob(module: RefreshModule, timestamp: number): PublicRefreshJobStatus {
    const job: PublicRefreshJobStatus = {
      jobId: randomUUID(),
      module,
      status: "running",
      triggeredAt: new Date(timestamp).toISOString(),
      startedAt: new Date(timestamp).toISOString()
    };
    this.refreshJobs.set(job.jobId, job);
    this.pruneRefreshJobs();
    return job;
  }

  private getRefreshJobStatus(jobId: string, module: RefreshModule): PublicRefreshJobStatus {
    const normalizedJobId = jobId.trim();
    if (!normalizedJobId) {
      throw new BadRequestException("jobId is required");
    }

    const job = this.refreshJobs.get(normalizedJobId);
    if (!job || job.module !== module) {
      throw new BadRequestException("refresh job not found");
    }

    return job;
  }

  private updateRefreshJob(
    jobId: string,
    patch: Partial<Omit<PublicRefreshJobStatus, "jobId" | "module">>
  ): void {
    const current = this.refreshJobs.get(jobId);
    if (!current) {
      return;
    }

    this.refreshJobs.set(jobId, {
      ...current,
      ...patch
    });
  }

  private pruneRefreshJobs(): void {
    const jobs = Array.from(this.refreshJobs.values()).sort((a, b) =>
      a.startedAt < b.startedAt ? -1 : 1
    );

    while (jobs.length > 20) {
      const oldest = jobs.shift();
      if (!oldest) {
        break;
      }
      this.refreshJobs.delete(oldest.jobId);
    }
  }

  private async runAiBriefRefresh(jobId: string): Promise<void> {
    try {
      const result = await this.aiBriefIngestService.ingestFromFeeds();
      this.updateRefreshJob(jobId, {
        status: "succeeded",
        finishedAt: new Date().toISOString(),
        result
      });
      this.logger.log(
        `[AI快报] 后台同步完成，新增 ${result.inserted} 条，抓取 ${result.fetched} 条，失败源 ${result.errors} 个`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.updateRefreshJob(jobId, {
        status: "failed",
        finishedAt: new Date().toISOString(),
        error: message
      });
      this.logger.error(`[AI快报] 后台同步失败: ${message}`);
    } finally {
      this.aiBriefRefreshRunning = false;
      this.aiBriefActiveJobId = null;
    }
  }

  private async runSoloSignalRefresh(jobId: string): Promise<void> {
    try {
      const result = await this.soloSignalIngestService.ingestFromSources();
      this.updateRefreshJob(jobId, {
        status: "succeeded",
        finishedAt: new Date().toISOString(),
        result
      });
      this.logger.log(
        `[AI一人公司] 后台同步完成，新增 ${result.inserted} 条，抓取 ${result.fetched} 条，失败源 ${result.errors} 个`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.updateRefreshJob(jobId, {
        status: "failed",
        finishedAt: new Date().toISOString(),
        error: message
      });
      this.logger.error(`[AI一人公司] 后台同步失败: ${message}`);
    } finally {
      this.soloSignalRefreshRunning = false;
      this.soloSignalActiveJobId = null;
    }
  }

  private normalizeLimit(limit?: number): number {
    const parsed = Number(limit);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 20;
    }

    return Math.min(Math.trunc(parsed), 50);
  }

  private parseCursor(cursor?: string): { publishedAt: Date; id: bigint } | null {
    if (!cursor) {
      return null;
    }

    try {
      const decoded = Buffer.from(cursor, "base64url").toString("utf8");
      const payload = JSON.parse(decoded) as PublicCursor;
      const publishedAt = new Date(payload.publishedAt);
      const id = BigInt(payload.id);
      if (Number.isNaN(publishedAt.getTime()) || id <= 0n) {
        throw new Error("invalid cursor");
      }
      return { publishedAt, id };
    } catch {
      throw new BadRequestException("invalid cursor");
    }
  }

  private encodeCursor(publishedAt: Date, id: bigint): string {
    const payload: PublicCursor = {
      publishedAt: publishedAt.toISOString(),
      id: id.toString()
    };
    return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  }

  private shouldKeepOriginal(value: string): boolean {
    const normalized = value.replace(/\s+/g, "");
    if (!normalized) {
      return true;
    }

    const latinChars = (normalized.match(/[A-Za-z]/g) ?? []).length;
    const cjkChars = (normalized.match(/[\u4e00-\u9fff]/g) ?? []).length;

    return cjkChars >= latinChars;
  }

  private cleanOptionalPublicText(value?: string | null): string | undefined {
    if (!value) {
      return undefined;
    }

    const cleaned = this.cleanPublicText(value);
    return cleaned || undefined;
  }

  private cleanPublicText(value: string): string {
    const withoutTags = value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]*>/g, " ");
    const decoded = withoutTags
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&#x2f;/gi, "/")
      .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
        String.fromCodePoint(Number.parseInt(hex, 16))
      );

    return decoded.replace(/[<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000);
  }

  private async translateFields(
    fields: Array<{ key: keyof InsightTranslationResult; value: string }>,
    sceneLabel: string
  ): Promise<Partial<InsightTranslationResult>> {
    const systemPrompt =
      "你是一名专业科技资讯翻译编辑。请把英文内容准确翻译成自然、简洁、易懂的简体中文。保留产品名、公司名、术语、金额、时间、URL，不要扩写，不要解释，不要输出额外说明。";
    const userPrompt = [
      `场景：${sceneLabel}`,
      "请按 JSON 返回翻译结果，键名保持不变，只输出合法 JSON。",
      JSON.stringify(
        Object.fromEntries(fields.map((field) => [field.key, field.value])),
        null,
        2
      )
    ].join("\n\n");

    const minimaxApiKey = process.env.MINIMAX_API_KEY?.trim();
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY?.trim();

    if (minimaxApiKey) {
      try {
        return await this.callLlmTranslationApi({
          apiKey: minimaxApiKey,
          baseUrl: "https://api.minimax.chat/v1/chat/completions",
          model: "abab6.5s-chat",
          systemPrompt,
          userPrompt
        });
      } catch (error) {
        this.logger.warn(`MiniMax translation failed: ${this.getErrorMessage(error)}`);
      }
    }

    if (deepseekApiKey) {
      return await this.callLlmTranslationApi({
        apiKey: deepseekApiKey,
        baseUrl: "https://api.deepseek.com/chat/completions",
        model: "deepseek-chat",
        systemPrompt,
        userPrompt
      });
    }

    throw new BadRequestException("未配置可用的翻译引擎");
  }

  private async callLlmTranslationApi(options: {
    apiKey: string;
    baseUrl: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
  }): Promise<Partial<InsightTranslationResult>> {
    const response = await fetch(options.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.apiKey}`
      },
      body: JSON.stringify({
        model: options.model,
        messages: [
          { role: "system", content: options.systemPrompt },
          { role: "user", content: options.userPrompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`LLM API Error ${response.status}: ${detail}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("翻译服务未返回有效内容");
    }

    const parsed = JSON.parse(content) as Partial<InsightTranslationResult>;
    return {
      title: typeof parsed.title === "string" ? parsed.title.trim() : undefined,
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : undefined,
      incomeSnippet:
        typeof parsed.incomeSnippet === "string" ? parsed.incomeSnippet.trim() : undefined
    };
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return "未知错误";
  }
}

import { createHash } from "crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { PrismaService } from "../../common/prisma.service";

interface FeedConfig {
  name: string;
  url: string;
}

interface DomSourceConfig {
  name: string;
  url: string;
  itemSelector?: string;
  titleSelector?: string;
  linkSelector?: string;
  summarySelector?: string;
}

interface ParsedSoloSignal {
  externalId: string;
  sourceName: string;
  title: string;
  summary?: string;
  sourceUrl: string;
  publishedAt: Date;
  incomeSnippet?: string;
}

interface ParsedRawItem {
  title: string;
  summary?: string;
  sourceUrl: string;
  publishedAt: Date;
  identity: string;
}

interface ParsedSourceBatch {
  records: ParsedSoloSignal[];
  scanned: number;
  accepted: number;
}

export interface SoloSignalIngestResult {
  inserted: number;
  fetched: number;
  sources: number;
  errors: number;
}

const DEFAULT_RSS_FEEDS: FeedConfig[] = [
  { name: "Indie Hackers", url: "https://www.indiehackers.com/feed" },
  { name: "Medium AI Startup", url: "https://medium.com/feed/tag/ai-startup" },
  { name: "Medium Micro SaaS", url: "https://medium.com/feed/tag/micro-saas" },
  { name: "Substack - One Useful Thing", url: "https://www.oneusefulthing.org/feed" }
];

const DEFAULT_DOM_SOURCES: DomSourceConfig[] = [
  {
    name: "Indie Hackers Articles",
    url: "https://www.indiehackers.com/articles",
    itemSelector: "article",
    titleSelector: "h2",
    linkSelector: "a",
    summarySelector: "p"
  },
  {
    name: "Starter Story",
    url: "https://www.starterstory.com/ideas",
    itemSelector: "article",
    titleSelector: "h2",
    linkSelector: "a",
    summarySelector: "p"
  }
];

const AI_KEYWORDS = ["ai", "llm", "gpt", "claude", "agent", "模型", "自动化"];
const INCOME_KEYWORDS = [
  "mrr",
  "arr",
  "revenue",
  "earning",
  "earnings",
  "profit",
  "income",
  "month",
  "月入",
  "变现",
  "营收"
];
const BUSINESS_KEYWORDS = [
  "startup",
  "founder",
  "founders",
  "indie",
  "saas",
  "micro saas",
  "micro-saas",
  "ship",
  "shipping",
  "launch",
  "launched",
  "build",
  "built",
  "studio",
  "automation business",
  "side project",
  "solo founder",
  "bootstrapped",
  "bootstrapping",
  "创业",
  "独立开发",
  "一人公司",
  "副业"
];

@Injectable()
export class SoloSignalIngestService {
  private readonly logger = new Logger(SoloSignalIngestService.name);
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    trimValues: true
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  async ingestFromSources(): Promise<SoloSignalIngestResult> {
    const rssFeeds = this.resolveFeedConfigs();
    const domSources = this.resolveDomSources();

    const aggregate = new Map<string, ParsedSoloSignal>();
    let errors = 0;

    for (const feed of rssFeeds) {
      try {
        const xml = await this.fetchText(feed.url);
        const batch = this.parseRssAndAtom(xml, feed);
        this.logger.log(
          `[SoloSignal] RSS parsed: ${feed.name} -> scanned ${batch.scanned}, accepted ${batch.accepted}`
        );
        for (const record of batch.records) {
          if (!aggregate.has(record.externalId)) {
            aggregate.set(record.externalId, record);
          }
        }
      } catch (error) {
        errors += 1;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `[SoloSignal] RSS source failed: ${feed.name} (${feed.url}) -> ${message}`
        );
      }
    }

    for (const source of domSources) {
      try {
        const html = await this.fetchText(source.url);
        const batch = this.parseDomSource(html, source);
        this.logger.log(
          `[SoloSignal] DOM parsed: ${source.name} -> scanned ${batch.scanned}, accepted ${batch.accepted}`
        );
        for (const record of batch.records) {
          if (!aggregate.has(record.externalId)) {
            aggregate.set(record.externalId, record);
          }
        }
      } catch (error) {
        errors += 1;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `[SoloSignal] DOM source failed: ${source.name} (${source.url}) -> ${message}`
        );
      }
    }

    const records = Array.from(aggregate.values());
    if (records.length === 0) {
      this.logger.warn(
        `[SoloSignal] no records accepted. rss=${rssFeeds.length}, dom=${domSources.length}, errors=${errors}. This usually means sources were unreachable or the keyword filters were too strict.`
      );
      return {
        inserted: 0,
        fetched: 0,
        sources: rssFeeds.length + domSources.length,
        errors
      };
    }

    const now = new Date();
    const result = await this.prisma.soloSignal.createMany({
      data: records.map((record) => ({
        externalId: record.externalId,
        sourceName: record.sourceName,
        title: record.title,
        summary: record.summary,
        sourceUrl: record.sourceUrl,
        publishedAt: record.publishedAt,
        incomeSnippet: record.incomeSnippet,
        createdAt: now,
        updatedAt: now
      })),
      skipDuplicates: true
    });

    return {
      inserted: result.count,
      fetched: records.length,
      sources: rssFeeds.length + domSources.length,
      errors
    };
  }

  private resolveFeedConfigs(): FeedConfig[] {
    const envValue = this.configService.get<string>("SOLO_SIGNAL_FEED_URLS")?.trim();
    if (!envValue) {
      return DEFAULT_RSS_FEEDS;
    }

    const parsed = envValue
      .split(",")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .map((item) => {
        const [namePart, urlPart] = item.includes("|") ? item.split("|", 2) : ["", item];
        const url = urlPart.trim();
        if (!this.isValidHttpUrl(url)) {
          return null;
        }
        const name = namePart.trim() || this.resolveNameFromUrl(url);
        return { name, url };
      })
      .filter((item): item is FeedConfig => item !== null);

    return parsed.length > 0 ? parsed : DEFAULT_RSS_FEEDS;
  }

  private resolveDomSources(): DomSourceConfig[] {
    const envValue = this.configService.get<string>("SOLO_SIGNAL_DOM_SOURCES")?.trim();
    if (!envValue) {
      return DEFAULT_DOM_SOURCES;
    }

    try {
      const parsed = JSON.parse(envValue) as unknown;
      if (!Array.isArray(parsed)) {
        return DEFAULT_DOM_SOURCES;
      }

      const normalized = parsed
        .map((item) => this.normalizeDomSource(item))
        .filter((item): item is DomSourceConfig => item !== null);

      return normalized.length > 0 ? normalized : DEFAULT_DOM_SOURCES;
    } catch {
      return DEFAULT_DOM_SOURCES;
    }
  }

  private normalizeDomSource(value: unknown): DomSourceConfig | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    const record = value as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const url = typeof record.url === "string" ? record.url.trim() : "";

    if (!name || !this.isValidHttpUrl(url)) {
      return null;
    }

    return {
      name,
      url,
      itemSelector: this.normalizeSelector(record.itemSelector),
      titleSelector: this.normalizeSelector(record.titleSelector),
      linkSelector: this.normalizeSelector(record.linkSelector),
      summarySelector: this.normalizeSelector(record.summarySelector)
    };
  }

  private normalizeSelector(value: unknown): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private async fetchText(url: string): Promise<string> {
    const timeout = this.resolvePositiveInt("SOLO_SIGNAL_FETCH_TIMEOUT_MS", 12000, 3000, 60000);
    const response = await axios.get<string>(url, {
      timeout,
      responseType: "text",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 SoloSignalFetcher/1.0",
        Accept: "text/html,application/rss+xml,application/atom+xml,application/xml,text/xml"
      }
    });

    return response.data;
  }

  private parseRssAndAtom(xml: string, feed: FeedConfig): ParsedSourceBatch {
    const maxPerSource = this.resolvePositiveInt("SOLO_SIGNAL_MAX_PER_SOURCE", 20, 1, 100);
    const parsed = this.parser.parse(xml) as Record<string, unknown>;
    const rssItems = this.parseRssItems(parsed, feed);
    const atomItems = this.parseAtomItems(parsed, feed);
    const rawItems = [...rssItems, ...atomItems];
    const records = rawItems
      .map((item) => this.toSoloSignal(feed.name, item))
      .filter((item): item is ParsedSoloSignal => Boolean(item))
      .slice(0, maxPerSource);

    return {
      records,
      scanned: rawItems.length,
      accepted: records.length
    };
  }

  private parseDomSource(html: string, source: DomSourceConfig): ParsedSourceBatch {
    const maxPerSource = this.resolvePositiveInt("SOLO_SIGNAL_MAX_PER_SOURCE", 20, 1, 100);
    const anchorRegex = /<a\b([^>]*?)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
    const records: ParsedSoloSignal[] = [];
    let scanned = 0;

    let match: RegExpExecArray | null;
    while ((match = anchorRegex.exec(html)) !== null) {
      const fullAnchor = match[0];
      const href = match[2] || "";
      const anchorText = this.cleanText(this.stripHtml(match[4] || ""));

      if (!href || !anchorText) {
        continue;
      }

      if (source.linkSelector && !this.matchesSelector(fullAnchor, source.linkSelector)) {
        continue;
      }

      const sourceUrl = this.normalizeUrl(href, source.url);
      if (!sourceUrl) {
        continue;
      }

      const summary = this.extractNearbySummary(html, fullAnchor, source.summarySelector);
      const rawItem: ParsedRawItem = {
        title: anchorText,
        summary,
        sourceUrl,
        publishedAt: new Date(),
        identity: `${sourceUrl}|${anchorText}`
      };
      scanned += 1;

      const normalized = this.toSoloSignal(source.name, rawItem);
      if (!normalized) {
        continue;
      }

      records.push(normalized);
      if (records.length >= maxPerSource) {
        break;
      }
    }

    return {
      records,
      scanned,
      accepted: records.length
    };
  }

  private extractNearbySummary(
    html: string,
    anchorHtml: string,
    summarySelector?: string
  ): string | undefined {
    const anchorIndex = html.indexOf(anchorHtml);
    if (anchorIndex < 0) {
      return undefined;
    }

    const slice = html.slice(anchorIndex, anchorIndex + 1200);
    if (summarySelector) {
      const selectorClass = this.extractClassToken(summarySelector);
      if (selectorClass) {
        const classPattern = new RegExp(
          `<[^>]*class=["'][^"']*${selectorClass}[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`,
          "i"
        );
        const classMatch = slice.match(classPattern);
        if (classMatch?.[1]) {
          const cleaned = this.cleanText(this.stripHtml(classMatch[1]));
          if (cleaned) {
            return cleaned;
          }
        }
      }
    }

    const paragraphMatch = slice.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (!paragraphMatch?.[1]) {
      return undefined;
    }

    const fallback = this.cleanText(this.stripHtml(paragraphMatch[1]));
    return fallback || undefined;
  }

  private matchesSelector(fragment: string, selector: string): boolean {
    const classToken = this.extractClassToken(selector);
    if (!classToken) {
      return true;
    }

    const classPattern = new RegExp(`class=["'][^"']*${classToken}[^"']*["']`, "i");
    return classPattern.test(fragment);
  }

  private extractClassToken(selector: string): string | null {
    const classMatch = selector.match(/\.([a-zA-Z0-9_-]+)/);
    if (classMatch?.[1]) {
      return classMatch[1];
    }
    return null;
  }

  private parseRssItems(parsed: Record<string, unknown>, feed: FeedConfig): ParsedRawItem[] {
    const rss = this.asRecord(parsed.rss);
    const channel = this.asRecord(rss?.channel);
    const items = this.toArray(channel?.item)
      .map((item) => this.asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item));

    return items
      .map((item) => ({
        title: this.cleanText(this.readNodeText(item.title)),
        summary: this.cleanText(
          this.readNodeText(item.description) || this.readNodeText(item["content:encoded"])
        ),
        sourceUrl: this.resolveFeedLink(item.link, feed.url),
        publishedAt: this.parseDate(
          this.readNodeText(item.pubDate) || this.readNodeText(item.isoDate)
        ),
        identity:
          this.cleanText(this.readNodeText(item.guid)) ||
          this.resolveFeedLink(item.link, feed.url) ||
          `${feed.url}:${this.cleanText(this.readNodeText(item.title))}`
      }))
      .filter((item) => item.title.length > 0 && item.sourceUrl.length > 0);
  }

  private parseAtomItems(parsed: Record<string, unknown>, feed: FeedConfig): ParsedRawItem[] {
    const atom = this.asRecord(parsed.feed);
    const entries = this.toArray(atom?.entry)
      .map((item) => this.asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item));

    return entries
      .map((entry) => ({
        title: this.cleanText(this.readNodeText(entry.title)),
        summary: this.cleanText(
          this.readNodeText(entry.summary) || this.readNodeText(entry.content)
        ),
        sourceUrl: this.resolveAtomLink(entry.link, feed.url),
        publishedAt: this.parseDate(
          this.readNodeText(entry.published) || this.readNodeText(entry.updated)
        ),
        identity:
          this.cleanText(this.readNodeText(entry.id)) ||
          this.resolveAtomLink(entry.link, feed.url) ||
          `${feed.url}:${this.cleanText(this.readNodeText(entry.title))}`
      }))
      .filter((item) => item.title.length > 0 && item.sourceUrl.length > 0);
  }

  private toSoloSignal(sourceName: string, raw: ParsedRawItem): ParsedSoloSignal | null {
    const title = raw.title.trim();
    const summary = raw.summary?.trim() || "";
    const sourceUrl = raw.sourceUrl.trim();

    if (!title || !sourceUrl) {
      return null;
    }

    const merged = `${title} ${summary}`.toLowerCase();
    const hasAiKeyword = AI_KEYWORDS.some((keyword) => merged.includes(keyword));
    const hasIncomeKeyword = INCOME_KEYWORDS.some((keyword) => merged.includes(keyword));
    const hasBusinessKeyword = BUSINESS_KEYWORDS.some((keyword) => merged.includes(keyword));
    if (!hasAiKeyword || (!hasIncomeKeyword && !hasBusinessKeyword)) {
      return null;
    }

    const incomeSnippet = this.extractIncomeSnippet(title, summary);
    return {
      externalId: this.buildExternalId(sourceName, raw.identity, title),
      sourceName,
      title,
      summary: summary || undefined,
      sourceUrl,
      publishedAt: raw.publishedAt,
      incomeSnippet: incomeSnippet || undefined
    };
  }

  private extractIncomeSnippet(title: string, summary: string): string {
    const source = `${title} ${summary}`.replace(/\s+/g, " ").trim();
    if (!source) {
      return "";
    }

    const lower = source.toLowerCase();
    for (const keyword of INCOME_KEYWORDS) {
      const index = lower.indexOf(keyword);
      if (index >= 0) {
        const start = Math.max(0, index - 24);
        const end = Math.min(source.length, index + 90);
        return source.slice(start, end).trim().slice(0, 500);
      }
    }

    return source.slice(0, 120);
  }

  private buildExternalId(sourceName: string, identity: string, title: string): string {
    return createHash("sha256").update(`${sourceName}|${identity}|${title}`).digest("hex");
  }

  private resolveFeedLink(linkNode: unknown, feedUrl: string): string {
    if (typeof linkNode === "string") {
      return this.normalizeUrl(linkNode, feedUrl);
    }

    if (Array.isArray(linkNode)) {
      for (const node of linkNode) {
        const candidate = this.resolveFeedLink(node, feedUrl);
        if (candidate) {
          return candidate;
        }
      }
      return "";
    }

    if (linkNode && typeof linkNode === "object") {
      const linkRecord = linkNode as Record<string, unknown>;
      const text = this.readNodeText(linkRecord["#text"]);
      if (text) {
        return this.normalizeUrl(text, feedUrl);
      }
      const href = this.readNodeText(linkRecord["@_href"]);
      if (href) {
        return this.normalizeUrl(href, feedUrl);
      }
    }

    return "";
  }

  private resolveAtomLink(linkNode: unknown, feedUrl: string): string {
    if (typeof linkNode === "string") {
      return this.normalizeUrl(linkNode, feedUrl);
    }

    const candidates = this.toArray(linkNode)
      .map((item) => this.asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item));

    const preferred =
      candidates.find((item) => {
        const rel = this.readNodeText(item["@_rel"]);
        return !rel || rel === "alternate";
      }) ?? candidates[0];

    if (!preferred) {
      return "";
    }

    const href = this.readNodeText(preferred["@_href"]);
    if (!href) {
      return "";
    }

    return this.normalizeUrl(href, feedUrl);
  }

  private parseDate(value: string): Date {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
    return new Date();
  }

  private normalizeUrl(input: string, baseUrl: string): string {
    const trimmed = input.trim();
    if (!trimmed) {
      return "";
    }

    try {
      return new URL(trimmed, baseUrl).toString();
    } catch {
      return "";
    }
  }

  private resolveNameFromUrl(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "Solo Source";
    }
  }

  private readNodeText(value: unknown): string {
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number") {
      return String(value);
    }
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (typeof record["#text"] === "string") {
        return record["#text"];
      }
      if (typeof record["__cdata"] === "string") {
        return record["__cdata"];
      }
    }

    return "";
  }

  private stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, " ");
  }

  private cleanText(input: string): string {
    const withoutTags = input
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

  private resolvePositiveInt(name: string, fallback: number, min: number, max: number): number {
    const raw = this.configService.get<string>(name);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    return Math.min(Math.max(Math.trunc(parsed), min), max);
  }

  private isValidHttpUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  private toArray<T>(value: T | T[] | undefined): T[] {
    if (!value) {
      return [];
    }

    return Array.isArray(value) ? value : [value];
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }
}

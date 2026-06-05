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

interface ParsedFeedItem {
  externalId: string;
  sourceName: string;
  title: string;
  summary?: string;
  sourceUrl: string;
  publishedAt: Date;
}

interface ParsedFeedRawItem {
  title: string;
  summary?: string;
  sourceUrl: string;
  publishedAt: Date;
  identity: string;
}

export interface AiBriefIngestResult {
  inserted: number;
  fetched: number;
  sources: number;
  errors: number;
}

const DEFAULT_FEEDS: FeedConfig[] = [
  { name: "OpenAI News", url: "https://openai.com/news/rss.xml" },
  { name: "Google AI Blog", url: "https://blog.google/technology/ai/rss/" },
  { name: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml" },
  { name: "Microsoft Research", url: "https://www.microsoft.com/en-us/research/feed/" },
  { name: "NVIDIA Blog", url: "https://blogs.nvidia.com/feed/" }
];

@Injectable()
export class AiBriefIngestService {
  private readonly logger = new Logger(AiBriefIngestService.name);
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    trimValues: true
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  async ingestFromFeeds(): Promise<AiBriefIngestResult> {
    const feedConfigs = this.resolveFeedConfigs();
    const aggregate = new Map<string, ParsedFeedItem>();
    let errors = 0;

    for (const feed of feedConfigs) {
      try {
        const xml = await this.fetchFeedXml(feed.url);
        const records = this.parseFeed(xml, feed);
        for (const record of records) {
          if (!aggregate.has(record.externalId)) {
            aggregate.set(record.externalId, record);
          }
        }
      } catch (error) {
        errors += 1;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[AiBrief] feed failed: ${feed.name} (${feed.url}) -> ${message}`);
      }
    }

    const records = Array.from(aggregate.values());
    if (records.length === 0) {
      return {
        inserted: 0,
        fetched: 0,
        sources: feedConfigs.length,
        errors
      };
    }

    const now = new Date();
    const result = await this.prisma.aiBrief.createMany({
      data: records.map((record) => ({
        externalId: record.externalId,
        sourceName: record.sourceName,
        title: record.title,
        summary: record.summary,
        sourceUrl: record.sourceUrl,
        publishedAt: record.publishedAt,
        createdAt: now,
        updatedAt: now
      })),
      skipDuplicates: true
    });

    return {
      inserted: result.count,
      fetched: records.length,
      sources: feedConfigs.length,
      errors
    };
  }

  private resolveFeedConfigs(): FeedConfig[] {
    const envValue = this.configService.get<string>("AI_BRIEF_FEED_URLS")?.trim();
    if (!envValue) {
      return DEFAULT_FEEDS;
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

        const resolvedName = namePart.trim() || this.resolveFeedNameFromUrl(url);
        return {
          name: resolvedName,
          url
        };
      })
      .filter((item): item is FeedConfig => item !== null);

    return parsed.length > 0 ? parsed : DEFAULT_FEEDS;
  }

  private async fetchFeedXml(url: string): Promise<string> {
    const timeout = this.resolvePositiveInt("AI_BRIEF_FETCH_TIMEOUT_MS", 12000, 3000, 60000);
    const response = await axios.get<string>(url, {
      timeout,
      responseType: "text",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 RSSFetcher/1.0",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml"
      }
    });

    return response.data;
  }

  private parseFeed(xml: string, feed: FeedConfig): ParsedFeedItem[] {
    const maxPerFeed = this.resolvePositiveInt("AI_BRIEF_MAX_PER_FEED", 20, 1, 100);
    const parsed = this.parser.parse(xml) as Record<string, unknown>;
    const rssItems = this.parseRssItems(parsed, feed);
    const atomItems = this.parseAtomItems(parsed, feed);

    return [...rssItems, ...atomItems]
      .filter((item) => item.title && item.sourceUrl)
      .slice(0, maxPerFeed)
      .map((item) => ({
        externalId: this.buildExternalId(feed.name, item.identity, item.title),
        sourceName: feed.name,
        title: item.title,
        summary: item.summary,
        sourceUrl: item.sourceUrl,
        publishedAt: item.publishedAt
      }));
  }

  private parseRssItems(parsed: Record<string, unknown>, feed: FeedConfig): ParsedFeedRawItem[] {
    const rss = this.asRecord(parsed.rss);
    const channel = this.asRecord(rss?.channel);
    const items = this.toArray(channel?.item)
      .map((item) => this.asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item));

    return items
      .map((item) => {
        const title = this.cleanText(this.readNodeText(item.title));
        const sourceUrl = this.resolveFeedLink(item.link, feed.url);
        const identity =
          this.cleanText(this.readNodeText(item.guid)) || sourceUrl || `${feed.url}:${title}`;
        const summary = this.cleanText(
          this.readNodeText(item.description) || this.readNodeText(item["content:encoded"])
        );
        const publishedAt = this.parseDate(
          this.readNodeText(item.pubDate) || this.readNodeText(item.isoDate)
        );

        return {
          title,
          summary,
          sourceUrl,
          publishedAt,
          identity
        };
      })
      .filter((item) => item.title.length > 0 && item.sourceUrl.length > 0);
  }

  private parseAtomItems(parsed: Record<string, unknown>, feed: FeedConfig): ParsedFeedRawItem[] {
    const atom = this.asRecord(parsed.feed);
    const entries = this.toArray(atom?.entry)
      .map((item) => this.asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item));

    return entries
      .map((entry) => {
        const title = this.cleanText(this.readNodeText(entry.title));
        const sourceUrl = this.resolveAtomLink(entry.link, feed.url);
        const identity =
          this.cleanText(this.readNodeText(entry.id)) || sourceUrl || `${feed.url}:${title}`;
        const summary = this.cleanText(
          this.readNodeText(entry.summary) || this.readNodeText(entry.content)
        );
        const publishedAt = this.parseDate(
          this.readNodeText(entry.published) || this.readNodeText(entry.updated)
        );

        return {
          title,
          summary,
          sourceUrl,
          publishedAt,
          identity
        };
      })
      .filter((item) => item.title.length > 0 && item.sourceUrl.length > 0);
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

  private buildExternalId(sourceName: string, identity: string, title: string): string {
    return createHash("sha256").update(`${sourceName}|${identity}|${title}`).digest("hex");
  }

  private parseDate(value: string): Date {
    const candidate = new Date(value);
    if (!Number.isNaN(candidate.getTime())) {
      return candidate;
    }
    return new Date();
  }

  private cleanText(value: string): string {
    const withoutTags = value.replace(/<[^>]*>/g, " ");
    return withoutTags.replace(/\s+/g, " ").trim().slice(0, 2000);
  }

  private normalizeUrl(input: string, feedUrl: string): string {
    const trimmed = input.trim();
    if (!trimmed) {
      return "";
    }

    try {
      return new URL(trimmed, feedUrl).toString();
    } catch {
      return "";
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

  private resolveFeedNameFromUrl(url: string): string {
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, "");
      return hostname;
    } catch {
      return "AI Feed";
    }
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
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
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

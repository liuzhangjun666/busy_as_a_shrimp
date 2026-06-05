import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ContentStatus, ContentType, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { CreateContentDto } from "./dto/content.dto";
import { DoppelgangerService } from "../doppelganger/doppelganger.service";
import { ComplianceService } from "../compliance/compliance.service";

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly doppelgangerService: DoppelgangerService,
    private readonly compliance: ComplianceService
  ) {}

  async create(userId: bigint, payload: CreateContentDto) {
    const isDebugBypass = process.env.CONTENT_DEBUG_BYPASS_ENABLED === "true";

    if (!isDebugBypass) {
      await this.compliance.enforceWritePolicy({
        userId,
        scene: "content_generate",
        texts: [payload.prompt]
      });
    }

    // 尝试 AI 生成内容
    let generatedBody = "";
    try {
      generatedBody = await this.generateWithAi(payload.targetPlatform, payload.prompt);
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`AI Generation failed: ${errorMessage}`);
      // 无论是否是调试模式，这里都直接抛出错误，确保真实性
      throw new BadRequestException(`AI 生成失败: ${errorMessage}`);
    }

    // 在内容末尾增加 AI 生成标识和调试时间戳
    const timestamp = new Date().toLocaleTimeString();
    generatedBody += `\n\n[由 AI 生成] (Ver: ${timestamp})`;

    if (!isDebugBypass) {
      await this.compliance.checkText(generatedBody, { scene: "ai_generated_content" });

      this.logger.log(`User ${userId} generating content for ${payload.targetPlatform}`);

      await this.doppelgangerService.consumePoints(userId, 2.0, {
        action: "CONTENT_GENERATION",
        platform: payload.targetPlatform
      });
    }

    const created = await this.prisma.content.create({
      data: {
        userId,
        contentType: payload.contentType as ContentType,
        contentBody: generatedBody,
        targetPlatform: payload.targetPlatform,
        status: ContentStatus.pending,
        stats: {
          views: 0,
          likes: 0,
          inquiries: 0
        }
      }
    });

    return {
      contentId: Number(created.contentId),
      status: created.status,
      generatedBody
    };
  }

  private async generateWithAi(platform: string, prompt: string): Promise<string> {
    const systemPrompt = this.getSystemPrompt(platform);

    const minimaxApiKey = process.env.MINIMAX_API_KEY?.trim();
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY?.trim();

    if (minimaxApiKey) {
      try {
        this.logger.log(`Attempting generation with MiniMax for ${platform}`);
        return await this.callLlmApi({
          apiKey: minimaxApiKey,
          baseUrl: "https://api.minimax.chat/v1/chat/completions",
          model: "abab6.5s-chat",
          systemPrompt,
          userPrompt: prompt
        });
      } catch (error) {
        this.logger.warn(
          `MiniMax failed, falling back to DeepSeek: ${this.getErrorMessage(error)}`
        );
      }
    }

    if (deepseekApiKey) {
      return await this.callLlmApi({
        apiKey: deepseekApiKey,
        baseUrl: "https://api.deepseek.com/chat/completions",
        model: "deepseek-chat",
        systemPrompt,
        userPrompt: prompt
      });
    }

    throw new Error("未配置可用的 AI 生成服务密钥");
  }

  private async callLlmApi(options: {
    apiKey: string;
    baseUrl: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
  }): Promise<string> {
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
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`LLM API Error ${response.status}: ${detail}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  private getSystemPrompt(platform: string): string {
    let p = "你是一位专业的社交媒体文案专家。";
    if (platform.includes("小红书")) {
      p +=
        "你需要创作符合小红书风格的笔记：标题吸引人，正文包含丰富的 Emoji，分段清晰，末尾带上相关话题标签。";
    } else if (platform.includes("朋友圈") || platform.includes("微信")) {
      p += "你需要创作适合朋友圈的文案：语气亲切自然，精炼且有互动感，适合配图。";
    } else {
      p += `你需要针对 ${platform} 平台创作高质量文案。`;
    }
    return p;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return "未知错误";
  }

  async list(userId: bigint) {
    const records = await this.prisma.content.findMany({
      where: { userId },
      orderBy: { contentId: "desc" },
      take: 100
    });

    return records.map((item) => ({
      contentId: Number(item.contentId),
      contentType: item.contentType,
      targetPlatform: item.targetPlatform,
      status: item.status,
      contentBody: item.contentBody,
      publishedAt: item.publishedAt?.toISOString(),
      stats: this.normalizeStats(item.stats)
    }));
  }

  async publish(userId: bigint, id: number) {
    const content = await this.prisma.content.findUnique({
      where: { contentId: BigInt(id) }
    });
    if (!content || content.userId !== userId) {
      throw new BadRequestException("内容不存在或无权发布");
    }

    await this.compliance.enforceWritePolicy({
      userId,
      scene: "content_publish",
      texts: [content.contentBody]
    });

    const updated = await this.prisma.content.update({
      where: { contentId: content.contentId },
      data: {
        status: ContentStatus.published,
        publishedAt: new Date()
      }
    });

    return {
      contentId: Number(updated.contentId),
      status: updated.status,
      publishedAt: updated.publishedAt?.toISOString(),
      stats: this.normalizeStats(updated.stats)
    };
  }

  async trackStats(userId: bigint, id: number, event: "view" | "like" | "inquiry") {
    const content = await this.prisma.content.findUnique({
      where: { contentId: BigInt(id) }
    });
    if (!content || content.userId !== userId) {
      throw new BadRequestException("内容不存在或无权操作");
    }

    const stats = this.normalizeStats(content.stats);
    if (event === "view") stats.views += 1;
    if (event === "like") stats.likes += 1;
    if (event === "inquiry") stats.inquiries += 1;

    const updated = await this.prisma.content.update({
      where: { contentId: content.contentId },
      data: { stats: stats as Prisma.InputJsonValue }
    });

    return {
      contentId: Number(updated.contentId),
      stats
    };
  }

  private normalizeStats(raw: Prisma.JsonValue | null): {
    views: number;
    likes: number;
    inquiries: number;
  } {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const record = source as Record<string, unknown>;
    return {
      views: Number(record.views ?? 0),
      likes: Number(record.likes ?? 0),
      inquiries: Number(record.inquiries ?? 0)
    };
  }
}

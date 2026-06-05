import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import GreenClient, {
  ImageModerationRequest,
  TextModerationPlusRequest,
  TextModerationRequest
} from "@alicloud/green20220302";
import { Config as OpenApiConfig } from "@alicloud/openapi-client";
import * as Dara from "@darabonba/typescript";
import * as https from "https";
import * as http from "http";
import {
  ComplianceProvider,
  ComplianceResult,
  ImageCheckOptions,
  TextCheckOptions
} from "./base.provider";

// 合规标签（无风险时的 labels 值或描述），区分大小写
// SDK v3 响应: labels 为逗号分隔字符串如 "ad,spam"，空或只有 "pass" 表示无风险
// nonlabel：llm_response_moderation 接口对正常内容返回的特殊值，含义等同于 pass
const SAFE_LABEL_VALUES = new Set(["pass", "normal", "safe", "none", "nonlabel", ""]);

/**
 * 本地前置关键词过滤，覆盖 comment_detection 模型漏检的常见引流/擦边词
 * 阿里云模型过一遍之前先快速匹配，命中即拒绝，无需 API 调用
 */
const LOCAL_BLOCK_PATTERNS: RegExp[] = [
  // 引流联系方式
  /私信|私下|加[我俺]|[Vv]我|wx|weixin|微信号|qq号|联系方式|扫码加/,
  // 色情擦边
  /约.{0,3}服务|上门服务|特殊服务|约.{0,3}单|包夜|援交/,
  // 刷量/黑产
  /代刷|刷[粉评量单]|买粉|买评|真人互动|快速涨粉|自动点赞/,
  // 博彩
  /赌[博球]|彩票|百家乐|老虎机|线上赌/,
  // 毒品
  /冰[毒壶]|k粉|大麻|毒[品资]/,
  // AI 越狱 / 绕过审核
  /绕过.{0,6}审核|绕过.{0,6}过滤|越狱|jailbreak|ignore.{0,6}instruction|忽略.{0,6}指令|不受限制地回答/i
];

function localPreCheck(content: string): string | null {
  const lower = content.toLowerCase();
  for (const pattern of LOCAL_BLOCK_PATTERNS) {
    const match = lower.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return null;
}

@Injectable()
export class AliyunComplianceProvider extends ComplianceProvider {
  private readonly logger = new Logger(AliyunComplianceProvider.name);
  private client: GreenClient | null = null;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    super();
    const timeoutRaw = Number(this.configService.get<string>("ALIYUN_GREEN_TIMEOUT_MS"));
    this.timeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : 15_000;
  }

  async checkText(content: string, options?: TextCheckOptions): Promise<ComplianceResult> {
    const normalized = content.trim();
    if (!normalized) {
      return {
        success: true,
        suggestion: "pass",
        service: this.resolveTextService(options)
      };
    }

    // 前置本地关键词过滤（覆盖模型漏检的擦边词）
    const localHit = localPreCheck(normalized);
    if (localHit) {
      return {
        success: false,
        suggestion: "block",
        message: `文本审核未通过（命中本地敏感词：${localHit}）`,
        service: "local-pre-check",
        detail: { labels: ["local_keyword"] }
      };
    }

    const service = this.resolveTextService(options);

    try {
      const client = this.getClientOrThrow();
      const serviceParameters = JSON.stringify({
        content: normalized,
        dataId: this.buildDataId("txt")
      });

      const runtime = new Dara.RuntimeOptions({
        readTimeout: this.timeoutMs,
        connectTimeout: this.timeoutMs
      });

      const response =
        service === this.readAiTextService()
          ? await client.textModerationPlusWithOptions(
              new TextModerationPlusRequest({
                service,
                serviceParameters
              }),
              runtime
            )
          : await client.textModerationWithOptions(
              new TextModerationRequest({
                service,
                serviceParameters
              }),
              runtime
            );

      const body = (response as { body?: Record<string, unknown> }).body ?? {};
      const responseCode = Number((body.code as number | string | undefined) ?? 0);
      if (responseCode !== 200) {
        this.throwAliyunResponseError(responseCode, body, "text");
      }

      const moderationData = (body.data as Record<string, unknown> | undefined) ?? {};
      const labels = this.extractTextLabels(moderationData);
      const blockedByLabel = labels.some((label) => !SAFE_LABEL_VALUES.has(label));

      if (blockedByLabel) {
        return {
          success: false,
          suggestion: "block",
          message: `文本审核未通过（命中：${labels.join(", ")}）`,
          service,
          detail: {
            labels
          }
        };
      }

      return {
        success: true,
        suggestion: "pass",
        service,
        detail: {
          labels
        }
      };
    } catch (error: unknown) {
      this.throwMappedServiceError(error, "text");
    }
  }

  async checkImage(image: string, options?: ImageCheckOptions): Promise<ComplianceResult> {
    const imageUrl = image.trim();
    if (!imageUrl) {
      return {
        success: false,
        suggestion: "block",
        message: "图片地址不能为空",
        service: this.resolveImageService(options)
      };
    }

    const service = this.resolveImageService(options);

    try {
      const client = this.getClientOrThrow();

      // 代理下载验证图片可访问性（跟随 301/302/防盗链），获取最终可用 URL
      // 注意：baselineCheck 不支持 base64；imageSyncDetection 需单独开通账号权限
      // 策略：代理下载确认可访问后，始终以 imageUrl 传参给 baselineCheck
      let finalImageUrl = imageUrl;
      try {
        // 用代理下载来跟随跳转并验证可达性，但不传 base64
        await this.fetchImageAsBuffer(imageUrl);
        // 下载成功说明 URL 本身可访问，直接用原 URL 即可（阿里云可以拉到）
      } catch (downloadErr) {
        this.logger.warn(
          `[aliyun-image-moderation] 代理验证失败，直接传 URL，可能被阿里云拒绝: ${(downloadErr as Error).message}`
        );
      }

      const serviceParameters = JSON.stringify({
        imageUrl: finalImageUrl,
        dataId: this.buildDataId("img")
      });

      const request = new ImageModerationRequest({
        service,
        serviceParameters
      });

      const runtime = new Dara.RuntimeOptions({
        readTimeout: this.timeoutMs,
        connectTimeout: this.timeoutMs
      });
      const response = await client.imageModerationWithOptions(request, runtime);
      const body = (response as { body?: Record<string, unknown> }).body ?? {};
      const responseCode = Number((body.code as number | string | undefined) ?? 0);
      if (responseCode !== 200) {
        this.throwAliyunResponseError(responseCode, body, "image");
      }

      const moderationData = (body.data as Record<string, unknown> | undefined) ?? {};
      const labels = this.extractImageLabels(moderationData);
      const blockedByLabel = labels.some((label) => !SAFE_LABEL_VALUES.has(label));

      if (blockedByLabel) {
        return {
          success: false,
          suggestion: "block",
          message: `图片审核未通过（命中：${labels.join(", ")}）`,
          service,
          detail: {
            labels
          }
        };
      }

      return {
        success: true,
        suggestion: "pass",
        service,
        detail: {
          labels
        }
      };
    } catch (error: unknown) {
      this.throwMappedServiceError(error, "image");
    }
  }

  /**
   * 代理下载图片为 Buffer，自动跟随最多 5 次 301/302 跳转
   */
  private fetchImageAsBuffer(url: string, maxRedirects = 5): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const follow = (currentUrl: string, remaining: number) => {
        const protocol = currentUrl.startsWith("https") ? https : http;
        const req = protocol.get(
          currentUrl,
          {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; AliyunContentModeration/1.0)",
              Accept: "image/*,*/*"
            },
            timeout: this.timeoutMs
          },
          (res) => {
            // 处理跳转
            if (
              res.statusCode &&
              [301, 302, 303, 307, 308].includes(res.statusCode) &&
              res.headers.location
            ) {
              res.resume();
              if (remaining <= 0) {
                return reject(new Error(`图片 URL 重定向次数超限: ${currentUrl}`));
              }
              const next = res.headers.location.startsWith("http")
                ? res.headers.location
                : new URL(res.headers.location, currentUrl).href;
              return follow(next, remaining - 1);
            }

            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
              res.resume();
              return reject(new Error(`图片下载失败 HTTP ${res.statusCode}: ${currentUrl}`));
            }

            const chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => chunks.push(chunk));
            res.on("end", () => resolve(Buffer.concat(chunks)));
            res.on("error", reject);
          }
        );
        req.on("error", reject);
        req.on("timeout", () => {
          req.destroy();
          reject(new Error(`图片下载超时: ${currentUrl}`));
        });
      };
      follow(url, maxRedirects);
    });
  }

  getName(): string {
    return "aliyun-green";
  }

  private getClientOrThrow(): GreenClient {
    if (this.client) {
      return this.client;
    }

    const accessKeyId = this.configService.get<string>("ALIYUN_ACCESS_KEY_ID")?.trim();
    const accessKeySecret = this.configService.get<string>("ALIYUN_ACCESS_KEY_SECRET")?.trim();
    if (!accessKeyId || !accessKeySecret) {
      throw new BadRequestException("内容审核服务配置异常，请联系管理员");
    }

    const endpoint =
      this.configService.get<string>("ALIYUN_GREEN_ENDPOINT")?.trim() ||
      "green-cip.cn-shanghai.aliyuncs.com";
    const regionId = "cn-shanghai";

    this.client = new GreenClient(
      new OpenApiConfig({
        accessKeyId,
        accessKeySecret,
        endpoint,
        regionId,
        readTimeout: this.timeoutMs,
        connectTimeout: this.timeoutMs
      })
    );

    return this.client;
  }

  private resolveTextService(options?: TextCheckOptions): string {
    if (options?.scene === "ai_generated_content") {
      return this.readAiTextService();
    }
    return this.readTextService();
  }

  private readTextService(): string {
    return (
      this.configService.get<string>("ALIYUN_GREEN_TEXT_SERVICE")?.trim() || "comment_detection"
    );
  }

  private readAiTextService(): string {
    return (
      this.configService.get<string>("ALIYUN_GREEN_AI_TEXT_SERVICE")?.trim() ||
      "llm_response_moderation"
    );
  }

  private resolveImageService(options?: ImageCheckOptions): string {
    if (options?.scene === "avatar") {
      return (
        this.configService.get<string>("ALIYUN_GREEN_IMAGE_SERVICE_AVATAR")?.trim() ||
        "profilePhotoCheck"
      );
    }

    return (
      this.configService.get<string>("ALIYUN_GREEN_IMAGE_SERVICE_GENERIC")?.trim() ||
      "baselineCheck"
    );
  }

  private extractTextLabels(moderationData: Record<string, unknown>): string[] {
    const labelsFromString = String(moderationData.labels ?? "")
      .split(",")
      .map((item) => this.normalizeToken(item))
      .filter((item): item is string => Boolean(item));

    const resultArray = Array.isArray(moderationData.result)
      ? (moderationData.result as Array<Record<string, unknown>>)
      : [];
    const labelsFromArray = resultArray
      .map((item) => this.normalizeToken(item.label))
      .filter((item): item is string => Boolean(item));

    return [...new Set([...labelsFromString, ...labelsFromArray])];
  }

  private extractImageLabels(moderationData: Record<string, unknown>): string[] {
    const resultArray = Array.isArray(moderationData.result)
      ? (moderationData.result as Array<Record<string, unknown>>)
      : [];

    return [
      ...new Set(
        resultArray
          .map((item) => this.normalizeToken(item.label))
          .filter((item): item is string => Boolean(item))
      )
    ];
  }

  private normalizeToken(value: unknown): string | null {
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();
    return normalized ? normalized : null;
  }

  private buildDataId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private throwAliyunResponseError(
    responseCode: number,
    body: Record<string, unknown>,
    scene: "text" | "image"
  ): never {
    const message = this.extractServiceResponseMessage(body);
    this.logger.warn(
      `[aliyun-${scene}-moderation] non-200 response code=${responseCode} message=${message}`
    );

    if (this.isArrearsMessage(responseCode, message)) {
      throw new BadRequestException(
        "Content moderation account is unavailable (arrears or missing permission)"
      );
    }

    if (responseCode === 401 || responseCode === 403) {
      throw new BadRequestException(
        "Content moderation permission denied. Please check access key and service authorization"
      );
    }

    throw new BadRequestException(
      scene === "image"
        ? "Image moderation service is temporarily unavailable, please retry later"
        : "Content moderation service is temporarily unavailable, please retry later"
    );
  }

  private extractServiceResponseMessage(body: Record<string, unknown>): string {
    const dataMessage =
      body.data && typeof body.data === "object"
        ? String((body.data as Record<string, unknown>).message ?? "")
        : "";

    const candidates = [
      String(body.message ?? ""),
      String(body.msg ?? ""),
      dataMessage,
      String(body.code ?? "")
    ]
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return candidates[0] ?? "unknown_error";
  }

  private isArrearsMessage(responseCode: number, message: string): boolean {
    if (responseCode !== 408) {
      return false;
    }

    const normalized = message.toLowerCase();
    return (
      normalized.includes("arrears") ||
      normalized.includes("in arrears") ||
      normalized.includes("insufficient balance") ||
      normalized.includes("recharge") ||
      normalized.includes("no permission") ||
      normalized.includes("forbidden")
    );
  }

  private throwMappedServiceError(error: unknown, scene: "text" | "image"): never {
    if (error instanceof BadRequestException) {
      throw error;
    }

    const code = this.extractErrorCode(error);
    const message = this.extractErrorMessage(error);
    this.logger.warn(`[aliyun-${scene}-moderation] code=${code ?? "unknown"} message=${message}`);

    if (this.isConfigError(code)) {
      throw new BadRequestException("内容审核服务配置异常，请联系管理员");
    }

    throw new BadRequestException(
      scene === "image" ? "图片审核服务暂不可用，请稍后重试" : "内容审核服务暂不可用，请稍后重试"
    );
  }

  private extractErrorCode(error: unknown): string | null {
    if (!error || typeof error !== "object") {
      return null;
    }

    const maybeCode = (error as { code?: unknown }).code;
    if (typeof maybeCode === "string" && maybeCode.trim()) {
      return maybeCode.trim();
    }

    const dataCode = (error as { data?: { Code?: unknown } }).data?.Code;
    if (typeof dataCode === "string" && dataCode.trim()) {
      return dataCode.trim();
    }

    return null;
  }

  private extractErrorMessage(error: unknown): string {
    if (!error || typeof error !== "object") {
      return String(error);
    }

    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }

    const dataMessage = (error as { data?: { Message?: unknown } }).data?.Message;
    if (typeof dataMessage === "string" && dataMessage.trim()) {
      return dataMessage.trim();
    }

    return "unknown_error";
  }

  private isConfigError(code: string | null): boolean {
    if (!code) {
      return false;
    }

    return (
      code.startsWith("InvalidAccessKeyId") ||
      code.startsWith("SignatureDoesNotMatch") ||
      code.startsWith("MissingAccessKey") ||
      code.startsWith("Unauthorized") ||
      code.startsWith("NoPermission") ||
      code.startsWith("Forbidden")
    );
  }
}

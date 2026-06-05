import { Injectable } from "@nestjs/common";
import {
  ComplianceProvider,
  ComplianceResult,
  ImageCheckOptions,
  TextCheckOptions
} from "./base.provider";

@Injectable()
export class LocalComplianceProvider extends ComplianceProvider {
  /**
   * 本地兜底敏感词库（开发/故障排查用）
   */
  private readonly sensitiveWords: string[] = [
    "违规",
    "禁止",
    "色情",
    "暴力",
    "博彩",
    "外网",
    "联系方式",
    "微信号",
    "QQ号",
    "加我",
    "私下交易",
    "代刷",
    "套现",
    "虚假宣传",
    "欺诈",
    "枪支",
    "毒品"
  ];

  async checkText(content: string, _options?: TextCheckOptions): Promise<ComplianceResult> {
    const found = this.sensitiveWords.find((word) => content.includes(word));
    if (found) {
      return {
        success: false,
        message: `内容包含敏感词汇: ${found}`,
        suggestion: "block",
        service: "local-keyword-check"
      };
    }

    return {
      success: true,
      suggestion: "pass",
      service: "local-keyword-check"
    };
  }

  async checkImage(image: string, _options?: ImageCheckOptions): Promise<ComplianceResult> {
    if (!image.startsWith("http") && !image.startsWith("base64")) {
      return {
        success: false,
        message: "无效的图片地址或格式",
        suggestion: "block",
        service: "local-image-check"
      };
    }

    return {
      success: true,
      suggestion: "pass",
      service: "local-image-check"
    };
  }

  getName(): string {
    return "local-keyword-scanner";
  }
}

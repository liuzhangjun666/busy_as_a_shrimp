export interface ComplianceResult {
  success: boolean;
  message?: string;
  suggestion?: "pass" | "block" | "review";
  service?: string;
  detail?: Record<string, unknown>;
}

export interface TextCheckOptions {
  scene?: string;
}

export interface ImageCheckOptions {
  scene?: "avatar" | "generic";
}

export abstract class ComplianceProvider {
  /**
   * 检查文本内容是否合规
   * @param content 待检查的文本
   */
  abstract checkText(content: string, options?: TextCheckOptions): Promise<ComplianceResult>;

  /**
   * 检查图片 URL 或 Base64 是否合规
   * @param image 待检查的图片标识
   */
  abstract checkImage(image: string, options?: ImageCheckOptions): Promise<ComplianceResult>;

  /**
   * 获取 Provider 名称
   */
  abstract getName(): string;
}

import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as TencentSms from "tencentcloud-sdk-nodejs-sms";

interface SmsSendStatus {
  Code?: string;
  Message?: string;
  PhoneNumber?: string;
  SerialNo?: string;
  Fee?: number;
  SessionContext?: string;
  IsoCode?: string;
}

interface SmsSendResponse {
  RequestId?: string;
  SendStatusSet?: SmsSendStatus[];
}

interface SmsClient {
  SendSms(params: {
    SmsSdkAppId: string;
    SignName: string;
    TemplateId: string;
    PhoneNumberSet: string[];
    TemplateParamSet?: string[];
  }): Promise<SmsSendResponse>;
}

type SmsClientType = SmsClient;

interface SmsConfigSnapshot {
  secretId: string;
  secretKey: string;
  smsSdkAppId: string;
  signName: string;
  templateId: string;
  region: string;
  endpoint: string;
  timeoutSeconds: number;
}

@Injectable()
export class SmsVerificationService {
  private readonly logger = new Logger(SmsVerificationService.name);
  private client: SmsClientType | null = null;
  private cachedConfig: SmsConfigSnapshot | null = null;

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return this.tryReadSmsConfig() !== null;
  }

  async sendVerificationCode(phone: string, code: string): Promise<void> {
    const config = this.requireSmsConfig();
    const client = this.getClient(config);

    try {
      const response = await client.SendSms({
        SmsSdkAppId: config.smsSdkAppId,
        SignName: config.signName,
        TemplateId: config.templateId,
        PhoneNumberSet: [this.toE164Phone(phone)],
        TemplateParamSet: this.buildTemplateParamSet(code)
      });

      const status = response.SendStatusSet?.[0];
      if (!status) {
        throw new BadGatewayException("短信服务暂时不可用，请稍后重试");
      }

      if (status.Code !== "Ok") {
        this.logger.warn(
          `Sms send rejected code=${status.Code ?? "unknown"} requestId=${response.RequestId ?? "-"} phone=${this.maskPhone(phone)}`
        );
        throw this.mapSendStatusToException(status.Code);
      }
    } catch (error: unknown) {
      if (
        error instanceof HttpException ||
        error instanceof BadGatewayException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      const sdkError = error as { code?: string; requestId?: string };
      this.logger.warn(
        `Sms sdk failed code=${sdkError?.code ?? "unknown"} requestId=${sdkError?.requestId ?? "-"} phone=${this.maskPhone(phone)}`
      );
      throw this.mapSdkErrorToException(sdkError?.code);
    }
  }

  private getClient(config: SmsConfigSnapshot): SmsClient {
    if (this.client) {
      return this.client;
    }

    this.client = new TencentSms.sms.v20210111.Client({
      credential: {
        secretId: config.secretId,
        secretKey: config.secretKey
      },
      region: config.region,
      profile: {
        signMethod: "TC3-HMAC-SHA256",
        httpProfile: {
          endpoint: config.endpoint,
          reqMethod: "POST",
          reqTimeout: config.timeoutSeconds
        }
      }
    });

    return this.client;
  }

  private mapSendStatusToException(code?: string): HttpException {
    if (!code) {
      return new BadGatewayException("短信服务暂时不可用，请稍后重试");
    }

    if (code.startsWith("LimitExceeded")) {
      return new HttpException("短信发送过于频繁，请稍后再试", HttpStatus.TOO_MANY_REQUESTS);
    }

    if (
      code === "FailedOperation.SignatureIncorrectOrUnapproved" ||
      code === "FailedOperation.TemplateIncorrectOrUnapproved"
    ) {
      return new InternalServerErrorException("短信签名或模板未通过审核，请联系管理员");
    }

    return new BadGatewayException("短信服务暂时不可用，请稍后重试");
  }

  private mapSdkErrorToException(code?: string): HttpException {
    if (!code) {
      return new BadGatewayException("短信服务暂时不可用，请稍后重试");
    }

    if (code === "RequestLimitExceeded" || code.startsWith("LimitExceeded")) {
      return new HttpException("短信发送过于频繁，请稍后再试", HttpStatus.TOO_MANY_REQUESTS);
    }

    if (
      code.startsWith("AuthFailure") ||
      code.startsWith("UnauthorizedOperation") ||
      code === "FailedOperation.SignatureIncorrectOrUnapproved" ||
      code === "FailedOperation.TemplateIncorrectOrUnapproved"
    ) {
      return new InternalServerErrorException("短信服务配置错误，请联系管理员");
    }

    return new BadGatewayException("短信服务暂时不可用，请稍后重试");
  }

  // 统一读取并校验短信配置，避免遗漏某个变量时出现难定位的 500。
  private requireSmsConfig(): SmsConfigSnapshot {
    const config = this.tryReadSmsConfig();
    if (config) {
      return config;
    }

    const missing = this.getMissingConfigKeys();
    if (this.configService.get<string>("NODE_ENV")?.trim() === "development") {
      throw new InternalServerErrorException(
        `短信服务未配置，请在 .env 补充: ${missing.join(", ")}`
      );
    }

    throw new InternalServerErrorException("短信服务未配置，请联系管理员");
  }

  private tryReadSmsConfig(): SmsConfigSnapshot | null {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    const secretId = this.configService.get<string>("TENCENTCLOUD_SECRET_ID")?.trim();
    const secretKey = this.configService.get<string>("TENCENTCLOUD_SECRET_KEY")?.trim();
    const smsSdkAppId = this.configService.get<string>("TENCENTCLOUD_SMS_SDK_APP_ID")?.trim();
    const signName = this.configService.get<string>("TENCENTCLOUD_SMS_SIGN_NAME")?.trim();
    const templateId = this.configService.get<string>("TENCENTCLOUD_SMS_TEMPLATE_ID")?.trim();
    const region =
      this.configService.get<string>("TENCENTCLOUD_SMS_REGION")?.trim() || "ap-guangzhou";
    const endpoint =
      this.configService.get<string>("TENCENTCLOUD_SMS_ENDPOINT")?.trim() ||
      "sms.tencentcloudapi.com";
    const timeoutSeconds = this.resolveTimeoutSeconds();

    if (
      !secretId ||
      !secretKey ||
      !smsSdkAppId ||
      !signName ||
      !templateId ||
      this.isPlaceholderValue(secretId) ||
      this.isPlaceholderValue(secretKey) ||
      this.isPlaceholderValue(smsSdkAppId) ||
      this.isPlaceholderValue(signName) ||
      this.isPlaceholderValue(templateId)
    ) {
      return null;
    }

    this.cachedConfig = {
      secretId,
      secretKey,
      smsSdkAppId,
      signName,
      templateId,
      region,
      endpoint,
      timeoutSeconds
    };
    return this.cachedConfig;
  }

  private resolveTimeoutSeconds(): number {
    const configured = Number(this.configService.get<string>("TENCENTCLOUD_SMS_TIMEOUT"));
    return Number.isFinite(configured) && configured > 0 ? configured : 15;
  }

  private getMissingConfigKeys(): string[] {
    const requiredKeys = [
      "TENCENTCLOUD_SECRET_ID",
      "TENCENTCLOUD_SECRET_KEY",
      "TENCENTCLOUD_SMS_SDK_APP_ID",
      "TENCENTCLOUD_SMS_SIGN_NAME",
      "TENCENTCLOUD_SMS_TEMPLATE_ID"
    ];

    return requiredKeys.filter((key) => {
      const value = this.configService.get<string>(key)?.trim();
      return !value || this.isPlaceholderValue(value);
    });
  }

  private isPlaceholderValue(value: string): boolean {
    return value.toLowerCase().startsWith("replace_with_");
  }

  private toE164Phone(phone: string): string {
    const normalized = phone.trim();
    if (normalized.startsWith("+")) {
      return normalized;
    }
    return `+86${normalized}`;
  }

  private maskPhone(phone: string): string {
    const normalized = phone.trim();
    if (normalized.length < 7) {
      return "***";
    }
    return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`;
  }

  private buildTemplateParamSet(code: string): string[] {
    const extraParamsRaw = this.configService
      .get<string>("TENCENTCLOUD_SMS_TEMPLATE_EXTRA_PARAMS")
      ?.trim();

    if (!extraParamsRaw) {
      return [code];
    }

    const extras = extraParamsRaw
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return [code, ...extras];
  }
}

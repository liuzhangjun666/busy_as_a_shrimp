import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as TencentFaceid from "tencentcloud-sdk-nodejs-faceid";

interface IdentityVerificationResult {
  verified: boolean;
  resultCode: string;
  description: string;
  requestId?: string;
}

interface FaceIdVerificationResponse {
  Result?: string | number;
  Description?: string;
  RequestId?: string;
}

interface FaceIdClient {
  IdCardVerification(params: { Name: string; IdCard: string }): Promise<FaceIdVerificationResponse>;
}

interface FaceIdSdkClientConstructor {
  new (config: {
    credential: {
      secretId: string;
      secretKey: string;
    };
    region: string;
    profile: {
      signMethod: string;
      httpProfile: {
        endpoint: string;
        reqMethod: "POST";
        reqTimeout: number;
      };
    };
  }): FaceIdClient;
}

@Injectable()
export class IdentityVerificationService {
  private readonly logger = new Logger(IdentityVerificationService.name);
  private client: FaceIdClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  async verifyNameAndIdCard(name: string, idCard: string): Promise<IdentityVerificationResult> {
    const client = this.getClient();

    try {
      // 腾讯云 FaceID 二要素：姓名 + 身份证号核验
      const response = await client.IdCardVerification({
        Name: name,
        IdCard: idCard
      });

      const resultCode = String(response.Result ?? "");
      const description = response.Description ?? "";

      if (resultCode === "0") {
        return {
          verified: true,
          resultCode,
          description,
          requestId: response.RequestId
        };
      }

      if (resultCode === "-7") {
        throw new HttpException("今日身份核验额度已用尽，请稍后再试", HttpStatus.TOO_MANY_REQUESTS);
      }

      if (resultCode === "-4" || resultCode === "-6") {
        throw new BadGatewayException("身份核验服务暂时不可用，请稍后重试");
      }

      return {
        verified: false,
        resultCode,
        description,
        requestId: response.RequestId
      };
    } catch (error: unknown) {
      const sdkError = error as {
        code?: string;
        message?: string;
        requestId?: string;
      };

      if (sdkError?.code === "RequestLimitExceeded") {
        throw new HttpException("身份核验请求过于频繁，请稍后再试", HttpStatus.TOO_MANY_REQUESTS);
      }

      if (
        sdkError?.code === "AuthFailure.SecretIdNotFound" ||
        sdkError?.code === "AuthFailure.SignatureFailure" ||
        sdkError?.code === "AuthFailure.TokenFailure"
      ) {
        throw new BadGatewayException("身份核验服务配置错误，请联系管理员检查密钥");
      }

      if (
        sdkError?.code === "FailedOperation.ServiceNotActivated" ||
        sdkError?.code === "ResourceUnavailable.ServiceNotOpened"
      ) {
        throw new BadGatewayException("腾讯云身份核验服务未开通或不可用，请先确认服务状态");
      }

      if (error instanceof HttpException || error instanceof BadGatewayException) {
        throw error;
      }

      this.logger.warn(
        `FaceID call failed code=${sdkError?.code ?? "unknown"} requestId=${sdkError?.requestId ?? "-"} idMask=${this.maskIdCard(idCard)}`
      );
      throw new BadGatewayException("身份核验服务暂时不可用，请稍后重试");
    }
  }

  private getClient(): FaceIdClient {
    if (this.client) {
      return this.client;
    }

    const secretId = this.configService.get<string>("TENCENTCLOUD_SECRET_ID")?.trim();
    const secretKey = this.configService.get<string>("TENCENTCLOUD_SECRET_KEY")?.trim();
    const region =
      this.configService.get<string>("TENCENTCLOUD_FACEID_REGION")?.trim() || "ap-beijing";
    const endpoint =
      this.configService.get<string>("TENCENTCLOUD_FACEID_ENDPOINT")?.trim() ||
      "faceid.tencentcloudapi.com";
    const requestTimeoutSeconds = this.resolveTimeoutSeconds();

    if (!secretId || !secretKey) {
      throw new InternalServerErrorException("身份核验服务未配置，请联系管理员");
    }

    const faceidSdk = TencentFaceid as {
      faceid?: {
        v20180301?: {
          Client?: FaceIdSdkClientConstructor;
        };
      };
    };
    const FaceIdClientCtor = faceidSdk.faceid?.v20180301?.Client;
    if (!FaceIdClientCtor) {
      throw new InternalServerErrorException("腾讯云身份核验 SDK 加载失败，请检查依赖安装");
    }

    const client = new FaceIdClientCtor({
      credential: {
        secretId,
        secretKey
      },
      region,
      profile: {
        signMethod: "TC3-HMAC-SHA256",
        httpProfile: {
          endpoint,
          reqMethod: "POST",
          reqTimeout: requestTimeoutSeconds
        }
      }
    }) as FaceIdClient;
    this.client = client;
    return client;
  }

  private resolveTimeoutSeconds(): number {
    const configured = Number(this.configService.get<string>("TENCENTCLOUD_FACEID_TIMEOUT"));
    return Number.isFinite(configured) && configured > 0 ? configured : 30;
  }

  private maskIdCard(idCard: string): string {
    if (idCard.length <= 8) {
      return "***";
    }
    return `${idCard.slice(0, 4)}****${idCard.slice(-4)}`;
  }
}

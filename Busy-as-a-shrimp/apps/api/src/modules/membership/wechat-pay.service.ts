import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger
} from "@nestjs/common";
import { createDecipheriv, createSign, createVerify, randomBytes } from "crypto";
import { existsSync, readFileSync } from "fs";

function readEnvValue(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }
  return "";
}

function readPemFromEnvOrPath(valueNames: string[], pathNames: string[]): string {
  const inlinePem = readEnvValue(...valueNames);
  if (inlinePem) {
    return inlinePem.replace(/\\n/g, "\n");
  }

  const pemPath = readEnvValue(...pathNames);
  if (!pemPath || !existsSync(pemPath)) {
    return "";
  }

  return readFileSync(pemPath, "utf8");
}

interface CreateNativeOrderInput {
  outTradeNo: string;
  description: string;
  totalAmountFen: number;
}

interface WechatTransaction {
  out_trade_no: string;
  transaction_id: string;
  trade_state: string;
  success_time?: string;
}

interface WechatNotifyResource {
  algorithm: string;
  ciphertext: string;
  nonce: string;
  associated_data?: string;
}

interface WechatNotifyBody {
  id: string;
  event_type: string;
  resource_type: string;
  resource: WechatNotifyResource;
}

@Injectable()
export class WechatPayService {
  private readonly logger = new Logger(WechatPayService.name);
  private readonly gateway = process.env.WECHAT_PAY_GATEWAY ?? "https://api.mch.weixin.qq.com";
  private readonly appId = readEnvValue("WECHAT_PAY_APP_ID", "WECHAT_APPID");
  private readonly mchId = readEnvValue("WECHAT_PAY_MCH_ID", "WECHAT_MCHID");
  private readonly mchSerialNo = readEnvValue("WECHAT_PAY_MCH_SERIAL_NO", "WECHAT_CERT_SERIAL");
  private readonly notifyUrl = readEnvValue("WECHAT_PAY_NOTIFY_URL", "WECHAT_NOTIFY_URL");
  private readonly privateKeyPem = readPemFromEnvOrPath(
    ["WECHAT_PAY_PRIVATE_KEY", "WECHAT_PRIVATE_KEY"],
    ["WECHAT_PAY_PRIVATE_KEY_PATH", "WECHAT_CERT_PATH"]
  );
  private readonly publicKeyPem = readPemFromEnvOrPath(
    ["WECHAT_PAY_PUBLIC_KEY", "WECHAT_PUBLIC_KEY", "WECHAT_PLATFORM_PUBLIC_KEY"],
    ["WECHAT_PAY_PUBLIC_KEY_PATH", "WECHAT_PUBLIC_KEY_PATH", "WECHAT_PLATFORM_PUBLIC_KEY_PATH"]
  );
  private readonly apiV3Key = readEnvValue("WECHAT_PAY_API_V3_KEY", "WECHAT_API_V3_KEY");

  async createNativeOrder(input: CreateNativeOrderInput): Promise<string> {
    this.requireOrderConfigOrThrow();

    const path = "/v3/pay/transactions/native";
    const payload = {
      appid: this.appId,
      mchid: this.mchId,
      description: input.description,
      out_trade_no: input.outTradeNo,
      notify_url: this.notifyUrl,
      amount: {
        total: input.totalAmountFen,
        currency: "CNY"
      }
    };

    const { status, body } = await this.requestWechat("POST", path, payload);

    if (status < 200 || status >= 300) {
      throw new InternalServerErrorException(
        `微信下单失败: ${body.code ?? "UNKNOWN"} ${body.message ?? "unknown"}`
      );
    }

    const codeUrl = body.code_url as string | undefined;
    if (!codeUrl) {
      throw new InternalServerErrorException("微信下单失败: 未返回 code_url");
    }
    return codeUrl;
  }

  async queryTransactionByOutTradeNo(outTradeNo: string): Promise<WechatTransaction | null> {
    this.requireOrderConfigOrThrow();
    const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${encodeURIComponent(this.mchId)}`;
    const { status, body } = await this.requestWechat("GET", path);
    if (status === 404) {
      return null;
    }
    if (status < 200 || status >= 300) {
      this.logger.warn(`Query transaction failed: status=${status}, body=${JSON.stringify(body)}`);
      return null;
    }

    if (
      typeof body.out_trade_no !== "string" ||
      typeof body.transaction_id !== "string" ||
      typeof body.trade_state !== "string"
    ) {
      this.logger.warn(`Query transaction shape invalid: ${JSON.stringify(body)}`);
      return null;
    }

    return {
      out_trade_no: body.out_trade_no,
      transaction_id: body.transaction_id,
      trade_state: body.trade_state,
      success_time: typeof body.success_time === "string" ? body.success_time : undefined
    };
  }

  verifyCallbackSignature(headers: Record<string, string | string[] | undefined>, rawBody: string) {
    this.requireCallbackConfigOrThrow();
    const timestamp = this.readHeader(headers, "wechatpay-timestamp");
    const nonce = this.readHeader(headers, "wechatpay-nonce");
    const signature = this.readHeader(headers, "wechatpay-signature");

    if (!timestamp || !nonce || !signature) {
      throw new BadRequestException("微信支付回调签名头缺失");
    }

    const message = `${timestamp}\n${nonce}\n${rawBody}\n`;
    const verifier = createVerify("RSA-SHA256");
    verifier.update(message);
    verifier.end();

    const ok = verifier.verify(this.publicKeyPem, signature, "base64");
    if (!ok) {
      throw new BadRequestException("微信支付回调签名验证失败");
    }
  }

  decryptCallbackBody(body: WechatNotifyBody): WechatTransaction {
    const resource = body.resource;
    if (!resource || resource.algorithm !== "AEAD_AES_256_GCM") {
      throw new BadRequestException("微信支付回调加密算法不支持");
    }
    if (!this.apiV3Key || this.apiV3Key.length !== 32) {
      throw new InternalServerErrorException("WECHAT_PAY_API_V3_KEY 未配置或长度不是 32");
    }

    const ciphertext = Buffer.from(resource.ciphertext, "base64");
    const nonce = Buffer.from(resource.nonce, "utf8");
    const aad = Buffer.from(resource.associated_data ?? "", "utf8");

    const authTag = ciphertext.subarray(ciphertext.length - 16);
    const encrypted = ciphertext.subarray(0, ciphertext.length - 16);
    const decipher = createDecipheriv("aes-256-gcm", Buffer.from(this.apiV3Key, "utf8"), nonce);
    decipher.setAuthTag(authTag);
    decipher.setAAD(aad);

    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    return JSON.parse(plain) as WechatTransaction;
  }

  private async requestWechat(
    method: "GET" | "POST",
    path: string,
    payload?: Record<string, unknown>
  ): Promise<{ status: number; body: Record<string, unknown> }> {
    const bodyText = payload ? JSON.stringify(payload) : "";
    const url = `${this.gateway}${path}`;
    const authorization = this.buildAuthorization(method, path, bodyText);

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: authorization,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "busy-as-a-shrimp/1.0"
      },
      body: method === "POST" ? bodyText : undefined
    });

    const responseText = await response.text();
    let parsed: Record<string, unknown> = {};
    if (responseText.trim()) {
      try {
        parsed = JSON.parse(responseText) as Record<string, unknown>;
      } catch {
        parsed = { raw: responseText };
      }
    }

    return { status: response.status, body: parsed };
  }

  private buildAuthorization(method: string, pathWithQuery: string, bodyText: string): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = randomBytes(16).toString("hex");
    const message = `${method}\n${pathWithQuery}\n${timestamp}\n${nonce}\n${bodyText}\n`;

    const signer = createSign("RSA-SHA256");
    signer.update(message);
    signer.end();
    const signature = signer.sign(this.privateKeyPem, "base64");

    return `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.mchSerialNo}"`;
  }

  private requireOrderConfigOrThrow(): void {
    const missing: string[] = [];
    if (!this.appId) missing.push("WECHAT_APPID / WECHAT_PAY_APP_ID");
    if (!this.mchId) missing.push("WECHAT_MCHID / WECHAT_PAY_MCH_ID");
    if (!this.mchSerialNo) missing.push("WECHAT_CERT_SERIAL / WECHAT_PAY_MCH_SERIAL_NO");
    if (!this.privateKeyPem) missing.push("WECHAT_CERT_PATH / WECHAT_PAY_PRIVATE_KEY");
    if (!this.notifyUrl) missing.push("WECHAT_NOTIFY_URL / WECHAT_PAY_NOTIFY_URL");
    if (!this.apiV3Key) missing.push("WECHAT_API_V3_KEY / WECHAT_PAY_API_V3_KEY");

    if (missing.length > 0) {
      throw new InternalServerErrorException(
        `微信支付配置不完整，请补充: ${missing.join(", ")}`
      );
    }
  }

  private requireCallbackConfigOrThrow(): void {
    if (!this.publicKeyPem) {
      throw new InternalServerErrorException(
        "微信支付回调验签缺少平台公钥，请补充 WECHAT_PUBLIC_KEY 或 WECHAT_PAY_PUBLIC_KEY"
      );
    }
  }

  private readHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string
  ): string | undefined {
    const value = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }
}

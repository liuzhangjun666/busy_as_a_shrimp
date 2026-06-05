import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";
import { Request } from "express";

@Injectable()
export class DeerFlowSignatureGuard implements CanActivate {
  private readonly secret = process.env.DEERFLOW_CALLBACK_SECRET?.trim() ?? "";
  private readonly callbackToken = process.env.DEERFLOW_CALLBACK_TOKEN?.trim() ?? "";

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();
    const signature = request.headers["x-deerflow-signature"] as string;
    const timestamp = request.headers["x-deerflow-timestamp"] as string;
    const callbackTokenFromQuery = this.getCallbackTokenFromQuery(request);

    if (!signature && !timestamp) {
      if (this.callbackToken && callbackTokenFromQuery === this.callbackToken) {
        return true;
      }
      if (!this.secret && !this.callbackToken) {
        throw new UnauthorizedException(
          "Missing DEERFLOW_CALLBACK_SECRET or DEERFLOW_CALLBACK_TOKEN"
        );
      }
      throw new UnauthorizedException("Missing DeerFlow signature headers");
    }

    if (!this.secret) {
      throw new UnauthorizedException("Missing DEERFLOW_CALLBACK_SECRET");
    }
    if (!signature || !timestamp) {
      throw new UnauthorizedException("Missing DeerFlow signature headers");
    }

    const timestampMs = Number(timestamp) * (timestamp.length === 10 ? 1000 : 1);
    const now = Date.now();
    const ageMs = now - timestampMs;
    const futureSkewMs = timestampMs - now;

    // Anti-replay protection: reject old signatures and large future clock skew.
    if (isNaN(ageMs) || ageMs > 5 * 60 * 1000 || futureSkewMs > 60 * 1000) {
      throw new UnauthorizedException("DeerFlow signature timestamp invalid");
    }

    let raw = request.rawBody;
    if (!raw) {
      const method = request.method.toUpperCase();
      if (method === "GET" || method === "HEAD") {
        raw = Buffer.from("");
      } else {
        throw new UnauthorizedException("Raw request body is missing for signature verification.");
      }
    }

    const expected = createHmac("sha256", this.secret)
      .update(`${timestamp}.${raw.toString("utf-8")}`)
      .digest("hex");

    const normalizedSignature = signature.startsWith("sha256=")
      ? signature.slice("sha256=".length)
      : signature;

    if (!/^[a-fA-F0-9]{64}$/.test(normalizedSignature)) {
      throw new UnauthorizedException("Invalid DeerFlow signature format");
    }

    const actual = Buffer.from(normalizedSignature.toLowerCase(), "utf8");
    const wanted = Buffer.from(expected, "utf8");

    if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) {
      throw new UnauthorizedException("Invalid DeerFlow signature");
    }

    return true;
  }

  private getCallbackTokenFromQuery(request: Request): string | undefined {
    const value = request.query?.callback_token;
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      const first = value[0];
      return typeof first === "string" ? first : undefined;
    }
    return undefined;
  }
}

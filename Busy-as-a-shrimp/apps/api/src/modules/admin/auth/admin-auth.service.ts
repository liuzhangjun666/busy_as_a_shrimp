import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";
import { AdminAuthProfile, AdminLoginDto } from "../dto/admin.dto";

interface AdminTokenPayload extends AdminAuthProfile {
  exp: number;
}

@Injectable()
export class AdminAuthService {
  private readonly adminUsername = process.env.ADMIN_USERNAME ?? "admin";
  private readonly adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";
  private readonly tokenTtlSeconds = Number(process.env.ADMIN_TOKEN_TTL_SECONDS ?? 8 * 60 * 60);
  private readonly tokenSecret = process.env.ADMIN_TOKEN_SECRET?.trim() ?? "";

  constructor() {
    if (!this.tokenSecret) {
      throw new Error("ADMIN_TOKEN_SECRET is not configured.");
    }
  }

  login(payload: AdminLoginDto) {
    const username = payload.username?.trim();
    const password = payload.password?.trim();

    if (!username || !password) {
      throw new BadRequestException("Username and password are required.");
    }

    if (username !== this.adminUsername || password !== this.adminPassword) {
      throw new UnauthorizedException("Invalid admin credentials.");
    }

    const profile: AdminAuthProfile = {
      adminId: 1,
      username,
      role: "super_admin"
    };

    return {
      token: this.sign(profile),
      expiresIn: this.tokenTtlSeconds,
      profile
    };
  }

  verifyToken(token: string): AdminAuthProfile {
    const [payloadPart, signaturePart] = token.split(".");
    if (!payloadPart || !signaturePart) {
      throw new UnauthorizedException("Invalid admin token format.");
    }

    const expected = this.signSegment(payloadPart);
    const signatureBuffer = Buffer.from(signaturePart);
    const expectedBuffer = Buffer.from(expected);
    const validSignature =
      signatureBuffer.length === expectedBuffer.length &&
      timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!validSignature) {
      throw new UnauthorizedException("Invalid admin token signature.");
    }

    const parsed = this.decodePayload(payloadPart);
    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException("Admin token expired.");
    }

    return {
      adminId: parsed.adminId,
      username: parsed.username,
      role: parsed.role
    };
  }

  extractTokenFromHeader(header?: string): string {
    if (!header) {
      throw new UnauthorizedException("Missing authorization header.");
    }

    const [type, token] = header.split(" ");
    if (type !== "Bearer" || !token) {
      throw new UnauthorizedException("Invalid authorization header format.");
    }

    return token;
  }

  private sign(profile: AdminAuthProfile): string {
    const payload: AdminTokenPayload = {
      ...profile,
      exp: Math.floor(Date.now() / 1000) + this.tokenTtlSeconds
    };

    const payloadPart = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signaturePart = this.signSegment(payloadPart);

    return `${payloadPart}.${signaturePart}`;
  }

  private signSegment(payloadPart: string): string {
    return createHmac("sha256", this.tokenSecret).update(payloadPart).digest("base64url");
  }

  private decodePayload(payloadPart: string): AdminTokenPayload {
    try {
      const json = Buffer.from(payloadPart, "base64url").toString("utf8");
      return JSON.parse(json) as AdminTokenPayload;
    } catch {
      throw new UnauthorizedException("Invalid admin token payload.");
    }
  }
}

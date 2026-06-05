import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../common/prisma.service";

interface JwtPayload {
  userId: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET") || "fallback_secret"
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { userId: BigInt(payload.userId) }
    });

    if (!user) {
      throw new UnauthorizedException("用户不存在");
    }

    // 与登录保持一致：仅 active 用户可通过鉴权，避免状态判断不一致。
    if (user.status === "banned") {
      throw new ForbiddenException({
        code: "VIOLATION_BANNED",
        message: "账号已被封禁",
        mutedUntil: null
      });
    }

    if (user.status !== "active") {
      throw new UnauthorizedException("账号状态异常");
    }

    return { userId: user.userId, role: user.role };
  }
}

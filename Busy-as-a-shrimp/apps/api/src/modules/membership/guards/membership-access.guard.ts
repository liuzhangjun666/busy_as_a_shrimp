import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../../common/prisma.service";
import { REQUIRE_MEMBER_KEY } from "../decorators/require-member.decorator";

@Injectable()
export class MembershipAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isRequireMember = this.reflector.getAllAndOverride<boolean>(REQUIRE_MEMBER_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!isRequireMember) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new UnauthorizedException("请先登录");
    }

    // 实时从数据库校验会员过期时间，防止 JWT 缓存导致的权限滞后
    const dbUser = await this.prisma.user.findUnique({
      where: { userId: BigInt(user.userId) },
      select: { memberLevel: true, memberExpire: true }
    });

    if (!dbUser || dbUser.memberLevel === "free") {
      throw new ForbiddenException("该功能仅限订阅会员使用，请前往充值。");
    }

    if (dbUser.memberExpire && dbUser.memberExpire < new Date()) {
      throw new ForbiddenException("会员已过期，请及时续费以继续使用详情功能。");
    }

    return true;
  }
}

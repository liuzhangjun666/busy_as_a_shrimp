import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AdminAuthService } from "./admin-auth.service";
import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AdminAuthService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      admin?: unknown;
    }>();
    const token = this.authService.extractTokenFromHeader(request.headers.authorization);
    request.admin = this.authService.verifyToken(token);
    return true;
  }
}

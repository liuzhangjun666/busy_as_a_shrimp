import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Ip,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { UserRole } from "@prisma/client";
import type { Request } from "express";
import { ok } from "../../common/api-response";
import { UserService } from "./user.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import {
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  SendCodeDto,
  SendSmsDto,
  UpdateRoleDto,
  UpdateUserInfoDto,
  VerifyIdentityDto
} from "./dto/user.dto";

interface ICurrentUser {
  userId: string | bigint;
  role: UserRole;
}

interface HeaderCarrier {
  headers?: Record<string, string | string[] | undefined>;
}

interface RequestCarrier extends HeaderCarrier {
  protocol?: string;
}

@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("captcha")
  async captcha() {
    const result = await this.userService.getCaptcha();
    return ok(result, "图形验证码已生成");
  }

  @Post("send-code")
  async sendCode(@Body() payload: SendCodeDto) {
    const result = await this.userService.sendCode(payload);
    return ok(result, result.message);
  }

  @Post("send-sms")
  async sendSms(@Body() payload: SendSmsDto) {
    const result = await this.userService.sendSms(payload);
    return ok(result, result.message);
  }

  // Backward-compatible fallback: some clients still call this endpoint with GET.
  @Get("send-sms")
  @Header("Cache-Control", "no-store")
  async sendSmsByGet(@Query() payload: SendSmsDto) {
    const result = await this.userService.sendSms(payload);
    return ok(result, result.message);
  }

  @Post("register")
  async register(@Body() payload: RegisterDto, @Ip() ip: string, @Req() req: HeaderCarrier) {
    const result = await this.userService.register(payload, ip, this.extractDeviceFingerprint(req));
    return ok(result, "注册成功");
  }

  @Post("reset-password")
  async resetPassword(@Body() payload: ResetPasswordDto) {
    const result = await this.userService.resetPassword(payload);
    return ok(result, "密码重置成功");
  }

  @Post("login")
  async login(@Body() payload: LoginDto, @Ip() ip: string, @Req() req: HeaderCarrier) {
    const result = await this.userService.login(payload, ip, this.extractDeviceFingerprint(req));
    return ok(result, "登录成功");
  }

  @Post("verify-identity")
  @UseGuards(JwtAuthGuard)
  async verifyIdentity(@CurrentUser() user: ICurrentUser, @Body() payload: VerifyIdentityDto) {
    const result = await this.userService.verifyIdentity(BigInt(user.userId), payload);
    return ok(result, "实名认证通过");
  }

  @Get("info")
  @UseGuards(JwtAuthGuard)
  async info(@CurrentUser() user: ICurrentUser) {
    const info = await this.userService.getInfo(BigInt(user.userId));
    return ok(info);
  }

  @Put("info")
  @UseGuards(JwtAuthGuard)
  async updateInfo(@CurrentUser() user: ICurrentUser, @Body() payload: UpdateUserInfoDto) {
    const updated = await this.userService.updateInfo(BigInt(user.userId), payload);
    return ok(updated, "用户信息已更新");
  }

  @Post("avatar/upload")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 3 * 1024 * 1024 }
    })
  )
  async uploadAvatar(
    @CurrentUser() user: ICurrentUser,
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          mimetype: string;
          size: number;
          originalname: string;
        }
      | undefined,
    @Req() req: Request
  ) {
    if (!file) {
      throw new BadRequestException("请先选择头像图片");
    }
    const origin = this.resolveRequestOrigin(req as RequestCarrier);
    const updated = await this.userService.uploadAvatar(BigInt(user.userId), file, origin);
    return ok(updated, "头像上传成功");
  }

  @Put("role")
  @UseGuards(JwtAuthGuard)
  async updateRole(@CurrentUser() user: ICurrentUser, @Body() payload: UpdateRoleDto) {
    const updated = await this.userService.updateRole(BigInt(user.userId), payload);
    return ok(updated, "角色已切换");
  }

  private extractDeviceFingerprint(req: HeaderCarrier): string | undefined {
    const directFingerprint = this.getHeaderValue(req.headers, "x-device-fingerprint");
    if (directFingerprint) {
      return directFingerprint.slice(0, 191);
    }

    const fallbackDeviceId = this.getHeaderValue(req.headers, "x-device-id");
    if (fallbackDeviceId) {
      return fallbackDeviceId.slice(0, 191);
    }

    const userAgent = this.getHeaderValue(req.headers, "user-agent");
    if (userAgent) {
      return `ua:${userAgent.slice(0, 188)}`;
    }

    return undefined;
  }

  private getHeaderValue(
    headers: Record<string, string | string[] | undefined> | undefined,
    key: string
  ): string | undefined {
    const raw = headers?.[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const trimmed = value?.trim();
    return trimmed || undefined;
  }

  private resolveRequestOrigin(req: RequestCarrier): string | undefined {
    const forwardedHost = this.getHeaderValue(req.headers, "x-forwarded-host");
    const forwardedProto = this.getHeaderValue(req.headers, "x-forwarded-proto");
    const host = forwardedHost || this.getHeaderValue(req.headers, "host");
    const protocol = forwardedProto || req.protocol;

    if (!host || !protocol) {
      return undefined;
    }

    return `${protocol}://${host}`;
  }
}

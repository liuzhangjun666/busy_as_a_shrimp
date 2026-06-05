import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Prisma, User } from "@prisma/client";
import * as crypto from "crypto";
import { existsSync, promises as fs } from "fs";
import * as path from "path";
import { PrismaService } from "../../common/prisma.service";
import { encryptPhone } from "../../common/phone-crypto";
import { resolveUploadsDir } from "../../common/uploads-path";
import { CaptainService } from "../captain/captain.service";
import { ComplianceService } from "../compliance/compliance.service";
import { DoppelgangerService } from "../doppelganger/doppelganger.service";
import { IdentityVerificationService } from "./identity-verification.service";
import { SmsVerificationService } from "./sms-verification.service";
import {
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  SmsPurposeEnum,
  SendCodeDto,
  SendSmsDto,
  UpdateRoleDto,
  UpdateUserInfoDto,
  VerifyIdentityDto
} from "./dto/user.dto";

interface CaptchaState {
  code: string;
  expiresAt: number;
}

interface SmsCodeState {
  code: string;
  expiresAt: number;
  remainingAttempts: number;
  lastSentAt: number;
}

export interface AuthUserSummary {
  userId: number;
  nickname: string | null;
  role: User["role"];
  memberLevel: User["memberLevel"];
  status: User["status"];
  city: string | null;
  district: string | null;
  inviteCode: string | null;
  speakMutedUntil: string | null;
  avatar: string | null;
  isRealNameVerified: boolean;
  pointsBalance: number;
  memberMonthlyPointsGift: number;
  currentMonthGrantedPoints: number;
  isMomoUnlocked: boolean;
}

export interface AuthSuccessData {
  token: string;
  user: AuthUserSummary;
}

interface AvatarUploadFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

@Injectable()
export class UserService {
  private readonly smsCodes = new Map<string, SmsCodeState>();
  private readonly captchas = new Map<string, CaptchaState>();
  private readonly logger = new Logger(UserService.name);
  private static readonly AVATAR_MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;
  private static readonly ALLOWED_AVATAR_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp"
  ]);
  private readonly uploadsRootDir = resolveUploadsDir();

  private readonly smsCodeTtlMs: number;
  private readonly smsCodeMaxAttempts: number;
  private readonly smsSendCooldownMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly captainService: CaptainService,
    private readonly doppelgangerService: DoppelgangerService,
    private readonly complianceService: ComplianceService,
    private readonly identityVerificationService: IdentityVerificationService,
    private readonly smsVerificationService: SmsVerificationService,
    private readonly configService: ConfigService
  ) {
    this.smsCodeTtlMs = this.resolvePositiveIntConfig("SMS_CODE_TTL_SECONDS", 300) * 1000;
    this.smsCodeMaxAttempts = this.resolvePositiveIntConfig("SMS_CODE_MAX_ATTEMPTS", 5);
    this.smsSendCooldownMs = this.resolvePositiveIntConfig("SMS_SEND_COOLDOWN_SECONDS", 60) * 1000;
  }

  private generateSecureInviteCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.randomBytes(8);
    let code = "SHR-";
    for (let i = 0; i < 6; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }

  async getCaptcha() {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const captchaId = crypto.randomUUID();
    this.captchas.set(captchaId, { code, expiresAt: Date.now() + 10 * 60 * 1000 });

    const chars = code.split("");
    const charNodes = chars
      .map((char, index) => {
        const x = 18 + index * 22;
        const y = 28 + (Math.floor(Math.random() * 7) - 3);
        const rotate = Math.floor(Math.random() * 21) - 10;
        return `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#0f172a" transform="rotate(${rotate} ${x} ${y})">${char}</text>`;
      })
      .join("");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40"><rect width="120" height="40" rx="6" fill="#e2e8f0"/><path d="M8 30 C 30 6, 50 35, 78 10 S 112 30, 116 14" stroke="#94a3b8" stroke-width="1.2" fill="none" opacity="0.55"/><path d="M4 12 C 26 35, 52 4, 80 28 S 108 6, 116 24" stroke="#64748b" stroke-width="1" fill="none" opacity="0.35"/>${charNodes}</svg>`;
    const imageBase64 = Buffer.from(svg, "utf8").toString("base64");
    return { captchaId, imageBase64 };
  }

  private validateCaptchaOrThrow(_captchaId?: string, _captchaValue?: string): void {
    // 开发/测试模式：彻底跳过图形验证码校验
    return;
  }

  private hashPhone(phone: string): string {
    return crypto.createHash("sha256").update(phone).digest("hex");
  }

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, passwordHash: string | null | undefined): boolean {
    if (!passwordHash) {
      return false;
    }

    const [salt, expectedHash] = passwordHash.split(":");
    if (!salt || !expectedHash) {
      return false;
    }

    const derivedHash = crypto.scryptSync(password, salt, 64);
    const expectedBuffer = Buffer.from(expectedHash, "hex");
    if (expectedBuffer.length !== derivedHash.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, derivedHash);
  }

  private maskPhone(phone: string): string {
    const normalized = phone.trim();
    const digits = normalized.replace(/\D/g, "");

    if (digits.length >= 7) {
      return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
    }

    if (normalized.length <= 2) {
      return normalized;
    }

    return `${normalized.slice(0, 1)}***${normalized.slice(-1)}`;
  }

  private generateToken(user: User): string {
    const payload = { userId: user.userId.toString(), role: user.role };
    return this.jwtService.sign(payload);
  }

  private buildAuthSuccessData(user: User): AuthSuccessData {
    throw new Error("buildAuthSuccessData must be called through buildAuthSuccessDataAsync");
  }

  private async buildAuthSuccessDataAsync(user: User): Promise<AuthSuccessData> {
    const normalizedAvatar = this.normalizeAvatarForResponse(user.avatar ?? null);
    const pointSummary = await this.doppelgangerService.getPointAccountSummary(user.userId, {
      memberLevel: user.memberLevel,
      memberExpire: user.memberExpire
    });

    return {
      token: this.generateToken(user),
      user: {
        userId: Number(user.userId),
        nickname: user.nickname ?? null,
        role: user.role,
        memberLevel: user.memberLevel,
        status: user.status,
        city: user.city ?? null,
        district: user.district ?? null,
        inviteCode: user.inviteCode ?? null,
        speakMutedUntil: user.speakMutedUntil ? user.speakMutedUntil.toISOString() : null,
        avatar: normalizedAvatar,
        isRealNameVerified: user.realNameVerified,
        pointsBalance: pointSummary.balance,
        memberMonthlyPointsGift: pointSummary.memberMonthlyPointsGift,
        currentMonthGrantedPoints: pointSummary.currentMonthGrantedPoints,
        isMomoUnlocked: pointSummary.isMomoUnlocked
      }
    };
  }

  // 统一用户资料返回字段，避免前后端实名字段命名不一致。
  private async buildUserInfoData(user: User, avatar: string | null) {
    const pointSummary = await this.doppelgangerService.getPointAccountSummary(user.userId, {
      memberLevel: user.memberLevel,
      memberExpire: user.memberExpire
    });

    return {
      userId: Number(user.userId),
      nickname: user.nickname ?? null,
      role: user.role,
      memberLevel: user.memberLevel,
      status: user.status,
      city: user.city ?? null,
      district: user.district ?? null,
      inviteCode: user.inviteCode ?? null,
      speakMutedUntil: user.speakMutedUntil ? user.speakMutedUntil.toISOString() : null,
      avatar,
      realNameVerified: user.realNameVerified,
      isRealNameVerified: user.realNameVerified,
      pointsBalance: pointSummary.balance,
      memberMonthlyPointsGift: pointSummary.memberMonthlyPointsGift,
      currentMonthGrantedPoints: pointSummary.currentMonthGrantedPoints,
      isMomoUnlocked: pointSummary.isMomoUnlocked
    };
  }

  async sendCode(payload: SendCodeDto) {
    return this.sendSmsVerificationCode(payload);
  }

  async sendSms(payload: SendSmsDto) {
    return this.sendSmsVerificationCode(payload);
  }

  private async sendSmsVerificationCode(payload: SendCodeDto | SendSmsDto) {
    this.validateCaptchaOrThrow(payload.captchaId, payload.captchaValue);
    await this.assertPhoneEligibleForSmsPurpose(payload.phone, payload.purpose);
    this.checkSendCooldownOrThrow(payload.phone);
    const code = this.generateSmsCode();
    await this.smsVerificationService.sendVerificationCode(payload.phone, code);

    this.saveSmsCode(payload.phone, code);

    return {
      success: true,
      message: "短信验证码已发送，请注意查收"
    };
  }

  private async assertPhoneEligibleForSmsPurpose(
    phone: string,
    purpose?: SendSmsDto["purpose"]
  ): Promise<void> {
    const normalizedPurpose = purpose ?? SmsPurposeEnum.login;
    const phoneHash = this.hashPhone(phone);
    const existing = await this.prisma.user.findFirst({ where: { phoneHash } });
    const hasRegisteredPassword = Boolean(existing?.passwordHash);

    if (normalizedPurpose === SmsPurposeEnum.register && hasRegisteredPassword) {
      throw new BadRequestException("该手机号已被注册，请前往登录页面登录");
    }

    if (
      (normalizedPurpose === SmsPurposeEnum.login ||
        normalizedPurpose === SmsPurposeEnum.resetPassword) &&
      !existing
    ) {
      throw new BadRequestException("该手机号未注册，请先注册");
    }
  }

  async register(payload: RegisterDto, ip?: string, deviceFingerprint?: string) {
    this.validateCaptchaOrThrow(payload.captchaId, payload.captchaValue);
    this.verifySmsCodeOrThrow(payload.phone, payload.verifyCode);

    const phoneHash = this.hashPhone(payload.phone);
    const existing = await this.prisma.user.findFirst({ where: { phoneHash } });
    const passwordHash = this.hashPassword(payload.password);

    if (existing?.passwordHash) {
      throw new BadRequestException("该手机号已注册");
    }

    if (existing) {
      const user = await this.prisma.user.update({
        where: { userId: existing.userId },
        data: {
          passwordHash,
          phoneEncrypted: existing.phoneEncrypted || encryptPhone(payload.phone),
          maskedPhone: existing.maskedPhone || this.maskPhone(payload.phone),
          lastIp: ip,
          inviteCode: existing.inviteCode || this.generateSecureInviteCode()
        }
      });

      return this.buildAuthSuccessDataAsync(user);
    }

    await this.complianceService.checkRegistrationRisk({ ip, deviceFingerprint });

    const user = await this.prisma.user.create({
      data: {
        phoneHash,
        phoneEncrypted: encryptPhone(payload.phone),
        passwordHash,
        maskedPhone: this.maskPhone(payload.phone),
        role: "service",
        status: "active",
        lastIp: ip,
        inviteCode: this.generateSecureInviteCode()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any
    });

    await this.complianceService.recordUserDevice(user.userId, ip, deviceFingerprint);

    if (payload.inviteCode) {
      await this.handleInvitation(user.userId, payload.inviteCode);
    }

    return this.buildAuthSuccessDataAsync(user);
  }

  async resetPassword(payload: ResetPasswordDto) {
    this.validateCaptchaOrThrow(payload.captchaId, payload.captchaValue);
    this.verifySmsCodeOrThrow(payload.phone, payload.verifyCode);

    const phoneHash = this.hashPhone(payload.phone);
    const existing = await this.prisma.user.findFirst({ where: { phoneHash } });
    if (!existing) {
      throw new BadRequestException("该手机号未注册，请先注册");
    }

    await this.prisma.user.update({
      where: { userId: existing.userId },
      data: {
        passwordHash: this.hashPassword(payload.password),
        phoneEncrypted: existing.phoneEncrypted || encryptPhone(payload.phone),
        maskedPhone: existing.maskedPhone || this.maskPhone(payload.phone)
      }
    });

    return {
      success: true
    };
  }

  async login(payload: LoginDto, _ip?: string, _deviceFingerprint?: string) {
    try {
      if (!payload.phone) {
        throw new BadRequestException("登录参数不完整");
      }

      const phoneHash = this.hashPhone(payload.phone);
      let user = await this.prisma.user.findFirst({ where: { phoneHash } });
      if (!user) {
        throw new BadRequestException("该手机号未注册，请先注册");
      }

      if (!user.maskedPhone || !user.phoneEncrypted) {
        user = await this.prisma.user.update({
          where: { userId: user.userId },
          data: {
            maskedPhone: user.maskedPhone || this.maskPhone(payload.phone),
            phoneEncrypted: user.phoneEncrypted || encryptPhone(payload.phone)
          }
        });
      }

      if (payload.password) {
        if (!user.passwordHash) {
          throw new BadRequestException("该账号尚未设置密码，请先注册");
        }

        if (!this.verifyPassword(payload.password, user.passwordHash)) {
          throw new UnauthorizedException("手机号或密码错误");
        }
      } else {
        const smsCode = payload.smsCode ?? payload.verifyCode;
        if (!smsCode) {
          throw new BadRequestException("登录参数不完整");
        }

        this.verifySmsCodeOrThrow(payload.phone, smsCode);
      }

      this.assertUserCanLogin(user);

       return this.buildAuthSuccessDataAsync(user);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const errStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Login failed: ${errMsg}`, errStack);
      throw error;
    }
  }

  async verifyIdentity(userId: bigint, payload: VerifyIdentityDto) {
    if (!payload.idNumber || !payload.name) {
      throw new BadRequestException("实名认证参数不完整");
    }

    const verification = await this.identityVerificationService.verifyNameAndIdCard(
      payload.name,
      payload.idNumber
    );

    if (!verification.verified) {
      throw new BadRequestException(this.mapIdentityFailureMessage(verification.resultCode));
    }

    // 实名校验成功后持久化状态，确保重新登录后仍保持“已实名”。
    await this.prisma.user.update({
      where: { userId },
      data: {
        realNameVerified: true,
        realNameVerifiedAt: new Date()
      }
    });

    return {
      success: true,
      resultCode: verification.resultCode,
      requestId: verification.requestId
    };
  }

  async getInfo(userId: bigint) {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) {
      throw new BadRequestException("用户未找到");
    }

    const avatar = await this.queryAvatar(userId);
    return this.buildUserInfoData(user, avatar);
  }

  async updateInfo(userId: bigint, payload: UpdateUserInfoDto) {
    const data: Prisma.UserUpdateInput = {};

    if (payload.nickname !== undefined) {
      data.nickname = this.normalizeNicknameInput(payload.nickname);
    }
    if (payload.city !== undefined) {
      data.city = payload.city;
    }
    if (payload.district !== undefined) {
      data.district = payload.district;
    }

    let user =
      Object.keys(data).length > 0
        ? await this.prisma.user.update({ where: { userId }, data })
        : await this.prisma.user.findUnique({ where: { userId } });

    if (!user) {
      throw new BadRequestException("用户未找到");
    }

    if (payload.avatar !== undefined) {
      const normalizedAvatar = this.normalizeAvatarInput(payload.avatar);
      if (normalizedAvatar) {
        // 头像更新前必须先通过图片审核（仅支持 URL 送审）。
        await this.complianceService.checkImage(normalizedAvatar, { scene: "avatar" });
      }
      await this.prisma.$executeRaw`
        UPDATE users
        SET avatar = ${normalizedAvatar}
        WHERE user_id = ${userId}
      `;
    }

    const avatar = await this.queryAvatar(userId);
    return this.buildUserInfoData(user, avatar);
  }

  async uploadAvatar(userId: bigint, file: AvatarUploadFile, requestOrigin?: string) {
    if (!file || !file.buffer) {
      throw new BadRequestException("请先选择头像图片");
    }

    if (!UserService.ALLOWED_AVATAR_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException("头像仅支持 JPG、PNG、WEBP 格式");
    }

    if (file.size > UserService.AVATAR_MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException("头像大小不能超过 3MB");
    }

    const extension = this.resolveAvatarExtension(file.mimetype);
    const userFolder = path.join(this.uploadsRootDir, "avatars", userId.toString());
    await fs.mkdir(userFolder, { recursive: true });

    const fileName = `${Date.now()}-${crypto.randomUUID().replace(/-/g, "")}.${extension}`;
    const fullPath = path.join(userFolder, fileName);
    await fs.writeFile(fullPath, file.buffer);

    const avatarUrl = `${this.resolveAssetBaseUrl(requestOrigin)}/uploads/avatars/${userId.toString()}/${fileName}`;

    try {
      await this.complianceService.checkImage(avatarUrl, { scene: "avatar" });
    } catch (error) {
      await fs.unlink(fullPath).catch(() => undefined);
      throw error;
    }

    const user = await this.prisma.user.update({
      where: { userId },
      data: { avatar: avatarUrl }
    });

    return this.buildUserInfoData(user, avatarUrl);
  }

  async updateRole(userId: bigint, payload: UpdateRoleDto) {
    return this.prisma.user.update({ where: { userId }, data: { role: payload.role } });
  }

  private async handleInvitation(inviteeId: bigint, inviteCode: string) {
    const inviterId = await this.resolveInviterId(inviteeId, inviteCode);
    if (!inviterId) {
      return;
    }

    const riskResult = await this.complianceService.evaluateInviteRisk({
      inviterId,
      inviteeId,
      inviteCode
    });

    // 仅在本次真实新建了有效邀请记录时触发奖励，避免重复发放。
    if (riskResult.isValid && riskResult.recordCreated && riskResult.inviteRecordId) {
      await this.captainService.handleValidInviteCreated({
        inviterId,
        inviteRecordId: riskResult.inviteRecordId
      });
    }
  }

  private async resolveInviterId(inviteeId: bigint, inviteCode: string): Promise<bigint | null> {
    const inviterUser = await this.prisma.user.findUnique({ where: { inviteCode } });
    if (inviterUser && inviterUser.userId !== inviteeId) {
      return inviterUser.userId;
    }

    try {
      const oldInviterId = BigInt(parseInt(inviteCode, 36));
      const oldInviter = await this.prisma.user.findUnique({ where: { userId: oldInviterId } });
      if (oldInviter && oldInviter.userId !== inviteeId) {
        return oldInviter.userId;
      }
    } catch {
      return null;
    }

    return null;
  }

  private async queryAvatar(userId: bigint): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<Array<{ avatar: string | null }>>`
      SELECT avatar
      FROM users
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    const rawAvatar = rows[0]?.avatar ?? null;
    const normalizedAvatar = this.normalizeAvatarForResponse(rawAvatar);

    if (rawAvatar && !normalizedAvatar) {
      await this.prisma.user.update({
        where: { userId },
        data: { avatar: null }
      });
    }

    return normalizedAvatar;
  }

  private normalizeAvatarForResponse(avatar: string | null): string | null {
    if (!avatar) {
      return null;
    }

    const normalized = avatar.trim();
    if (!normalized) {
      return null;
    }

    const localFilePath = this.resolveLocalUploadFilePath(normalized);
    if (localFilePath && !existsSync(localFilePath)) {
      this.logger.warn(`Avatar file missing, fallback to default: ${normalized}`);
      return null;
    }

    return normalized;
  }

  private resolveLocalUploadFilePath(avatarUrl: string): string | null {
    if (avatarUrl.startsWith("data:")) {
      return null;
    }

    let pathname = "";
    try {
      pathname = new URL(avatarUrl, "http://localhost").pathname;
    } catch {
      return null;
    }

    const marker = "/uploads/";
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex < 0) {
      return null;
    }

    const rawRelativePath = pathname.slice(markerIndex + marker.length).trim();
    if (!rawRelativePath) {
      return null;
    }

    const safeSegments = rawRelativePath
      .split("/")
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0 && segment !== "." && segment !== "..");

    if (safeSegments.length === 0) {
      return null;
    }

    const absolutePath = path.resolve(this.uploadsRootDir, ...safeSegments);
    const uploadsRoot = path.resolve(this.uploadsRootDir);
    const uploadsRootWithSep = uploadsRoot.endsWith(path.sep)
      ? uploadsRoot
      : `${uploadsRoot}${path.sep}`;

    if (!absolutePath.startsWith(uploadsRootWithSep) && absolutePath !== uploadsRoot) {
      return null;
    }

    return absolutePath;
  }

  private mapIdentityFailureMessage(resultCode: string): string {
    if (resultCode === "-1") return "姓名与身份证号不一致";
    if (resultCode === "-2") return "身份证号格式不正确";
    if (resultCode === "-3") return "姓名格式不正确";
    if (resultCode === "-5") return "未查询到权威数据，请核对后重试";
    return "身份核验失败，请检查姓名和身份证号";
  }

  private normalizeAvatarInput(avatar: string | null | undefined): string | null {
    if (avatar === undefined || avatar === null) {
      return null;
    }

    const trimmed = avatar.trim();
    if (!trimmed) {
      return null;
    }

    if (!this.isHttpUrl(trimmed)) {
      throw new BadRequestException("头像仅支持 http/https 图片地址");
    }

    return trimmed;
  }

  private isHttpUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  private normalizeNicknameInput(nickname: string): string | null {
    const normalized = nickname.trim();
    if (!normalized) {
      return null;
    }
    if (normalized.length > 20) {
      throw new BadRequestException("昵称长度不能超过 20 个字符");
    }
    return normalized;
  }

  private resolveAvatarExtension(mimeType: string): string {
    if (mimeType === "image/jpeg") {
      return "jpg";
    }
    if (mimeType === "image/png") {
      return "png";
    }
    if (mimeType === "image/webp") {
      return "webp";
    }
    throw new BadRequestException("头像格式不支持");
  }

  private resolveAssetBaseUrl(requestOrigin?: string): string {
    const envBaseUrl =
      this.configService.get<string>("PUBLIC_ASSET_BASE_URL")?.trim() ||
      this.configService.get<string>("ASSET_BASE_URL")?.trim();

    const fallbackBaseUrl = requestOrigin?.trim() || "http://localhost:8081";
    return (envBaseUrl || fallbackBaseUrl).replace(/\/+$/, "");
  }

  private resolvePositiveIntConfig(key: string, fallback: number): number {
    const raw = Number(this.configService.get<string>(key));
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
  }

  private generateSmsCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private assertUserCanLogin(user: User): void {
    // 统一在登录阶段拦截非 active 账号，避免发放“登录成功但无法使用”的 token。
    if (user.status === "banned") {
      throw new ForbiddenException({
        code: "VIOLATION_BANNED",
        message: "账号已被封禁",
        mutedUntil: null
      });
    }

    if (user.status !== "active") {
      throw new UnauthorizedException("账号状态异常，无法登录");
    }
  }

  private checkSendCooldownOrThrow(phone: string): void {
    const state = this.smsCodes.get(phone);
    if (!state) {
      return;
    }

    const waitMs = state.lastSentAt + this.smsSendCooldownMs - Date.now();
    if (waitMs > 0) {
      throw new BadRequestException(`短信发送过于频繁，请 ${Math.ceil(waitMs / 1000)} 秒后重试`);
    }
  }

  private saveSmsCode(phone: string, code: string): void {
    const now = Date.now();
    this.smsCodes.set(phone, {
      code,
      expiresAt: now + this.smsCodeTtlMs,
      remainingAttempts: this.smsCodeMaxAttempts,
      lastSentAt: now
    });
  }

  private verifySmsCodeOrThrow(phone: string, verifyCode: string): void {
    const state = this.smsCodes.get(phone);
    if (!state) {
      throw new BadRequestException("请先获取短信验证码");
    }

    if (state.expiresAt < Date.now()) {
      this.smsCodes.delete(phone);
      throw new BadRequestException("短信验证码已过期，请重新获取");
    }

    if (verifyCode !== state.code) {
      state.remainingAttempts -= 1;
      if (state.remainingAttempts <= 0) {
        this.smsCodes.delete(phone);
        throw new BadRequestException("验证码错误次数过多，请重新获取短信验证码");
      }

      this.smsCodes.set(phone, state);
      throw new BadRequestException(`验证码错误，还可重试 ${state.remainingAttempts} 次`);
    }

    this.smsCodes.delete(phone);
  }
}

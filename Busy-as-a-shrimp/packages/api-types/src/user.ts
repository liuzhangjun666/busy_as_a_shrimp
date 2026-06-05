export interface RegisterDto {
  phone: string;
  verifyCode: string;
  captchaId: string;
  captchaValue: string;
  password: string;
  inviteCode?: string;
}

export interface ResetPasswordDto {
  phone: string;
  verifyCode: string;
  captchaId: string;
  captchaValue: string;
  password: string;
}

export interface SendSmsDto {
  phone: string;
  captchaId: string;
  captchaValue: string;
  purpose?: "register" | "login" | "reset_password";
}

export type SendCodeDto = SendSmsDto;

export interface LoginDto {
  phone?: string;
  password?: string;
  smsCode?: string;
  verifyCode?: string;
  wechatCode?: string;
  captchaId?: string;
  captchaValue?: string;
  inviteCode?: string;
}

export interface CaptchaDto {
  captchaId: string;
  imageBase64: string;
}

export interface VerifyIdentityDto {
  name: string;
  idNumber: string;
}

export interface UpdateUserInfoDto {
  nickname?: string;
  city?: string;
  district?: string;
  avatar?: string | null;
}

export interface UpdateRoleDto {
  role: "service" | "resource" | "both";
}

export type UserRole = "service" | "resource" | "both";
export type UserStatus = "active" | "banned" | "frozen";
export type MemberLevel = "free" | "monthly" | "yearly" | "lifetime";

export interface UserSummary {
  userId: number;
  nickname: string | null;
  role: UserRole;
  memberLevel: MemberLevel;
  status: UserStatus;
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
  user: UserSummary;
}

import {
  IsMobilePhone,
  IsString,
  Length,
  IsOptional,
  IsIn,
  Matches,
  MaxLength,
  IsNotEmpty
} from "class-validator";

export const UserRoleEnum = {
  service: "service",
  resource: "resource",
  both: "both"
} as const;

export type UserRole = (typeof UserRoleEnum)[keyof typeof UserRoleEnum];
export const SmsPurposeEnum = {
  register: "register",
  login: "login",
  resetPassword: "reset_password"
} as const;

export type SmsPurpose = (typeof SmsPurposeEnum)[keyof typeof SmsPurposeEnum];

export class SendSmsDto {
  @IsMobilePhone("zh-CN")
  phone!: string;

  @IsString()
  @Length(4, 4)
  @Matches(/^[a-zA-Z0-9]{4}$/)
  captchaValue!: string;

  @IsString()
  captchaId!: string;

  @IsOptional()
  @IsIn(["register", "login", "reset_password"])
  purpose?: SmsPurpose;
}

export class SendCodeDto extends SendSmsDto {}

export class RegisterDto {
  @IsMobilePhone("zh-CN")
  phone!: string;

  @IsString()
  @Length(6, 6)
  verifyCode!: string;

  @IsString()
  @Length(4, 4)
  @Matches(/^[a-zA-Z0-9]{4}$/)
  captchaValue!: string;

  @IsString()
  captchaId!: string;

  @IsString()
  @Length(6, 20)
  @Matches(/^\S+$/)
  password!: string;

  @IsString()
  @IsOptional()
  @Length(6, 12)
  inviteCode?: string;
}

export class ResetPasswordDto {
  @IsMobilePhone("zh-CN")
  phone!: string;

  @IsString()
  @Length(6, 6)
  verifyCode!: string;

  @IsString()
  @Length(4, 4)
  @Matches(/^[a-zA-Z0-9]{4}$/)
  captchaValue!: string;

  @IsString()
  captchaId!: string;

  @IsString()
  @Length(6, 20)
  @Matches(/^\S+$/)
  password!: string;
}

export class LoginDto {
  @IsMobilePhone("zh-CN")
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  @Length(6, 6)
  verifyCode?: string;

  @IsString()
  @IsOptional()
  @Length(6, 6)
  smsCode?: string;

  @IsString()
  @IsOptional()
  @Length(6, 20)
  @Matches(/^\S+$/)
  password?: string;

  @IsString()
  @IsOptional()
  @Length(4, 4)
  @Matches(/^[a-zA-Z0-9]{4}$/)
  captchaValue?: string;

  @IsString()
  @IsOptional()
  captchaId?: string;

  @IsString()
  @IsOptional()
  wechatCode?: string;

  @IsString()
  @IsOptional()
  @Length(6, 12)
  inviteCode?: string;
}

export class VerifyIdentityDto {
  @IsNotEmpty({ message: "姓名不能为空" })
  @IsString({ message: "姓名格式不正确" })
  name!: string;

  @IsNotEmpty({ message: "身份证号不能为空" })
  @IsString({ message: "身份证号格式不正确" })
  @Length(15, 18, { message: "身份证号长度必须为 15 到 18 位" })
  @Matches(/(^\d{15}$)|(^\d{17}[\dXx]$)/, { message: "身份证号格式不正确" })
  idNumber!: string;
}

export class UpdateUserInfoDto {
  @IsString()
  @IsOptional()
  @MaxLength(20)
  nickname?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2_000_000)
  avatar?: string | null;
}

export class UpdateRoleDto {
  @IsIn(["service", "resource", "both"])
  role!: UserRole;
}

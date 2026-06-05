import type {
  AuthSuccessData,
  CaptchaDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  SendSmsDto,
  UpdateRoleDto,
  UpdateUserInfoDto,
  AdminLoginDto,
  VerifyIdentityDto
} from "@airp/api-types";
import type { AdminSessionProfile } from "../../../admin/lib/auth";
import type { HttpClientLike } from "./http";

export interface UserInfo {
  userId: number;
  nickname?: string | null;
  role: "service" | "resource" | "both";
  memberLevel: string;
  city: string | null;
  district?: string | null;
  avatar?: string | null;
  isRealNameVerified?: boolean;
  pointsBalance: number;
  memberMonthlyPointsGift: number;
  currentMonthGrantedPoints: number;
  isMomoUnlocked: boolean;
}

export type LoginResult = AuthSuccessData;
export type RegisterResult = AuthSuccessData;

export interface SendSmsResult {
  success: boolean;
  message: string;
  mockCode?: string;
}

export interface ResetPasswordResult {
  success: boolean;
}

export interface MembershipPlan {
  code: string;
  name: string;
  price: number;
  monthlyGiftPoints?: number;
}

export interface MembershipSubscribePayload {
  sourceModule?: "ai_brief" | "solo_ai" | "campus";
  sourceAction?: string;
}

export interface MembershipSubscribeResult {
  success: true;
  paymentRequired: boolean;
  memberLevel: string;
  expireDate?: string;
  outTradeNo?: string;
  paymentMode?: "native";
  codeUrl?: string;
  paymentUrl?: string;
  amount?: number;
  status?: string;
}

export interface MembershipOrderStatusResult {
  outTradeNo: string;
  status: string;
  paid: boolean;
}

export interface CampusUnlockStatus {
  unlocked: boolean;
  purchaseId?: number;
  unlockedAt?: string;
}

export interface CampusUnlockCheckoutResponse {
  success: true;
  unlocked: true;
  purchaseId: number;
  amount: number;
}

export interface CaptainInfo {
  level: string;
  inviteCode: string;
  inviteLink: string;
  inviteQrCodeUrl: string;
  rewardRules: {
    firstFiveTarget: number;
    firstFiveRewardLabel: string;
    perValidInvitePointsAfterMilestone: number;
    leaderboardCycleDays: number;
    leaderboardRewardPoolPoints: number;
    leaderboardRewardLadder: number[];
    pointsRequireMembership: boolean;
  };
  firstFiveProgress: {
    qualifiedInvites: number;
    target: number;
    remaining: number;
    unlocked: boolean;
    giftedAt: string | null;
  };
  currentPeriod: {
    periodId: number;
    startTime: string;
    endTime: string;
    rewardPoolPoints: number;
    daysRemaining: number;
    nextSettlementAt: string;
  };
}

export interface CaptainStats {
  validInvites: number;
  totalInvites: number;
  currentCycleInvites: number;
  currentCycleRank: number | null;
  totalRewardPoints: number;
  firstFiveQualifiedInvites: number;
  firstFiveTarget: number;
  firstFiveRewardUnlocked: boolean;
}

export interface CaptainRankingItem {
  rank: number;
  captainId: number;
  name: string;
  level: string;
  validInviteCount: number;
  rewardPoints: number;
  isCurrentUser: boolean;
}

export interface CaptainRanking {
  period: {
    periodId: number;
    startTime: string;
    endTime: string;
    rewardPoolPoints: number;
    cycleDays: number;
    daysRemaining: number;
    nextSettlementAt: string;
  };
  myRank: {
    rank: number | null;
    validInviteCount: number;
    rewardPoints: number | null;
  };
  leaderboard: CaptainRankingItem[];
}

export interface CaptainRewardRecord {
  rewardId: string;
  type: "milestone_membership" | "invite_points" | "leaderboard_points";
  title: string;
  description: string;
  points: number;
  valueText: string;
  createdAt: string;
}

export interface CaptainRewards {
  records: CaptainRewardRecord[];
  summary: {
    totalRewardPoints: number;
    inviteRewardPoints: number;
    leaderboardRewardPoints: number;
    firstFiveRewardUnlocked: boolean;
    firstFiveGiftedAt: string | null;
  };
}

export interface CaptainInviteDetail {
  inviteRecordId: number;
  inviteeUserId: number;
  inviteCode: string;
  inviteeLabel: string;
  isValid: boolean;
  invitedAt: string;
  validInviteSequence: number | null;
  rewardStage: "invalid" | "first_five_progress" | "first_five_reward" | "invite_points";
  rewardPoints: number | null;
  rewardStatusText: string;
  unlockedMembershipByThisInvite: boolean;
}

export interface ConsumeMomoCommandResult {
  success: true;
  command: string;
  cost: number;
  remainingBalance: number;
  memberMonthlyPointsGift: number;
  currentMonthGrantedPoints: number;
  memberLevel: string;
}

export interface AdminLoginResult {
  token: string;
  profile: AdminSessionProfile;
}

export function createUserApi(client: Pick<HttpClientLike, "get" | "post" | "put">) {
  return {
    register(payload: RegisterDto): Promise<RegisterResult> {
      return client.post<RegisterResult>("/user/register", payload);
    },
    resetPassword(payload: ResetPasswordDto): Promise<ResetPasswordResult> {
      return client.post<ResetPasswordResult>("/user/reset-password", payload);
    },
    sendSms(payload: SendSmsDto): Promise<SendSmsResult> {
      return client.post<SendSmsResult>("/user/send-sms", payload);
    },
    login(payload: LoginDto): Promise<LoginResult> {
      return client.post<LoginResult>("/user/login", payload);
    },
    fetchCaptcha(): Promise<CaptchaDto> {
      return client.get<CaptchaDto>("/user/captcha");
    },
    getInfo(): Promise<UserInfo> {
      return client.get<UserInfo>("/user/info");
    },
    updateInfo(payload: UpdateUserInfoDto): Promise<UserInfo> {
      return client.put<UserInfo>("/user/info", payload);
    },
    uploadAvatar(file: File): Promise<UserInfo> {
      const formData = new FormData();
      formData.append("file", file);
      return client.post<UserInfo>("/user/avatar/upload", formData);
    },
    updateRole(payload: UpdateRoleDto): Promise<{ updated: boolean; role: UpdateRoleDto["role"] }> {
      return client.put<{ updated: boolean; role: UpdateRoleDto["role"] }>("/user/role", payload);
    },
    verifyIdentity(payload: VerifyIdentityDto): Promise<{ success: boolean }> {
      return client.post<{ success: boolean }>("/user/verify-identity", payload);
    },
    adminLogin(payload: AdminLoginDto): Promise<AdminLoginResult> {
      return client.post<AdminLoginResult>("/admin/login", payload);
    },
    getMembershipPlans(): Promise<MembershipPlan[]> {
      return client.get<MembershipPlan[]>("/membership/plans");
    },
    subscribePlan(
      planCode: string,
      payload?: MembershipSubscribePayload
    ): Promise<MembershipSubscribeResult> {
      return client.post<MembershipSubscribeResult>(
        "/membership/subscribe",
        {
          planCode,
          sourceModule: payload?.sourceModule,
          sourceAction: payload?.sourceAction
        }
      );
    },
    getMembershipOrderStatus(outTradeNo: string): Promise<MembershipOrderStatusResult> {
      const encoded = encodeURIComponent(outTradeNo);
      return client.get<MembershipOrderStatusResult>(`/membership/order-status?outTradeNo=${encoded}`);
    },
    getCampusUnlockStatus(): Promise<CampusUnlockStatus> {
      return client.get<CampusUnlockStatus>("/campus/unlock/status");
    },
    checkoutCampusUnlock(
      payload?: Pick<MembershipSubscribePayload, "sourceModule" | "sourceAction">
    ): Promise<CampusUnlockCheckoutResponse> {
      return client.post<CampusUnlockCheckoutResponse>("/campus/unlock/checkout", {
        sourceModule: payload?.sourceModule,
        sourceAction: payload?.sourceAction
      });
    },
    getCaptainInfo(): Promise<CaptainInfo> {
      return client.get<CaptainInfo>("/captain/info");
    },
    getCaptainStats(): Promise<CaptainStats> {
      return client.get<CaptainStats>("/captain/stats");
    },
    getCaptainRanking(): Promise<CaptainRanking> {
      return client.get<CaptainRanking>("/captain/ranking");
    },
    getCaptainRewards(): Promise<CaptainRewards> {
      return client.get<CaptainRewards>("/captain/rewards");
    },
    getCaptainInvites(): Promise<CaptainInviteDetail[]> {
      return client.get<CaptainInviteDetail[]>("/captain/invites");
    },
    consumeMomoCommand(command: string): Promise<ConsumeMomoCommandResult> {
      return client.post<ConsumeMomoCommandResult>("/doppelganger/momo/consume", { command });
    }
  };
}

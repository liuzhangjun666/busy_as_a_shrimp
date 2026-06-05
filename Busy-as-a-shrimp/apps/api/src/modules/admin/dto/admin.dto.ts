export type AdminUserStatus = "active" | "frozen" | "banned";
export type AdminUserRole = "service" | "resource" | "both";
export type AdminResourceStatus = "pending" | "active" | "inactive" | "rejected";
export type CaptainLevel = "normal" | "advanced" | "gold";
export type DictStatus = "normal" | "disabled";
export type BrushOrderPenaltyStatus = "applied" | "confirmed" | "rolled_back";

export interface QueryUsersDto {
  status?: AdminUserStatus;
  role?: AdminUserRole;
  page?: number;
  pageSize?: number;
}

export interface UpdateUserStatusDto {
  status: AdminUserStatus;
}

export interface QueryResourcesDto {
  status?: AdminResourceStatus;
  page?: number;
  pageSize?: number;
}

export interface QueryBrushOrderPenaltiesDto {
  status?: BrushOrderPenaltyStatus;
  userId?: number;
  page?: number;
  pageSize?: number;
}

export interface ReviewBrushOrderPenaltyDto {
  decision: "confirm" | "rollback";
  note?: string;
}

export interface QueryDictDataDto {
  dictType?: string;
}

export interface CreateDictTypeDto {
  dictName: string;
  dictType: string;
  status: DictStatus;
  remark?: string;
}

export interface UpdateDictTypeDto {
  dictName: string;
  dictType: string;
  status: DictStatus;
  remark?: string;
}

export interface CreateDictDataDto {
  dictType: string;
  dictCode: string;
  dictLabel: string;
  dictValue: string;
  dictSort: number;
  status: DictStatus;
  remark?: string;
}

export interface UpdateDictDataDto {
  dictCode: string;
  dictLabel: string;
  dictValue: string;
  dictSort: number;
  status: DictStatus;
  remark?: string;
}

export interface ReviewResourceDto {
  decision: "approve" | "reject";
  reason?: string;
}

export interface PublishAnnouncementDto {
  title: string;
  type: string;
  content: string;
  publisher?: string;
}

export interface QueryAiBriefsDto {
  limit?: number;
}

export interface CreateAiBriefDto {
  title: string;
  sourceName: string;
  sourceUrl: string;
  summary?: string;
  publishedAt?: string;
}

export interface QuerySoloSignalsDto {
  limit?: number;
}

export interface CreateSoloSignalDto {
  title: string;
  sourceName: string;
  sourceUrl: string;
  summary?: string;
  publishedAt?: string;
  incomeSnippet?: string;
}

export interface GrantCampusUnlockDto {
  userId: number;
  note?: string;
}

export interface UpdateCaptainLevelDto {
  level: CaptainLevel;
}

export interface AdminLoginDto {
  username: string;
  password: string;
}

export interface AdminAuthProfile {
  adminId: number;
  username: string;
  role: "super_admin";
}

export interface CreateBountyTaskDto {
  title: string;
  content: string;
  points: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD" | "EXPERT";
}

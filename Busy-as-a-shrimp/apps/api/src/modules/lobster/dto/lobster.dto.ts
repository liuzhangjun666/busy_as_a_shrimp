import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";

// ===== 用户端 DTO =====
export type PersonalityType = "city" | "ecommerce" | "global";
export type LobsterStatusType = "sleeping" | "active" | "executing" | "paused";

export interface ActivateLobsterDto {
  personality?: PersonalityType;
}

export interface TriggerTaskDto {
  personalityOverride?: PersonalityType;
  taskType?: string;
}

export interface ReviewCallbackDto {
  taskId: string;
  approved: boolean;
  feedback?: string;
}

// ===== DeerFlow 回调 DTO =====
export interface DeerFlowPushResultDto {
  userId: string;
  opportunities: Array<{
    sourceType?: string;
    companyName?: string;
    industry?: string;
    logoGradient?: string;
    recruitmentType?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    noWrittenTest?: boolean;
    position?: string;
    announcementUrl?: string;
    applyUrl?: string;
    // legacy fields for backward compatibility
    title?: string;
    content?: string;
    priceRange?: { min?: number; max?: number };
    commission?: number;
    sourceUrl?: string;
  }>;
  deerflowRunId: string;
}

export interface DeerFlowReviewPendingDto {
  userId: string;
  taskId: string;
  threadId: string;
  runId: string;
  contentPreview: string;
  platform: string;
}

export interface DeerFlowHpEventDto {
  userId: string;
  delta: number;
  reason: string;
  refId?: string;
}

export interface DeerFlowTaskStatusDto {
  deerflowRunId: string;
  userId: string;
  status: "running" | "paused" | "completed" | "failed";
  outputJson?: Record<string, unknown>;
}

// ===== webhook/callback 简化回调 DTO（对齐 LangGraph Server 标准结构） =====
export interface DeerFlowWebhookCallbackDto {
  run_id: string;
  thread_id: string;
  status: "busy" | "idle" | "error" | "interrupted" | "completed" | "failed" | "success";
  metadata: {
    userId: string;
    taskType: string;
    [key: string]: unknown;
  };
  values: unknown; // 最终节点输出
}

// ===== 新增业务 DTO =====

export interface PaginatedResult<T> {
  total: number;
  page: number;
  size: number;
  list: T[];
}

export interface ReviewTaskRecord {
  reviewId: string;
  taskLogId?: string;
  context?: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | "expired";
  expiresAt: Date;
  createdAt: Date;
}

export interface LobsterMatchRecordDto {
  matchId: string;
  targetUserId?: string;
  title: string;
  content?: string;
  matchScore?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface UserBatchQueryDto {
  city?: string;
  personality?: PersonalityType;
  level?: string;
  page?: number;
  size?: number;
}

export interface CreateReviewTaskDto {
  userId: string;
  taskLogId?: string;
  threadId: string;
  runId: string;
  contentPreview: string;
  platform?: string;
}

export interface ReviewActionDto {
  approved: boolean;
  feedback?: string;
}

export class ScanCampusBodyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  scanType?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class GetOpportunitiesQueryDto {
  @IsOptional()
  @IsString()
  sourceType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size?: number;
}

import type { HttpClientLike } from "./http";

// ── 统计 ──────────────────────────────────────────────
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalResources: number;
  pendingResources: number;
  activeCaptains: number;
  matchRate: number;
  announcementCount: number;
}

// ── 用户 ──────────────────────────────────────────────
export interface AdminUser {
  userId: number;
  phoneMasked: string;
  role: "service" | "resource" | "both";
  city: string;
  memberLevel: "free" | "monthly" | "yearly" | "lifetime";
  status: "active" | "frozen" | "banned";
  createdAt: string;
  captainLevel?: "normal" | "advanced" | "gold";
}

export interface AdminListResult<T> {
  list: T[];
  page: number;
  pageSize: number;
  total: number;
}

export type UserStatus = "active" | "frozen" | "banned";
export type BrushOrderPenaltyStatus = "applied" | "confirmed" | "rolled_back";

export interface BrushOrderPenalty {
  penaltyId: number;
  userId: number;
  inviteRecordId: number;
  triggerReasons: string[];
  beforeCaptainLevel: "normal" | "advanced" | "gold";
  status: BrushOrderPenaltyStatus;
  reviewedBy?: number;
  reviewNote?: string;
  appliedAt: string;
  reviewedAt?: string;
  rolledBackAt?: string;
  affectedCommissionCount: number;
}

export interface BrushOrderPenaltyListResult {
  list: BrushOrderPenalty[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ReviewBrushOrderPenaltyDto {
  decision: "confirm" | "rollback";
  note?: string;
}

// ── 资源 ──────────────────────────────────────────────
export interface AdminPriceRange {
  min?: number;
  max?: number;
}

export interface AdminResource {
  resourceId: number;
  userId: number;
  resourceType: "skill" | "location" | "account" | "time";
  tags: string[];
  tagsZh?: string[];
  areaCode?: string;
  priceRange?: AdminPriceRange;
  status: "pending" | "active" | "inactive" | "rejected";
  createdAt: string;
  verifiedAt?: string;
  reviewReason?: string;
  reviewEngine?: string;
}

export interface QueryAdminUsersParams {
  status?: UserStatus;
  role?: AdminUser["role"];
  page?: number;
  pageSize?: number;
}

export interface QueryAdminResourcesParams {
  status?: AdminResource["status"];
  page?: number;
  pageSize?: number;
}

export type ReviewDecision = "approve" | "reject";

// ── 船长 ──────────────────────────────────────────────
export interface CaptainRank {
  captainId: number;
  name: string;
  level: "normal" | "advanced" | "gold";
  score: number;
  monthInvites: number;
  commissionRate: number;
}

export type CaptainLevel = "normal" | "advanced" | "gold";

// ── 公告 ──────────────────────────────────────────────
export type AnnouncementType = "notice" | "activity" | "warning";

export interface AdminBountyTask {
  taskId: number;
  title: string;
  points: number;
  status: string;
  difficulty: string;
}

export interface CreateBountyTaskDto {
  title: string;
  content: string;
  points: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD" | "EXPERT";
}

export type StartupPostStatus = "draft" | "published" | "offline";

export interface AdminStartupPost {
  id: string;
  title: string;
  summary: string;
  category: string | null;
  tags: string[];
  coverImageUrl: string | null;
  status: StartupPostStatus;
  sort: number;
  viewCount: number;
  publishedAt: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStartupPostDetail extends AdminStartupPost {
  content: string;
  contactInfo: string | null;
  sourceUrl: string | null;
}

export interface QueryAdminStartupPostsParams {
  status?: StartupPostStatus;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateStartupPostDto {
  title: string;
  summary?: string;
  content: string;
  category?: string;
  tags?: string[];
  coverImageUrl?: string;
  contactInfo?: string;
  sourceUrl?: string;
  sort?: number;
  status?: StartupPostStatus;
  publishedAt?: string;
}

export type UpdateStartupPostDto = CreateStartupPostDto;

export interface AdminSubmission {
  submissionId: number;
  userId: number;
  taskId: number;
  proof: string;
  status: string;
  createdAt: string;
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  publishedAt: string;
  publishedBy: string;
}

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  type: AnnouncementType;
}

export interface AdminAiBrief {
  id: string;
  title: string;
  summary?: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  createdAt: string;
}

export interface CreateAiBriefDto {
  title: string;
  sourceName: string;
  sourceUrl: string;
  summary?: string;
  publishedAt?: string;
}

export interface AdminSoloSignal {
  id: string;
  title: string;
  summary?: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  incomeSnippet?: string;
  createdAt: string;
}

export interface CreateSoloSignalDto {
  title: string;
  sourceName: string;
  sourceUrl: string;
  summary?: string;
  publishedAt?: string;
  incomeSnippet?: string;
}

// ── 匹配 ──────────────────────────────────────────────
export interface AdminMatchRecord {
  matchId: number;
  needId: number;
  resourceId: number;
  status: "pushed" | "viewed" | "confirmed" | "done" | "invalid";
  score: number;
  pushTime?: string;
}

// ── 数据字典 ──────────────────────────────────────────
export interface DictType {
  dictId: number;
  dictName: string;
  dictType: string;
  status: "normal" | "disabled";
  remark?: string;
}

export interface UpsertDictTypeDto {
  dictName: string;
  dictType: string;
  status: "normal" | "disabled";
  remark?: string;
}

export interface DictData {
  dictDataId: number;
  dictCode: string;
  dictLabel: string;
  dictValue: string;
  dictSort: number;
  status: "normal" | "disabled";
  remark?: string;
}

export interface UpsertDictDataDto {
  dictCode: string;
  dictLabel: string;
  dictValue: string;
  dictSort: number;
  status: "normal" | "disabled";
  remark?: string;
}

export interface CreateDictDataDto extends UpsertDictDataDto {
  dictType: string;
}

// ── API 工厂 ──────────────────────────────────────────
export function createAdminApi(client: Pick<HttpClientLike, "get" | "put" | "post" | "delete">) {
  return {
    // 统计
    stats(): Promise<AdminStats> {
      return client.get<AdminStats>("/admin/stats");
    },

    // 用户
    users(params?: QueryAdminUsersParams): Promise<AdminListResult<AdminUser>> {
      const query = new URLSearchParams();
      if (params?.status) query.set("status", params.status);
      if (params?.role) query.set("role", params.role);
      if (params?.page !== undefined) query.set("page", String(params.page));
      if (params?.pageSize !== undefined) query.set("pageSize", String(params.pageSize));
      const suffix = query.toString();
      return client.get<AdminListResult<AdminUser>>(`/admin/users${suffix ? `?${suffix}` : ""}`);
    },
    updateUserStatus(
      userId: number,
      status: UserStatus
    ): Promise<{ userId: number; status: string }> {
      return client.put<{ userId: number; status: string }>(`/admin/users/${userId}/status`, {
        body: { status }
      });
    },
    brushOrderPenalties(params?: {
      status?: BrushOrderPenaltyStatus;
      userId?: number;
      page?: number;
      pageSize?: number;
    }): Promise<BrushOrderPenaltyListResult> {
      const query = new URLSearchParams();
      if (params?.status) query.set("status", params.status);
      if (params?.userId !== undefined) query.set("userId", String(params.userId));
      if (params?.page !== undefined) query.set("page", String(params.page));
      if (params?.pageSize !== undefined) query.set("pageSize", String(params.pageSize));
      const suffix = query.toString();
      return client.get<BrushOrderPenaltyListResult>(
        `/admin/risk/brush-order-penalties${suffix ? `?${suffix}` : ""}`
      );
    },
    reviewBrushOrderPenalty(
      penaltyId: number,
      payload: ReviewBrushOrderPenaltyDto
    ): Promise<BrushOrderPenalty> {
      return client.put<BrushOrderPenalty>(
        `/admin/risk/brush-order-penalties/${penaltyId}/review`,
        {
          body: payload
        }
      );
    },

    // 资源
    resources(params?: QueryAdminResourcesParams): Promise<AdminListResult<AdminResource>> {
      const query = new URLSearchParams();
      if (params?.status) query.set("status", params.status);
      if (params?.page !== undefined) query.set("page", String(params.page));
      if (params?.pageSize !== undefined) query.set("pageSize", String(params.pageSize));
      const suffix = query.toString();
      return client.get<AdminListResult<AdminResource>>(
        `/admin/resources${suffix ? `?${suffix}` : ""}`
      );
    },
    reviewResource(
      id: number,
      decision: ReviewDecision,
      reason?: string
    ): Promise<{ resourceId: number; status: string }> {
      return client.put<{ resourceId: number; status: string }>(`/admin/resources/${id}`, {
        body: { decision, reason }
      });
    },

    // 船长
    captainRanking(): Promise<CaptainRank[]> {
      return client.get<CaptainRank[]>("/admin/captain/ranking");
    },
    updateCaptainLevel(
      captainId: number,
      level: CaptainLevel
    ): Promise<{ captainId: number; level: string }> {
      return client.put<{ captainId: number; level: string }>(`/admin/captain/${captainId}/level`, {
        body: { level }
      });
    },

    // 公告
    announce(dto: CreateAnnouncementDto): Promise<AdminAnnouncement> {
      return client.post<AdminAnnouncement>("/admin/announce", { body: dto });
    },
    announcements(): Promise<AdminAnnouncement[]> {
      return client.get<AdminAnnouncement[]>("/admin/announcements");
    },
    aiBriefs(limit = 50): Promise<AdminAiBrief[]> {
      return client.get<AdminAiBrief[]>(`/admin/ai-briefs?limit=${limit}`);
    },
    createAiBrief(payload: CreateAiBriefDto): Promise<AdminAiBrief> {
      return client.post<AdminAiBrief>("/admin/ai-briefs", { body: payload });
    },
    soloSignals(limit = 50): Promise<AdminSoloSignal[]> {
      return client.get<AdminSoloSignal[]>(`/admin/solo-signals?limit=${limit}`);
    },
    createSoloSignal(payload: CreateSoloSignalDto): Promise<AdminSoloSignal> {
      return client.post<AdminSoloSignal>("/admin/solo-signals", { body: payload });
    },
    deleteAnnouncement(id: string): Promise<{ id: string }> {
      return client.delete<{ id: string }>(`/admin/announcements/${id}`);
    },

    // 匹配记录
    matches(): Promise<AdminMatchRecord[]> {
      return client.get<AdminMatchRecord[]>("/admin/matches");
    },

    // 数据字典
    dictTypes(): Promise<DictType[]> {
      return client.get<DictType[]>("/admin/dict/types");
    },
    createDictType(dto: UpsertDictTypeDto): Promise<DictType> {
      return client.post<DictType>("/admin/dict/types", { body: dto });
    },
    updateDictType(dictId: number, dto: UpsertDictTypeDto): Promise<DictType> {
      return client.put<DictType>(`/admin/dict/types/${dictId}`, { body: dto });
    },
    deleteDictType(dictId: number): Promise<{ dictId: number }> {
      return client.delete<{ dictId: number }>(`/admin/dict/types/${dictId}`);
    },
    dictData(dictType: string): Promise<DictData[]> {
      return client.get<DictData[]>(`/admin/dict/data?dictType=${encodeURIComponent(dictType)}`);
    },
    createDictData(dto: CreateDictDataDto): Promise<DictData> {
      return client.post<DictData>("/admin/dict/data", { body: dto });
    },
    updateDictData(dictDataId: number, dto: UpsertDictDataDto): Promise<DictData> {
      return client.put<DictData>(`/admin/dict/data/${dictDataId}`, { body: dto });
    },
    deleteDictData(dictDataId: number): Promise<{ dictDataId: number }> {
      return client.delete<{ dictDataId: number }>(`/admin/dict/data/${dictDataId}`);
    },

    // 任务与审核
    tasks(): Promise<AdminBountyTask[]> {
      return client.get<AdminBountyTask[]>("/admin/tasks");
    },
    createTask(dto: CreateBountyTaskDto): Promise<AdminBountyTask> {
      return client.post<AdminBountyTask>("/admin/tasks", { body: dto });
    },
    submissions(): Promise<AdminSubmission[]> {
      return client.get<AdminSubmission[]>("/admin/submissions");
    },
    reviewSubmission(
      id: number,
      decision: "approve" | "reject"
    ): Promise<{ submissionId: number; status: string }> {
      return client.put<{ submissionId: number; status: string }>(
        `/admin/submissions/${id}/review`,
        { body: { decision } }
      );
    },

    // 创业信息
    startupPosts(
      params?: QueryAdminStartupPostsParams
    ): Promise<AdminListResult<AdminStartupPost>> {
      const query = new URLSearchParams();
      if (params?.status) query.set("status", params.status);
      if (params?.keyword) query.set("keyword", params.keyword);
      if (params?.page !== undefined) query.set("page", String(params.page));
      if (params?.pageSize !== undefined) query.set("pageSize", String(params.pageSize));
      const suffix = query.toString();
      return client.get<AdminListResult<AdminStartupPost>>(
        `/admin/startup-posts${suffix ? `?${suffix}` : ""}`
      );
    },
    startupPost(id: string): Promise<AdminStartupPostDetail> {
      return client.get<AdminStartupPostDetail>(`/admin/startup-posts/${id}`);
    },
    createStartupPost(dto: CreateStartupPostDto): Promise<AdminStartupPostDetail> {
      return client.post<AdminStartupPostDetail>("/admin/startup-posts", { body: dto });
    },
    updateStartupPost(id: string, dto: UpdateStartupPostDto): Promise<AdminStartupPostDetail> {
      return client.put<AdminStartupPostDetail>(`/admin/startup-posts/${id}`, { body: dto });
    },
    updateStartupPostStatus(
      id: string,
      status: StartupPostStatus,
      publishedAt?: string
    ): Promise<AdminStartupPostDetail> {
      return client.put<AdminStartupPostDetail>(`/admin/startup-posts/${id}/status`, {
        body: { status, publishedAt }
      });
    },
    deleteStartupPost(id: string): Promise<{ id: string }> {
      return client.delete<{ id: string }>(`/admin/startup-posts/${id}`);
    }
  };
}

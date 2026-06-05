import type { HttpClientLike } from "./http";

export interface LobsterStatus {
  status: "sleeping" | "active" | "executing" | "paused";
  hp: number;
}

export interface CampusOpportunityRecord {
  companyName: string;
  industry: string;
  logoGradient: string;
  recruitmentType: string;
  location: string;
  startDate: string;
  endDate: string;
  noWrittenTest: boolean;
  position: string;
  announcementUrl: string;
  applyUrl: string;
  sourceType: string;
}

export interface CampusOpportunitiesResponse {
  total: number;
  page: number;
  size: number;
  list: CampusOpportunityRecord[];
}

export interface CampusOpportunitiesQuery {
  page?: number;
  size?: number;
  sourceType?: string;
}

export interface CampusScanPayload {
  scanType?: string;
  city?: string;
  keyword?: string;
  limit?: number;
}

export interface LobsterTaskLogItem {
  taskType?: string;
  status?: string;
  startedAt?: string;
  completedAt?: string;
  deerflowRunId?: string;
}

export function createLobsterApi(client: Pick<HttpClientLike, "get" | "post">) {
  return {
    /**
     * 获取赛博分身状态
     */
    getStatus(): Promise<LobsterStatus> {
      return client.get<LobsterStatus>("/lobster/status");
    },

    /**
     * 触发自动化任务 (如 daily_scan)
     */
    trigger(
      taskType: string = "daily_scan",
      personalityOverride?: string
    ): Promise<{ success: boolean; logId?: string }> {
      return client.post<{ success: boolean; logId?: string }>("/lobster/trigger", {
        taskType,
        personalityOverride
      });
    },

    /**
     * 触发智能匹配任务
     */
    triggerMatch(
      userProfile?: string,
      demandPool?: string
    ): Promise<{ threadId?: string; runId?: string }> {
      return client.post<{ threadId?: string; runId?: string }>("/lobster/trigger-match", {
        userProfile,
        demandPool
      });
    },

    /**
     * 触发校招抓取任务
     */
    scanCampus(payload: CampusScanPayload): Promise<{ success: boolean; message?: string }> {
      return client.post<{ success: boolean; message?: string }>("/lobster/scan-campus", payload);
    },

    /**
     * 获取历史智配记录
     */
    getMatches(
      page: number = 1,
      size: number = 20
    ): Promise<{ list: Record<string, unknown>[]; total: number }> {
      return client.get<{ list: Record<string, unknown>[]; total: number }>(
        `/lobster/matches?page=${page}&size=${size}`
      );
    },

    /**
     * 获取分身任务日志
     */
    getTaskLogs(): Promise<LobsterTaskLogItem[]> {
      return client.get<LobsterTaskLogItem[]>("/lobster/task-logs");
    },

    /**
     * 获取校招岗位机会（分页）
     */
    getCampusOpportunities(
      query: CampusOpportunitiesQuery = {}
    ): Promise<CampusOpportunitiesResponse> {
      const page = query.page ?? 1;
      const size = query.size ?? 20;
      const sourceType = query.sourceType ?? "campus_recruitment";
      const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        sourceType
      });

      return client.get<CampusOpportunitiesResponse>(`/lobster/opportunities?${params.toString()}`);
    },

    /**
     * 获取公开校招岗位机会（游客可访问）
     */
    getPublicCampusOpportunities(limit: number = 20): Promise<CampusOpportunitiesResponse> {
      const params = new URLSearchParams({
        limit: String(limit)
      });
      return client.get<CampusOpportunitiesResponse>(
        `/public/campus-opportunities?${params.toString()}`
      );
    }
  };
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Link2,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Sparkles
} from "lucide-react";
import Link from "next/link";

import { getLobsterApi, getMatchApi } from "@/api";
import type { MatchItem } from "@/api/match-api";
import { MatchListSkeletonGrid } from "@/features/match-list/match-list-skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/stores/user-store";
import { getErrorMessage } from "@/utils/error-message";
import {
  formatResourceTagLabel,
  formatUploaderLabel,
  resolveResourceTypeLabel
} from "@/utils/resource-display";

type MatchStatusFilter = "all" | "pending" | "confirmed" | "invalid";
type MatchStatus = "pending" | "confirmed" | "invalid";
type TargetStatus = "PENDING" | "CONFIRMED" | "REJECTED";
type MatchSource = "business" | "resource_pool" | "deerflow";

type AiTriggerResult = {
  resourcePoolMatchedCount: number;
  deerflowStarted: boolean;
  errors: string[];
};

const POOL_TAG_IGNORED_VALUES = new Set([
  "activation_resource",
  "activation skill",
  "activation_skill",
  "activation goal",
  "activation_goal",
  "activation custom module",
  "activation_custom_module",
  "core skill",
  "core_skill",
  "core location",
  "core_location",
  "core account",
  "core_account",
  "core time",
  "core_time",
  "skill",
  "location",
  "account",
  "time",
  "region"
]);

const ENGLISH_TO_CHINESE_LABELS: Record<string, string> = {
  "RESOURCE POOL": "资源池",
  DEERFLOW: "智能外部线索",
  "HANDSHAKE MONITOR": "对接状态",
  "CONTACT ENCRYPTION": "联系方式",
  "[ YOU: READY ]": "我方：已确认",
  "[ YOU: PENDING ]": "我方：待确认",
  "[ YOU: REJECTED ]": "我方：已拒绝",
  "[ TARGET: READY ]": "对方：已确认",
  "[ TARGET: REJECTED ]": "对方：已拒绝",
  "[ TARGET: AWAITING ]": "对方：待回应"
};

export type MatchCardItem = {
  matchId: number;
  needId: number;
  resourceId: number;
  score: number;
  status: MatchStatus;
  targetStatus: TargetStatus;
  rejectedBy?: "self" | "target";
  locationTags: string[];
  skillTags: string[];
  maskedContact: string;
  source: MatchSource;
  title?: string;
  content?: string;
};

export const MATCH_LIST_QUERY_KEY = ["match-list"] as const;

function normalizeTextList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeTextList(item));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (typeof value === "number") {
    return [String(value)];
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap((item) => normalizeTextList(item));
  }
  return [];
}

function maskContact(raw: unknown): string {
  if (typeof raw !== "string") {
    return "确认后可见";
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 11) {
    return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
  }

  return "确认后可见";
}

function normalizeStatus(value: unknown): MatchStatus {
  if (value === "confirmed" || value === "done") {
    return "confirmed";
  }
  if (value === "rejected" || value === "invalid" || value === "expired") {
    return "invalid";
  }
  return "pending";
}

function normalizeTargetStatus(value: unknown, sourceStatus: unknown): TargetStatus {
  if (value === "CONFIRMED") {
    return "CONFIRMED";
  }
  if (value === "REJECTED") {
    return "REJECTED";
  }
  if (value === "PENDING") {
    return "PENDING";
  }

  // Mock fallback per spec.
  return sourceStatus === "CONFIRMED" ? "PENDING" : "PENDING";
}

function getYouHandshakeMeta(
  status: MatchStatus,
  rejectedBy?: "self" | "target"
): { label: string; dotClassName: string } {
  if (status === "confirmed") {
    return {
      label: ENGLISH_TO_CHINESE_LABELS["[ YOU: READY ]"],
      dotClassName: "bg-emerald-500"
    };
  }

  if (status === "invalid" && rejectedBy === "self") {
    return {
      label: ENGLISH_TO_CHINESE_LABELS["[ YOU: REJECTED ]"],
      dotClassName: "bg-rose-500"
    };
  }

  return {
    label: ENGLISH_TO_CHINESE_LABELS["[ YOU: PENDING ]"],
    dotClassName: "bg-blue-500"
  };
}

function getTargetHandshakeMeta(status: TargetStatus): { label: string; dotClassName: string } {
  if (status === "CONFIRMED") {
    return {
      label: ENGLISH_TO_CHINESE_LABELS["[ TARGET: READY ]"],
      dotClassName: "bg-emerald-500"
    };
  }

  if (status === "REJECTED") {
    return {
      label: ENGLISH_TO_CHINESE_LABELS["[ TARGET: REJECTED ]"],
      dotClassName: "bg-rose-500"
    };
  }

  return {
    label: ENGLISH_TO_CHINESE_LABELS["[ TARGET: AWAITING ]"],
    dotClassName: "animate-pulse bg-amber-500"
  };
}

function pickOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function pickRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getSourceSectionMeta(source: MatchSource): { title: string; description: string } {
  if (source === "business") {
    return {
      title: "需求匹配",
      description: "平台需求侧匹配结果，支持确认、拒绝和重跑。"
    };
  }

  if (source === "resource_pool") {
    return {
      title: "资源池匹配",
      description: "基于你的已发布资源画像，从平台资源池中排除自己的资源后匹配。"
    };
  }

  return {
    title: "DeerFlow 商机",
    description: "由 DeerFlow 智能体在外部线索和商机池中异步检索回写。"
  };
}

function toReadablePoolTag(tag: string): string | null {
  const formatted = formatResourceTagLabel(tag);
  if (!formatted) {
    return null;
  }

  const normalized = formatted
    .replace(/^(资源|技能|愿望|地区|核心技能|地点|账号\/流量|时间\/劳动力)：/, "")
    .trim();

  if (!normalized) {
    return null;
  }

  const lower = normalized.toLowerCase();
  if (POOL_TAG_IGNORED_VALUES.has(lower)) {
    return null;
  }

  if (/^\d{6,}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function uniqueReadablePoolTags(tags: unknown, limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of normalizeTextList(tags)) {
    const readable = toReadablePoolTag(tag);
    if (!readable || seen.has(readable)) {
      continue;
    }
    seen.add(readable);
    result.push(readable);
    if (result.length >= limit) {
      break;
    }
  }

  return result;
}

function formatPoolReason(reason: string): string | null {
  const trimmed = reason.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("类型 ")) {
    return `资源类型匹配：${resolveResourceTypeLabel(trimmed.slice(3).trim())}`;
  }

  if (trimmed.startsWith("地区 ")) {
    const readable = toReadablePoolTag(`region:${trimmed.slice(3).trim()}`);
    return readable ? `地区匹配：${readable}` : "地区匹配";
  }

  const readable = toReadablePoolTag(trimmed);
  return readable ?? trimmed;
}

function buildReadablePoolTitle(metadata: Record<string, unknown>, fallbackUserId: number): string {
  const uploader = formatUploaderLabel(
    pickRecord(metadata.uploader) as
      | {
          userId?: number | string;
          nickname?: string | null;
          maskedPhone?: string | null;
        }
      | null,
    fallbackUserId
  );
  const resourceType = resolveResourceTypeLabel(String(metadata.resourceType ?? "skill"));
  const highlightTag = uniqueReadablePoolTags(metadata.tags, 1)[0];

  return highlightTag
    ? `资源池匹配：${uploader} · ${highlightTag}`
    : `资源池匹配：${uploader} · ${resourceType}`;
}

function buildReadablePoolContent(metadata: Record<string, unknown>, fallbackResourceId: number): string {
  const resourceType = resolveResourceTypeLabel(String(metadata.resourceType ?? "skill"));
  const reasons = normalizeTextList(metadata.reasons)
    .map((reason) => formatPoolReason(reason))
    .filter((reason): reason is string => Boolean(reason));
  const tags = uniqueReadablePoolTags(metadata.tags, 4);
  const resourceId = metadata.resourceId ? String(metadata.resourceId) : String(fallbackResourceId);

  return [
    `资源 #${resourceId}`,
    `资源类型：${resourceType}`,
    reasons.length > 0 ? `匹配原因：${reasons.join("、")}` : "匹配原因：画像相似",
    tags.length > 0 ? `可提供：${tags.join("、")}` : ""
  ]
    .filter(Boolean)
    .join(" | ");
}

function normalizeMatch(item: MatchItem, index: number): MatchCardItem {
  const extra = item as unknown as Record<string, unknown>;
  const matchId = Number(item.matchId);
  const needId = Number(item.needId);
  const resourceId = Number(item.resourceId);
  const score = Number(item.score);

  return {
    matchId: Number.isFinite(matchId) ? matchId : index + 1,
    needId: Number.isFinite(needId) ? needId : 0,
    resourceId: Number.isFinite(resourceId) ? resourceId : 0,
    score: Number.isFinite(score) ? score : 0,
    status: normalizeStatus(item.status),
    targetStatus: normalizeTargetStatus(
      (item as unknown as { targetStatus?: unknown }).targetStatus,
      item.status
    ),
    locationTags: normalizeTextList(
      extra.locationTags ?? extra.regionTags ?? extra.areaTags ?? extra.location
    ).slice(0, 3),
    skillTags: normalizeTextList(extra.skillTags ?? extra.tags ?? extra.skills).slice(0, 4),
    maskedContact: maskContact(extra.contactMasked ?? extra.phoneMasked ?? extra.contact),
    source: "business"
  };
}

function normalizeLobsterMatch(item: Record<string, unknown>, index: number): MatchCardItem {
  const scoreRaw = Number(item.matchScore);
  const metadata = pickRecord(item.metadata);
  const source: MatchSource = metadata?.source === "resource_pool" ? "resource_pool" : "deerflow";
  const resourceId = Number(metadata?.resourceId);
  const readablePoolTags = source === "resource_pool" ? uniqueReadablePoolTags(metadata?.tags, 4) : [];
  const readablePoolLocations = source === "resource_pool" ? uniqueReadablePoolTags([metadata?.areaCode], 3) : [];
  const poolStatus =
    source === "resource_pool"
      ? normalizeStatus(metadata?.confirmationStatus ?? metadata?.status ?? item.status)
      : "pending";
  const poolTargetStatus =
    source === "resource_pool"
      ? normalizeTargetStatus(metadata?.targetStatus, metadata?.confirmationStatus ?? item.status)
      : "PENDING";
  const uploader = pickRecord(metadata?.uploader);
  const poolMaskedContact =
    source === "resource_pool" && poolStatus === "confirmed"
      ? maskContact(uploader?.maskedPhone ?? metadata?.maskedPhone ?? metadata?.contactMasked)
      : source === "resource_pool"
        ? "确认后查看资源方联系方式"
        : "确认后解锁外部情报";

  return {
    matchId: Number(item.matchId) || index + 5000,
    needId: 0,
    resourceId: Number.isFinite(resourceId) ? resourceId : 0,
    score: Number.isFinite(scoreRaw) ? scoreRaw : 85,
    status: poolStatus,
    targetStatus: poolTargetStatus,
    rejectedBy:
      source === "resource_pool" &&
      (metadata?.rejectedBy === "self" || metadata?.rejectedBy === "target")
        ? metadata.rejectedBy
        : undefined,
    locationTags:
      source === "resource_pool"
        ? readablePoolLocations
        : ["AI全网发现", "同城商机"],
    skillTags:
      source === "resource_pool" ? readablePoolTags : ["智能推荐"],
    maskedContact: poolMaskedContact,
    source,
    title:
      source === "resource_pool"
        ? buildReadablePoolTitle(metadata ?? {}, Number(item.targetUserId) || 0)
        : pickOptionalString(item.title),
    content:
      source === "resource_pool"
        ? buildReadablePoolContent(metadata ?? {}, Number(resourceId) || 0)
        : pickOptionalString(item.content)
  };
}

export async function fetchMatchListQueryData(): Promise<MatchCardItem[]> {
  const [matchRes, aiRes] = await Promise.allSettled([
    getMatchApi().list(),
    getLobsterApi().getMatches(1, 100)
  ]);

  const businessList =
    matchRes.status === "fulfilled"
      ? matchRes.value.map((item, index) => normalizeMatch(item, index))
      : [];

  const aiList =
    aiRes.status === "fulfilled"
      ? aiRes.value.list.map((item, index) =>
          normalizeLobsterMatch(item as Record<string, unknown>, index)
        )
      : [];

  return [...businessList, ...aiList].sort((a, b) => b.score - a.score);
}

function getStatusMeta(status: MatchStatus): { label: string; className: string } {
  if (status === "confirmed") {
    return {
      label: "已确认",
      className: "border-emerald-100 bg-emerald-50 text-emerald-600"
    };
  }
  if (status === "invalid") {
    return {
      label: "已失效",
      className: "border-slate-200 bg-slate-100 text-slate-500"
    };
  }
  return {
    label: "待确认",
    className: "border-amber-100 bg-amber-50 text-amber-600"
  };
}

function parseStatusFilter(value: string | null): MatchStatusFilter {
  if (value === "pending" || value === "confirmed" || value === "invalid") {
    return value;
  }
  return "all";
}

function LoginRequiredCard({ hydrated }: { hydrated: boolean }) {
  return (
    <Card className="rounded-[2rem] border border-slate-200 bg-white p-2 shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">匹配列表</CardTitle>
        <CardDescription className="text-slate-500">
          {hydrated ? "请先登录后查看匹配结果。" : "正在初始化页面..."}
        </CardDescription>
      </CardHeader>
      {hydrated ? (
        <CardFooter>
          <Button
            asChild
            className="rounded-xl bg-slate-900 font-semibold tracking-wide text-white shadow-sm transition-all hover:bg-slate-800"
          >
            <Link href="/auth">去登录</Link>
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}

function MatchListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [confirmTarget, setConfirmTarget] = useState<MatchCardItem | null>(null);
  const searchParamsSnapshot = searchParams.toString();
  const statusParam = searchParams.get("status");
  const queryParam = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(queryParam);

  const statusFilter = parseStatusFilter(statusParam);
  const keyword = queryParam.trim().toLowerCase();

  const {
    data = [],
    isFetching,
    isPending,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: MATCH_LIST_QUERY_KEY,
    queryFn: fetchMatchListQueryData,
    staleTime: 45_000,
    retry: 1
  });

  const filtered = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const searchable = [
        String(item.matchId),
        String(item.needId),
        String(item.resourceId),
        item.source,
        item.title ?? "",
        item.content ?? "",
        item.locationTags.join(" "),
        item.skillTags.join(" ")
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(keyword);
    });
  }, [data, keyword, statusFilter]);
  const groupedFiltered = useMemo(() => {
    const orderedSources: MatchSource[] = ["business", "resource_pool", "deerflow"];
    return orderedSources.flatMap((source) => filtered.filter((item) => item.source === source));
  }, [filtered]);

  const syncUrlState = useCallback(
    (patch: { status?: MatchStatusFilter | null; q?: string | null }) => {
      const params = new URLSearchParams(searchParamsSnapshot);

      if (patch.status !== undefined) {
        if (!patch.status || patch.status === "all") {
          params.delete("status");
        } else {
          params.set("status", patch.status);
        }
      }

      if (patch.q !== undefined) {
        const q = patch.q?.trim();
        if (!q) {
          params.delete("q");
        } else {
          params.set("q", q);
        }
      }

      const next = params.toString();
      if (next === searchParamsSnapshot) {
        return;
      }

      router.replace(next ? `?${next}` : "?", { scroll: false });
    },
    [router, searchParamsSnapshot]
  );

  useEffect(() => {
    setSearchInput(queryParam);
  }, [queryParam]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      syncUrlState({ q: searchInput });
    }, 260);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput, syncUrlState]);

  const confirmMutation = useMutation({
    mutationFn: async (matchId: number) => getMatchApi().confirm(matchId),
    onMutate: async (matchId) => {
      await queryClient.cancelQueries({ queryKey: MATCH_LIST_QUERY_KEY });
      const previous = queryClient.getQueryData<MatchCardItem[]>(MATCH_LIST_QUERY_KEY) ?? [];

      queryClient.setQueryData<MatchCardItem[]>(
        MATCH_LIST_QUERY_KEY,
        previous.map((item) =>
          item.matchId === matchId
            ? {
                ...item,
                status: "confirmed"
              }
            : item
        )
      );

      toast({
        title: "已确认匹配",
        description: "正在同步服务端状态..."
      });

      return { previous };
    },
    onError: (submitError, _matchId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(MATCH_LIST_QUERY_KEY, context.previous);
      }

      toast({
        variant: "destructive",
        title: "确认失败，已回滚",
        description: getErrorMessage(submitError)
      });
    },
    onSuccess: () => {
      toast({
        title: "匹配确认成功",
        description: "已进入后续流程。"
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: MATCH_LIST_QUERY_KEY });
    }
  });

  const aiTriggerMutation = useMutation({
    mutationFn: async (): Promise<AiTriggerResult> => {
      const [resourcePoolResult, deerflowResult] = await Promise.allSettled([
        getMatchApi().runPool({ topK: 20 }),
        getLobsterApi().triggerMatch()
      ]);
      const errors = [
        resourcePoolResult.status === "rejected"
          ? `资源池匹配失败：${getErrorMessage(resourcePoolResult.reason)}`
          : "",
        deerflowResult.status === "rejected"
          ? `DeerFlow 下发失败：${getErrorMessage(deerflowResult.reason)}`
          : ""
      ].filter(Boolean);

      if (resourcePoolResult.status === "rejected" && deerflowResult.status === "rejected") {
        throw new Error(errors.join("；"));
      }

      return {
        resourcePoolMatchedCount:
          resourcePoolResult.status === "fulfilled" ? resourcePoolResult.value.matchedCount : 0,
        deerflowStarted: deerflowResult.status === "fulfilled",
        errors
      };
    },
    onSuccess: (result) => {
      toast({
        title: "AI 智配已启动",
        description: [
          `资源池已匹配 ${result.resourcePoolMatchedCount} 条`,
          result.deerflowStarted ? "DeerFlow 已下发" : "DeerFlow 未下发",
          ...result.errors
        ].join("；")
      });
      void queryClient.invalidateQueries({ queryKey: MATCH_LIST_QUERY_KEY });
      // 触发后 2 秒尝试请求一次列表，给 AI 一点反应时间
      setTimeout(() => {
        void refetch();
      }, 2000);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "启动失败",
        description: getErrorMessage(error)
      });
    }
  });

  const rerunMutation = useMutation({
    mutationFn: async (needId: number) => getMatchApi().run({ needId }),
    onSuccess: (_result, needId) => {
      toast({
        title: "已提交重跑请求",
        description: `需求 ${needId} 已重新进入匹配队列。`
      });
      void queryClient.invalidateQueries({ queryKey: MATCH_LIST_QUERY_KEY });
    },
    onError: (runError) => {
      toast({
        variant: "destructive",
        title: "重跑失败",
        description: getErrorMessage(runError)
      });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (matchId: number) => getMatchApi().reject(matchId),
    onSuccess: () => {
      toast({
        title: "匹配已拒绝",
        description: "该匹配已标记为失效。"
      });
      void queryClient.invalidateQueries({ queryKey: MATCH_LIST_QUERY_KEY });
    },
    onError: (rejectError) => {
      toast({
        variant: "destructive",
        title: "拒绝失败",
        description: getErrorMessage(rejectError)
      });
    }
  });

  const submittingId = confirmMutation.variables ?? null;
  const rejectingId = rejectMutation.variables ?? null;
  const rerunNeedId = rerunMutation.variables ?? null;

  return (
    <section className="space-y-4">
      <Card className="rounded-[2rem] border border-slate-200 bg-white p-2 shadow-sm">
        <CardHeader className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
                匹配列表
              </CardTitle>
              <CardDescription className="mt-1 text-sm font-medium text-slate-500">
                高契合度优先展示，确认后才开放联系方式。
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="hidden items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 font-medium text-white shadow-sm transition-all hover:bg-slate-800 md:flex"
                onClick={() => void aiTriggerMutation.mutate()}
                disabled={aiTriggerMutation.isPending}
              >
                {aiTriggerMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4 text-blue-200" />
                )}
                AI 智配
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border border-slate-200 bg-white px-5 py-2 font-medium text-slate-700 transition-all hover:bg-slate-50"
                onClick={() => void refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                刷新
              </Button>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(event.target.value.replace(/[^\w\u4e00-\u9fa5-\s]/g, ""))
                }
                placeholder="搜索匹配 ID / 标签"
                autoComplete="off"
                className="w-full max-w-md rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 text-slate-900 placeholder:text-slate-400 transition-all focus:border-transparent focus:bg-white focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "pending", "confirmed", "invalid"] as const).map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={statusFilter === status ? "default" : "ghost"}
                  onClick={() => syncUrlState({ status })}
                  className={cn(
                    "px-3 py-1.5 text-sm transition-colors",
                    statusFilter === status
                      ? "rounded-lg bg-slate-100/80 font-semibold text-slate-900"
                      : "font-medium text-slate-500 hover:text-slate-900"
                  )}
                >
                  {status === "all"
                    ? "全部"
                    : status === "pending"
                      ? "待确认"
                      : status === "confirmed"
                        ? "已确认"
                        : "已失效"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {isError ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="flex items-start gap-2 p-4 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-2">
              <p className="font-medium">匹配列表加载失败</p>
              <p>{getErrorMessage(error)}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
                重试
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!isError && isPending ? <MatchListSkeletonGrid count={4} /> : null}

      {!isError && !isPending && filtered.length === 0 ? (
        <Card className="rounded-[2rem] border border-slate-200 bg-white p-2 shadow-sm">
          <CardContent className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-100 bg-slate-50/50 py-16 text-center">
            <div className="mb-4">
              <Sparkles className="h-16 w-16 text-slate-300" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">暂无匹配结果</h3>
              <p className="mb-6 mt-2 text-sm text-slate-400">
                先发布资源，系统会自动尝试为你匹配。
              </p>
            </div>
            <Button
              asChild
              className="rounded-xl bg-slate-900 px-8 py-3 font-semibold text-white shadow-sm transition-all hover:bg-slate-800"
            >
              <Link href="/resource/new">去发布资源</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!isError && !isPending && groupedFiltered.length > 0 ? (
        <motion.ul className="grid gap-3">
          <AnimatePresence initial={false} mode="popLayout">
            {groupedFiltered.map((item, index) => {
              const statusMeta = getStatusMeta(item.status);
              const scoreWidth = Math.max(4, Math.min(100, item.score));
              const isPending = item.status === "pending";
                const canConfirm =
                  isPending && (item.source === "business" || item.source === "resource_pool");
              const isSubmitting = submittingId === item.matchId && confirmMutation.isPending;
              const isRejecting = rejectingId === item.matchId && rejectMutation.isPending;
                const canRerun = item.source === "business" && item.needId > 0;
              const isRerunning = rerunNeedId === item.needId && rerunMutation.isPending;
                const youHandshakeMeta = getYouHandshakeMeta(item.status, item.rejectedBy);
              const targetHandshakeMeta = getTargetHandshakeMeta(item.targetStatus);
              const sectionMeta = getSourceSectionMeta(item.source);
              const previousItem = groupedFiltered[index - 1];
              const showSectionHeader = !previousItem || previousItem.source !== item.source;

              return (
                <motion.li
                  key={`${item.source}-${item.matchId}`}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {showSectionHeader ? (
                    <div className="mb-3 mt-2 flex flex-wrap items-end justify-between gap-2 px-1">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{sectionMeta.title}</h3>
                        <p className="mt-1 text-xs text-slate-500">{sectionMeta.description}</p>
                      </div>
                    </div>
                  ) : null}
                  <motion.div
                    whileHover={{ y: -2, scale: 1.003 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <Card className="rounded-[2rem] border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
                      <CardHeader className="space-y-4 p-6 pb-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <CardTitle className="text-lg font-bold tracking-tight text-slate-900">
                            {item.source === "deerflow" ? (
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-blue-500" />
                                <span>DeerFlow 商机</span>
                              </div>
                            ) : item.source === "resource_pool" ? (
                              <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-emerald-500" />
                                <span>资源池匹配</span>
                              </div>
                            ) : (
                              <>
                                匹配任务 <span className="text-slate-900">#{item.matchId}</span>
                              </>
                            )}
                          </CardTitle>
                          <div className="flex gap-2">
                            {item.source === "deerflow" && (
                              <Badge className="border border-blue-100 bg-blue-50 text-blue-600">
                                {ENGLISH_TO_CHINESE_LABELS.DEERFLOW}
                              </Badge>
                            )}
                            {item.source === "resource_pool" && (
                              <Badge className="border border-emerald-100 bg-emerald-50 text-emerald-600">
                                {ENGLISH_TO_CHINESE_LABELS["RESOURCE POOL"]}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full border-none px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest",
                                statusMeta.className
                              )}
                            >
                              {statusMeta.label}
                            </Badge>
                          </div>
                        </div>
                        <CardDescription className="flex items-center gap-2 text-xs tracking-tight text-slate-500">
                          <div className="h-1 w-1 rounded-full bg-slate-300" />
                          {item.source === "deerflow"
                            ? `外部商机 #${item.matchId}`
                            : `需求 ${item.needId} · 资源 ${item.resourceId}`}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-6 p-6 pt-0">
                        <div className="space-y-3">
                          {item.title && (
                            <h4 className="line-clamp-1 text-sm font-bold text-slate-900">
                              {item.title}
                            </h4>
                          )}
                          {item.content && (
                            <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
                              {item.content}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                            <span>契合深度</span>
                            <span className="font-mono text-slate-900">
                              {item.score.toFixed(1)} %
                            </span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-slate-100">
                            <motion.div
                              className="h-2.5 rounded-full bg-slate-900"
                              initial={{ width: 0 }}
                              animate={{ width: `${scoreWidth}%` }}
                              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                            />
                          </div>
                          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <p className="mb-2 text-[10px] font-mono tracking-[0.2em] text-slate-400">
                              {ENGLISH_TO_CHINESE_LABELS["HANDSHAKE MONITOR"]}
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                                <span
                                  className={cn(
                                    "h-2 w-2 rounded-full",
                                    youHandshakeMeta.dotClassName
                                  )}
                                />
                                <span className="font-mono text-[10px] tracking-widest text-slate-700">
                                  {youHandshakeMeta.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                                <span
                                  className={cn(
                                    "h-2 w-2 rounded-full",
                                    targetHandshakeMeta.dotClassName
                                  )}
                                />
                                <span className="font-mono text-[10px] tracking-widest text-slate-700">
                                  {targetHandshakeMeta.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                              <MapPin className="h-3 w-3 text-blue-500/60" />
                              地区标签
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {item.locationTags.length > 0 ? (
                                item.locationTags.map((tag) => (
                                  <Badge
                                    key={`${item.matchId}-location-${tag}`}
                                    variant="secondary"
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-all hover:bg-slate-100"
                                  >
                                    {tag}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-[10px] italic text-slate-400">暂无记录</span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                              <CheckCircle2 className="h-3 w-3 text-blue-500/60" />
                              核心技能
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {item.skillTags.length > 0 ? (
                                item.skillTags.map((tag) => (
                                  <Badge
                                    key={`${item.matchId}-skill-${tag}`}
                                    variant="secondary"
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-all hover:bg-slate-100"
                                  >
                                    {tag}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-[10px] italic text-slate-400">暂无记录</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                          <div className="flex items-start gap-4">
                            <div className="rounded-full bg-white p-2.5 ring-1 ring-slate-200">
                              <Link2 className="h-4 w-4 text-slate-500" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                {ENGLISH_TO_CHINESE_LABELS["CONTACT ENCRYPTION"]}
                              </p>
                              <p className="font-mono text-sm font-medium tracking-tight text-slate-700">
                                {isPending ? "已加密，确认后可查看" : item.maskedContact}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>

                      <CardFooter className="p-6 pt-0">
                        <div className="flex w-full flex-wrap items-center gap-2">
                          {canConfirm ? (
                            <>
                              <Button
                                type="button"
                                onClick={() => setConfirmTarget(item)}
                                disabled={isSubmitting || isRejecting}
                                className="group rounded-xl bg-slate-900 font-semibold tracking-wide text-white shadow-sm transition-all hover:bg-slate-800"
                              >
                                {isSubmitting ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                确认并建立连接
                                <ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={isSubmitting || isRejecting}
                                onClick={() => void rejectMutation.mutateAsync(item.matchId)}
                                className="rounded-xl border border-rose-200 bg-white text-rose-500 hover:bg-rose-50"
                              >
                                {isRejecting ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                拒绝
                              </Button>
                            </>
                          ) : null}
                          {canRerun ? (
                            <Button
                              type="button"
                              variant="outline"
                              disabled={isRerunning}
                              onClick={() => void rerunMutation.mutateAsync(item.needId)}
                              className="rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            >
                              {isRerunning ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              重跑该需求
                            </Button>
                          ) : null}
                          {item.source === "resource_pool" ? (
                            <Button
                              asChild
                              variant="outline"
                              className="rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            >
                              <Link href="/resource/list">查看资源池</Link>
                            </Button>
                          ) : null}
                          {item.source === "deerflow" ? (
                            <span className="text-xs text-slate-400">
                              外部商机回写结果，刷新后同步最新状态
                            </span>
                          ) : null}
                        </div>
                      </CardFooter>
                    </Card>
                  </motion.div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      ) : null}

      <AlertDialog
        open={Boolean(confirmTarget)}
        onOpenChange={(open) => {
          if (!open && !confirmMutation.isPending) {
            setConfirmTarget(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-sm border border-slate-200 bg-white p-8 shadow-xl">
          <AlertDialogHeader className="space-y-4 text-center">
            <div className="mx-auto rounded-full bg-slate-100 p-3 text-slate-700 ring-1 ring-slate-200">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-xl font-bold tracking-tight text-slate-900">
                确认开启流程？
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-relaxed text-slate-500">
                确认后将向对方展示您的联系方式并建立业务对接，是否继续？
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:flex-col sm:space-x-0">
            <AlertDialogAction
              disabled={confirmMutation.isPending || !confirmTarget}
              className="w-full rounded-xl bg-slate-900 font-semibold tracking-wide text-white shadow-sm hover:bg-slate-800"
              onClick={(event) => {
                event.preventDefault();
                if (!confirmTarget) {
                  return;
                }
                void confirmMutation.mutateAsync(confirmTarget.matchId).finally(() => {
                  setConfirmTarget(null);
                });
              }}
            >
              {confirmMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              立即确认
            </AlertDialogAction>
            <AlertDialogCancel
              disabled={confirmMutation.isPending}
              className="border border-slate-200 bg-white font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              返回修改
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

export function MatchListFeature() {
  const token = useUserStore((state) => state.token);
  const tokenExpiresAt = useUserStore((state) => state.tokenExpiresAt);
  const logout = useUserStore((state) => state.logout);

  const [hydrated, setHydrated] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      setIsAuthed(false);
      return;
    }

    if (!token) {
      setIsAuthed(false);
      return;
    }

    if (Date.now() >= tokenExpiresAt) {
      logout();
      setIsAuthed(false);
      return;
    }

    setIsAuthed(true);
  }, [hydrated, logout, token, tokenExpiresAt]);

  if (!isAuthed) {
    return <LoginRequiredCard hydrated={hydrated} />;
  }

  return <MatchListContent />;
}

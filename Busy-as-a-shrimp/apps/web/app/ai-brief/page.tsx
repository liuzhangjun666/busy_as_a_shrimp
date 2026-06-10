"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { CalendarClock, ExternalLink, Loader2, Newspaper, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { getAiBriefApi, getPublicTranslateApi } from "@/api";
import type { AiBriefRefreshJobStatus } from "@/api/ai-brief-api";
import { useAuthStatus } from "@/stores/use-auth-status";
import { useUserStore } from "@/stores/user-store";
import { getErrorMessage } from "@/utils/error-message";
import { sanitizePublicText } from "@/utils/public-text";

const PAGE_SIZE = 20;

export default function AiBriefPage() {
  const router = useRouter();
  const { hydrated, isLoggedIn } = useAuthStatus();
  const memberLevel = useUserStore((state) => state.memberLevel);
  const [translations, setTranslations] = useState<
    Record<string, { title: string; summary?: string }>
  >({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showTranslated, setShowTranslated] = useState<Record<string, boolean>>({});
  const [refreshJob, setRefreshJob] = useState<AiBriefRefreshJobStatus | null>(null);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const refreshPollTimerRef = useRef<number | null>(null);
  const query = useInfiniteQuery({
    queryKey: ["ai-briefs"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      getAiBriefApi().list({
        limit: PAGE_SIZE,
        cursor: pageParam
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const records = useMemo(() => {
    return query.data?.pages.flatMap((page) => page.list) ?? [];
  }, [query.data]);
  const latestSyncAt = useMemo(() => {
    if (records.length === 0) {
      return null;
    }

    return records.reduce((latest, item) => {
      const candidate = new Date(item.createdAt).getTime();
      if (!Number.isFinite(candidate)) {
        return latest;
      }
      return latest === null || candidate > latest ? candidate : latest;
    }, null as number | null);
  }, [records]);
  const hasPaidMembership =
    memberLevel === "PRO" || memberLevel === "YEARLY" || memberLevel === "LIFETIME";
  const isRefreshJobRunning = refreshJob?.status === "running";
  const refreshStatusText = useMemo(() => {
    if (refreshJob?.status === "succeeded") {
      const inserted = refreshJob.result?.inserted ?? 0;
      const fetched = refreshJob.result?.fetched ?? 0;
      return `同步完成：新增 ${inserted} 条，抓取 ${fetched} 条`;
    }

    if (refreshJob?.status === "failed") {
      return `同步失败：${refreshJob.error ?? "请稍后重试"}`;
    }

    if (refreshJob?.status === "running") {
      return refreshNotice ?? "AI快报后台同步中...";
    }

    return refreshNotice;
  }, [refreshJob, refreshNotice]);
  const refreshStatusClassName =
    refreshJob?.status === "failed"
      ? "text-rose-600"
      : refreshJob?.status === "succeeded"
        ? "text-emerald-700"
        : "text-slate-500";

  useEffect(() => {
    return () => {
      if (refreshPollTimerRef.current !== null) {
        window.clearTimeout(refreshPollTimerRef.current);
        refreshPollTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!refreshJob || refreshJob.status !== "running") {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const nextStatus = await getAiBriefApi().refreshStatus(refreshJob.jobId);
        if (cancelled) {
          return;
        }

        setRefreshJob(nextStatus);
        if (nextStatus.status === "running") {
          refreshPollTimerRef.current = window.setTimeout(() => {
            void poll();
          }, 2000);
          return;
        }

        if (nextStatus.status === "succeeded") {
          setRefreshNotice(null);
          await query.refetch();
          return;
        }

        setRefreshNotice(null);
      } catch {
        if (cancelled) {
          return;
        }

        refreshPollTimerRef.current = window.setTimeout(() => {
          void poll();
        }, 4000);
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (refreshPollTimerRef.current !== null) {
        window.clearTimeout(refreshPollTimerRef.current);
        refreshPollTimerRef.current = null;
      }
    };
  }, [query, refreshJob]);

  const goToAiMoneyPass = () => {
    router.push("/ai-money-pass");
  };

  const goToMemberCheckout = (sourceAction: "header_cta" | "card_cta") => {
    const returnTo = "/ai-brief";
    const target = `/member?sourceModule=ai_brief&sourceAction=${sourceAction}&returnTo=${encodeURIComponent(returnTo)}`;
    if (!hydrated || !isLoggedIn) {
      router.push(`/auth?redirect=${encodeURIComponent(target)}`);
      return;
    }
    router.push(target);
  };

  const handleTranslate = async (item: (typeof records)[number]) => {
    if (translations[item.id]) {
      setShowTranslated((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
      return;
    }

    try {
      setTranslatingId(item.id);
      const translated = await getPublicTranslateApi().translateInsight({
        title: item.title,
        summary: item.summary,
        scene: "ai_brief"
      });
      setTranslations((prev) => ({
        ...prev,
        [item.id]: translated
      }));
      setShowTranslated((prev) => ({
        ...prev,
        [item.id]: true
      }));
    } catch (error) {
      window.alert(`翻译失败：${getErrorMessage(error)}`);
    } finally {
      setTranslatingId(null);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setRefreshNotice(null);
      const result = await getAiBriefApi().refresh();

      if (result.skipped) {
        if (result.running && result.jobId) {
          setRefreshJob({
            jobId: result.jobId,
            module: "ai_brief",
            status: "running",
            triggeredAt: result.triggeredAt,
            startedAt: result.triggeredAt
          });
          setRefreshNotice(result.reason ?? "AI快报后台同步中...");
          return;
        }

        setRefreshNotice(result.reason ?? `请在 ${result.cooldownSeconds} 秒后再试`);
        return;
      }

      if (result.jobId) {
        setRefreshJob({
          jobId: result.jobId,
          module: "ai_brief",
          status: "running",
          triggeredAt: result.triggeredAt,
          startedAt: result.triggeredAt
        });
      }
      setRefreshNotice(result.reason ?? "AI快报后台同步已启动，稍后将自动刷新列表");
    } catch (error) {
      window.alert(`刷新失败：${getErrorMessage(error)}`);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-11rem)] rounded-[2rem] bg-slate-50 before:pointer-events-none before:absolute before:inset-0 before:opacity-50 before:[background-size:16px_16px] before:bg-[radial-gradient(#e2e8f0_1px,transparent_1px)]">
      <div className="relative z-10 p-6 md:p-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                <Newspaper className="h-3.5 w-3.5" />
                AI BRIEF
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                AI快报
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                聚合全球官方 AI 动态，默认展示原文标题与来源。
              </p>
              {latestSyncAt ? (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  <RefreshCw className="h-3.5 w-3.5" />
                  最近同步：{new Date(latestSyncAt).toLocaleString("zh-CN", { hour12: false })}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col items-start gap-2 md:items-end">
              <div className="flex flex-wrap items-center gap-2">
                {hasPaidMembership ? (
                  <button
                    type="button"
                    onClick={goToAiMoneyPass}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-100"
                  >
                    AI赚钱通行证已解锁，立即进入
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => goToMemberCheckout("header_cta")}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-slate-800"
                  >
                    解锁AI赚钱通行证
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  disabled={refreshing || isRefreshJobRunning}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {refreshing || isRefreshJobRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {refreshing || isRefreshJobRunning ? "同步中..." : "刷新"}
                </button>
              </div>
              {refreshStatusText ? (
                <p className={`text-xs font-medium ${refreshStatusClassName}`}>
                  {refreshStatusText}
                </p>
              ) : null}
            </div>
          </div>

          {query.isLoading ? (
            <div className="flex min-h-56 items-center justify-center text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              正在拉取最新快报...
            </div>
          ) : query.isError ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-5 text-sm text-rose-600">
              拉取失败，可稍后重试。
            </div>
          ) : records.length === 0 ? (
            <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-sm text-slate-500">
              暂无快报
            </div>
          ) : (
            <>
              <div className="max-h-[calc(100vh-20rem)] space-y-3 overflow-y-auto pr-1">
                {records.map((item, index) => (
                  <div key={item.id} className="space-y-3">
                    {!hasPaidMembership && index === 4 ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-sm font-semibold text-slate-900">
                          仅看资讯不够，直接进入可落地的 AI 赚钱执行路径。
                        </p>
                        <button
                          type="button"
                          onClick={() => goToMemberCheckout("card_cta")}
                          className="mt-3 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          立即开通会员
                        </button>
                      </div>
                    ) : null}
                    <article className="rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:shadow-sm">
                      {(() => {
                        const translated = translations[item.id];
                        const useTranslated = showTranslated[item.id] && translated;
                        const title = sanitizePublicText(
                          useTranslated ? translated.title : item.title
                        ) ?? "未命名快报";
                        const summary = sanitizePublicText(
                          useTranslated ? translated.summary : item.summary
                        );

                        return (
                          <>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {item.sourceName}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {new Date(item.publishedAt).toLocaleString("zh-CN", { hour12: false })}
                        </span>
                      </div>
                      <h2 className="text-sm font-semibold leading-6 text-slate-900 md:text-base">
                        {title}
                      </h2>
                      {summary ? (
                        <p className="mt-1 text-sm leading-6 text-slate-500">{summary}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        {!hasPaidMembership ? (
                          <button
                            type="button"
                            onClick={() => goToMemberCheckout("card_cta")}
                            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            解锁AI赚钱通行证
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={goToAiMoneyPass}
                            className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-all hover:bg-emerald-100"
                          >
                            进入AI赚钱通行证
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleTranslate(item)}
                          disabled={translatingId === item.id}
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {translatingId === item.id ? (
                            <>
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              翻译中...
                            </>
                          ) : translated ? (
                            useTranslated ? "查看原文" : "查看翻译"
                          ) : (
                            "翻译成中文"
                          )}
                        </button>
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
                        >
                          查看原文
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                          </>
                        );
                      })()}
                    </article>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-center">
                {query.hasNextPage ? (
                  <button
                    type="button"
                    onClick={() => query.fetchNextPage()}
                    disabled={query.isFetchingNextPage}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {query.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {query.isFetchingNextPage ? "加载中..." : "加载更多"}
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">已加载全部内容</span>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

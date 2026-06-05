"use client";

import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  CalendarClock,
  ExternalLink,
  Loader2,
  RefreshCw,
  TrendingUp
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getPublicTranslateApi, getSoloSignalApi } from "@/api";
import { useAuthStatus } from "@/stores/use-auth-status";
import { useUserStore } from "@/stores/user-store";
import { getErrorMessage } from "@/utils/error-message";
import { sanitizePublicText } from "@/utils/public-text";

const PAGE_SIZE = 20;

export default function SoloAiPage() {
  const router = useRouter();
  const { hydrated, isLoggedIn } = useAuthStatus();
  const memberLevel = useUserStore((state) => state.memberLevel);
  const [translations, setTranslations] = useState<
    Record<string, { title: string; summary?: string; incomeSnippet?: string }>
  >({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showTranslated, setShowTranslated] = useState<Record<string, boolean>>({});
  const query = useInfiniteQuery({
    queryKey: ["solo-signals"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      getSoloSignalApi().list({
        limit: PAGE_SIZE,
        cursor: pageParam
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const records = useMemo(() => query.data?.pages.flatMap((page) => page.list) ?? [], [query.data]);
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

  const goToMemberCheckout = (sourceAction: "header_cta" | "card_cta") => {
    const returnTo = "/solo-ai";
    const target = `/member?sourceModule=solo_ai&sourceAction=${sourceAction}&returnTo=${encodeURIComponent(returnTo)}`;
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
        incomeSnippet: item.incomeSnippet,
        scene: "solo_signal"
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
      const result = await getSoloSignalApi().refresh();
      await query.refetch();

      if (result.skipped) {
        window.alert(result.reason ?? `请在 ${result.cooldownSeconds} 秒后再试`);
        return;
      }

      const inserted = result.result?.inserted ?? 0;
      const fetched = result.result?.fetched ?? 0;
      window.alert(`AI一人公司同步完成：新增 ${inserted} 条，抓取 ${fetched} 条`);
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
                <BriefcaseBusiness className="h-3.5 w-3.5" />
                SOLO AI SIGNALS
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                AI一人公司
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                聚合个体开发者借助 AI 变现的公开情报，展示原文标题与关键变现片段。
              </p>
              {latestSyncAt ? (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  <RefreshCw className="h-3.5 w-3.5" />
                  最近同步：{new Date(latestSyncAt).toLocaleString("zh-CN", { hour12: false })}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {hasPaidMembership ? (
                <button
                  type="button"
                  onClick={() => router.push("/sop-library")}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-100"
                >
                  SOP模板库已解锁，立即进入
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => goToMemberCheckout("header_cta")}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-slate-800"
                >
                  解锁SOP模板库（会员）
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {refreshing ? "同步中..." : "刷新"}
              </button>
            </div>
          </div>

          {query.isLoading ? (
            <div className="flex min-h-56 items-center justify-center text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              正在拉取最新情报...
            </div>
          ) : query.isError ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-5 text-sm text-rose-600">
              拉取失败，可稍后重试。
            </div>
          ) : records.length === 0 ? (
            <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-sm text-slate-500">
              暂无情报
            </div>
          ) : (
            <>
              <div className="max-h-[calc(100vh-20rem)] space-y-3 overflow-y-auto pr-1">
                {records.map((item, index) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:shadow-sm"
                  >
                    {(() => {
                      const translated = translations[item.id];
                      const useTranslated = showTranslated[item.id] && translated;
                      const title = sanitizePublicText(
                        useTranslated ? translated.title : item.title
                      ) ?? "未命名案例";
                      const summary = sanitizePublicText(
                        useTranslated ? translated.summary : item.summary
                      );
                      const incomeSnippet = sanitizePublicText(
                        useTranslated ? translated.incomeSnippet : item.incomeSnippet
                      );

                      return (
                        <>
                    {!hasPaidMembership && index === 4 ? (
                      <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                        <p>你已经看到真实案例，下一步是拿到可复制执行模板。</p>
                        <button
                          type="button"
                          onClick={() => goToMemberCheckout("card_cta")}
                          className="mt-2 inline-flex items-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          立即开通会员
                        </button>
                      </div>
                    ) : null}
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

                    {incomeSnippet ? (
                      <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                        <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{incomeSnippet}</span>
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {!hasPaidMembership ? (
                        <button
                          type="button"
                          onClick={() => goToMemberCheckout("card_cta")}
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          解锁完整打法
                        </button>
                      ) : (
                        <span className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                          SOP模板库已解锁
                        </span>
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

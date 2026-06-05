"use client";

import {
  CircleDot,
  Terminal,
  Globe,
  BatteryCharging,
  Layers,
  LayoutList,
  Megaphone,
  RotateCw,
  Download,
  Settings,
  Sparkles,
  ArrowRight,
  BriefcaseBusiness,
  Newspaper,
  Crown,
  BarChart3,
  ListChecks
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { getMatchApi, getUserApi } from "@/api";
import type { MatchItem } from "@/api/match-api";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStatus } from "@/stores/use-auth-status";
import { toast } from "@/hooks/use-toast";
import { useCampusUnlockStatus } from "@/hooks/use-campus-unlock-status";
import { CampusFilterSheet } from "@/components/campus-filter-sheet";
import {
  EMPTY_CAMPUS_FILTERS,
  CampusRecruitmentSection,
  type CampusFilterOptions,
  type CampusFilters,
  type CampusOpportunity
} from "@/components/campus-recruitment-section";

function isPendingMatch(status: MatchItem["status"]): boolean {
  return status === "queued" || status === "pushed";
}

export default function HomePage() {
  return (
    <Suspense fallback={<section className="h-[calc(100vh-8rem)] w-full bg-slate-50" />}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hydrated, isLoggedIn, phone } = useAuthStatus();

  const [pendingCount, setPendingCount] = useState(0);
  const [loadingPendingCount, setLoadingPendingCount] = useState(false);
  const [activeModule, setActiveModule] = useState<"home" | "console" | "campus">("home");
  const [campusRefreshToken, setCampusRefreshToken] = useState(0);
  const [campusLastRefreshedAt, setCampusLastRefreshedAt] = useState<Date | null>(null);
  const [refreshTick, setRefreshTick] = useState(Date.now());
  const [campusExportRows, setCampusExportRows] = useState<CampusOpportunity[]>([]);
  const [campusFilterSheetOpen, setCampusFilterSheetOpen] = useState(false);
  const [campusFilters, setCampusFilters] = useState<CampusFilters>(EMPTY_CAMPUS_FILTERS);
  const [campusFilterOptions, setCampusFilterOptions] = useState<CampusFilterOptions>({
    locations: [],
    industries: []
  });
  const campusUnlockQuery = useCampusUnlockStatus(hydrated && isLoggedIn);
  const [isUnlockingCampus, setIsUnlockingCampus] = useState(false);
  const isCampusUnlocked = hydrated && isLoggedIn && campusUnlockQuery.data?.unlocked === true;
  const isLocked = hydrated && !isCampusUnlocked;

  const loginStatusLabel = hydrated
    ? !isLoggedIn
      ? "未登录"
      : phone
        ? `已登录 (${phone})`
        : "已登录"
    : "加载中...";

  async function loadPendingCount() {
    if (!isLoggedIn) {
      setPendingCount(0);
      return;
    }

    setLoadingPendingCount(true);
    try {
      const list = await getMatchApi().list();
      setPendingCount(list.filter((item) => isPendingMatch(item.status)).length);
    } catch {
      setPendingCount(0);
    } finally {
      setLoadingPendingCount(false);
    }
  }

  useEffect(() => {
    void loadPendingCount();
  }, [isLoggedIn]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRefreshTick(Date.now());
    }, 60_000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const campusRefreshLabel = useMemo(() => {
    if (!campusLastRefreshedAt) {
      return "尚未刷新";
    }
    const minutes = Math.max(
      0,
      Math.floor((refreshTick - campusLastRefreshedAt.getTime()) / 60_000)
    );
    return `已更新于 ${minutes} 分钟前`;
  }, [campusLastRefreshedAt, refreshTick]);

  const redirectToCampusUnlockCheckout = useCallback(
    (sourceAction: string) => {
      const redirect = `/?intent=campus_unlock&sourceAction=${encodeURIComponent(sourceAction)}`;
      router.push(`/auth?redirect=${encodeURIComponent(redirect)}`);
    },
    [router]
  );

  const handleCampusUnlockCheckout = useCallback(
    async (sourceAction = "paywall_cta", silent = false) => {
      if (!isLoggedIn) {
        redirectToCampusUnlockCheckout(sourceAction);
        return;
      }

      setIsUnlockingCampus(true);
      try {
        await getUserApi().checkoutCampusUnlock({
          sourceModule: "campus",
          sourceAction
        });
        await campusUnlockQuery.refetch();
        if (!silent) {
          toast({
            title: "解锁成功",
            description: "校招完整版已解锁，祝你上岸顺利。"
          });
        }
      } catch (error) {
        if (!silent) {
          toast({
            variant: "destructive",
            title: "解锁失败",
            description: error instanceof Error ? error.message : "请稍后重试"
          });
        }
      } finally {
        setIsUnlockingCampus(false);
      }
    },
    [campusUnlockQuery, isLoggedIn, redirectToCampusUnlockCheckout]
  );

  useEffect(() => {
    if (!hydrated || !isLoggedIn) {
      return;
    }
    const intent = searchParams.get("intent");
    if (intent !== "campus_unlock") {
      return;
    }
    if (campusUnlockQuery.data?.unlocked || isUnlockingCampus) {
      router.replace("/");
      return;
    }
    const sourceAction = searchParams.get("sourceAction") || "paywall_cta";
    void handleCampusUnlockCheckout(sourceAction, true).finally(() => {
      router.replace("/");
    });
  }, [
    campusUnlockQuery.data?.unlocked,
    handleCampusUnlockCheckout,
    hydrated,
    isLoggedIn,
    isUnlockingCampus,
    router,
    searchParams
  ]);

  const openMomo = (command: string) => {
    window.dispatchEvent(new CustomEvent("momo:open", { detail: { command } }));
  };

  const navigateToCampus = useCallback(() => {
    router.push("/?module=campus");
  }, [router]);

  const navigateToConsole = useCallback(
    (command?: string) => {
      const params = new URLSearchParams({ module: "console" });
      if (command) {
        params.set("command", command);
      }
      router.push(`/?${params.toString()}`);
    },
    [router]
  );

  useEffect(() => {
    if (activeModule !== "campus") {
      setCampusFilterSheetOpen(false);
    }
  }, [activeModule]);

  useEffect(() => {
    const mod = searchParams.get("module");
    if (mod === "campus") {
      setActiveModule("campus");
    } else if (mod === "console") {
      setActiveModule("console");
      openMomo(searchParams.get("command") ?? "");
    } else {
      setActiveModule("home");
    }
  }, [searchParams]);

  const handleCampusHeaderRefresh = () => {
    setCampusRefreshToken((prev) => prev + 1);
  };

  const handleCampusExportDataChange = useCallback((rows: CampusOpportunity[]) => {
    setCampusExportRows(rows);
  }, []);

  const handleCampusFilterOptionsChange = useCallback((options: CampusFilterOptions) => {
    setCampusFilterOptions(options);
  }, []);

  const handleCampusFiltersApply = useCallback((nextFilters: CampusFilters) => {
    setCampusFilters(nextFilters);
  }, []);

  const handleCampusDataRefreshed = useCallback(
    ({ refreshedAt, mode }: { refreshedAt: Date; mode: "initial" | "poll" | "manual" }) => {
      if (mode === "poll") {
        return;
      }
      setCampusLastRefreshedAt(refreshedAt);
    },
    []
  );

  const handleCampusExport = useCallback(() => {
    if (campusExportRows.length === 0) {
      return;
    }

    const headers = [
      "公司名",
      "行业",
      "招聘类型",
      "地点",
      "开始日期",
      "结束日期",
      "免笔试",
      "岗位",
      "公告链接",
      "投递链接",
      "来源类型"
    ];
    const escapeCell = (value: string) =>
      value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");

    const headerCells = headers.map((item) => `<th>${escapeCell(item)}</th>`).join("");
    const bodyRows = campusExportRows
      .map((item) => {
        const row = [
          item.companyName,
          item.industry,
          item.recruitmentType,
          item.location,
          item.startDate,
          item.endDate,
          item.noWrittenTest ? "是" : "否",
          item.position,
          item.announcementUrl,
          item.applyUrl,
          item.sourceType ?? "campus_recruitment"
        ];

        return `<tr>${row.map((cell) => `<td>${escapeCell(cell)}</td>`).join("")}</tr>`;
      })
      .join("");

    const excelHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8" />
</head>
<body>
  <table border="1">
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;

    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate()
    ).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
    const blob = new Blob(["\ufeff", excelHtml], {
      type: "application/vnd.ms-excel;charset=utf-8;"
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `campus-opportunities-${timestamp}.xls`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(downloadUrl);
  }, [campusExportRows]);

  const navItemBaseClass =
    "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition-all";
  const navItemInactiveClass = "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
  const navIconBaseClass = "h-4 w-4 shrink-0";
  const navIconInactiveClass = "text-slate-400 transition-colors group-hover:text-slate-600";
  const activeCampusFilterCount = campusFilters.locations.length + campusFilters.industries.length;
  const consoleLatencyMs = 12;
  const moduleCards = [
    {
      eyebrow: "Opportunity Intelligence",
      title: "机会大厅",
      description: "浏览校招情报矩阵、筛选城市岗位并导出结构化数据。",
      highlight: "校招 / 实习 / 导出",
      icon: Globe,
      accent: "from-sky-500/15 to-cyan-500/5",
      href: "/?module=campus",
      actionLabel: "进入校招情报"
    },
    {
      eyebrow: "AI Command",
      title: "执行终端",
      description: "唤醒 momo 智能体，下发扫描、巡检、分身调度等即时任务。",
      highlight: "调度 / 巡检 / 执行",
      icon: Terminal,
      accent: "from-indigo-500/15 to-blue-500/5",
      onClick: () => navigateToConsole(),
      actionLabel: "打开 momo"
    },
    {
      eyebrow: "Resource Layer",
      title: "资源列表",
      description: "聚合技能、账号、时段与地区资源，支持快速筛选和发布。",
      highlight: "资源 / 标签 / 供需",
      icon: Layers,
      accent: "from-emerald-500/15 to-teal-500/5",
      href: "/resource/list",
      actionLabel: "查看资源"
    },
    {
      eyebrow: "Signal Stream",
      title: "AI快报",
      description: "跟踪最新 AI 资讯、摘要和值得关注的行业信号。",
      highlight: "资讯 / 摘要 / 趋势",
      icon: Newspaper,
      accent: "from-amber-500/15 to-orange-500/5",
      href: "/ai-brief",
      actionLabel: "浏览快报"
    },
    {
      eyebrow: "Solo Builder",
      title: "AI一人公司",
      description: "查看一人公司案例、独立创业信号与可复用的方法论。",
      highlight: "案例 / 方法 / 增长",
      icon: BriefcaseBusiness,
      accent: "from-fuchsia-500/15 to-pink-500/5",
      href: "/solo-ai",
      actionLabel: "进入案例库"
    },
    {
      eyebrow: "Content Engine",
      title: "内容中心",
      description: "生成内容草稿、人工确认发布，并持续回收浏览与转化反馈。",
      highlight: "生成 / 发布 / 回流",
      icon: ListChecks,
      accent: "from-violet-500/15 to-purple-500/5",
      href: "/content",
      actionLabel: "管理内容"
    }
  ] as const;

  return (
    <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] flex h-[calc(100vh-8rem)] min-h-[600px] w-screen overflow-hidden border border-slate-200 bg-slate-50 text-slate-900 shadow-2xl">
      <aside className="z-40 flex w-64 shrink-0 flex-col border-r border-slate-200/60 bg-[#FCFCFC]">
        <div className="border-b border-slate-100 p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Terminal className="h-4 w-4 text-blue-600" />
            <span>中枢调度器</span>
          </div>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
            系统控制面板
          </p>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-4">
          <div className="mb-2 mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
            核心模块
          </div>
          <button
            onClick={() => navigateToConsole()}
            className={`${navItemBaseClass} ${navItemInactiveClass}`}
          >
            <Terminal className={`${navIconBaseClass} ${navIconInactiveClass}`} />
            执行终端
          </button>
          <button
            onClick={navigateToCampus}
            className={`${navItemBaseClass} ${navItemInactiveClass}`}
          >
            <Globe className={`${navIconBaseClass} ${navIconInactiveClass}`} />
            机会大厅
          </button>
          <button
            onClick={() => navigateToConsole("/check_hp")}
            className={`${navItemBaseClass} ${navItemInactiveClass}`}
          >
            <BatteryCharging className={`${navIconBaseClass} ${navIconInactiveClass}`} />
            HP 状态管理
          </button>
          <button
            onClick={() => navigateToConsole("/scan_ecom")}
            className={`${navItemBaseClass} ${navItemInactiveClass}`}
          >
            <Layers className={`${navIconBaseClass} ${navIconInactiveClass}`} />
            分身管家
          </button>
          <button
            onClick={() => navigateToConsole("/view_logs")}
            className={`${navItemBaseClass} ${navItemInactiveClass}`}
          >
            <LayoutList className={`${navIconBaseClass} ${navIconInactiveClass}`} />
            任务日志
          </button>
          <Link href="/announcements" className={`${navItemBaseClass} ${navItemInactiveClass}`}>
            <Megaphone className={`${navIconBaseClass} ${navIconInactiveClass}`} />
            系统公告
          </Link>
        </div>

        <div className="mt-auto space-y-5 border-t border-slate-100 bg-slate-50/50 p-5">
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
              运行环境
            </p>
            <div className="flex items-center gap-2">
              <CircleDot className="h-3.5 w-3.5 animate-pulse text-emerald-500" />
              <span className="font-mono text-xs text-slate-700">网络在线</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
              鉴权状态
            </p>
            <p className="break-all font-mono text-xs text-slate-700">{loginStatusLabel}</p>
            {!isLoggedIn && hydrated && (
              <Link
                href="/auth"
                className="mt-0.5 inline-block text-[10px] font-bold text-blue-600 hover:text-blue-500 hover:underline"
              >
                {"-> 需要登录"}
              </Link>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
              待决任务
            </p>
            {loadingPendingCount ? (
              <Skeleton className="mt-1 h-4 w-12 rounded bg-slate-200" />
            ) : (
              <p className="font-mono text-xs text-slate-700">
                <span className="inline-flex items-center justify-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600 ring-1 ring-inset ring-blue-500/10">
                  {pendingCount}
                </span>{" "}
                项
              </p>
            )}
          </div>
        </div>
      </aside>

      <main className="relative flex-1 overflow-hidden bg-slate-50/50">
        {activeModule === "campus" ? (
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/60 bg-white/70 px-6 backdrop-blur-md">
            <div className="flex min-w-0 items-center">
              <span className="text-xs font-medium text-slate-400">Opportunities</span>
              <span className="mx-2 text-slate-200">/</span>
              <span className="truncate text-sm font-semibold text-slate-800">
                2026 大厂校招情报汇总
              </span>
              <span className="ml-3 inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Live
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden text-[11px] font-medium text-slate-400 xl:inline">
                {campusRefreshLabel}
              </span>
              <button
                type="button"
                onClick={handleCampusHeaderRefresh}
                className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-slate-200 hover:bg-slate-100/80 hover:text-slate-900"
              >
                <RotateCw className="h-3.5 w-3.5" />
                刷新
              </button>
              <button
                type="button"
                onClick={handleCampusExport}
                disabled={campusExportRows.length === 0}
                className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-slate-200 hover:bg-slate-100/80 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:text-slate-600"
              >
                <Download className="h-3.5 w-3.5" />
                导出数据
              </button>
              <button
                type="button"
                aria-label="设置"
                onClick={() => setCampusFilterSheetOpen((prev) => !prev)}
                className="relative grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200/70"
              >
                <Settings className="h-4 w-4" />
                {activeCampusFilterCount > 0 ? (
                  <span className="absolute -right-1.5 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                    {activeCampusFilterCount}
                  </span>
                ) : null}
              </button>
            </div>
          </header>
        ) : null}
        <div
          className={`relative z-10 overflow-y-auto transition-[margin-right] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            activeModule === "campus" ? "h-[calc(100%-3.5rem)]" : "h-full"
          } ${activeModule === "campus" && campusFilterSheetOpen ? "sm:mr-[360px]" : "mr-0"}`}
        >
          <div className="space-y-8 p-6">
            {activeModule === "home" ? (
              <section className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden rounded-[2rem] border border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-slate-100/90 p-5 md:p-8">
                <div className="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl" />
                <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
                <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(148,163,184,0.11)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.11)_1px,transparent_1px)] [background-size:28px_28px]" />
                <div className="relative z-10 space-y-6 md:space-y-8">
                  <header className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                    <article className="rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-7 shadow-sm md:p-9">
                      <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                        虾忙平台
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        AI 协作中枢
                      </p>
                      <h1 className="mt-5 max-w-4xl pb-1 text-[clamp(2rem,4.6vw,3.2rem)] font-black leading-[1.34] tracking-[-0.015em] text-slate-900 [text-wrap:balance]">
                        <span className="block">从机会发现到执行落地的</span>
                        <span className="mt-1 block">一站式智能协作平台</span>
                      </h1>
                      <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                        虾忙是一个面向所有人的 AI
                        网站，聚合校招情报、资源协同、内容生产和智能调度能力。
                        平台重点提供赛博分身能力，让你可以并行处理信息筛选、任务分发与执行跟踪，在同一平台完成从机会发现到结果回收的闭环。
                      </p>
                      <div className="mt-7 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={navigateToCampus}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800"
                        >
                          进入机会大厅
                          <ArrowRight className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigateToConsole()}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                        >
                          打开执行终端
                          <Terminal className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-7 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                          校招情报矩阵
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                          资源供需网络
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                          AI 快报
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                          momo 智能调度
                        </span>
                      </div>
                    </article>

                    <article className="relative overflow-hidden rounded-[1.75rem] border border-slate-900/90 bg-slate-900 p-6 text-white shadow-xl">
                      <div className="pointer-events-none absolute -right-24 -top-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
                      <div className="pointer-events-none absolute -bottom-20 -left-14 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
                      <div className="relative z-10">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Website Highlights
                        </p>
                        <div className="mt-5 grid gap-3">
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="mt-2 text-2xl font-bold text-white">机会情报一屏洞察</p>
                            <p className="mt-2 text-sm leading-6 text-slate-300">
                              汇总校招与实习信息，支持按城市、行业、岗位快速筛选。
                            </p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                              <p className="mt-2 text-2xl font-bold text-white">赛博分身并行执行</p>
                              <p className="mt-2 text-sm leading-6 text-slate-300">
                                一个入口调度多个分身，支持并行扫描、分工处理与状态同步，效率更高。
                              </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                              <p className="mt-2 text-2xl font-bold text-white">AI 调度闭环执行</p>
                              <p className="mt-2 text-sm leading-6 text-slate-300">
                                通过 momo 快速下发任务、跟踪执行状态并回收结果反馈。
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  </header>

                  <section className="grid gap-4 lg:grid-cols-3">
                    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Step 01
                      </p>
                      <h2 className="mt-2 text-lg font-bold text-slate-900">先看机会</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        在机会大厅按城市、行业和岗位快速筛选，先明确优先级。
                      </p>
                      <button
                        type="button"
                        onClick={navigateToCampus}
                        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900"
                      >
                        打开情报大厅
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </article>
                    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Step 02
                      </p>
                      <h2 className="mt-2 text-lg font-bold text-slate-900">再配资源</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        用资源列表补齐技能、账号、地区和可用时段，让需求可执行。
                      </p>
                      <Link
                        href="/resource/list"
                        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900"
                      >
                        查看资源列表
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </article>
                    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Step 03
                      </p>
                      <h2 className="mt-2 text-lg font-bold text-slate-900">最后执行</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        通过 momo 终端发起扫描、巡检和日志追踪，闭环推进任务。
                      </p>
                      <button
                        type="button"
                        onClick={() => navigateToConsole("/scan_city")}
                        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900"
                      >
                        执行扫描任务
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </article>
                  </section>

                  <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Capability Matrix
                      </p>
                      <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                        功能模块
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        首页负责清晰介绍能力并导流，点击卡片进入对应业务页面。
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {moduleCards.map((card) => {
                        const Icon = card.icon;
                        const content = (
                          <div
                            className={`group relative h-full overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg`}
                          >
                            <div
                              className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-85`}
                            />
                            <div className="relative z-10">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                {card.eyebrow}
                              </p>
                              <div className="mt-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/90 text-slate-900 shadow-sm">
                                <Icon className="h-5 w-5" />
                              </div>
                              <h3 className="mt-4 text-xl font-bold text-slate-900">
                                {card.title}
                              </h3>
                              <p className="mt-2 min-h-[4rem] text-sm leading-6 text-slate-600">
                                {card.description}
                              </p>
                              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                {card.highlight}
                              </p>
                              <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                                {card.actionLabel}
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                              </div>
                            </div>
                          </div>
                        );

                        if ("href" in card) {
                          return (
                            <Link key={card.title} href={card.href} className="h-full">
                              {content}
                            </Link>
                          );
                        }

                        return (
                          <button
                            key={card.title}
                            type="button"
                            onClick={card.onClick}
                            className="h-full text-left"
                          >
                            {content}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Design Baseline
                      </p>
                      <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                        信息架构向成熟产品官网靠齐
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-slate-500">
                        这版首页参考主流 SaaS 站点的排版方式，强调可读性、路径引导和模块分发，
                        让首次访问用户也能快速理解平台价值。
                      </p>
                      <div className="mt-5 space-y-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          先价值主张，再模块入口，降低首次认知成本。
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          统一按钮层级和卡片密度，避免视觉噪音。
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          保留业务跳转闭环，首页专注介绍和导流。
                        </div>
                      </div>
                    </article>

                    <article className="rounded-[1.75rem] border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                        <Crown className="h-4 w-4" />
                        Premium Modules
                      </div>
                      <h3 className="mt-4 text-2xl font-black tracking-tight">
                        会员与团长体系独立展示
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        在首页单独保留权益入口，避免被内容流淹没，同时强化商业化路径认知。
                      </p>
                      <div className="mt-6 grid gap-3">
                        <Link
                          href="/member"
                          className="inline-flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold transition hover:bg-white/10"
                        >
                          星际通行证
                          <Crown className="h-4 w-4" />
                        </Link>
                        <Link
                          href="/captain"
                          className="inline-flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold transition hover:bg-white/10"
                        >
                          团长中枢
                          <BarChart3 className="h-4 w-4" />
                        </Link>
                      </div>
                    </article>
                  </section>
                </div>
              </section>
            ) : activeModule === "console" ? (
              <section className="relative isolate min-h-[calc(100vh-4rem)] bg-slate-50 p-6 before:absolute before:inset-0 before:bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] before:[background-size:16px_16px] before:opacity-50 md:p-8">
                <div className="relative z-10">
                  <header>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                      中枢调度大盘 (Command Center)
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Momo 智能体已在线，随时响应您的调度指令。
                    </p>
                  </header>

                  <div className="relative mt-6 flex flex-col items-center justify-between gap-6 overflow-hidden rounded-[2rem] border border-blue-100/60 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 p-8 shadow-sm md:flex-row">
                    <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl" />
                    <div className="relative z-10">
                      <p className="mb-3 inline-flex w-max items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-600">
                        <Sparkles className="h-3.5 w-3.5" />
                        MOMO ASSISTANT ONLINE
                      </p>
                      <h3 className="text-xl font-bold text-slate-900">
                        执行终端已升级为全局悬浮舱
                      </h3>
                      <p className="mt-2 max-w-md text-sm text-slate-500">
                        您现在可以在任何页面随时唤醒 Momo 协助处理任务，无需中断当前工作流。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateToConsole()}
                      className="relative z-10 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-8 py-3.5 font-semibold text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg"
                    >
                      <Terminal className="h-4 w-4" />
                      立即唤醒 Momo
                    </button>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
                    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">
                        <CircleDot className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900">运行环境</h4>
                      <div className="mt-4 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
                        <span className="text-sm font-semibold text-slate-700">系统在线</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">当前延迟：{consoleLatencyMs}ms</p>
                    </article>

                    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-500">
                        <LayoutList className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900">当前队列</h4>
                      <p className="mt-4 text-sm text-slate-400">所有引擎空闲</p>
                    </article>

                    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
                        <Terminal className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900">快捷指令库</h4>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                          /scan_city
                        </span>
                        <span className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                          /check_hp
                        </span>
                        <span className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                          /scan_ecom
                        </span>
                      </div>
                    </article>
                  </div>
                </div>
              </section>
            ) : (
              <CampusRecruitmentSection
                isLocked={isLocked}
                isUnlocking={isUnlockingCampus}
                onUnlock={() => void handleCampusUnlockCheckout("paywall_cta")}
                onLoginForUnlock={() => redirectToCampusUnlockCheckout("paywall_cta")}
                refreshToken={campusRefreshToken}
                onDataRefreshed={handleCampusDataRefreshed}
                onExportDataChange={handleCampusExportDataChange}
                filters={campusFilters}
                onFilterOptionsChange={handleCampusFilterOptionsChange}
              />
            )}
          </div>
        </div>

        {activeModule === "campus" ? (
          <CampusFilterSheet
            open={campusFilterSheetOpen}
            onOpenChange={setCampusFilterSheetOpen}
            filters={campusFilters}
            options={campusFilterOptions}
            onApply={handleCampusFiltersApply}
            className="!top-14"
          />
        ) : null}
      </main>
    </section>
  );
}

"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  BriefcaseBusiness,
  ChevronRight,
  CheckCircle2,
  Eraser,
  Info,
  Layers,
  List,
  MapPin,
  Newspaper,
  Sparkles,
  X
} from "lucide-react";

import {
  getAiBriefApi,
  getAnnouncementApi,
  getLobsterApi,
  getMatchApi,
  getResourceApi,
  getSoloSignalApi,
  getUserApi
} from "@/api";
import { useUserStore } from "@/stores/user-store";

const QUICK_ACTIONS = [
  {
    cmd: "/scan_campus",
    label: "扫描最新大厂校招情报 (默认: 北京)",
    desc: "可按城市与关键词抓取最新岗位",
    icon: MapPin,
    presetInput: "/scan_campus 北京 ",
    cost: 20
  },
  {
    cmd: "/match_task",
    label: "发起智能匹配任务",
    desc: "一键调度分身执行匹配任务",
    icon: Sparkles,
    presetInput: "/match_task",
    cost: 18
  },
  {
    cmd: "/check_hp",
    label: "查询当前 AI 引擎分身节点健康度",
    desc: "查看当前分身状态与 HP 指标",
    icon: Activity,
    presetInput: "/check_hp",
    cost: 6
  },
  {
    cmd: "/view_logs",
    label: "查看最近任务日志",
    desc: "回看分身最近执行记录与状态",
    icon: List,
    presetInput: "/view_logs",
    cost: 4
  },
  {
    cmd: "/match_overview",
    label: "获取匹配池状态概览",
    desc: "统计待处理、已确认、已失效匹配",
    icon: Layers,
    presetInput: "/match_overview",
    cost: 8
  },
  {
    cmd: "/resource_overview",
    label: "获取资源矩阵概览",
    desc: "统计资源总量、状态与类型分布",
    icon: BriefcaseBusiness,
    presetInput: "/resource_overview",
    cost: 8
  },
  {
    cmd: "/campus_snapshot",
    label: "拉取校招机会快照",
    desc: "读取最新校招岗位摘要与样本",
    icon: MapPin,
    presetInput: "/campus_snapshot",
    cost: 10
  },
  {
    cmd: "/brief_digest",
    label: "生成资讯速览",
    desc: "汇总 AI 快报、一人公司与系统公告",
    icon: Newspaper,
    presetInput: "/brief_digest",
    cost: 12
  },
  {
    cmd: "/clear",
    label: "清空当前终端的所有运行日志",
    desc: "一键清除本会话的所有执行记录",
    icon: Eraser,
    presetInput: "/clear"
  }
];

interface LogEntry {
  id: string;
  type: "user" | "info" | "success" | "error";
  content: string;
  timestamp: Date;
}

interface SerializedLogEntry {
  id: string;
  type: LogEntry["type"];
  content: string;
  timestamp: string;
}

interface ExecutionConsoleProps {
  defaultCommand?: string;
  isLocked?: boolean;
  onNeedActivation?: () => void;
  compact?: boolean;
  onClose?: () => void;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

const CONSOLE_LOG_STORAGE_KEY = "airp:momo-console-logs";
const MAX_DAILY_LOGS = 200;

function getCurrentLogDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function serializeLogs(logs: LogEntry[]): SerializedLogEntry[] {
  return logs.map((log) => ({
    ...log,
    timestamp: log.timestamp.toISOString()
  }));
}

function deserializeLogs(serialized: SerializedLogEntry[]): LogEntry[] {
  return serialized
    .map((log) => ({
      ...log,
      timestamp: new Date(log.timestamp)
    }))
    .filter((log) => !Number.isNaN(log.timestamp.getTime()));
}

function getRouteDisplayLabel(route: string): string {
  if (route === "/?module=campus") {
    return "校招/实习汇总";
  }
  if (route === "/match/list") {
    return "匹配列表";
  }
  if (route === "/resource/list") {
    return "资源列表";
  }
  if (route === "/ai-brief") {
    return "AI 快报";
  }
  return "目标页面";
}

function getCommandSuccessRoute(commandText: string): string | null {
  if (commandText.startsWith("/scan_campus") || commandText.startsWith("/scan_city")) {
    return "/?module=campus";
  }
  if (commandText.startsWith("/match_task") || commandText.startsWith("/match_overview")) {
    return "/match/list";
  }
  if (commandText.startsWith("/resource_overview")) {
    return "/resource/list";
  }
  if (commandText.startsWith("/campus_snapshot")) {
    return "/?module=campus";
  }
  if (commandText.startsWith("/brief_digest")) {
    return "/ai-brief";
  }
  return null;
}

function parseScanCampusPayload(commandText: string): {
  scanType: string;
  city?: string;
  keyword?: string;
  limit?: number;
} {
  const segments = commandText.trim().split(/\s+/).filter(Boolean);
  const args = segments.slice(1);

  let limit: number | undefined;
  if (args.length > 0) {
    const maybeLimit = Number(args[args.length - 1]);
    if (Number.isInteger(maybeLimit) && maybeLimit > 0) {
      limit = maybeLimit;
      args.pop();
    }
  }

  const city = args[0]?.trim() || undefined;
  const keyword = args.slice(1).join(" ").trim() || undefined;

  return {
    scanType: "city",
    city,
    keyword,
    limit
  };
}

function formatLogTime(timestamp: Date): string {
  return timestamp.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

function toResourceTypeLabel(value: string): string {
  if (value === "skill") return "技能";
  if (value === "location") return "地区";
  if (value === "account") return "账号";
  if (value === "time") return "时段";
  return value;
}

function toCommandDisplayLabel(commandText: string): string {
  if (commandText.startsWith("/scan_campus") || commandText.startsWith("/scan_city")) {
    const payload = parseScanCampusPayload(commandText);
    return `扫描校招情报${payload.city ? `（${payload.city}）` : "（默认城市）"}`;
  }
  if (commandText.startsWith("/match_task")) return "发起智能匹配任务";
  if (commandText.startsWith("/check_hp")) return "查询分身节点健康度";
  if (commandText.startsWith("/view_logs")) return "查看最近任务日志";
  if (commandText.startsWith("/match_overview")) return "获取匹配池状态概览";
  if (commandText.startsWith("/resource_overview")) return "获取资源矩阵概览";
  if (commandText.startsWith("/campus_snapshot")) return "拉取校招机会快照";
  if (commandText.startsWith("/brief_digest")) return "生成资讯速览";
  return "执行快捷动作";
}

function getCommandCost(commandText: string): number {
  const commandKey = commandText.trim().split(/\s+/)[0] ?? "";
  return QUICK_ACTIONS.find((item) => item.cmd === commandKey)?.cost ?? 0;
}

export function ExecutionConsole({
  defaultCommand,
  isLocked,
  onNeedActivation,
  compact = false,
  onClose
}: ExecutionConsoleProps = {}) {
  const router = useRouter();
  const memberLevel = useUserStore((state) => state.memberLevel);
  const pointsBalance = useUserStore((state) => state.pointsBalance);
  const memberMonthlyPointsGift = useUserStore((state) => state.memberMonthlyPointsGift);
  const currentMonthGrantedPoints = useUserStore((state) => state.currentMonthGrantedPoints);
  const setPointsSummary = useUserStore((state) => state.setPointsSummary);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousLockStatus = useRef(isLocked);
  const hasRestoredLogsRef = useRef(false);

  const addLog = (type: LogEntry["type"], content: string) => {
    setLogs((prev) =>
      [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type,
          content,
          timestamp: new Date()
        }
      ].slice(-MAX_DAILY_LOGS)
    );
  };

  useEffect(() => {
    if (hasRestoredLogsRef.current) {
      return;
    }

    hasRestoredLogsRef.current = true;

    try {
      const raw = window.localStorage.getItem(CONSOLE_LOG_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as {
        dateKey?: string;
        logs?: SerializedLogEntry[];
      };

      if (parsed.dateKey !== getCurrentLogDateKey()) {
        window.localStorage.removeItem(CONSOLE_LOG_STORAGE_KEY);
        return;
      }

      if (Array.isArray(parsed.logs) && parsed.logs.length > 0) {
        setLogs(deserializeLogs(parsed.logs).slice(-MAX_DAILY_LOGS));
      }
    } catch {
      window.localStorage.removeItem(CONSOLE_LOG_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!hasRestoredLogsRef.current) {
      return;
    }

    try {
      window.localStorage.setItem(
        CONSOLE_LOG_STORAGE_KEY,
        JSON.stringify({
          dateKey: getCurrentLogDateKey(),
          logs: serializeLogs(logs)
        })
      );
    } catch {
      // Ignore persistence failures and keep in-memory logs usable.
    }
  }, [logs]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (defaultCommand && !isLocked) {
      void executeCommand(defaultCommand);
    }
  }, [defaultCommand, isLocked]);

  useEffect(() => {
    if (isLocked === previousLockStatus.current) {
      return;
    }

    if (isLocked) {
      addLog("error", "系统未激活：控制台离线。请先完成模块初始化配置。");
    } else if (previousLockStatus.current) {
      addLog("info", "系统就绪：DeerFlow 调度引擎已连接。");
    }

    previousLockStatus.current = isLocked;
  }, [isLocked]);

  const executeCommand = async (rawCommand: string) => {
    const commandText = rawCommand.trim();
    let successRoute: string | null = null;
    if (!commandText || isExecuting) {
      return;
    }

    if (commandText === "/clear") {
      setLogs([]);
      return;
    }

    addLog("user", toCommandDisplayLabel(commandText));
    setIsExecuting(true);

    if (!commandText.startsWith("/")) {
      addLog("error", "暂不支持该动作，请点击上方快捷卡片执行。");
      setIsExecuting(false);
      return;
    }


    addLog("info", "执行中：正在解析指令并下发任务，请稍候...");

    try {
      const consumeResult = await getUserApi().consumeMomoCommand(commandText);
      setPointsSummary({
        pointsBalance: consumeResult.remainingBalance,
        memberMonthlyPointsGift: consumeResult.memberMonthlyPointsGift,
        currentMonthGrantedPoints: consumeResult.currentMonthGrantedPoints,
        isMomoUnlocked: true
      });
      addLog(
        "info",
        `已扣除 ${consumeResult.cost} 积分，剩余 ${consumeResult.remainingBalance.toFixed(2)} 积分。`
      );

      if (commandText.startsWith("/scan_campus") || commandText.startsWith("/scan_city")) {
        const payload = parseScanCampusPayload(commandText);
        const result = await getLobsterApi().scanCampus(payload);
        addLog(
          "success",
          `同城校招抓取已下发：${result.message ?? "任务已接收"}。city=${payload.city ?? "-"} keyword=${payload.keyword ?? "-"} limit=${payload.limit ?? 30}`
        );
        successRoute = getCommandSuccessRoute(commandText);
      } else if (commandText.startsWith("/match_task")) {
        const result = await getLobsterApi().triggerMatch();
        addLog(
          "success",
          `匹配任务已下发：threadId=${result.threadId ?? "unknown"}，请稍后查看匹配列表。`
        );
        successRoute = getCommandSuccessRoute(commandText);
      } else if (commandText.startsWith("/check_hp")) {
        const status = await getLobsterApi().getStatus();
        addLog("success", `状态查询成功：status=${status.status}，HP=${status.hp}。`);
      } else if (commandText.startsWith("/view_logs")) {
        const taskLogs = await getLobsterApi().getTaskLogs();
        if (taskLogs.length === 0) {
          addLog("success", "最近暂无执行日志。");
        } else {
          const preview = taskLogs
            .slice(0, 3)
            .map(
              (item, index) =>
                `${index + 1}.${item.taskType ?? "unknown"}(${item.status ?? "unknown"})`
            )
            .join("；");
          addLog("success", `最近 ${taskLogs.length} 条任务日志：${preview}`);
        }
      } else if (commandText.startsWith("/match_overview")) {
        const list = await getMatchApi().list();
        const pending = list.filter(
          (item) => item.status === "queued" || item.status === "pushed" || item.status === "viewed"
        ).length;
        const confirmed = list.filter(
          (item) => item.status === "confirmed" || item.status === "done"
        ).length;
        const invalid = list.filter(
          (item) => item.status === "invalid" || item.status === "rejected"
        ).length;
        addLog(
          "success",
          `匹配概览：总计 ${list.length}，待处理 ${pending}，已确认 ${confirmed}，已失效 ${invalid}。`
        );
        successRoute = getCommandSuccessRoute(commandText);
      } else if (commandText.startsWith("/resource_overview")) {
        const resources = await getResourceApi().list();
        if (resources.length === 0) {
          addLog("success", "当前暂无资源记录。");
        } else {
          const statusCount = resources.reduce(
            (acc, item) => {
              acc[item.status] = (acc[item.status] ?? 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          );
          const typeCount = resources.reduce(
            (acc, item) => {
              acc[item.resourceType] = (acc[item.resourceType] ?? 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          );
          const topTypeText = Object.entries(typeCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([type, count]) => `${toResourceTypeLabel(type)}:${count}`)
            .join("、");
          addLog(
            "success",
            `资源概览：总计 ${resources.length}，已上架 ${statusCount.active ?? 0}，审核中 ${statusCount.pending ?? 0}，已下架 ${statusCount.inactive ?? 0}。类型分布：${topTypeText || "暂无"}`
          );
        }
        successRoute = getCommandSuccessRoute(commandText);
      } else if (commandText.startsWith("/campus_snapshot")) {
        const snapshot = await getLobsterApi().getCampusOpportunities({
          page: 1,
          size: 5,
          sourceType: "campus_recruitment"
        });
        if (snapshot.list.length === 0) {
          addLog("success", "当前暂无校招机会。");
        } else {
          const preview = snapshot.list
            .slice(0, 3)
            .map((item) => `${item.companyName}-${item.position}`)
            .join("；");
          addLog("success", `校招快照：共 ${snapshot.total} 条，最新包括 ${preview}。`);
        }
        successRoute = getCommandSuccessRoute(commandText);
      } else if (commandText.startsWith("/brief_digest")) {
        const [briefs, soloSignals, announcements] = await Promise.all([
          getAiBriefApi().list({ limit: 3 }),
          getSoloSignalApi().list({ limit: 3 }),
          getAnnouncementApi().list()
        ]);
        const briefTitle = briefs.list[0]?.title ?? "暂无";
        const soloTitle = soloSignals.list[0]?.title ?? "暂无";
        addLog(
          "success",
          `资讯速览：AI快报 ${briefs.list.length} 条（最新：${briefTitle}）；一人公司 ${soloSignals.list.length} 条（最新：${soloTitle}）；系统公告 ${announcements.length} 条。`
        );
        successRoute = getCommandSuccessRoute(commandText);
      } else {
        addLog("error", "暂不支持该动作，请点击上方快捷卡片执行。");
      }

      if (successRoute) {
        const routeLabel = getRouteDisplayLabel(successRoute);
        addLog("success", `执行完毕：结果已同步，3 秒后自动跳转到${routeLabel}。`);
        await wait(3000);
        router.push(successRoute);
        onClose?.();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "请检查网络或登录状态。";
      addLog("error", `执行失败：${message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleQuickActionClick = (action: (typeof QUICK_ACTIONS)[number]) => {
    if (isLocked) {
      onNeedActivation?.();
      return;
    }
    void executeCommand(action.presetInput);
  };

  const renderSystemLog = (log: LogEntry) => {
    const visual = {
      info: {
        icon: Info,
        className: compact
          ? "bg-slate-100/90 text-slate-700 border border-slate-200/80"
          : "bg-sky-50 text-sky-700 border border-sky-100"
      },
      success: {
        icon: CheckCircle2,
        className: compact
          ? "bg-emerald-50/90 text-emerald-700 border border-emerald-100"
          : "bg-emerald-50 text-emerald-700 border border-emerald-100"
      },
      error: {
        icon: AlertCircle,
        className: compact
          ? "bg-rose-50/90 text-rose-700 border border-rose-100"
          : "bg-rose-50 text-rose-700 border border-rose-100"
      }
    }[log.type as "info" | "success" | "error"];

    const Icon = visual.icon;

    return (
      <div key={log.id} className={`rounded-2xl px-4 py-3 ${visual.className}`}>
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm leading-6">{log.content}</p>
            <p className="mt-1 text-xs opacity-60" suppressHydrationWarning>
              {formatLogTime(log.timestamp)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={
        compact
          ? "relative flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.22)] backdrop-blur-xl"
          : "relative flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
      }
    >
      {compact ? (
        <div
          data-momo-drag-handle="true"
          className="relative cursor-grab select-none border-b border-slate-200/70 bg-gradient-to-br from-slate-50 via-white to-slate-100 px-5 pb-5 pt-4 active:cursor-grabbing"
        >
          <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_top_left,rgba(148,163,184,0.26),transparent_52%)]" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-slate-200/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">
                Beta
              </span>
              <button
                type="button"
                onClick={onClose}
                data-momo-no-drag="true"
                className="grid h-7 w-7 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/80 hover:text-slate-800"
                aria-label="关闭 momo 助手"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-lg font-bold text-white shadow-md">
                mo
              </div>
              <div className="min-w-0">
                <p className="text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-slate-900">
                  Hi, 我是 momo ~
                </p>
                <p className="mt-1 text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-slate-900">
                  有任何问题随时告诉我
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  自动化调度已接入。请点击下方快捷动作发起任务。
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className={
          compact ? "flex-1 overflow-y-auto px-5 py-4" : "flex-1 overflow-y-auto p-6 pb-36"
        }
      >
        <div className={compact ? "space-y-4" : "mx-auto flex max-w-4xl flex-col gap-6 py-4"}>
          {!compact ? (
            <p className="text-center font-medium text-slate-400">
              终端已就绪，点击快捷动作即可执行核心任务。
            </p>
          ) : null}

          <div className={compact ? "space-y-3" : "grid w-full grid-cols-2 gap-4"}>
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.cmd}
                  type="button"
                  disabled={isExecuting}
                  onClick={() => handleQuickActionClick(action)}
                  className={
                    compact
                      ? "group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_30px_rgba(15,23,42,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
                      : "group cursor-pointer rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition-all hover:border-blue-200 hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  }
                >
                  {compact ? (
                    <>
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-50 text-orange-500">
                        <Sparkles className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-700">
                          {action.label}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {action.desc} · 消耗 {action.cost} 积分
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600" />
                    </>
                  ) : (
                    <>
                      <Icon className="h-5 w-5 text-slate-400 transition-colors group-hover:text-blue-500" />
                      <p className="mt-3 text-sm font-semibold text-slate-800">{action.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{action.desc}</p>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <div className={compact ? "space-y-3" : "flex flex-col gap-3"}>
            {logs.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                点击上方任一快捷动作，即可在此查看执行结果。
              </div>
            ) : (
              logs.map((log) => {
                if (log.type === "user") {
                  return (
                    <div
                      key={log.id}
                      className={
                        compact
                          ? "ml-10 rounded-2xl border border-blue-200/80 bg-blue-500 px-4 py-3 text-white"
                          : "rounded-2xl border border-slate-200 bg-slate-900/95 px-4 py-3 text-white"
                      }
                    >
                      <p className="text-sm font-semibold">
                        <span className={compact ? "mr-2 text-blue-100" : "mr-2 text-slate-300"}>
                          {">"}
                        </span>
                        {log.content}
                      </p>
                      <p
                        className={
                          compact
                            ? "mt-1 text-xs text-blue-100/80"
                            : "mt-1 text-xs text-slate-300/70"
                        }
                        suppressHydrationWarning
                      >
                        {formatLogTime(log.timestamp)}
                      </p>
                    </div>
                  );
                }
                return renderSystemLog(log);
              })
            )}
          </div>
        </div>
      </div>

      <div
        className={
          compact
            ? "border-t border-slate-200/80 bg-white/95 p-4"
            : "absolute bottom-0 left-0 w-full bg-gradient-to-t from-white via-white to-transparent p-4"
        }
      >
        <div
          className={
            compact
              ? "rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
              : "mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
          }
        >
          <p className="text-xs text-slate-500">
            {isExecuting
              ? "任务执行中，请等待结果返回；完成后会自动跳转。"
              : `当前为快捷执行模式，请点击上方动作卡片发起任务。当前积分 ${pointsBalance.toFixed(2)}，本月已发放 ${currentMonthGrantedPoints.toFixed(2)} / ${memberMonthlyPointsGift.toFixed(2)}。`}
          </p>
        </div>

        {isLocked ? (
          <div
            className={
              compact ? "mt-2 flex justify-end" : "mx-auto mt-2 flex w-full max-w-4xl justify-end"
            }
          >
            <button
              type="button"
              onClick={onNeedActivation}
              className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100"
            >
              去激活系统
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useDictQuery } from "@/hooks/use-dict-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, X, Terminal, MapPin, Wrench, Star, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { getResourceApi } from "@/api";
import { RESOURCE_ACTIVATION_QUERY_KEY } from "@/hooks/use-resource-activation-status";

interface ActivationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ActivationSheet({ open, onOpenChange, onSuccess }: ActivationSheetProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [isInputting, setIsInputting] = useState(false);
  const [regionSearch, setRegionSearch] = useState("");
  const [payload, setPayload] = useState<Record<string, string[]>>({
    region: [],
    skill: [],
    custom: []
  });
  const [logs, setLogs] = useState<
    { id: string; text: string; type: "success" | "warn" | "info" }[]
  >([{ id: "init", text: "> [系统] 终端激活，模块初始化配置向导 v1.0.1 待命中...", type: "info" }]);

  const endOfLogsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfLogsRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // 重置状态
  useEffect(() => {
    if (open && !mutation.isPending) {
      setStep(0);
      setPayload({ region: [], skill: [], custom: [] });
      setRegionSearch("");
      setLogs([
        {
          id: "init-" + Date.now(),
          text: "> [系统] 终端激活，模块初始化配置向导 v1.0.1 待命中...",
          type: "info"
        }
      ]);
      setIsInputting(false);
      mutation.reset();
    }
  }, [open]);

  useEffect(() => {
    setIsInputting(false);
    if (step !== 0) {
      setRegionSearch("");
    }
  }, [step]);

  // 使用 React Query Mutation 处理真实提交
  const mutation = useMutation({
    mutationFn: async (submitPayload: Record<string, string[]>) => {
      const regionData = submitPayload.region || submitPayload.resource || [];
      const skillData = submitPayload.skill || [];
      const customData = submitPayload.custom || [];

      const resourceType: string[] = [];
      if (skillData.length > 0) resourceType.push("skill");
      if (regionData.length > 0) resourceType.push("location");
      if (resourceType.length === 0) resourceType.push("skill");

      const tags = [
        ...regionData.map((item) => `activation_resource:${item}`),
        ...skillData.map((item) => `activation_skill:${item}`),
        ...customData.map((item) => `activation_goal:${item}`)
      ];

      await getResourceApi().upload({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resourceType: resourceType as any,
        tags,
        areaCode: regionData[0] || undefined
      });
      await queryClient.invalidateQueries({ queryKey: RESOURCE_ACTIVATION_QUERY_KEY });
    },
    onSuccess: () => {
      appendLog(`> [系统] 引擎激活成功，正在解开锁定协议...`, "success");
      setTimeout(() => {
        onOpenChange(false);
        onSuccess?.();
      }, 500);
    },
    onError: (error) => {
      appendLog(`> [系统错误] 引擎激活失败: ${(error as Error).message}`, "warn");
    }
  });

  // 动态数据获取
  const regionQuery = useDictQuery("RESOURCE_REGION_CODES");
  const skillQuery = useDictQuery("RESOURCE_SKILL_TAGS");
  const customQuery = useDictQuery("RESOURCE_CUSTOM_TAGS");
  const allRegions = regionQuery.data?.items || [];
  const regionSearchKeyword = regionSearch.trim().toLowerCase();
  const filteredRegions = useMemo(() => {
    if (!regionSearchKeyword) {
      return allRegions.slice(0, 10);
    }
    return allRegions
      .filter((item) => {
        const label = item.label.toLowerCase();
        const code = item.code.toLowerCase();
        return label.includes(regionSearchKeyword) || code.includes(regionSearchKeyword);
      })
      .slice(0, 10);
  }, [allRegions, regionSearchKeyword]);
  const quickAccessRegions = useMemo(() => allRegions.slice(0, 12), [allRegions]);

  const stepsConfig = [
    {
      key: "region",
      label: "地区",
      title: "初始化序列 (1/4)：挂载地区节点",
      query: regionQuery,
      icon: MapPin
    },
    {
      key: "skill",
      label: "技能",
      title: "初始化序列 (2/4)：注入核心技能",
      query: skillQuery,
      icon: Wrench
    },
    {
      key: "custom",
      label: "愿望",
      title: "初始化序列 (3/4)：设定运行愿望",
      query: customQuery,
      icon: Star
    }
  ];

  const isStepReview = step === 3;
  const currentStepInfo = isStepReview ? null : stepsConfig[step];

  const appendLog = (text: string, type: "success" | "warn" | "info" = "info") => {
    setLogs((prev) => [...prev, { id: Math.random().toString(36).substring(2, 9), text, type }]);
  };

  const toggleSelection = (code: string, label: string, keyOverride?: string) => {
    if (isStepReview || !currentStepInfo || mutation.isPending) return;

    const key = keyOverride ?? currentStepInfo.key;
    const isSelected = payload[key].includes(code);

    if (isSelected) {
      setPayload((prev) => ({
        ...prev,
        [key]: prev[key].filter((item) => item !== code)
      }));
      appendLog(`> [系统提示] 参数 [${label}] ... 解绑完成。`, "warn");
    } else {
      setPayload((prev) => ({
        ...prev,
        [key]: [...prev[key], code]
      }));
      appendLog(
        `> [BINDING] :: 变量 [${label}] -> 系统路径 [sys.user_profile] ... 就绪。`,
        "success"
      );
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
      appendLog(`> [系统] 读取下一指令栈... 缓冲执行 ${step + 2}/4`, "info");
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
      appendLog(`> [系统] 已执行操作回溯... 跳转序列 ${step}/4`, "info");
    }
  };

  const handleSubmit = () => {
    appendLog(`> [系统] 接收到执行指令，正在向 [sys.core] 推送初始化参数...`, "info");
    mutation.mutate(payload);
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(val) => {
        if (!mutation.isPending) onOpenChange(val);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-slate-800 bg-slate-950 p-6 shadow-2xl transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <DialogPrimitive.Title className="font-mono text-lg font-semibold tracking-tight text-slate-200">
              模块初始化配置向导 v1.0.1
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              disabled={mutation.isPending}
              className="rounded-sm opacity-70 ring-offset-slate-950 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-slate-800"
            >
              <X className="h-4 w-4 text-slate-400" />
              <span className="sr-only">关闭向导</span>
            </DialogPrimitive.Close>
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto py-6 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-800">
            <h3 className="mb-4 font-mono text-sm tracking-wider text-slate-400">
              {isStepReview ? "初始化序列 (4/4)：安全审查与确认" : currentStepInfo?.title}
            </h3>

            <div className="flex-1 space-y-4">
              {isStepReview ? (
                /* 第 4 步: 最终审查 */
                <div className="rounded-md border border-slate-800 bg-slate-900/50 p-4 font-mono text-sm">
                  <div className="text-emerald-400 mb-4 font-semibold tracking-widest border-b border-slate-700/50 pb-2">
                    /* sys.configuration.profile */
                  </div>
                  {stepsConfig.map((s) => {
                    const selectedCodes = payload[s.key] ?? [];
                    const selectedLabels = selectedCodes.map((rawCode) => {
                      const cleanCode = rawCode.includes(":")
                        ? rawCode.split(":").slice(1).join(":")
                        : rawCode;
                      const normalizedCode = cleanCode.trim();
                      const matchedItem = s.query.data?.items?.find((i) => {
                        return (
                          i.code === normalizedCode ||
                          i.code.toLowerCase() === normalizedCode.toLowerCase()
                        );
                      });
                      return matchedItem?.label || normalizedCode;
                    });

                    return (
                      <div key={s.key} className="mb-4 last:mb-0">
                        <div className="text-slate-500 flex items-center mb-1">
                          <s.icon className="w-3 h-3 mr-1" />
                          <span>
                            {s.label}
                            <span className="ml-1 text-slate-600">[{s.key.toUpperCase()}]</span>
                          </span>
                        </div>
                        <div className="pl-4 text-slate-300">
                          {selectedLabels.length > 0 ? (
                            <ul className="list-disc leading-relaxed">
                              {selectedLabels.map((l, i) => (
                                <li key={i} className="text-slate-200">
                                  {l}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-slate-600 italic">None</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : currentStepInfo?.query.isPending ? (
                /* 加载中骨架屏 */
                <div className="flex flex-wrap gap-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-10 w-28 animate-pulse rounded-md bg-slate-800/50" />
                  ))}
                </div>
              ) : currentStepInfo?.query.isError ? (
                /* 错误容错面板 */
                <div className="flex flex-col items-center justify-center rounded-md border border-rose-900/50 bg-rose-950/20 p-8 text-center">
                  <p className="mb-4 font-mono text-sm text-rose-400">
                    依赖项加载失败 (ERR_FETCH_FAILED)
                  </p>
                  <button
                    onClick={() => currentStepInfo.query.refetch()}
                    className="flex items-center rounded bg-slate-800 px-4 py-2 font-mono text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <RefreshCw className="mr-2 h-3 w-3" /> 重试指令 (Retry)
                  </button>
                </div>
              ) : (
                /* 正常参数卡片渲染 */
                <div className="w-full space-y-4">
                  {currentStepInfo?.key === "region" ? (
                    <>
                      <div className="rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2">
                        <input
                          type="text"
                          value={regionSearch}
                          onChange={(event) => setRegionSearch(event.target.value)}
                          placeholder="> input keyword to search nodes..."
                          className="w-full border-0 bg-transparent font-mono text-sm text-emerald-300 placeholder:text-slate-500 focus:outline-none focus:ring-0"
                        />
                      </div>

                      <div className="text-xs font-mono tracking-wider text-slate-500">
                        {regionSearchKeyword
                          ? "> [SEARCH_RESULT] 匹配节点"
                          : "> [QUICK_ACCESS] 常用节点"}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {(regionSearchKeyword ? filteredRegions : quickAccessRegions).map((tag) => {
                          const isSelected = payload[currentStepInfo.key].includes(tag.code);
                          const Icon = currentStepInfo.icon;
                          return (
                            <button
                              key={tag.code}
                              disabled={mutation.isPending}
                              onClick={() => toggleSelection(tag.code, tag.label)}
                              className={cn(
                                "flex items-center rounded-md border px-4 py-2 text-sm transition-all focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                                isSelected
                                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[inset_0_0_10px_rgba(16,185,129,0.2)]"
                                  : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200"
                              )}
                            >
                              <Icon className="mr-2 h-4 w-4" />
                              {tag.label}
                            </button>
                          );
                        })}

                        {regionSearchKeyword && filteredRegions.length === 0 ? (
                          <div className="rounded-md border border-dashed border-slate-700 bg-slate-900/40 px-3 py-2 text-xs font-mono text-slate-500">
                            &gt; 未找到匹配节点，您可以强制挂载自定义节点
                          </div>
                        ) : null}
                      </div>

                      {regionSearch.trim() ? (
                        <button
                          type="button"
                          disabled={mutation.isPending}
                          onClick={() => {
                            const customRegion = regionSearch.trim();
                            if (!customRegion) return;
                            toggleSelection(customRegion, customRegion, "region");
                            setRegionSearch("");
                          }}
                          className="flex w-full items-center rounded-md border border-dashed border-emerald-500/40 bg-emerald-500/5 px-4 py-2 text-left text-sm font-mono text-emerald-400 transition-colors hover:border-emerald-400/60 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          + [FORCE_MOUNT] 强制挂载未知节点: {regionSearch.trim()}
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {currentStepInfo?.query.data?.items?.map((tag) => {
                        const isSelected = payload[currentStepInfo.key].includes(tag.code);
                        const Icon = currentStepInfo.icon;
                        return (
                          <button
                            key={tag.code}
                            disabled={mutation.isPending}
                            onClick={() => toggleSelection(tag.code, tag.label)}
                            className={cn(
                              "flex items-center rounded-md border px-4 py-2 text-sm transition-all focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                              isSelected
                                ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-[inset_0_0_10px_rgba(16,185,129,0.2)]"
                                : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200"
                            )}
                          >
                            <Icon className="mr-2 h-4 w-4" />
                            {tag.label}
                          </button>
                        );
                      })}
                      <div className="ml-2 flex items-center">
                        {isInputting ? (
                          <input
                            type="text"
                            autoFocus
                            className="w-32 rounded-md border border-emerald-500/50 bg-slate-900 px-3 py-1.5 text-sm text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="输入后回车..."
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && e.currentTarget.value) {
                                const customVal = e.currentTarget.value.trim();
                                if (customVal) {
                                  e.preventDefault();
                                  toggleSelection(customVal, customVal);
                                  setIsInputting(false);
                                }
                              }
                            }}
                            onBlur={() => setIsInputting(false)}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsInputting(true)}
                            className="flex items-center rounded-md border border-dashed border-slate-700 bg-slate-900/50 px-4 py-2 text-sm text-slate-500 transition-colors hover:border-slate-500 hover:text-slate-300"
                          >
                            + 载入自定义模块...
                          </button>
                        )}
                      </div>
                      {(!currentStepInfo?.query.data?.items ||
                        currentStepInfo.query.data.items.length === 0) && (
                        <div className="text-sm font-mono text-slate-500">&gt; 无可用挂载项</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto space-y-4 pt-4 border-t border-slate-800">
            {/* 终端日志流 */}
            <div className="relative flex h-24 flex-col overflow-hidden rounded-md bg-black border border-slate-800 p-2 font-mono text-xs shadow-inner">
              <div className="absolute top-2 right-2 flex space-x-1">
                <div className="h-2 w-2 rounded-full bg-slate-800"></div>
                <div className="h-2 w-2 rounded-full bg-slate-800"></div>
                <div className="h-2 w-2 rounded-full bg-slate-800"></div>
              </div>
              <div className="flex items-center text-emerald-600/80 mb-1 shrink-0 font-bold border-b border-emerald-900/30 pb-1">
                <Terminal className="mr-2 h-3 w-3" />
                <span>TERMINAL output (tty1)</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 [&::-webkit-scrollbar]:hidden">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={cn(
                      "break-words leading-relaxed",
                      log.type === "success" && "text-emerald-400",
                      log.type === "warn" && "text-slate-500",
                      log.type === "info" && "text-slate-400"
                    )}
                  >
                    {log.text}
                  </div>
                ))}
                <div ref={endOfLogsRef} />
              </div>
            </div>

            {/* 底部操作台 */}
            <div className="flex items-center justify-between">
              <div className="font-mono text-xs font-medium text-slate-500 flex items-center">
                <span className="bg-slate-800 px-2 py-1 rounded text-slate-300 tracking-widest mr-2">
                  {step + 1}/4
                </span>
                {mutation.isPending ? "编译中..." : "系统就绪"}
              </div>
              <div className="flex space-x-3 text-sm">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={step === 0 || mutation.isPending}
                  className="rounded-md border border-slate-700 bg-slate-900 text-slate-400 px-4 py-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  上一步
                </button>
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={mutation.isPending}
                    className="rounded-md bg-slate-200 text-slate-900 px-4 py-2 font-medium hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                  >
                    配置加载 (Next)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={mutation.isPending}
                    className="flex min-w-[170px] items-center justify-center rounded-md bg-emerald-600 text-emerald-50 px-4 py-2 font-medium hover:bg-emerald-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                  >
                    {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {mutation.isPending ? "初始化执行中..." : "系统引擎一键初始化 (Initialize)"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  Crown,
  ExternalLink,
  Lightbulb,
  Loader2,
  Radar,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getAiBriefApi } from "@/api";
import { useAuthStatus } from "@/stores/use-auth-status";
import { useUserStore } from "@/stores/user-store";
import { sanitizePublicText } from "@/utils/public-text";
import { getErrorMessage } from "@/utils/error-message";

const monetizationTracks = [
  {
    title: "信息差快反路径",
    summary: "盯紧 AI 新能力上线，用最快速度拆成教程、清单、模版或训练营，抢首波搜索和社媒流量。",
    actions: ["当天读完官方更新", "24 小时内产出中文拆解", "把高频问题整理成可售内容"]
  },
  {
    title: "工作流代做路径",
    summary: "把模型、自动化和表单串成可交付服务，优先卖给需要立刻提效的小团队和个体商家。",
    actions: ["先做一个可演示样例", "明确报价边界", "沉淀成可重复交付 SOP"]
  },
  {
    title: "模板订阅路径",
    summary: "把提示词、脚本、知识库、运营流程做成模板库，持续积累复购和会员收入。",
    actions: ["围绕单一场景做首个模板", "收集用户真实反馈", "每周固定补 2-3 个版本"]
  }
] as const;

const executionRhythm = [
  "先看 5-8 条最新 AI 快报，筛出真正影响收入模型的变化",
  "只挑一个细分场景验证，不同时开太多战线",
  "优先做可交付、可报价、可复制的最小服务包",
  "把有效动作沉淀到 SOP 模板库，形成复用资产"
] as const;

export default function AiMoneyPassPage() {
  const router = useRouter();
  const { hydrated, isLoggedIn } = useAuthStatus();
  const memberLevel = useUserStore((state) => state.memberLevel);
  const hasPaidMembership =
    memberLevel === "PRO" || memberLevel === "YEARLY" || memberLevel === "LIFETIME";

  const query = useQuery({
    queryKey: ["ai-money-pass", "brief-radar"],
    queryFn: () =>
      getAiBriefApi().list({
        limit: 8
      }),
    staleTime: 2 * 60 * 1000
  });

  const radarItems = useMemo(() => query.data?.list ?? [], [query.data]);

  const goToMemberCheckout = () => {
    const target = `/member?sourceModule=ai_brief&sourceAction=ai_money_pass&returnTo=${encodeURIComponent("/ai-money-pass")}`;
    if (!hydrated || !isLoggedIn) {
      router.push(`/auth?redirect=${encodeURIComponent(target)}`);
      return;
    }
    router.push(target);
  };

  return (
    <div className="relative min-h-[calc(100vh-11rem)] rounded-[2rem] bg-slate-50 before:pointer-events-none before:absolute before:inset-0 before:opacity-50 before:[background-size:16px_16px] before:bg-[radial-gradient(#e2e8f0_1px,transparent_1px)]">
      <div className="relative z-10 p-6 md:p-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                <BriefcaseBusiness className="h-3.5 w-3.5" />
                AI MONEY PASS
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                AI赚钱通行证
              </h1>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                把分散的 AI 新闻，转成能落到服务、内容、模板和报价里的执行路径。这里不是单纯看资讯，而是帮你判断哪些变化值得立刻拿去赚钱。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {hasPaidMembership ? (
                <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                  <Sparkles className="h-4 w-4" />
                  月会员及以上已解锁
                </div>
              ) : (
                <button
                  type="button"
                  onClick={goToMemberCheckout}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-slate-800"
                >
                  <Crown className="h-4 w-4" />
                  开通会员解锁通行证
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <TrendingUp className="h-4 w-4 text-cyan-600" />
                三条最容易落地的赚钱路径
              </div>
              <div className="mt-4 grid gap-3">
                {monetizationTracks.map((track, index) => (
                  <article
                    key={track.title}
                    className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="inline-flex rounded-full border border-cyan-100 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
                      路径 {index + 1}
                    </div>
                    <h2 className="mt-3 text-lg font-bold text-slate-900">{track.title}</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{track.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {track.actions.map((action) => (
                        <span
                          key={action}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                        >
                          {action}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-white/90">
                <Lightbulb className="h-4 w-4 text-cyan-300" />
                今日执行节奏
              </div>
              <div className="mt-4 space-y-3">
                {executionRhythm.map((item, index) => (
                  <div
                    key={item}
                    className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
                      Step {index + 1}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-white/85">{item}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/ai-brief"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                >
                  返回 AI 快报
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/sop-library"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
                >
                  去看 SOP 模板库
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                <Radar className="h-3.5 w-3.5" />
                OPPORTUNITY RADAR
              </div>
              <h2 className="mt-3 text-2xl font-bold text-slate-900">今日机会雷达</h2>
              <p className="mt-2 text-sm text-slate-500">
                从 AI 快报里先筛出最值得关注的一批信号，再决定你要做教程、服务还是模板。
              </p>
            </div>
            <Link
              href="/ai-brief"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              查看全部 AI 快报
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5">
            {query.isLoading ? (
              <div className="flex min-h-52 items-center justify-center rounded-[1.5rem] border border-slate-200 bg-slate-50 text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                正在装载今天的机会雷达...
              </div>
            ) : query.isError ? (
              <div className="rounded-[1.5rem] border border-rose-100 bg-rose-50 px-5 py-6 text-sm text-rose-600">
                机会雷达加载失败：{getErrorMessage(query.error)}
              </div>
            ) : radarItems.length === 0 ? (
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
                当前还没有可用快报数据，稍后再来看看。
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {radarItems.map((item) => {
                  const title = sanitizePublicText(item.title) ?? "未命名快报";
                  const summary = sanitizePublicText(item.summary);

                  return (
                    <article
                      key={item.id}
                      className="rounded-[1.5rem] border border-slate-200 bg-slate-50/60 p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                          {item.sourceName}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {new Date(item.publishedAt).toLocaleString("zh-CN", { hour12: false })}
                        </span>
                      </div>

                      <h3 className="mt-3 text-base font-bold leading-7 text-slate-900">{title}</h3>
                      {summary ? (
                        <p className="mt-2 text-sm leading-7 text-slate-600">{summary}</p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
                        >
                          查看原文
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

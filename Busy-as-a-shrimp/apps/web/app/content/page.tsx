"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, FileText, Sparkles } from "lucide-react";

import { getContentApi } from "@/api";
import type { ContentEvent, ContentItem, ContentType } from "@/api/content-api";
import { useAuthStatus } from "@/stores/use-auth-status";
import { getErrorMessage } from "@/utils/error-message";

const CONTENT_QUERY_KEY = ["content", "list"] as const;

const CONTENT_TYPE_OPTIONS: Array<{ value: ContentType; label: string }> = [
  { value: "card", label: "卡片" },
  { value: "post", label: "文案" },
  { value: "video_script", label: "脚本" },
  { value: "poster", label: "海报" }
];

const EVENT_OPTIONS: Array<{ value: ContentEvent; label: string }> = [
  { value: "view", label: "浏览 +1" },
  { value: "like", label: "点赞 +1" },
  { value: "inquiry", label: "咨询 +1" }
];

function statusLabel(status: ContentItem["status"]): string {
  if (status === "draft") return "草稿";
  if (status === "pending") return "待审核";
  if (status === "published") return "已发布";
  return "已拒绝";
}

export default function ContentPage() {
  const { hydrated, isLoggedIn } = useAuthStatus();
  const queryClient = useQueryClient();
  const [contentType, setContentType] = useState<ContentType>("post");
  const [targetPlatform, setTargetPlatform] = useState("小红书");
  const [prompt, setPrompt] = useState("");
  const [notice, setNotice] = useState("");

  const listQuery = useQuery({
    queryKey: CONTENT_QUERY_KEY,
    queryFn: () => getContentApi().list(),
    enabled: hydrated && isLoggedIn
  });

  const createMutation = useMutation({
    mutationFn: () => getContentApi().generate({ contentType, targetPlatform, prompt }),
    onSuccess: async (result) => {
      setNotice(
        `已生成内容 #${result.contentId}，消耗 ${result.pointsDeducted} 积分，请确认后发布。`
      );
      setPrompt("");
      await queryClient.invalidateQueries({ queryKey: CONTENT_QUERY_KEY });
    },
    onError: (error) => {
      setNotice(`生成失败：${getErrorMessage(error)}`);
    }
  });

  const publishMutation = useMutation({
    mutationFn: (contentId: number) => getContentApi().publish(contentId),
    onSuccess: async (result) => {
      setNotice(`内容 #${result.contentId} 已发布。`);
      await queryClient.invalidateQueries({ queryKey: CONTENT_QUERY_KEY });
    },
    onError: (error) => {
      setNotice(`发布失败：${getErrorMessage(error)}`);
    }
  });

  const statsMutation = useMutation({
    mutationFn: ({ contentId, event }: { contentId: number; event: ContentEvent }) =>
      getContentApi().track(contentId, event),
    onSuccess: async (result) => {
      setNotice(
        `内容 #${result.contentId} 统计已更新：浏览 ${result.stats.views} / 点赞 ${result.stats.likes} / 咨询 ${result.stats.inquiries}`
      );
      await queryClient.invalidateQueries({ queryKey: CONTENT_QUERY_KEY });
    },
    onError: (error) => {
      setNotice(`统计回流失败：${getErrorMessage(error)}`);
    }
  });

  const submitting = createMutation.isPending;
  const records = listQuery.data ?? [];
  const publishedCount = useMemo(
    () => records.filter((item) => item.status === "published").length,
    [records]
  );

  if (!hydrated) {
    return <p className="text-sm text-slate-400">正在初始化...</p>;
  }

  if (!isLoggedIn) {
    return (
      <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md md:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">内容中心</h1>
        <p className="mt-2 text-sm font-medium text-slate-400">
          请先登录后使用内容生成与发布功能。
        </p>
        <Link
          href="/auth"
          className="mt-4 inline-flex rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-800"
        >
          去登录
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-0">
      <header className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md md:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">内容中心</h1>
        <p className="mt-2 text-sm font-medium text-slate-400">
          生成草稿 -&gt; 人工确认发布 -&gt; 统计回流（浏览/点赞/咨询）。
        </p>
        <div className="mt-5 flex gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-600 shadow-sm">
            内容总数 {records.length}
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-600 shadow-sm">
            已发布 {publishedCount}
          </div>
        </div>
      </header>

      <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md md:p-8">
        <h2 className="mb-5 text-lg font-bold text-slate-900">生成内容</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="relative">
            <select
              value={contentType}
              onChange={(event) => setContentType(event.target.value as ContentType)}
              className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm font-medium text-slate-700 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/20"
            >
              {CONTENT_TYPE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
          <input
            value={targetPlatform}
            onChange={(event) => setTargetPlatform(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700 transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="目标平台，例如抖音"
          />
          <button
            type="button"
            disabled={submitting || prompt.trim().length < 3}
            onClick={() => createMutation.mutate()}
            className="flex transform items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_0_rgb(0,0,0,10%)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-slate-800 hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4 text-amber-100" />
            {submitting ? "生成中..." : "生成草稿"}
          </button>
        </div>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          className="mt-4 min-h-[140px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/50 p-5 text-sm text-slate-800 shadow-inner transition-all placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:shadow-none focus:outline-none focus:ring-2 focus:ring-slate-900/20"
          placeholder="输入生成提示词"
        />
      </section>

      {notice ? (
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          {notice}
        </section>
      ) : null}

      <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md md:p-8">
        <h2 className="mb-5 text-lg font-bold text-slate-900">我的内容</h2>
        {listQuery.isPending ? <p className="text-sm text-slate-400">加载中...</p> : null}
        {listQuery.isError ? (
          <p className="text-sm text-rose-500">加载失败：{getErrorMessage(listQuery.error)}</p>
        ) : null}
        {!listQuery.isPending && !listQuery.isError && records.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-100 bg-slate-50/50 py-12">
            <FileText className="mb-3 h-12 w-12 text-slate-300" />
            <p className="text-sm font-medium text-slate-400">暂无内容记录。</p>
          </div>
        ) : null}

        <div className="space-y-3">
          {records.map((item) => (
            <article
              key={item.contentId}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  #{item.contentId} · {item.targetPlatform} · {statusLabel(item.status)}
                </p>
                {item.status === "pending" ? (
                  <button
                    type="button"
                    disabled={publishMutation.isPending}
                    onClick={() => publishMutation.mutate(item.contentId)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
                  >
                    确认发布
                  </button>
                ) : null}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {item.contentBody}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                浏览 {item.stats.views} · 点赞 {item.stats.likes} · 咨询 {item.stats.inquiries}
              </p>

              {item.status === "published" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {EVENT_OPTIONS.map((event) => (
                    <button
                      key={`${item.contentId}-${event.value}`}
                      type="button"
                      disabled={statsMutation.isPending}
                      onClick={() =>
                        statsMutation.mutate({ contentId: item.contentId, event: event.value })
                      }
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900"
                    >
                      {event.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

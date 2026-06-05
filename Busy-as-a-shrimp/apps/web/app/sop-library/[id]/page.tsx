"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookCopy,
  Copy,
  ExternalLink,
  Loader2,
  Lock,
  Sparkles
} from "lucide-react";
import { getSopTemplateApi } from "@/api";
import { useAuthStatus } from "@/stores/use-auth-status";
import { useUserStore } from "@/stores/user-store";
import { getErrorMessage } from "@/utils/error-message";

export default function SopLibraryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { hydrated, isLoggedIn } = useAuthStatus();
  const memberLevel = useUserStore((state) => state.memberLevel);
  const hasPaidMembership =
    memberLevel === "PRO" || memberLevel === "YEARLY" || memberLevel === "LIFETIME";
  const [copied, setCopied] = useState(false);

  const templateId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const detailQuery = useQuery({
    queryKey: ["sop-library", "detail", templateId, hasPaidMembership],
    enabled: Boolean(templateId),
    queryFn: async () => {
      if (!templateId) {
        throw new Error("模板不存在");
      }
      return hasPaidMembership
        ? getSopTemplateApi().detail(templateId)
        : getSopTemplateApi().preview(templateId);
    },
    staleTime: 2 * 60 * 1000
  });

  const template = detailQuery.data;
  const content = useMemo(() => {
    if (!template) {
      return "";
    }
    return "content" in template ? template.content : template.previewContent;
  }, [template]);

  const goToMemberCheckout = () => {
    const target = `/member?sourceModule=solo_ai&sourceAction=sop_detail_unlock&returnTo=${encodeURIComponent(`/sop-library/${templateId ?? ""}`)}`;
    if (!hydrated || !isLoggedIn) {
      router.push(`/auth?redirect=${encodeURIComponent(target)}`);
      return;
    }
    router.push(target);
  };

  const handleCopy = async () => {
    if (!template || !("copyText" in template)) {
      goToMemberCheckout();
      return;
    }

    await navigator.clipboard.writeText(template.copyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="relative min-h-[calc(100vh-11rem)] rounded-[2rem] bg-slate-50 before:pointer-events-none before:absolute before:inset-0 before:opacity-50 before:[background-size:16px_16px] before:bg-[radial-gradient(#e2e8f0_1px,transparent_1px)]">
      <div className="relative z-10 p-6 md:p-8">
        <div className="mb-4">
          <Link
            href="/sop-library"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            返回模板库
          </Link>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          {detailQuery.isLoading ? (
            <div className="flex min-h-64 items-center justify-center text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              正在加载模板详情...
            </div>
          ) : detailQuery.isError ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-5 text-sm text-rose-600">
              模板详情加载失败：{getErrorMessage(detailQuery.error)}
            </div>
          ) : !template ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10 text-sm text-slate-500">
              未找到对应模板。
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="inline-flex rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                    {template.category}
                  </div>
                  <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                    {template.title}
                  </h1>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{template.summary}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {template.tags.map((tag) => (
                      <span
                        key={`${template.id}-${tag}`}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-stretch gap-2">
                  {hasPaidMembership ? (
                    <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                      <Sparkles className="h-4 w-4" />
                      会员全文已解锁
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                      <Lock className="h-4 w-4" />
                      当前仅可查看预览
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    <Copy className="h-4 w-4" />
                    {!hasPaidMembership ? "开通会员后复制" : copied ? "已复制模板" : "一键复制模板"}
                  </button>

                  {template.sourceUrl ? (
                    <a
                      href={template.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      查看来源
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    阅读时间
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {template.estimatedReadMinutes} 分钟
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    发布时间
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {template.publishedAt
                      ? new Date(template.publishedAt).toLocaleString("zh-CN", { hour12: false })
                      : "随时可用"}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    查看次数
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {template.viewCount}
                  </div>
                </div>
              </div>

              {!hasPaidMembership ? (
                <div className="mt-6 rounded-[2rem] border border-amber-100 bg-amber-50/70 p-5">
                  <h2 className="text-lg font-bold text-slate-900">会员可解锁完整执行模板</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    你现在看到的是可阅读预览。开通会员后，可查看完整 SOP、复制全文、按你的业务场景直接改写执行。
                  </p>
                  <button
                    type="button"
                    onClick={goToMemberCheckout}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    开通会员查看完整模板
                    <Sparkles className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              <article className="mt-6 rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  <BookCopy className="h-4 w-4" />
                  {hasPaidMembership ? "完整 SOP 模板" : "模板预览"}
                </div>
                <div className="whitespace-pre-wrap text-sm leading-8 text-slate-700">{content}</div>
              </article>

              {"contactInfo" in template && template.contactInfo ? (
                <section className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
                  <h2 className="text-sm font-bold text-emerald-800">使用提醒</h2>
                  <p className="mt-2 text-sm leading-7 text-emerald-700">{template.contactInfo}</p>
                </section>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

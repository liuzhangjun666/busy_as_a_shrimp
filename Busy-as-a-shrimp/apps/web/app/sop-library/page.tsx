"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookCopy,
  Filter,
  Loader2,
  Lock,
  Search,
  Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getSopTemplateApi } from "@/api";
import { useAuthStatus } from "@/stores/use-auth-status";
import { useUserStore } from "@/stores/user-store";
import { getErrorMessage } from "@/utils/error-message";

const DEFAULT_PAGE_SIZE = 12;

export default function SopLibraryPage() {
  const router = useRouter();
  const { hydrated, isLoggedIn } = useAuthStatus();
  const memberLevel = useUserStore((state) => state.memberLevel);
  const hasPaidMembership =
    memberLevel === "PRO" || memberLevel === "YEARLY" || memberLevel === "LIFETIME";

  const [keywordDraft, setKeywordDraft] = useState("");
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");

  const listQuery = useQuery({
    queryKey: ["sop-library", { keyword, category }],
    queryFn: () =>
      getSopTemplateApi().list({
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        keyword: keyword || undefined,
        category: category || undefined
      }),
    staleTime: 2 * 60 * 1000
  });

  const categories = useMemo(() => listQuery.data?.categories ?? [], [listQuery.data]);
  const records = listQuery.data?.list ?? [];

  const goToMemberCheckout = () => {
    const target = `/member?sourceModule=solo_ai&sourceAction=sop_library&returnTo=${encodeURIComponent("/sop-library")}`;
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
                <BookCopy className="h-3.5 w-3.5" />
                SOP TEMPLATE LIBRARY
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                SOP模板库
              </h1>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                把 AI 一人公司的真实案例，沉淀成可复制、可执行、可落地的标准作业模板。你可以按场景筛选，先预览，再进入完整模板执行。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {hasPaidMembership ? (
                <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                  <Sparkles className="h-4 w-4" />
                  会员全文已解锁
                </div>
              ) : (
                <button
                  type="button"
                  onClick={goToMemberCheckout}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-slate-800"
                >
                  <Lock className="h-4 w-4" />
                  开通会员解锁全文与复制
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={keywordDraft}
                  onChange={(event) => setKeywordDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setKeyword(keywordDraft.trim());
                    }
                  }}
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  placeholder="搜索模板标题、执行步骤或适用场景"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setKeyword(keywordDraft.trim())}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  搜索
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setKeywordDraft("");
                    setKeyword("");
                    setCategory("");
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  重置
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                <Filter className="h-3.5 w-3.5" />
                分类
              </div>
              <button
                type="button"
                onClick={() => setCategory("")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  category === ""
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                全部
              </button>
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    category === item
                      ? "bg-cyan-600 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6">
          {listQuery.isLoading ? (
            <div className="flex min-h-64 items-center justify-center rounded-[2rem] border border-slate-200 bg-white text-slate-500 shadow-sm">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              正在装载模板库...
            </div>
          ) : listQuery.isError ? (
            <div className="rounded-[2rem] border border-rose-100 bg-rose-50 px-6 py-8 text-sm text-rose-600 shadow-sm">
              模板库加载失败：{getErrorMessage(listQuery.error)}
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-10 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">当前条件下暂无模板</h2>
              <p className="mt-2 text-sm text-slate-500">
                你可以切换分类或清空搜索条件，我们已经为模板库准备好了基础模板。
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  共找到 <span className="font-semibold text-slate-900">{listQuery.data?.total ?? 0}</span>{" "}
                  个可执行模板
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {records.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-[1px] hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="inline-flex rounded-full border border-cyan-100 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
                          {item.category}
                        </div>
                        <h2 className="mt-3 text-lg font-bold leading-7 text-slate-900">
                          {item.title}
                        </h2>
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        <div>{item.estimatedReadMinutes} 分钟读完</div>
                        <div className="mt-1">
                          {item.publishedAt
                            ? new Date(item.publishedAt).toLocaleDateString("zh-CN")
                            : "随时可用"}
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.summary}</p>

                    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        模板预览
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{item.previewText}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <span
                          key={`${item.id}-${tag}`}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <Link
                        href={`/sop-library/${item.id}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        {hasPaidMembership ? "查看完整SOP" : "查看模板预览"}
                        <ArrowRight className="h-4 w-4" />
                      </Link>

                      {!hasPaidMembership ? (
                        <button
                          type="button"
                          onClick={goToMemberCheckout}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                          开通会员解锁复制
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

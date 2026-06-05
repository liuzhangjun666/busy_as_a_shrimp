"use client";

import { ArrowRight, Coins, Lock, ReceiptText, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { getDoppelgangerApi } from "../../src/api";
import { useAuthStatus } from "../../src/stores/use-auth-status";
import { useUserStore } from "../../src/stores/user-store";

const POINT_LEDGER_QUERY_KEY = ["doppelganger", "point-ledger"] as const;

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getTransactionTone(direction: "income" | "expense"): string {
  return direction === "income"
    ? "border-emerald-100 bg-emerald-50/70 text-emerald-600"
    : "border-rose-100 bg-rose-50/70 text-rose-600";
}

function ensureNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export default function PointsPage() {
  const { hydrated, isLoggedIn, token } = useAuthStatus();
  const pointsBalance = useUserStore((state) => state.pointsBalance);
  const memberMonthlyPointsGift = useUserStore((state) => state.memberMonthlyPointsGift);
  const currentMonthGrantedPoints = useUserStore((state) => state.currentMonthGrantedPoints);
  const isMomoUnlocked = useUserStore((state) => state.isMomoUnlocked);
  const memberLevel = useUserStore((state) => state.memberLevel);
  const setPointsSummary = useUserStore((state) => state.setPointsSummary);

  const ledgerQuery = useQuery({
    queryKey: POINT_LEDGER_QUERY_KEY,
    queryFn: () => getDoppelgangerApi().getMyPointLedger(),
    enabled: hydrated && isLoggedIn && Boolean(token),
    staleTime: 20_000
  });

  useEffect(() => {
    if (!ledgerQuery.data) {
      return;
    }
    setPointsSummary({
      pointsBalance: ledgerQuery.data.balance,
      memberMonthlyPointsGift: ledgerQuery.data.memberMonthlyPointsGift,
      currentMonthGrantedPoints: ledgerQuery.data.currentMonthGrantedPoints,
      isMomoUnlocked: ledgerQuery.data.isMomoUnlocked
    });
  }, [ledgerQuery.data, setPointsSummary]);

  const summary = useMemo(
    () => ({
      balance: ensureNumber(ledgerQuery.data?.balance ?? pointsBalance),
      monthlyGift: ensureNumber(
        ledgerQuery.data?.memberMonthlyPointsGift ?? memberMonthlyPointsGift
      ),
      currentMonthGranted: ensureNumber(
        ledgerQuery.data?.currentMonthGrantedPoints ?? currentMonthGrantedPoints
      ),
      momoUnlocked: ledgerQuery.data?.isMomoUnlocked ?? isMomoUnlocked
    }),
    [
      currentMonthGrantedPoints,
      isMomoUnlocked,
      ledgerQuery.data,
      memberMonthlyPointsGift,
      pointsBalance
    ]
  );

  if (!hydrated) {
    return <main className="mx-auto min-h-[calc(100vh-6rem)] max-w-6xl bg-slate-50 px-4 py-12 sm:px-6" />;
  }

  if (!isLoggedIn) {
    return (
      <main className="mx-auto min-h-[calc(100vh-6rem)] max-w-4xl bg-slate-50 px-4 py-12 sm:px-6">
        <section className="rounded-[28px] border border-slate-100 bg-white px-6 py-12 text-center shadow-[0_18px_60px_rgb(15,23,42,0.06)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-3xl font-bold text-slate-900">分身积分账本</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
            登录后即可查看会员月赠送积分、momo 指令扣分记录，以及当前积分余额。
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/auth?redirect=/points"
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              立即登录
            </Link>
            <Link
              href="/member?returnTo=/points"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              查看会员积分方案
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-6rem)] max-w-6xl space-y-8 bg-slate-50 px-4 py-12 sm:px-6">
      <header className="rounded-[32px] border border-slate-100 bg-white px-6 py-8 shadow-[0_18px_60px_rgb(15,23,42,0.06)] sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-500">Points Ledger</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">分身积分账本</h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-500">
              这里会保留会员月赠送积分与 momo 指令扣分记录，方便你随时查看剩余额度和使用情况。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/member"
              className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:border-cyan-200 hover:bg-cyan-100"
            >
              查看积分方案
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              返回个人中心
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_14px_40px_rgb(15,23,42,0.05)]">
          <div className="flex items-center gap-3 text-cyan-600">
            <Coins className="h-5 w-5" />
            <span className="text-[11px] font-bold uppercase tracking-[0.25em]">当前积分</span>
          </div>
          <p className="mt-4 text-3xl font-black tracking-tight text-slate-900">
            {summary.balance.toFixed(2)}
          </p>
          <p className="mt-2 text-sm text-slate-500">执行 momo 指令会从这里扣减。</p>
        </article>

        <article className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_14px_40px_rgb(15,23,42,0.05)]">
          <div className="flex items-center gap-3 text-emerald-600">
            <Sparkles className="h-5 w-5" />
            <span className="text-[11px] font-bold uppercase tracking-[0.25em]">本月已到账</span>
          </div>
          <p className="mt-4 text-3xl font-black tracking-tight text-slate-900">
            {summary.currentMonthGranted.toFixed(2)}
          </p>
          <p className="mt-2 text-sm text-slate-500">会员每月积分会自动补发到账本。</p>
        </article>

        <article className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_14px_40px_rgb(15,23,42,0.05)]">
          <div className="flex items-center gap-3 text-amber-500">
            <ReceiptText className="h-5 w-5" />
            <span className="text-[11px] font-bold uppercase tracking-[0.25em]">当前档位月赠送</span>
          </div>
          <p className="mt-4 text-3xl font-black tracking-tight text-slate-900">
            {summary.monthlyGift.toFixed(2)}
          </p>
          <p className="mt-2 text-sm text-slate-500">当前会员档位：{memberLevel}</p>
        </article>

        <article className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_14px_40px_rgb(15,23,42,0.05)]">
          <div className="flex items-center gap-3 text-violet-600">
            <Lock className="h-5 w-5" />
            <span className="text-[11px] font-bold uppercase tracking-[0.25em]">momo 权限</span>
          </div>
          <p className="mt-4 text-2xl font-black tracking-tight text-slate-900">
            {summary.momoUnlocked ? "已解锁" : "未解锁"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {summary.momoUnlocked ? "已开通会员，可直接消耗积分执行指令。" : "开通会员后即可获得积分并使用 momo。"}
          </p>
        </article>
      </section>

      <section className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-[0_18px_60px_rgb(15,23,42,0.06)] sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-slate-400">Points Timeline</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">积分流水</h2>
            <p className="mt-2 text-sm text-slate-500">
              会员赠送、系统补发与 momo 指令消耗都会在这里留下记录。
            </p>
          </div>
          {ledgerQuery.isFetching ? (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
              正在同步积分流水...
            </span>
          ) : null}
        </div>

        {ledgerQuery.isLoading ? (
          <div className="mt-8 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-3xl border border-slate-100 bg-slate-50"
              />
            ))}
          </div>
        ) : ledgerQuery.isError ? (
          <div className="mt-8 rounded-3xl border border-rose-100 bg-rose-50/70 px-5 py-6 text-sm text-rose-600">
            积分流水同步失败，请稍后刷新重试。
          </div>
        ) : ledgerQuery.data?.transactions.length ? (
          <div className="mt-8 space-y-4">
            {ledgerQuery.data.transactions.map((transaction) => {
              const isIncome = transaction.direction === "income";
              return (
                <article
                  key={transaction.transactionId}
                  className="rounded-[28px] border border-slate-100 bg-slate-50/70 px-5 py-5 transition hover:border-slate-200 hover:bg-white"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getTransactionTone(
                            transaction.direction
                          )}`}
                        >
                          {isIncome ? "积分收入" : "积分支出"}
                        </span>
                        <span className="text-xs text-slate-400">{formatDateTime(transaction.createdAt)}</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{transaction.title}</h3>
                      <p className="text-sm leading-7 text-slate-500">{transaction.description}</p>
                    </div>
                    <div
                      className={`text-right text-2xl font-black tracking-tight ${
                        isIncome ? "text-emerald-600" : "text-rose-500"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {Math.abs(transaction.amount).toFixed(2)}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-[28px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center">
            <p className="text-lg font-bold text-slate-900">暂时还没有积分流水</p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
              开通会员后会自动收到每月积分赠送；使用 momo 指令后，也会在这里看到对应扣分记录。
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/member?returnTo=/points"
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                去开通会员
              </Link>
              <Link
                href="/profile"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                返回个人中心
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

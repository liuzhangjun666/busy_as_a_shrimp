"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Copy, Crown, Loader2, QrCode, XCircle } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { getDoppelgangerApi, getUserApi } from "@/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useUserStore, type MemberLevel } from "@/stores/user-store";
import type { MembershipPlan, MembershipSubscribePayload } from "@/api/user-api";

type TierFeature = {
  label: string;
  enabled: boolean;
};

type TierStyle = {
  popular?: boolean;
  badge?: string;
  buttonVariant: "free" | "popular" | "paid";
  features: TierFeature[];
  subtitle: string;
  audience: string;
};

/* 方案 code 到前端展示级别的映射 */
function planCodeToLevel(code: string): MemberLevel {
  if (code === "monthly" || code === "PRO") return "PRO";
  if (code === "yearly" || code === "YEARLY") return "YEARLY";
  if (code === "lifetime" || code === "LIFETIME") return "LIFETIME";
  return "FREE";
}

/* 后端价格格式化 */
function formatPriceAmount(price: number): string {
  if (price <= 0) return "¥0";
  return `¥${price}`;
}

function formatPriceCycle(code: string): string | null {
  if (code === "monthly") return "/ 月";
  if (code === "yearly") return "/ 年";
  return null;
}

/* 各方案的视觉风格配置 */
const TIER_STYLES: Record<string, TierStyle> = {
  free: {
    buttonVariant: "free",
    subtitle: "基础试用权限",
    audience: "适合先体验平台基础能力的轻度用户",
    features: [
      { label: "每日基础匹配 5 次", enabled: true },
      { label: "普通推荐池曝光", enabled: true },
      { label: "AI赚钱通行证", enabled: false },
      { label: "SOP模板库", enabled: false },
      { label: "优先 AI 调度通道", enabled: false },
      { label: "专属客服与极速审核", enabled: false }
    ]
  },
  monthly: {
    popular: true,
    badge: "MOST POPULAR",
    buttonVariant: "popular",
    subtitle: "高频匹配与策略加速",
    audience: "适合个人日常调度、轻量执行与持续试跑",
    features: [
      { label: "每日高级匹配 120 次", enabled: true },
      { label: "优先流量加权推荐", enabled: true },
      { label: "AI赚钱通行证", enabled: true },
      { label: "SOP模板库", enabled: true },
      { label: "AI 内容策略建议", enabled: true },
      { label: "实时佣金追踪看板", enabled: true }
    ]
  },
  yearly: {
    buttonVariant: "paid",
    subtitle: "年度特惠与深度赋能",
    audience: "适合高频使用、稳定推进项目的进阶用户",
    features: [
      { label: "全年高级匹配无限制", enabled: true },
      { label: "专属调度策略白名单", enabled: true },
      { label: "AI赚钱通行证", enabled: true },
      { label: "SOP模板库", enabled: true },
      { label: "AI 内容策略建议", enabled: true },
      { label: "年度专属勋章", enabled: true }
    ]
  },
  lifetime: {
    buttonVariant: "paid",
    subtitle: "永久权限与超维度特权",
    audience: "适合长期深度使用与多任务并行的重度用户",
    features: [
      { label: "终身高级匹配额度", enabled: true },
      { label: "专属调度策略白名单", enabled: true },
      { label: "AI赚钱通行证", enabled: true },
      { label: "SOP模板库", enabled: true },
      { label: "团队协作多账号席位", enabled: true },
      { label: "至尊勋章与专属身份", enabled: true }
    ]
  }
};

/* 默认兜底风格 */
const DEFAULT_STYLE: TierStyle = {
  buttonVariant: "paid",
  subtitle: "",
  audience: "",
  features: []
};

function buildTierFeatures(planCode: string, baseFeatures: TierFeature[], monthlyGiftPoints = 0): TierFeature[] {
  const giftedPointsFeature: TierFeature = {
    label:
      monthlyGiftPoints > 0
        ? `每月赠送 ${monthlyGiftPoints} 分身积分`
        : "momo 赛博分身（通过签到获取积分）",
    enabled: true
  };

  return [giftedPointsFeature, ...baseFeatures];
}

function getFallbackMonthlyGiftPoints(planCode: string): number {
  if (planCode === "monthly") return 180;
  if (planCode === "yearly") return 480;
  if (planCode === "lifetime") return 1200;
  return 0;
}

function getPointUsageHint(planCode: string, monthlyGiftPoints = 0): string {
  if (planCode === "free" || monthlyGiftPoints <= 0) {
    return "免费用户可通过每日签到免费获取分身积分来使用 momo 指令。";
  }
  if (planCode === "monthly") {
    return `每月 ${monthlyGiftPoints} 积分，约可执行 15 次中等强度 momo 指令。`;
  }
  if (planCode === "yearly") {
    return `每月 ${monthlyGiftPoints} 积分，约可执行 40 次中等强度 momo 指令。`;
  }
  if (planCode === "lifetime") {
    return `每月 ${monthlyGiftPoints} 积分，约可执行 100 次中等强度 momo 指令。`;
  }
  return `每月赠送 ${monthlyGiftPoints} 分身积分。`;
}

function getLevelLabel(level: MemberLevel): string {
  if (level === "PRO") return "PRO";
  if (level === "YEARLY") return "YEARLY";
  if (level === "LIFETIME") return "LIFETIME";
  return "FREE";
}

function getSourceModuleLabel(sourceModule: MembershipSubscribePayload["sourceModule"]): string {
  if (sourceModule === "ai_brief") return "AI快报";
  if (sourceModule === "solo_ai") return "AI一人公司";
  if (sourceModule === "campus") return "大学生校招";
  return "站内入口";
}

function normalizeReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  return value;
}

function normalizeMemberLevel(level: string): MemberLevel {
  if (level === "monthly" || level === "PRO") return "PRO";
  if (level === "yearly" || level === "YEARLY") return "YEARLY";
  if (level === "lifetime" || level === "LIFETIME") return "LIFETIME";
  return "FREE";
}

function buildQrImageUrl(content: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=16&data=${encodeURIComponent(content)}`;
}

function ensureNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export default function MemberPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-[calc(100vh-6rem)] max-w-5xl bg-slate-50 px-4 py-12 sm:px-6" />
      }
    >
      <MemberPageContent />
    </Suspense>
  );
}

function MemberPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberLevel = useUserStore((state) => state.memberLevel);
  const setMemberLevel = useUserStore((state) => state.setMemberLevel);
  const pointsBalance = ensureNumber(useUserStore((state) => state.pointsBalance));
  const memberMonthlyPointsGift = ensureNumber(
    useUserStore((state) => state.memberMonthlyPointsGift)
  );
  const currentMonthGrantedPoints = ensureNumber(
    useUserStore((state) => state.currentMonthGrantedPoints)
  );
  const setPointsSummary = useUserStore((state) => state.setPointsSummary);
  const [processingTier, setProcessingTier] = useState<MemberLevel | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [checkingOrder, setCheckingOrder] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<{
    outTradeNo: string;
    codeUrl: string;
    amount?: number;
    memberLevel: string;
  } | null>(null);

  const sourceContext = useMemo<MembershipSubscribePayload>(() => {
    const sourceModuleRaw = searchParams.get("sourceModule");
    const sourceActionRaw = searchParams.get("sourceAction");
    const sourceModule =
      sourceModuleRaw === "ai_brief" ||
      sourceModuleRaw === "solo_ai" ||
      sourceModuleRaw === "campus"
        ? sourceModuleRaw
        : undefined;
    const sourceAction = sourceActionRaw?.trim() ? sourceActionRaw.trim().slice(0, 64) : undefined;

    return {
      sourceModule,
      sourceAction
    };
  }, [searchParams]);

  const returnTo = useMemo(() => normalizeReturnTo(searchParams.get("returnTo")), [searchParams]);
  const callbackTradeNo = useMemo(() => searchParams.get("outTradeNo"), [searchParams]);

  async function syncPointSummaryFromLedger() {
    try {
      const ledger = await getDoppelgangerApi().getMyPointLedger();
      setPointsSummary({
        pointsBalance: ledger.balance,
        memberMonthlyPointsGift: ledger.memberMonthlyPointsGift,
        currentMonthGrantedPoints: ledger.currentMonthGrantedPoints,
        isMomoUnlocked: ledger.isMomoUnlocked
      });
    } catch {
      // Ignore transient ledger sync failures and keep current UI state.
    }
  }

  /* 挂载时从后端拉取真实方案列表 */
  useEffect(() => {
    getUserApi()
      .getMembershipPlans()
      .then((data) => setPlans(data))
      .catch((err) => {
        console.error("获取会员方案失败", err);
        /* 兜底：使用本地硬编码方案 */
        setPlans([
          { code: "free", name: "免费版", price: 0 },
          { code: "monthly", name: "月度会员", price: 0.01, monthlyGiftPoints: 180 },
          { code: "yearly", name: "年度会员", price: 0.01, monthlyGiftPoints: 480 },
          { code: "lifetime", name: "终身版", price: 0.01, monthlyGiftPoints: 1200 }
        ]);
      })
      .finally(() => setLoadingPlans(false));
  }, []);

  useEffect(() => {
    getUserApi()
      .getInfo()
      .then(async (info) => {
        setMemberLevel(normalizeMemberLevel(info.memberLevel));
        setPointsSummary({
          pointsBalance: info.pointsBalance,
          memberMonthlyPointsGift: info.memberMonthlyPointsGift,
          currentMonthGrantedPoints: info.currentMonthGrantedPoints,
          isMomoUnlocked: info.isMomoUnlocked
        });
        await syncPointSummaryFromLedger();
      })
      .catch(() => {
        // Ignore transient sync failures and keep the locally cached status.
      });
  }, [setMemberLevel, setPointsSummary]);

  useEffect(() => {
    const tradeNo = callbackTradeNo?.trim();
    if (!tradeNo) {
      return;
    }

    setCheckingOrder(true);
    getUserApi()
      .getMembershipOrderStatus(tradeNo)
      .then(async (statusResult) => {
        if (!statusResult.paid) {
          return;
        }
        const info = await getUserApi().getInfo();
        setMemberLevel(normalizeMemberLevel(info.memberLevel));
        setPointsSummary({
          pointsBalance: info.pointsBalance,
          memberMonthlyPointsGift: info.memberMonthlyPointsGift,
          currentMonthGrantedPoints: info.currentMonthGrantedPoints,
          isMomoUnlocked: info.isMomoUnlocked
        });
        await syncPointSummaryFromLedger();
        toast({
          title: "支付成功",
          description: "会员状态已更新。"
        });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "订单状态查询失败";
        toast({
          title: "订单确认中",
          description: message,
          variant: "destructive"
        });
      })
      .finally(() => setCheckingOrder(false));
  }, [callbackTradeNo, setMemberLevel, setPointsSummary]);

  useEffect(() => {
    if (!paymentDialogOpen || !pendingOrder?.outTradeNo) {
      return;
    }

    let cancelled = false;
    const runCheck = async () => {
      try {
        const statusResult = await getUserApi().getMembershipOrderStatus(pendingOrder.outTradeNo);
        if (!statusResult.paid || cancelled) {
          return;
        }

        const info = await getUserApi().getInfo();
        if (cancelled) {
          return;
        }

        setMemberLevel(normalizeMemberLevel(info.memberLevel));
        setPointsSummary({
          pointsBalance: info.pointsBalance,
          memberMonthlyPointsGift: info.memberMonthlyPointsGift,
          currentMonthGrantedPoints: info.currentMonthGrantedPoints,
          isMomoUnlocked: info.isMomoUnlocked
        });
        await syncPointSummaryFromLedger();
        setPaymentDialogOpen(false);
        setPendingOrder(null);
        toast({
          title: "支付成功",
          description: "会员状态已更新。"
        });
        if (returnTo) {
          router.replace(returnTo);
        }
      } catch {
        // Ignore transient polling failures and keep polling.
      }
    };

    void runCheck();
    const timer = window.setInterval(() => {
      void runCheck();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [paymentDialogOpen, pendingOrder, returnTo, router, setMemberLevel, setPointsSummary]);

  async function copyPaymentCode() {
    if (!pendingOrder?.codeUrl || typeof navigator === "undefined" || !navigator.clipboard) {
      toast({
        title: "复制失败",
        description: "当前环境暂不支持复制，请直接扫码支付。",
        variant: "destructive"
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(pendingOrder.codeUrl);
      toast({
        title: "已复制支付链接",
        description: "可粘贴到其他安全环境备用。"
      });
    } catch {
      toast({
        title: "复制失败",
        description: "请直接使用二维码完成支付。",
        variant: "destructive"
      });
    }
  }

  async function handleUpgrade(planCode: string, level: MemberLevel) {
    if (level === "FREE") return;
    setProcessingTier(level);

    try {
      const result = await getUserApi().subscribePlan(planCode, sourceContext);
      if (result.paymentRequired) {
        if (result.paymentMode !== "native" || !result.codeUrl || !result.outTradeNo) {
          throw new Error("扫码支付信息缺失，请稍后重试。");
        }

        setPendingOrder({
          outTradeNo: result.outTradeNo,
          codeUrl: result.codeUrl,
          amount: result.amount,
          memberLevel: result.memberLevel
        });
        setPaymentDialogOpen(true);
        toast({
          title: "请使用微信扫码支付",
          description: "支付完成后会自动刷新会员状态。"
        });
        return;
      }

      /* 使用后端返回的 memberLevel 同步到 Store */
      const newLevel = result.memberLevel;
      if (newLevel === "monthly" || newLevel === "PRO") {
        setMemberLevel("PRO");
      } else if (newLevel === "yearly" || newLevel === "YEARLY") {
        setMemberLevel("YEARLY");
      } else if (newLevel === "lifetime" || newLevel === "LIFETIME") {
        setMemberLevel("LIFETIME");
      }

      toast({
        title: "支付/升级成功",
        description: `您的账户已升级至 ${result.memberLevel}（来源：${getSourceModuleLabel(sourceContext.sourceModule)}）。`
      });
      if (returnTo) {
        router.replace(returnTo);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "您可能需要先登录或者当前网络不稳定。";
      toast({
        title: "升级失败",
        description: message,
        variant: "destructive"
      });
    } finally {
      setProcessingTier(null);
    }
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-6rem)] max-w-5xl space-y-10 bg-slate-50 px-4 py-12 sm:px-6">
      <header className="space-y-3 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          星际通行证 (Astro Pass)
        </h1>
        <p className="mt-4 text-lg font-medium text-slate-500">解锁最高维度的算力与匹配特权</p>
        <div className="mt-6 inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-600 shadow-sm">
          CURRENT PLAN: {getLevelLabel(memberLevel)}
        </div>
        <div className="mx-auto mt-4 flex max-w-xl flex-wrap items-center justify-center gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/80 px-5 py-4 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">当前积分：{pointsBalance.toFixed(2)}</span>
          <span>本月已到账：{currentMonthGrantedPoints.toFixed(2)}</span>
          <span>当前档位月赠送：{memberMonthlyPointsGift.toFixed(2)}</span>
          <Link
            href="/points"
            className="inline-flex items-center rounded-full border border-cyan-200 bg-white px-3 py-1 text-xs font-semibold text-cyan-700 transition hover:border-cyan-300 hover:bg-cyan-50"
          >
            查看积分账本
          </Link>
        </div>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-500">
          momo 赛博分身对所有完成三步曲激活的用户开放，积分可通过每日签到免费领取；会员每月额外自动补发积分额度，档位越高，可支撑的调度频率越高。
        </p>
      </header>

      {loadingPlans ? (
        <div className="flex items-center justify-center gap-3 py-20 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">正在加载方案...</span>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {plans.map((plan, index) => {
            const level = planCodeToLevel(plan.code);
            const style = TIER_STYLES[plan.code] ?? DEFAULT_STYLE;
            const isCurrent = level === memberLevel;
            const canUpgrade = level !== "FREE";
            const isProcessing = processingTier === level;
            const cycle = formatPriceCycle(plan.code);
            const amount = formatPriceAmount(plan.price);
            const resolvedMonthlyGiftPoints =
              plan.monthlyGiftPoints ?? getFallbackMonthlyGiftPoints(plan.code);
            const featureList = buildTierFeatures(
              plan.code,
              style.features,
              resolvedMonthlyGiftPoints
            );
            const pointUsageHint = getPointUsageHint(plan.code, resolvedMonthlyGiftPoints);

            const paidButtonClassName =
              style.buttonVariant === "popular"
                ? "mt-8 w-full rounded-xl bg-slate-900 py-3 font-semibold text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg"
                : "mt-8 w-full rounded-xl border border-slate-200 bg-white py-3 font-semibold text-slate-900 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-50";

            return (
              <motion.article
                key={plan.code}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: index * 0.08, ease: "easeOut" }}
                className={`relative flex flex-col rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-lg ${
                  style.popular ? "border-2 border-slate-900 ring-4 ring-slate-900/5" : ""
                }`}
              >
                {style.badge ? (
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    {style.badge}
                  </span>
                ) : null}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">{plan.name}</h2>
                    {plan.code === "lifetime" ? <Crown className="h-4 w-4 text-slate-500" /> : null}
                  </div>
                  <p className="mt-4 flex items-end gap-2">
                    <span className="text-4xl font-extrabold text-slate-900">{amount}</span>
                    {cycle ? (
                      <span className="text-lg font-medium text-slate-500">{cycle}</span>
                    ) : null}
                  </p>
                  <p className="mt-2 border-b border-slate-100 pb-6 text-sm text-slate-500">
                    {style.subtitle}
                  </p>
                  <div className="space-y-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                    <p className="font-medium text-slate-700">{style.audience}</p>
                    <p className="text-slate-500">{pointUsageHint}</p>
                  </div>
                </div>

                <ul className="mt-6 flex flex-1 flex-col gap-4">
                  {featureList.map((feature) => (
                    <li
                      key={`${plan.code}-${feature.label}`}
                      className={`flex items-center gap-2 ${
                        feature.enabled
                          ? "text-sm font-medium text-slate-700"
                          : "text-sm font-normal text-slate-400 line-through"
                      }`}
                    >
                      {feature.enabled ? (
                        <CheckCircle2 className="h-4 w-4 text-slate-900" />
                      ) : (
                        <XCircle className="h-4 w-4 text-slate-300" />
                      )}
                      <span>{feature.label}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  {canUpgrade ? (
                    <button
                      type="button"
                      disabled={isProcessing || isCurrent}
                      onClick={() => void handleUpgrade(plan.code, level)}
                      className={`inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70 ${paidButtonClassName}`}
                    >
                      {isProcessing ? (
                        <>
                          <motion.span
                            className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent"
                            animate={{ rotate: 360 }}
                            transition={{
                              repeat: Number.POSITIVE_INFINITY,
                              duration: 0.8,
                              ease: "linear"
                            }}
                          />
                          处理中...
                        </>
                      ) : isCurrent ? (
                        "当前已开通"
                      ) : (
                        "立即开通"
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="mt-8 inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-3 font-semibold text-slate-500"
                    >
                      免费使用中
                    </button>
                  )}
                </div>
              </motion.article>
            );
          })}
        </section>
      )}
      {checkingOrder ? (
        <div className="flex items-center justify-center gap-2 pb-2 text-xs text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>正在确认支付结果...</span>
        </div>
      ) : null}

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-lg rounded-[2rem] border border-slate-200 bg-white p-0 shadow-2xl">
          <DialogHeader className="border-b border-slate-100 px-6 py-5 text-left">
            <DialogTitle className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
              <QrCode className="h-5 w-5 text-slate-700" />
              微信扫码支付
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-slate-500">
              请使用微信扫描下方二维码完成支付，支付成功后页面会自动刷新会员状态。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-6">
            <div className="flex justify-center">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
                {pendingOrder?.codeUrl ? (
                  <img
                    src={buildQrImageUrl(pendingOrder.codeUrl)}
                    alt="微信支付二维码"
                    className="h-72 w-72 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-72 w-72 items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-400">
                    二维码生成中...
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-4">
                <span>订单号</span>
                <span className="font-semibold text-slate-900">{pendingOrder?.outTradeNo ?? "--"}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-4">
                <span>支付金额</span>
                <span className="font-semibold text-slate-900">
                  {pendingOrder?.amount ? `¥${pendingOrder.amount}` : "--"}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-4">
                <span>会员套餐</span>
                <span className="font-semibold text-slate-900">{pendingOrder?.memberLevel ?? "--"}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void copyPaymentCode()}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
              >
                <Copy className="h-4 w-4" />
                复制支付链接
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!pendingOrder?.outTradeNo) {
                    return;
                  }

                  setCheckingOrder(true);
                  try {
                    const statusResult = await getUserApi().getMembershipOrderStatus(
                      pendingOrder.outTradeNo
                    );
                    if (!statusResult.paid) {
                      toast({
                        title: "暂未支付成功",
                        description: "请完成扫码支付后再检查订单状态。"
                      });
                      return;
                    }

                    const info = await getUserApi().getInfo();
                    setMemberLevel(normalizeMemberLevel(info.memberLevel));
                    setPointsSummary({
                      pointsBalance: info.pointsBalance,
                      memberMonthlyPointsGift: info.memberMonthlyPointsGift,
                      currentMonthGrantedPoints: info.currentMonthGrantedPoints,
                      isMomoUnlocked: info.isMomoUnlocked
                    });
                    await syncPointSummaryFromLedger();
                    setPaymentDialogOpen(false);
                    setPendingOrder(null);
                    toast({
                      title: "支付成功",
                      description: "会员状态已更新。"
                    });
                    if (returnTo) {
                      router.replace(returnTo);
                    }
                  } catch (err: unknown) {
                    toast({
                      title: "查询失败",
                      description: err instanceof Error ? err.message : "请稍后重试",
                      variant: "destructive"
                    });
                  } finally {
                    setCheckingOrder(false);
                  }
                }}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition-all hover:bg-slate-800"
              >
                {checkingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                我已支付，检查状态
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

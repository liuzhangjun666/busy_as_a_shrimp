"use client";

import { motion } from "framer-motion";
import {
  CalendarDays,
  Copy,
  Gift,
  Medal,
  Crown,
  Sparkles,
  Trophy,
  UsersRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { getUserApi } from "@/api";
import type {
  CaptainInfo,
  CaptainInviteDetail,
  CaptainRanking,
  CaptainRewardRecord,
  CaptainStats
} from "@/api/user-api";

type RewardSummary = {
  totalRewardPoints: number;
  inviteRewardPoints: number;
  leaderboardRewardPoints: number;
  firstFiveRewardUnlocked: boolean;
  firstFiveGiftedAt: string | null;
};

const EMPTY_INFO: CaptainInfo = {
  level: "normal",
  inviteCode: "",
  inviteLink: "",
  inviteQrCodeUrl: "",
  rewardRules: {
    firstFiveTarget: 5,
    firstFiveRewardLabel: "首次 5 个有效邀请赠送 30 天会员时长",
    perValidInvitePointsAfterMilestone: 20,
    leaderboardCycleDays: 14,
    leaderboardRewardPoolPoints: 5000,
    leaderboardRewardLadder: [1200, 900, 700, 500, 400, 350, 300, 250, 220, 180],
    pointsRequireMembership: true
  },
  firstFiveProgress: {
    qualifiedInvites: 0,
    target: 5,
    remaining: 5,
    unlocked: false,
    giftedAt: null
  },
  currentPeriod: {
    periodId: 0,
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    rewardPoolPoints: 5000,
    daysRemaining: 14,
    nextSettlementAt: new Date().toISOString()
  }
};

const EMPTY_STATS: CaptainStats = {
  validInvites: 0,
  totalInvites: 0,
  currentCycleInvites: 0,
  currentCycleRank: null,
  totalRewardPoints: 0,
  firstFiveQualifiedInvites: 0,
  firstFiveTarget: 5,
  firstFiveRewardUnlocked: false
};

const EMPTY_RANKING: CaptainRanking = {
  period: {
    periodId: 0,
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    rewardPoolPoints: 5000,
    cycleDays: 14,
    daysRemaining: 14,
    nextSettlementAt: new Date().toISOString()
  },
  myRank: {
    rank: null,
    validInviteCount: 0,
    rewardPoints: null
  },
  leaderboard: []
};

const EMPTY_REWARD_SUMMARY: RewardSummary = {
  totalRewardPoints: 0,
  inviteRewardPoints: 0,
  leaderboardRewardPoints: 0,
  firstFiveRewardUnlocked: false,
  firstFiveGiftedAt: null
};

const PREVIEW_LEADERBOARD = [
  { rank: 1, name: "团长·星北", validInviteCount: 18 },
  { rank: 2, name: "团长·木木", validInviteCount: 16 },
  { rank: 3, name: "团长·阿青", validInviteCount: 14 },
  { rank: 4, name: "团长·Luna", validInviteCount: 12 },
  { rank: 5, name: "团长·阿泽", validInviteCount: 11 },
  { rank: 6, name: "团长·七七", validInviteCount: 10 },
  { rank: 7, name: "团长·小野", validInviteCount: 9 },
  { rank: 8, name: "团长·Momo", validInviteCount: 8 },
  { rank: 9, name: "团长·栗子", validInviteCount: 7 },
  { rank: 10, name: "团长·南风", validInviteCount: 6 }
];

function getRankTone(rank: number) {
  if (rank === 1) {
    return {
      card: "border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100 shadow-[0_0_0_1px_rgba(251,191,36,0.18),0_16px_36px_rgba(245,158,11,0.16)]",
      badge: "bg-amber-100 text-amber-700",
      icon: "text-amber-500"
    };
  }
  if (rank === 2) {
    return {
      card: "border-slate-300 bg-slate-100",
      badge: "bg-slate-200 text-slate-700",
      icon: "text-slate-500"
    };
  }
  if (rank === 3) {
    return {
      card: "border-orange-200 bg-orange-50",
      badge: "bg-orange-100 text-orange-700",
      icon: "text-orange-500"
    };
  }
  return {
    card: "border-slate-100 bg-slate-50",
    badge: "bg-white text-slate-900",
    icon: "text-slate-300"
  };
}

function getRemainingTimeLabel(value?: string | null): string {
  if (!value) return "--";
  const endTime = new Date(value);
  const diff = endTime.getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) {
    return "即将结算";
  }
  const totalHours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return `${days} 天 ${hours} 小时`;
}

function formatDate(value?: string | null): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("zh-CN", { hour12: false });
}

function getRewardBadgeClass(type: CaptainRewardRecord["type"]): string {
  if (type === "milestone_membership") {
    return "border border-violet-100 bg-violet-50 text-violet-600";
  }
  if (type === "leaderboard_points") {
    return "border border-amber-100 bg-amber-50 text-amber-600";
  }
  return "border border-emerald-100 bg-emerald-50 text-emerald-600";
}

function getInviteBadgeClass(detail: CaptainInviteDetail): string {
  if (!detail.isValid) {
    return "border border-rose-100 bg-rose-50 text-rose-600";
  }
  if (detail.rewardStage === "first_five_reward") {
    return "border border-violet-100 bg-violet-50 text-violet-600";
  }
  if (detail.rewardStage === "invite_points") {
    return "border border-emerald-100 bg-emerald-50 text-emerald-600";
  }
  return "border border-slate-200 bg-slate-50 text-slate-600";
}

function getInviteBadgeLabel(detail: CaptainInviteDetail): string {
  if (!detail.isValid) return "已失效";
  if (detail.rewardStage === "first_five_reward") return "月卡已发放";
  if (detail.rewardStage === "invite_points") return "积分已到账";
  return "计入进度";
}

export default function CaptainPage() {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<CaptainInfo>(EMPTY_INFO);
  const [stats, setStats] = useState<CaptainStats>(EMPTY_STATS);
  const [ranking, setRanking] = useState<CaptainRanking>(EMPTY_RANKING);
  const [rewardSummary, setRewardSummary] = useState<RewardSummary>(EMPTY_REWARD_SUMMARY);
  const [rewardRecords, setRewardRecords] = useState<CaptainRewardRecord[]>([]);
  const [inviteLogs, setInviteLogs] = useState<CaptainInviteDetail[]>([]);

  useEffect(() => {
    Promise.all([
      getUserApi()
        .getCaptainInfo()
        .catch(() => null),
      getUserApi()
        .getCaptainStats()
        .catch(() => null),
      getUserApi()
        .getCaptainRanking()
        .catch(() => null),
      getUserApi()
        .getCaptainRewards()
        .catch(() => null),
      getUserApi()
        .getCaptainInvites()
        .catch(() => null)
    ]).then(([infoData, statsData, rankingData, rewardData, inviteData]) => {
      if (infoData) setInfo(infoData);
      if (statsData) setStats(statsData);
      if (rankingData) setRanking(rankingData);
      if (rewardData) {
        setRewardSummary(rewardData.summary);
        setRewardRecords(rewardData.records ?? []);
      }
      if (inviteData) {
        setInviteLogs(inviteData);
      }
      setLoading(false);
    });
  }, []);

  const firstFivePercent = useMemo(() => {
    if (!info.firstFiveProgress.target) return 0;
    return Math.min(
      100,
      Math.round((info.firstFiveProgress.qualifiedInvites / info.firstFiveProgress.target) * 100)
    );
  }, [info.firstFiveProgress]);

  const leaderboardPreviewRows = useMemo(() => {
    if (ranking.leaderboard.length > 0) {
      return ranking.leaderboard;
    }

    return PREVIEW_LEADERBOARD.map((item, index) => ({
      rank: item.rank,
      captainId: -(index + 1),
      name: item.name,
      level: "normal",
      validInviteCount: item.validInviteCount,
      rewardPoints: info.rewardRules.leaderboardRewardLadder[index] ?? 0,
      isCurrentUser: false
    }));
  }, [info.rewardRules.leaderboardRewardLadder, ranking.leaderboard]);

  const myRankHint = useMemo(() => {
    const myRank = ranking.myRank.rank;
    if (!myRank || myRank <= 1) {
      return null;
    }
    const currentRow = leaderboardPreviewRows.find((item) => item.rank === myRank);
    const previousRow = leaderboardPreviewRows.find((item) => item.rank === myRank - 1);
    if (!currentRow || !previousRow) {
      return null;
    }
    const gap = Math.max(0, previousRow.validInviteCount - currentRow.validInviteCount);
    if (gap <= 0) {
      return "你和上一名当前并列，继续新增 1 个有效邀请即可反超。";
    }
    return `距离上一名还差 ${gap} 个有效邀请，继续冲榜就能再往前一位。`;
  }, [leaderboardPreviewRows, ranking.myRank.rank]);

  async function handleCopyInviteLink() {
    try {
      await navigator.clipboard.writeText(info.inviteLink);
      setCopied(true);
      toast({
        title: "复制成功",
        description: "邀请链接已写入剪贴板。"
      });
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({
        variant: "destructive",
        title: "复制失败",
        description: "浏览器未授予剪贴板权限。"
      });
    }
  }

  if (loading) {
    return <div className="p-10 text-center font-mono text-slate-400">Loading Captain Rewards...</div>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 bg-slate-50 py-10">
      <header className="space-y-2">
        <p className="mb-6 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
          CAPTAIN CENTER
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          星际团长中枢 (Captain Nexus)
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-500">
          邀请奖励已切换为「月度会员时长 + 分身积分」机制。首次达成 5 个有效邀请赠送 30
          天会员时长，第 6 个有效邀请起每个奖励 {info.rewardRules.perValidInvitePointsAfterMilestone}
          分，双周榜前 10 名按梯度瓜分 {info.rewardRules.leaderboardRewardPoolPoints} 分。
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <motion.article
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="text-4xl font-extrabold text-slate-900">{rewardSummary.totalRewardPoints}</p>
          <p className="mt-2 text-sm font-medium text-slate-400">累计获得分身积分</p>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08, ease: "easeOut" }}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <UsersRound className="h-4 w-4" />
          </div>
          <p className="text-4xl font-extrabold text-slate-900">{stats.validInvites}</p>
          <p className="mt-2 text-sm font-medium text-slate-400">有效邀请总数</p>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.16, ease: "easeOut" }}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-500">
            <Trophy className="h-4 w-4" />
          </div>
          <p className="text-4xl font-extrabold text-slate-900">
            {ranking.myRank.rank ? `#${ranking.myRank.rank}` : "--"}
          </p>
          <p className="mt-2 text-sm font-medium text-slate-400">当前双周榜排名</p>
        </motion.article>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.2, ease: "easeOut" }}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Invite Engine
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">邀请链接与奖励规则</h2>
            </div>
            <button
              type="button"
              onClick={() => void handleCopyInviteLink()}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-800"
            >
              <Copy className="h-4 w-4" />
              {copied ? "已复制" : "复制链接"}
            </button>
          </div>

          <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-4">
            <p className="select-all font-mono text-sm text-slate-700">{info.inviteLink || "---"}</p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                首 5 邀奖励
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {info.rewardRules.firstFiveRewardLabel}
              </p>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                奖励到账后会直接补到你的通行证权益里，并自动为当月补发会员月度积分。
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                后续有效邀请
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                每个 +{info.rewardRules.perValidInvitePointsAfterMilestone} 分身积分
              </p>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                分身积分仅能在 momo 指令里消耗使用，未开会员时积分会保留但无法调用 momo。
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.28, ease: "easeOut" }}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900">当前周期前 10 排行榜</h2>
            </div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-amber-600">
              剩余 {getRemainingTimeLabel(ranking.period.nextSettlementAt)}
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              我的本期排名：{ranking.myRank.rank ? `第 ${ranking.myRank.rank} 名` : "暂未上榜"}
            </p>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              当前周期有效邀请 {ranking.myRank.validInviteCount} 个
              {ranking.myRank.rewardPoints
                  ? `，按当前名次预计结算 ${ranking.myRank.rewardPoints} 分。`
                  : "，继续邀请可冲击前 10 榜单奖励。"}
            </p>
            {myRankHint ? <p className="mt-1 text-xs leading-6 text-blue-600">{myRankHint}</p> : null}
          </div>

          <div className="mt-4 space-y-2">
            {ranking.leaderboard.length === 0 ? (
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-cyan-700">
                当前周期暂时还没有真实上榜数据，下面先展示一组模拟前 10 名预览，方便你看最终的榜单展示效果。
              </div>
            ) : null}
            {leaderboardPreviewRows.map((item) => (
              <div
                key={`${item.rank}-${item.captainId}`}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                  item.isCurrentUser ? "border-blue-200 bg-blue-50" : getRankTone(item.rank).card
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shadow-sm ${
                      item.isCurrentUser ? "bg-blue-100 text-blue-700" : getRankTone(item.rank).badge
                    }`}
                  >
                    {item.rank}
                  </span>
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      {item.rank <= 3 ? (
                        item.rank === 1 ? (
                          <Crown className={`h-4 w-4 ${getRankTone(item.rank).icon}`} />
                        ) : (
                          <Medal className={`h-4 w-4 ${getRankTone(item.rank).icon}`} />
                        )
                      ) : null}
                      {item.name}
                      {item.isCurrentUser ? (
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-blue-700">
                          你
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500">{item.validInviteCount} 个有效邀请</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{item.rewardPoints} 分</p>
                  <p className="text-xs text-slate-500">
                    {ranking.leaderboard.length === 0 ? "模拟展示" : "结算奖励"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-semibold text-slate-900">本期榜单说明</p>
            </div>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              当前周期：{formatDate(ranking.period.startTime)} - {formatDate(ranking.period.endTime)}
            </p>
            <p className="mt-1 text-xs leading-6 text-slate-500">
              距离结算还有 {ranking.period.daysRemaining} 天，前 10 名将按梯度瓜分{" "}
              {ranking.period.rewardPoolPoints} 分身积分。
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-3">
              {info.rewardRules.leaderboardRewardLadder.map((points, index) => (
                <div
                  key={`ladder-${index + 1}`}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <p className="font-semibold text-slate-900">第 {index + 1} 名</p>
                  <p className="mt-1">{points} 分</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-3">
          <div className="mt-4 flex items-center gap-2">
            <Gift className="h-4 w-4 text-violet-500" />
            <h2 className="text-lg font-bold text-slate-900">首 5 邀进度</h2>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">
                  {info.firstFiveProgress.qualifiedInvites}/{info.firstFiveProgress.target}
                </p>
                <span className="text-xs text-slate-500">
                  {info.firstFiveProgress.unlocked
                    ? "月度会员时长已到账"
                    : `还差 ${info.firstFiveProgress.remaining} 个有效邀请`}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600"
                  style={{ width: `${firstFivePercent}%` }}
                />
              </div>
              <p className="mt-3 text-xs leading-6 text-slate-500">
                {info.firstFiveProgress.unlocked
                  ? `奖励发放时间：${formatDate(info.firstFiveProgress.giftedAt)}`
                  : "先完成首 5 个有效邀请，拿到 30 天会员时长，再开始稳定解锁并使用 momo。"}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="mt-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <h2 className="text-lg font-bold text-slate-900">邀请奖励流水</h2>
          </div>

          <div className="space-y-2">
            {rewardRecords.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
                还没有奖励发放记录。达成首 5 邀或拿到有效邀请积分后，这里会记录每一笔奖励到账。
              </div>
            ) : (
              rewardRecords.map((record, index) => (
                <motion.div
                  key={record.rewardId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: index * 0.05, ease: "easeOut" }}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{record.title}</p>
                      <p className="text-xs leading-6 text-slate-500">{record.description}</p>
                      <p className="text-xs text-slate-400">{formatDate(record.createdAt)}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold tracking-wider ${getRewardBadgeClass(record.type)}`}
                      >
                        {record.type === "milestone_membership"
                          ? "月卡奖励"
                          : record.type === "leaderboard_points"
                            ? "榜单积分"
                            : "邀请积分"}
                      </span>
                      <span className="font-mono text-sm font-semibold text-slate-900">
                        {record.valueText}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>
      </section>

      <section className="space-y-3">
        <div className="mt-10 mb-4 flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-cyan-600" />
          <h2 className="text-lg font-bold text-slate-900">邀请进度明细</h2>
        </div>

        <div className="space-y-2">
          {inviteLogs.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
              暂无邀请记录，复制上方邀请链接给新用户注册后，这里会显示每一次邀请是否有效，以及它对应的是首
              5 邀进度、月卡奖励还是后续积分奖励。
            </div>
          ) : (
            inviteLogs.map((log, index) => (
              <motion.div
                key={log.inviteRecordId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: index * 0.04, ease: "easeOut" }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-mono text-sm text-slate-900">{log.inviteeLabel}</p>
                    <p className="text-xs text-slate-500">
                      邀请时间：{formatDate(log.invitedAt)} · 邀请码：{log.inviteCode}
                    </p>
                    <p className="text-xs leading-6 text-slate-500">{log.rewardStatusText}</p>
                  </div>

                  <span
                    className={`inline-flex w-max rounded-lg px-2.5 py-1 text-xs font-semibold tracking-wider ${getInviteBadgeClass(log)}`}
                  >
                    {getInviteBadgeLabel(log)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      有效序号
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {log.validInviteSequence ? `第 ${log.validInviteSequence} 个` : "--"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">只统计通过风控的有效邀请</p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      对应奖励
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {log.unlockedMembershipByThisInvite
                        ? "30 天会员时长"
                        : log.rewardPoints
                          ? `${log.rewardPoints} 分身积分`
                          : "计入进度"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {log.unlockedMembershipByThisInvite
                        ? "该邀请触发了首 5 邀赠礼"
                        : log.rewardPoints
                          ? "已发到你的分身积分账本"
                          : "达到第 5 邀后会自动升级为月卡奖励"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      榜单贡献
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {log.isValid ? "+1 有效邀请" : "不计入"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      当前双周榜只按有效邀请数量排序，不再计算现金佣金。
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

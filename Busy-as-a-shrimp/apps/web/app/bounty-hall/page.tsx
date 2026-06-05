"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Coins, Handshake, Loader2, Sparkles, Target } from "lucide-react";
import { getBountyHallApi, getDoppelgangerApi } from "@/api";
import type {
  BountyClaimedTaskCard,
  BountyDifficulty,
  BountySubmissionSummary,
  BountyTaskCard
} from "@/api/bounty-hall-api";
import { getErrorMessage } from "@/utils/error-message";
import { useAuthStatus } from "@/stores/use-auth-status";

const DIFFICULTY_LABELS: Record<BountyDifficulty, string> = {
  EASY: "简单",
  MEDIUM: "标准",
  HARD: "高强度",
  EXPERT: "专家级"
};

const MEMBER_LEVEL_LABELS: Record<string, string> = {
  free: "免费版",
  monthly: "月度会员",
  yearly: "年度会员",
  lifetime: "终身版"
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getSubmissionStage(submission: BountySubmissionSummary) {
  if (submission.status === "APPROVED") {
    return "已完成，积分已发放";
  }
  if (submission.status === "REJECTED") {
    return "合作已终止";
  }
  if (submission.contactUnlockedAt) {
    return "已互相确认，联系方式已解锁";
  }
  if (submission.publisherAgreedAt && !submission.claimerAgreedAt) {
    return "发布方已同意，等待接单方确认";
  }
  if (!submission.publisherAgreedAt) {
    return "已领取，等待发布方选择";
  }
  return "等待双方确认";
}

function getUserInitial(label: string) {
  return (label || "用").trim().charAt(0).toUpperCase();
}

function renderProfileSnapshot(user: BountySubmissionSummary["claimer"]) {
  const location = [user.city, user.district].filter(Boolean).join(" · ");
  const memberLabel = MEMBER_LEVEL_LABELS[user.memberLevel] ?? "免费版";
  const resourceTags = user.resourceHighlights.slice(0, 4);
  const skillTags = user.skillHighlights.slice(0, 4);

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-4">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.label}
            className="h-14 w-14 rounded-2xl border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg font-bold text-slate-700">
            {getUserInitial(user.label)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-slate-900">{user.label}</div>
            <StatusPill tone={user.realNameVerified ? "emerald" : "slate"}>
              {user.realNameVerified ? "已实名" : "未实名"}
            </StatusPill>
            <StatusPill tone="sky">{memberLabel}</StatusPill>
          </div>
          <div className="mt-2 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
            <div>地区：{location || "未填写"}</div>
            <div>历史接单：{user.taskAcceptCount} 次</div>
            <div>已发布资源：{user.resourceCount} 个</div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                可提供资源
              </div>
              <div className="flex flex-wrap gap-2">
                {resourceTags.length > 0 ? (
                  resourceTags.map((tag) => (
                    <span
                      key={`resource-${user.userId}-${tag}`}
                      className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs text-sky-700"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">暂未公开可提供资源</span>
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                核心技能
              </div>
              <div className="flex flex-wrap gap-2">
                {skillTags.length > 0 ? (
                  skillTags.map((tag) => (
                    <span
                      key={`skill-${user.userId}-${tag}`}
                      className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs text-emerald-700"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">暂未公开核心技能</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "emerald" | "amber" | "rose" | "sky" }) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "rose"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : tone === "sky"
            ? "border-sky-200 bg-sky-50 text-sky-700"
            : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}

function SectionCard({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
        {description ? <p className="text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function BountyHallPage() {
  const queryClient = useQueryClient();
  const { hydrated, isLoggedIn } = useAuthStatus();
  const [form, setForm] = useState({
    title: "",
    content: "",
    points: "20",
    difficulty: "MEDIUM" as BountyDifficulty
  });
  const [proofDrafts, setProofDrafts] = useState<Record<number, string>>({});

  const openTasksQuery = useQuery({
    queryKey: ["bounty-hall", "open-tasks"],
    queryFn: () => getBountyHallApi().listOpenTasks(),
    staleTime: 30 * 1000,
    enabled: hydrated && isLoggedIn
  });
  const publishedTasksQuery = useQuery({
    queryKey: ["bounty-hall", "my-published"],
    queryFn: () => getBountyHallApi().listMyPublishedTasks(),
    staleTime: 30 * 1000,
    enabled: hydrated && isLoggedIn
  });
  const claimedTasksQuery = useQuery({
    queryKey: ["bounty-hall", "my-claimed"],
    queryFn: () => getBountyHallApi().listMyClaimedTasks(),
    staleTime: 30 * 1000,
    enabled: hydrated && isLoggedIn
  });
  const ledgerQuery = useQuery({
    queryKey: ["doppelganger", "ledger"],
    queryFn: () => getDoppelgangerApi().getMyPointLedger(),
    staleTime: 30 * 1000,
    enabled: hydrated && isLoggedIn
  });

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["bounty-hall"] }),
      queryClient.invalidateQueries({ queryKey: ["doppelganger", "ledger"] })
    ]);
  };

  const publishMutation = useMutation({
    mutationFn: () =>
      getBountyHallApi().publishTask({
        title: form.title,
        content: form.content,
        points: Number(form.points),
        difficulty: form.difficulty
      }),
    onSuccess: async () => {
      setForm({
        title: "",
        content: "",
        points: "20",
        difficulty: "MEDIUM"
      });
      await refreshAll();
    }
  });

  const simpleActionMutation = useMutation({
    mutationFn: async (payload: { action: () => Promise<unknown> }) => payload.action(),
    onSuccess: async () => {
      await refreshAll();
    }
  });

  const submitProofMutation = useMutation({
    mutationFn: async (payload: { submissionId: number; proof: string }) =>
      getBountyHallApi().submitProof(payload.submissionId, payload.proof),
    onSuccess: async (_, variables) => {
      setProofDrafts((prev) => ({ ...prev, [variables.submissionId]: "" }));
      await refreshAll();
    }
  });

  const openTasks = openTasksQuery.data ?? [];
  const publishedTasks = publishedTasksQuery.data ?? [];
  const claimedTasks = claimedTasksQuery.data ?? [];
  const currentPoints = ledgerQuery.data?.balance ?? 0;

  const summary = useMemo(
    () => ({
      openCount: openTasks.length,
      publishedCount: publishedTasks.length,
      claimedCount: claimedTasks.length
    }),
    [claimedTasks.length, openTasks.length, publishedTasks.length]
  );

  const isBusy =
    publishMutation.isPending || simpleActionMutation.isPending || submitProofMutation.isPending;

  const renderOpenTask = (task: BountyTaskCard) => {
    const mySubmission = task.mySubmission;

    return (
      <article key={task.taskId} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">{task.title}</h3>
              <StatusPill tone="sky">{DIFFICULTY_LABELS[task.difficulty]}</StatusPill>
              <StatusPill tone="amber">{task.points} 分身积分</StatusPill>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">{task.content}</p>
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>发布方：{task.publisher.label}</div>
            <div className="mt-1">发布时间：{formatDateTime(task.createdAt)}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            这是手动寻找合作方的悬赏任务，不走系统自动匹配。领取后需要双方确认，才会解锁联系方式。
          </p>
          {mySubmission ? (
            <StatusPill tone="sky">{getSubmissionStage(mySubmission)}</StatusPill>
          ) : (
            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                simpleActionMutation.mutate({
                  action: () => getBountyHallApi().claimTask(task.taskId)
                })
              }
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              领取悬赏
            </button>
          )}
        </div>
      </article>
    );
  };

  const renderPublisherSubmission = (task: BountyTaskCard, submission: BountySubmissionSummary) => {
    const unlocked = Boolean(task.unlockedContact?.claimer && submission.submissionId === task.selectedSubmissionId);

    return (
      <div key={submission.submissionId} className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">{submission.claimer.label}</div>
            <div className="mt-1 text-xs text-slate-400">领取时间：{formatDateTime(submission.createdAt)}</div>
          </div>
          <StatusPill
            tone={
              submission.status === "APPROVED"
                ? "emerald"
                : submission.status === "REJECTED"
                  ? "rose"
                  : submission.contactUnlockedAt
                    ? "sky"
                    : submission.publisherAgreedAt
                      ? "amber"
                      : "slate"
            }
          >
            {getSubmissionStage(submission)}
          </StatusPill>
        </div>

        {renderProfileSnapshot(submission.claimer)}

        {submission.proof ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
            <div className="mb-1 font-medium text-slate-800">任务进度 / 交付说明</div>
            {submission.proof}
          </div>
        ) : null}

        {unlocked ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            已解锁接单方联系方式：{task.unlockedContact?.claimer?.nickname || "未设置昵称"} ·{" "}
            {task.unlockedContact?.claimer?.maskedPhone || "未留联系方式"}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          {submission.status === "PENDING" && !submission.publisherAgreedAt ? (
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={() =>
                  simpleActionMutation.mutate({
                    action: () => getBountyHallApi().publisherAgree(submission.submissionId)
                  })
                }
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                同意对接
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() =>
                  simpleActionMutation.mutate({
                    action: () => getBountyHallApi().rejectSubmission(submission.submissionId)
                  })
                }
                className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
              >
                拒绝
              </button>
            </>
          ) : null}

          {submission.status === "PENDING" && submission.contactUnlockedAt ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                simpleActionMutation.mutate({
                  action: () => getBountyHallApi().completeSubmission(submission.submissionId)
                })
              }
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
            >
              确认完成并发放 {task.points} 积分
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  const renderClaimedTask = (task: BountyClaimedTaskCard) => {
    const submission = task.submission;
    const proofDraft = proofDrafts[submission.submissionId] ?? submission.proof ?? "";

    return (
      <article key={submission.submissionId} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">{task.title}</h3>
              <StatusPill tone="amber">{task.points} 分身积分</StatusPill>
              <StatusPill tone="sky">{DIFFICULTY_LABELS[task.difficulty]}</StatusPill>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">{task.content}</p>
            <p className="text-xs text-slate-400">发布方：{task.publisher.label}</p>
          </div>
          <StatusPill
            tone={
              submission.status === "APPROVED"
                ? "emerald"
                : submission.status === "REJECTED"
                  ? "rose"
                  : submission.contactUnlockedAt
                    ? "sky"
                    : submission.publisherAgreedAt
                      ? "amber"
                      : "slate"
            }
          >
            {getSubmissionStage(submission)}
          </StatusPill>
        </div>

        {task.unlockedContact?.publisher ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            已解锁发布方联系方式：{task.unlockedContact.publisher.nickname || "未设置昵称"} ·{" "}
            {task.unlockedContact.publisher.maskedPhone || "未留联系方式"}
          </div>
        ) : null}

        {submission.status === "PENDING" && submission.publisherAgreedAt && !submission.claimerAgreedAt ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                simpleActionMutation.mutate({
                  action: () => getBountyHallApi().claimerAgree(submission.submissionId)
                })
              }
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              我同意合作并解锁联系方式
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                simpleActionMutation.mutate({
                  action: () => getBountyHallApi().rejectSubmission(submission.submissionId)
                })
              }
              className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
            >
              放弃该悬赏
            </button>
          </div>
        ) : null}

        {submission.status === "PENDING" && submission.contactUnlockedAt ? (
          <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-900">任务进度 / 交付说明</div>
            <textarea
              value={proofDraft}
              onChange={(event) =>
                setProofDrafts((prev) => ({
                  ...prev,
                  [submission.submissionId]: event.target.value
                }))
              }
              rows={4}
              placeholder="填写你已完成的内容、交付链接、素材说明或进度汇报。"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
            />
            <button
              type="button"
              disabled={isBusy || !proofDraft.trim()}
              onClick={() =>
                submitProofMutation.mutate({
                  submissionId: submission.submissionId,
                  proof: proofDraft
                })
              }
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
            >
              提交任务进度
            </button>
          </div>
        ) : null}
      </article>
    );
  };

  const anyError =
    openTasksQuery.error || publishedTasksQuery.error || claimedTasksQuery.error || ledgerQuery.error;

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 rounded-[1.75rem] border border-slate-200 bg-white px-6 py-5 text-sm text-slate-500 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在恢复登录态并加载悬赏大厅...
        </div>
      </main>
    );
  }

  return (
    <motion.main
      className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <section className="overflow-hidden rounded-[2.25rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_45%,#eef8ff_100%)] p-8 shadow-sm">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.95fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-semibold tracking-[0.24em] text-sky-700">
              <Target className="h-3.5 w-3.5" />
              BOUNTY HALL
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-black tracking-tight text-slate-900">悬赏大厅</h1>
              <p className="max-w-3xl text-base leading-8 text-slate-600">
                这里不是系统自动匹配，而是你自己手动发布悬赏、自己挑人、自己接单。双方都同意后才解锁对接信息，任务完成由发布方确认，接单方再获得分身积分。
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <div className="text-sm font-medium text-slate-500">可领取悬赏</div>
                <div className="mt-2 text-3xl font-black text-slate-900">{summary.openCount}</div>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <div className="text-sm font-medium text-slate-500">我的发布</div>
                <div className="mt-2 text-3xl font-black text-slate-900">{summary.publishedCount}</div>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <div className="text-sm font-medium text-slate-500">我的分身积分</div>
                <div className="mt-2 text-3xl font-black text-slate-900">{currentPoints.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              <Sparkles className="h-4 w-4 text-amber-500" />
              核心规则
            </div>
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
              <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                <Handshake className="mt-1 h-4 w-4 shrink-0 text-sky-600" />
                <div>发布方先选人，接单方再确认。只有双方都确认后，才会解锁脱敏联系方式。</div>
              </div>
              <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                <Coins className="mt-1 h-4 w-4 shrink-0 text-amber-500" />
                <div>任务完成后，由发布方点击“确认完成并发放积分”，接单方即可获得悬赏积分。</div>
              </div>
              <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                <div>当前分身积分来源：新手激活赠送、每月会员赠送、邀请奖励、完成悬赏任务。积分仅可在 momo 中消耗。</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {anyError ? (
        <section className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4" />
            悬赏大厅加载失败
          </div>
          <div className="mt-2">{getErrorMessage(anyError)}</div>
        </section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.05fr_1.4fr]">
        <SectionCard title="发布悬赏" description="自己手动发起任务，等待合适的人来领取。">
          <div className="space-y-4">
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="例如：需要 2 位短视频剪辑师在 3 天内完成 10 条成片"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
            />
            <textarea
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
              rows={6}
              placeholder="把任务背景、交付标准、时间要求、你希望对方具备的资源写清楚。"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-500">
                <span>奖励积分</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.points}
                  onChange={(event) => setForm((prev) => ({ ...prev, points: event.target.value }))}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-500">
                <span>任务难度</span>
                <select
                  value={form.difficulty}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      difficulty: event.target.value as BountyDifficulty
                    }))
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="EASY">简单</option>
                  <option value="MEDIUM">标准</option>
                  <option value="HARD">高强度</option>
                  <option value="EXPERT">专家级</option>
                </select>
              </label>
            </div>
            <button
              type="button"
              disabled={publishMutation.isPending || !form.title.trim() || !form.content.trim() || !Number(form.points)}
              onClick={() => publishMutation.mutate()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {publishMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              发布悬赏任务
            </button>
          </div>
        </SectionCard>

        <SectionCard title="可领取悬赏" description="手动寻找适合自己的任务，先领取，再等待发布方选择。">
          <div className="space-y-4">
            {openTasksQuery.isPending ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在载入悬赏列表...
              </div>
            ) : openTasks.length > 0 ? (
              openTasks.map(renderOpenTask)
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
                当前还没有公开悬赏，你可以先发布第一条。
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <SectionCard title="我的发布" description="你发布的悬赏，会在这里看到领取情况、确认进度和发分入口。">
          <div className="space-y-5">
            {publishedTasksQuery.isPending ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在载入我的发布...
              </div>
            ) : publishedTasks.length > 0 ? (
              publishedTasks.map((task) => (
                <article key={task.taskId} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">{task.title}</h3>
                        <StatusPill tone="amber">{task.points} 积分</StatusPill>
                        <StatusPill tone={task.status === "FINISHED" ? "emerald" : task.status === "CANCELLED" ? "rose" : "sky"}>
                          {task.status === "FINISHED" ? "已完成" : task.status === "CANCELLED" ? "已取消" : "进行中"}
                        </StatusPill>
                      </div>
                      <p className="text-sm leading-7 text-slate-600">{task.content}</p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <div>发布时间：{formatDateTime(task.createdAt)}</div>
                      <div className="mt-1">已有 {task.claimCount} 人领取</div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {task.submissions.length > 0 ? (
                      task.submissions.map((submission) => renderPublisherSubmission(task, submission))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                        暂时还没有人领取这个悬赏任务。
                      </div>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
                你还没有发布过悬赏，左侧发布后这里会开始显示领取和确认进度。
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="我的领取" description="你领取的悬赏在这里推进。发布方同意后，你再确认合作，才能解锁联系方式。">
          <div className="space-y-5">
            {claimedTasksQuery.isPending ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在载入我的领取...
              </div>
            ) : claimedTasks.length > 0 ? (
              claimedTasks.map(renderClaimedTask)
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-500">
                你还没有领取任何悬赏任务。
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </motion.main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAdminApi } from "../../../src/api";
import type {
  BrushOrderPenalty,
  BrushOrderPenaltyStatus,
  ReviewBrushOrderPenaltyDto
} from "../../../src/api/admin-api";
import { EmptyState } from "../../../src/components/empty-state";
import { getErrorMessage } from "../../../src/utils/error-message";
import styles from "../../page.module.css";

const PENALTY_LIST_QUERY_KEY = ["admin", "risk", "brush-order-penalties"] as const;

const STATUS_LABEL: Record<BrushOrderPenaltyStatus, string> = {
  applied: "待复核",
  confirmed: "已确认处罚",
  rolled_back: "已回滚"
};

const STATUS_FILTER_TABS: Array<{ key: "all" | BrushOrderPenaltyStatus; label: string }> = [
  { key: "all", label: "全部" },
  { key: "applied", label: "待复核" },
  { key: "confirmed", label: "已确认处罚" },
  { key: "rolled_back", label: "已回滚" }
];

const STATUS_BADGE_CLASS: Record<BrushOrderPenaltyStatus, string> = {
  applied: styles.pending,
  confirmed: styles.active,
  rolled_back: styles.inactive
};

const LEVEL_LABEL: Record<"normal" | "advanced" | "gold", string> = {
  normal: "普通",
  advanced: "高级",
  gold: "金牌"
};

function formatDate(value?: string): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("zh-CN", { hour12: false });
}

function parsePositiveInt(raw: string): number | undefined {
  const normalized = raw.trim();
  if (!normalized) {
    return undefined;
  }
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

function readReviewMeta(item: BrushOrderPenalty): string {
  const chunks: string[] = [];
  if (item.reviewedBy) {
    chunks.push(`复核人 #${item.reviewedBy}`);
  }
  if (item.reviewedAt) {
    chunks.push(`复核时间 ${formatDate(item.reviewedAt)}`);
  }
  if (item.reviewNote) {
    chunks.push(`备注: ${item.reviewNote}`);
  }
  return chunks.length > 0 ? chunks.join(" | ") : "-";
}

export default function BrushOrderPenaltiesPage() {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<"all" | BrushOrderPenaltyStatus>("all");
  const [userInput, setUserInput] = useState("");
  const [appliedUserInput, setAppliedUserInput] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [notice, setNotice] = useState<string | null>(null);

  const parsedUserId = useMemo(() => parsePositiveInt(appliedUserInput), [appliedUserInput]);
  const hasInvalidUserInput = Boolean(appliedUserInput.trim()) && !parsedUserId;

  const penaltiesQuery = useQuery({
    queryKey: [...PENALTY_LIST_QUERY_KEY, statusFilter, parsedUserId ?? "all", page, pageSize],
    queryFn: async () => {
      return getAdminApi().brushOrderPenalties({
        status: statusFilter === "all" ? undefined : statusFilter,
        userId: parsedUserId,
        page,
        pageSize
      });
    },
    staleTime: 20_000
  });

  const reviewMutation = useMutation({
    mutationFn: async (payload: {
      penaltyId: number;
      review: ReviewBrushOrderPenaltyDto;
    }): Promise<BrushOrderPenalty> => {
      return getAdminApi().reviewBrushOrderPenalty(payload.penaltyId, payload.review);
    },
    onSuccess: (result) => {
      setNotice(
        `处罚单 #${result.penaltyId} 已更新为「${STATUS_LABEL[result.status] ?? result.status}」。`
      );
      void queryClient.invalidateQueries({ queryKey: PENALTY_LIST_QUERY_KEY });
    },
    onError: (error) => {
      setNotice(`操作失败：${getErrorMessage(error)}`);
    }
  });

  const result = penaltiesQuery.data;
  const penalties = result?.list ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [statusFilter, appliedUserInput]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function applyUserFilter() {
    setAppliedUserInput(userInput.trim());
  }

  function clearUserFilter() {
    setUserInput("");
    setAppliedUserInput("");
  }

  function submitReview(penalty: BrushOrderPenalty, decision: "confirm" | "rollback") {
    if (decision === "rollback") {
      const confirmed = window.confirm(`确认回滚处罚单 #${penalty.penaltyId} 吗？`);
      if (!confirmed) {
        return;
      }
    }

    const note = window.prompt("请输入复核备注（可选）", "") ?? "";
    reviewMutation.mutate({
      penaltyId: penalty.penaltyId,
      review: {
        decision,
        note: note.trim() || undefined
      }
    });
  }

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>风控处罚复核</h1>
          <p className={styles.subtitle}>管理刷单处罚单，支持确认处罚与回滚复核。</p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "12px"
        }}
      >
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {STATUS_FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              style={{
                height: "36px",
                padding: "0 14px",
                borderRadius: "8px",
                border:
                  statusFilter === tab.key
                    ? "1px solid rgba(99,102,241,0.6)"
                    : "1px solid rgba(255,255,255,0.1)",
                background:
                  statusFilter === tab.key ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                color: statusFilter === tab.key ? "#a5b4fc" : "#94a3b8",
                fontSize: "13px",
                cursor: "pointer",
                fontFamily: "inherit"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          value={userInput}
          onChange={(event) => setUserInput(event.target.value)}
          placeholder="按用户ID筛选（可选）"
          style={{
            height: "36px",
            width: "180px",
            padding: "0 12px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)",
            color: "#e2e8f0",
            fontSize: "13px"
          }}
        />
        <button
          type="button"
          onClick={applyUserFilter}
          style={{
            height: "36px",
            padding: "0 14px",
            borderRadius: "8px",
            border: "1px solid rgba(91,140,255,0.35)",
            background: "rgba(91,140,255,0.12)",
            color: "#c4d6ff",
            fontSize: "13px",
            cursor: "pointer",
            fontFamily: "inherit"
          }}
        >
          应用筛选
        </button>
        <button
          type="button"
          onClick={clearUserFilter}
          style={{
            height: "36px",
            padding: "0 14px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)",
            color: "#94a3b8",
            fontSize: "13px",
            cursor: "pointer",
            fontFamily: "inherit"
          }}
        >
          清空
        </button>
        <span style={{ color: "#64748b", fontSize: "12px" }}>
          共 {total} 条{parsedUserId ? `（用户 #${parsedUserId}）` : ""}
        </span>
      </div>

      {hasInvalidUserInput ? <p className={styles.error}>用户ID筛选无效：请输入正整数。</p> : null}

      {notice ? (
        <p
          style={{
            marginBottom: "12px",
            padding: "10px 14px",
            borderRadius: "10px",
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.2)",
            color: "#a5b4fc",
            fontSize: "13px"
          }}
        >
          {notice}
        </p>
      ) : null}

      {penaltiesQuery.isLoading ? <p className={styles.loading}>正在加载处罚单...</p> : null}
      {penaltiesQuery.isError ? (
        <p className={styles.error}>加载失败：{getErrorMessage(penaltiesQuery.error)}</p>
      ) : null}

      {!penaltiesQuery.isLoading && !penaltiesQuery.isError && penalties.length === 0 ? (
        <EmptyState title="暂无处罚单" text="当前筛选条件下没有可复核的处罚单。" />
      ) : null}

      {!penaltiesQuery.isLoading && !penaltiesQuery.isError && penalties.length > 0 ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>处罚单列表</h2>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>处罚ID</th>
                  <th>用户ID</th>
                  <th>邀请记录</th>
                  <th>处罚前等级</th>
                  <th>触发原因</th>
                  <th>影响佣金数</th>
                  <th>状态</th>
                  <th>处罚时间</th>
                  <th>复核信息</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {penalties.map((item) => (
                  <tr key={item.penaltyId}>
                    <td>#{item.penaltyId}</td>
                    <td>#{item.userId}</td>
                    <td>#{item.inviteRecordId}</td>
                    <td>{LEVEL_LABEL[item.beforeCaptainLevel]}</td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {item.triggerReasons.map((reason, index) => (
                          <span
                            key={`${item.penaltyId}-reason-${index}`}
                            style={{
                              padding: "2px 8px",
                              borderRadius: "6px",
                              border: "1px solid rgba(255,255,255,0.1)",
                              background: "rgba(255,255,255,0.04)",
                              color: "#cbd5e1",
                              fontSize: "11px"
                            }}
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{item.affectedCommissionCount}</td>
                    <td>
                      <span className={`${styles.badge} ${STATUS_BADGE_CLASS[item.status]}`}>
                        {STATUS_LABEL[item.status]}
                      </span>
                    </td>
                    <td>{formatDate(item.appliedAt)}</td>
                    <td style={{ maxWidth: "260px", lineHeight: 1.5 }}>{readReviewMeta(item)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {item.status === "applied" ? (
                          <button
                            type="button"
                            disabled={reviewMutation.isPending}
                            onClick={() => submitReview(item, "confirm")}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "8px",
                              border: "1px solid rgba(52,211,153,0.35)",
                              background: "rgba(52,211,153,0.1)",
                              color: "#6ee7b7",
                              fontSize: "12px",
                              cursor: "pointer",
                              fontFamily: "inherit"
                            }}
                          >
                            确认处罚
                          </button>
                        ) : null}
                        {item.status !== "rolled_back" ? (
                          <button
                            type="button"
                            disabled={reviewMutation.isPending}
                            onClick={() => submitReview(item, "rollback")}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "8px",
                              border: "1px solid rgba(248,113,113,0.35)",
                              background: "rgba(248,113,113,0.1)",
                              color: "#fca5a5",
                              fontSize: "12px",
                              cursor: "pointer",
                              fontFamily: "inherit"
                            }}
                          >
                            回滚处罚
                          </button>
                        ) : (
                          <span style={{ color: "#64748b", fontSize: "12px" }}>已回滚</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span style={{ color: "#64748b", fontSize: "12px" }}>
              第 {page}/{totalPages} 页
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                style={{
                  padding: "4px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#cbd5e1",
                  cursor: "pointer"
                }}
              >
                上一页
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                style={{
                  padding: "4px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#cbd5e1",
                  cursor: "pointer"
                }}
              >
                下一页
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

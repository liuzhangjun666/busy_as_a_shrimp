"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getAdminApi } from "@/api";
import type { AdminListResult, AdminResource, ReviewDecision } from "@/api/admin-api";
import { getErrorMessage } from "@/utils/error-message";
import pageStyles from "../../page.module.css";

type ResourceReviewStatus = "pending" | "active" | "rejected";

const RESOURCE_REVIEW_QUERY_KEY = ["admin", "resource-review"] as const;

const TYPE_LABEL: Record<string, string> = {
  skill: "技能",
  location: "场地/位置",
  account: "账号/流量",
  time: "时间/劳动力"
};

const STATUS_META: Record<
  ResourceReviewStatus,
  { label: string; loading: string; empty: string; title: string }
> = {
  pending: {
    label: "待审",
    loading: "正在加载待审资源...",
    empty: "暂无待审核资源，队列已清空。",
    title: "待审资源列表"
  },
  active: {
    label: "已审核",
    loading: "正在加载已审核资源...",
    empty: "暂无已审核资源。",
    title: "已审核资源列表"
  },
  rejected: {
    label: "未通过",
    loading: "正在加载未通过资源...",
    empty: "暂无未通过资源。",
    title: "未通过资源列表"
  }
};

const RISK_COLOR: Record<string, { color: string; bg: string }> = {
  价格区间异常: { color: "#fca5a5", bg: "rgba(239,68,68,0.1)" },
  标签包含联系方式: { color: "#fde68a", bg: "rgba(234,179,8,0.1)" },
  未发现风险: { color: "#6ee7b7", bg: "rgba(52,211,153,0.1)" }
};

function describePrice(resource: AdminResource): string {
  const min = resource.priceRange?.min;
  const max = resource.priceRange?.max;
  if (!Number.isFinite(min) && !Number.isFinite(max)) return "-";
  if (Number.isFinite(min) && Number.isFinite(max)) return `${min} - ${max}`;
  if (Number.isFinite(min)) return `>= ${min}`;
  return `<= ${max}`;
}

function getRiskSummary(resource: AdminResource): string {
  const price = resource.priceRange;
  const hasBadPrice =
    price &&
    Number.isFinite(price.min) &&
    Number.isFinite(price.max) &&
    ((price.min ?? 0) <= 0 || (price.max ?? 0) < (price.min ?? 0));
  if (hasBadPrice) return "价格区间异常";
  if (resource.tags.some((tag) => /wechat|vx|qq|@|1\d{10}/i.test(tag))) return "标签包含联系方式";
  return "未发现风险";
}

function readCount(result: AdminListResult<AdminResource> | undefined): number {
  return result?.total ?? 0;
}

export default function ResourceReviewPage() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState<ResourceReviewStatus>("pending");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const pendingCountQuery = useQuery({
    queryKey: [...RESOURCE_REVIEW_QUERY_KEY, "count", "pending"],
    queryFn: () => getAdminApi().resources({ status: "pending", page: 1, pageSize: 1 }),
    staleTime: 30_000
  });
  const activeCountQuery = useQuery({
    queryKey: [...RESOURCE_REVIEW_QUERY_KEY, "count", "active"],
    queryFn: () => getAdminApi().resources({ status: "active", page: 1, pageSize: 1 }),
    staleTime: 30_000
  });
  const rejectedCountQuery = useQuery({
    queryKey: [...RESOURCE_REVIEW_QUERY_KEY, "count", "rejected"],
    queryFn: () => getAdminApi().resources({ status: "rejected", page: 1, pageSize: 1 }),
    staleTime: 30_000
  });

  const resourcesQuery = useQuery({
    queryKey: [...RESOURCE_REVIEW_QUERY_KEY, "list", status, page, pageSize],
    queryFn: async (): Promise<AdminListResult<AdminResource>> => {
      return getAdminApi().resources({
        status,
        page,
        pageSize
      });
    },
    staleTime: 30_000
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      resourceId,
      decision,
      reason
    }: {
      resourceId: number;
      decision: ReviewDecision;
      reason?: string;
    }) => getAdminApi().reviewResource(resourceId, decision, reason),
    onSuccess: (result) => {
      setNotice(`资源 #${result.resourceId} 已${result.status === "active" ? "通过" : "拒绝"}`);
      void queryClient.invalidateQueries({ queryKey: RESOURCE_REVIEW_QUERY_KEY });
    }
  });

  const resourcesResult = resourcesQuery.data;
  const resources = resourcesResult?.list ?? [];
  const total = resourcesResult?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canReview = status === "pending";

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  function handleReview(resourceId: number, decision: ReviewDecision) {
    if (decision === "reject") {
      const reason = window
        .prompt("请输入拒绝原因（会同步给用户）：", "内容不符合平台规范")
        ?.trim();
      if (!reason) {
        return;
      }
      reviewMutation.mutate({ resourceId, decision, reason });
      return;
    }
    reviewMutation.mutate({ resourceId, decision });
  }

  const counts = {
    pending: readCount(pendingCountQuery.data),
    active: readCount(activeCountQuery.data),
    rejected: readCount(rejectedCountQuery.data)
  };

  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.headerRow}>
        <div>
          <h1 className={pageStyles.title}>资源审核</h1>
          <p className={pageStyles.subtitle}>处理资源审核队列，并查看已审核与未通过记录。</p>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "6px 16px",
            borderRadius: "999px",
            border: "1px solid rgba(130,148,255,0.4)",
            background: "rgba(99,102,241,0.15)",
            color: "#a5b4fc",
            fontSize: "13px",
            fontWeight: 600
          }}
        >
          {STATUS_META[status].label}: {total}
        </span>
        <select
          value={pageSize}
          onChange={(event) => {
            setPageSize(Number(event.target.value));
            setPage(1);
          }}
          style={{
            marginLeft: "10px",
            height: "32px",
            padding: "0 10px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.06)",
            color: "#f8fafc",
            fontSize: "12px"
          }}
        >
          <option value={10}>10 / 页</option>
          <option value={20}>20 / 页</option>
          <option value={50}>50 / 页</option>
        </select>
      </div>

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
          role="status"
        >
          {notice}
        </p>
      ) : null}

      <p
        style={{
          marginBottom: "12px",
          padding: "10px 14px",
          borderRadius: "10px",
          background: "rgba(16,185,129,0.08)",
          border: "1px solid rgba(16,185,129,0.2)",
          color: "#a7f3d0",
          fontSize: "12px"
        }}
      >
        自动审核规则：每 3
        小时执行一次，优先阿里云内容审核；阿里云不可用时自动切换网站本地兜底审核。通过后自动发布，未通过会写入明确原因。
      </p>

      <section
        style={{
          marginBottom: "12px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap"
        }}
      >
        {(["pending", "active", "rejected"] as ResourceReviewStatus[]).map((tabStatus) => {
          const isActive = tabStatus === status;
          return (
            <button
              key={tabStatus}
              type="button"
              onClick={() => setStatus(tabStatus)}
              style={{
                padding: "7px 14px",
                borderRadius: "999px",
                border: isActive
                  ? "1px solid rgba(99,102,241,0.5)"
                  : "1px solid rgba(148,163,184,0.25)",
                background: isActive ? "rgba(99,102,241,0.18)" : "rgba(15,23,42,0.55)",
                color: isActive ? "#c7d2fe" : "#94a3b8",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit"
              }}
            >
              {STATUS_META[tabStatus].label}: {counts[tabStatus]}
            </button>
          );
        })}
      </section>

      <section className={pageStyles.panel}>
        <div className={pageStyles.panelHeader}>
          <h2>{STATUS_META[status].title}</h2>
        </div>

        {resourcesQuery.isLoading ? (
          <p className={pageStyles.loading}>{STATUS_META[status].loading}</p>
        ) : null}

        {!resourcesQuery.isLoading && resourcesQuery.isError ? (
          <p className={pageStyles.error}>加载失败：{getErrorMessage(resourcesQuery.error)}</p>
        ) : null}

        {!resourcesQuery.isLoading && !resourcesQuery.isError && total === 0 ? (
          <p style={{ textAlign: "center", color: "#64748b", padding: "32px 0", margin: 0 }}>
            {STATUS_META[status].empty}
          </p>
        ) : null}

        {!resourcesQuery.isLoading && !resourcesQuery.isError && total > 0 ? (
          <>
            <div className={pageStyles.tableWrap}>
              <table className={pageStyles.table}>
                <thead>
                  <tr>
                    <th>资源ID</th>
                    <th>提交者</th>
                    <th>类型</th>
                    <th>标签</th>
                    <th>价格区间</th>
                    <th>风险提示</th>
                    <th>审核说明</th>
                    <th>{canReview ? "操作" : "状态"}</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((resource) => {
                    const risk = getRiskSummary(resource);
                    const riskStyle = RISK_COLOR[risk] ?? RISK_COLOR["未发现风险"];
                    const displayTags =
                      resource.tagsZh && resource.tagsZh.length > 0
                        ? resource.tagsZh
                        : resource.tags;
                    return (
                      <tr key={resource.resourceId}>
                        <td>#{resource.resourceId}</td>
                        <td>#{resource.userId}</td>
                        <td>{TYPE_LABEL[resource.resourceType] ?? resource.resourceType}</td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {displayTags.slice(0, 3).map((tag, i) => (
                              <span
                                key={`${resource.resourceId}-${tag}-${i}`}
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  background: "rgba(99,102,241,0.12)",
                                  border: "1px solid rgba(99,102,241,0.25)",
                                  color: "#c7d2fe"
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                            {displayTags.length === 0 && (
                              <span style={{ color: "#475569" }}>-</span>
                            )}
                          </div>
                        </td>
                        <td>{describePrice(resource)}</td>
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 10px",
                              borderRadius: "999px",
                              fontSize: "12px",
                              background: riskStyle.bg,
                              color: riskStyle.color
                            }}
                          >
                            {risk}
                          </span>
                        </td>
                        <td style={{ color: "#cbd5e1", fontSize: "12px", lineHeight: 1.5 }}>
                          <div>{resource.reviewReason || "自动审核中"}</div>
                          <div style={{ marginTop: "2px", color: "#94a3b8" }}>
                            引擎：{resource.reviewEngine || "aliyun/local"}
                          </div>
                        </td>
                        <td>
                          {canReview ? (
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                type="button"
                                disabled={reviewMutation.isPending}
                                onClick={() => handleReview(resource.resourceId, "approve")}
                                style={{
                                  padding: "4px 14px",
                                  borderRadius: "8px",
                                  border: "1px solid rgba(52,211,153,0.4)",
                                  background: "rgba(52,211,153,0.1)",
                                  color: "#6ee7b7",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  fontFamily: "inherit"
                                }}
                              >
                                通过
                              </button>
                              <button
                                type="button"
                                disabled={reviewMutation.isPending}
                                onClick={() => handleReview(resource.resourceId, "reject")}
                                style={{
                                  padding: "4px 14px",
                                  borderRadius: "8px",
                                  border: "1px solid rgba(248,113,113,0.4)",
                                  background: "rgba(248,113,113,0.1)",
                                  color: "#fca5a5",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  fontFamily: "inherit"
                                }}
                              >
                                拒绝
                              </button>
                            </div>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "3px 10px",
                                borderRadius: "999px",
                                fontSize: "12px",
                                border:
                                  status === "active"
                                    ? "1px solid rgba(52,211,153,0.4)"
                                    : "1px solid rgba(248,113,113,0.4)",
                                background:
                                  status === "active"
                                    ? "rgba(52,211,153,0.1)"
                                    : "rgba(248,113,113,0.1)",
                                color: status === "active" ? "#6ee7b7" : "#fca5a5"
                              }}
                            >
                              {status === "active" ? "已通过" : "未通过"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
          </>
        ) : null}
      </section>
    </main>
  );
}

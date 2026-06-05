"use client";

import { useEffect, useMemo, useState } from "react";

import { getAdminApi } from "../../src/api";
import type { AdminMatchRecord } from "../../src/api/admin-api";
import { EmptyState } from "../../src/components/empty-state";
import styles from "../page.module.css";

type MatchStatusFilter = "all" | AdminMatchRecord["status"];

const STATUS_LABEL: Record<AdminMatchRecord["status"], string> = {
  pushed: "已推送",
  viewed: "已查看",
  confirmed: "已确认",
  done: "已完成",
  invalid: "已失效"
};

const STATUS_FILTER_TABS: Array<{ key: MatchStatusFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "pushed", label: "已推送" },
  { key: "viewed", label: "已查看" },
  { key: "confirmed", label: "已确认" },
  { key: "done", label: "已完成" },
  { key: "invalid", label: "已失效" }
];

function formatDate(value?: string): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("zh-CN", { hour12: false });
}

export default function MatchesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MatchStatusFilter>("all");
  const [matches, setMatches] = useState<AdminMatchRecord[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await getAdminApi().matches();
        if (active) {
          setMatches(result);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "加载匹配记录失败。");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim();
    return matches.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return (
        String(item.matchId).includes(keyword) ||
        String(item.needId).includes(keyword) ||
        String(item.resourceId).includes(keyword)
      );
    });
  }, [matches, search, statusFilter]);

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>匹配记录</h1>
          <p className={styles.subtitle}>查看平台撮合明细与推进状态。</p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "16px"
        }}
      >
        <input
          type="text"
          placeholder="搜索 matchId / needId / resourceId"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{
            height: "38px",
            padding: "0 14px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
            color: "#f8fafc",
            fontSize: "14px",
            outline: "none",
            width: "280px"
          }}
        />
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
        <span style={{ color: "#64748b", fontSize: "13px" }}>
          共 {matches.length} 条{search ? `（筛选后 ${filtered.length} 条）` : ""}
        </span>
      </div>

      {loading ? <p className={styles.loading}>正在加载匹配记录...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !error && filtered.length === 0 ? (
        <EmptyState title="暂无匹配记录" text="当前筛选条件下没有可展示的数据。" />
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>撮合明细</h2>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>匹配ID</th>
                  <th>需求ID</th>
                  <th>资源ID</th>
                  <th>分数</th>
                  <th>状态</th>
                  <th>推送时间</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.matchId}>
                    <td>#{item.matchId}</td>
                    <td>{item.needId}</td>
                    <td>{item.resourceId}</td>
                    <td>{item.score.toFixed(2)}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[item.status] ?? ""}`}>
                        {STATUS_LABEL[item.status] ?? item.status}
                      </span>
                    </td>
                    <td>{formatDate(item.pushTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}

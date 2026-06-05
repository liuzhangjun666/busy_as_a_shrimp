"use client";

import { useEffect, useState } from "react";

import { getAdminApi } from "../../../src/api";
import type { CaptainLevel, CaptainRank } from "../../../src/api/admin-api";
import { EmptyState } from "../../../src/components/empty-state";
import styles from "../../page.module.css";

const LEVEL_LABEL: Record<string, string> = {
  normal: "普通",
  advanced: "高级",
  gold: "金牌"
};

const LEVEL_OPTIONS: { value: CaptainLevel; label: string }[] = [
  { value: "normal", label: "普通" },
  { value: "advanced", label: "高级" },
  { value: "gold", label: "金牌" }
];

export default function CaptainRankingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<CaptainRank[]>([]);
  const [operating, setOperating] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await getAdminApi().captainRanking();
        if (active) {
          setRows(result);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "加载团长排行失败。");
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

  async function handleLevelChange(captainId: number, level: CaptainLevel) {
    setOperating(captainId);
    setNotice(null);
    try {
      await getAdminApi().updateCaptainLevel(captainId, level);
      setRows((prev) => prev.map((r) => (r.captainId === captainId ? { ...r, level } : r)));
      setNotice(`团长 #${captainId} 等级已调整为「${LEVEL_LABEL[level]}」`);
    } catch (err) {
      setNotice(`操作失败：${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setOperating(null);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>团长排行榜</h1>
          <p className={styles.subtitle}>跟踪顶尖团长表现与佣金等级，支持手动调整等级。</p>
        </div>
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
        >
          {notice}
        </p>
      ) : null}

      {loading ? <p className={styles.loading}>正在加载团长排行...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !error && rows.length === 0 ? (
        <EmptyState title="暂无排行数据" text="团长排行数据暂不可用。" />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>团长排行</h2>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>排名</th>
                  <th>团长</th>
                  <th>当前等级</th>
                  <th>得分</th>
                  <th>本月招募</th>
                  <th>佣金比例</th>
                  <th>调整等级</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item, index) => (
                  <tr key={item.captainId}>
                    <td>
                      <span
                        style={{
                          fontWeight: "bold",
                          color:
                            index === 0
                              ? "#fbbf24"
                              : index === 1
                                ? "#94a3b8"
                                : index === 2
                                  ? "#cd7c3e"
                                  : "#64748b"
                        }}
                      >
                        #{index + 1}
                      </span>
                    </td>
                    <td>
                      {item.name} (#{item.captainId})
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${styles.active}`}
                        style={{
                          background:
                            item.level === "gold"
                              ? "rgba(251,191,36,0.15)"
                              : item.level === "advanced"
                                ? "rgba(99,102,241,0.15)"
                                : "rgba(148,163,184,0.1)",
                          border:
                            item.level === "gold"
                              ? "1px solid rgba(251,191,36,0.4)"
                              : item.level === "advanced"
                                ? "1px solid rgba(99,102,241,0.4)"
                                : "1px solid rgba(148,163,184,0.2)",
                          color:
                            item.level === "gold"
                              ? "#fde68a"
                              : item.level === "advanced"
                                ? "#a5b4fc"
                                : "#94a3b8"
                        }}
                      >
                        {LEVEL_LABEL[item.level]}
                      </span>
                    </td>
                    <td>{item.score}</td>
                    <td>{item.monthInvites}</td>
                    <td>{Math.round(item.commissionRate * 100)}%</td>
                    <td>
                      <select
                        value={item.level}
                        disabled={operating === item.captainId}
                        onChange={(e) =>
                          handleLevelChange(item.captainId, e.target.value as CaptainLevel)
                        }
                        style={{
                          height: "32px",
                          padding: "0 10px",
                          borderRadius: "8px",
                          border: "1px solid rgba(255,255,255,0.1)",
                          background: "rgba(255,255,255,0.06)",
                          color: "#f8fafc",
                          fontSize: "13px",
                          cursor: "pointer",
                          fontFamily: "inherit"
                        }}
                      >
                        {LEVEL_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
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

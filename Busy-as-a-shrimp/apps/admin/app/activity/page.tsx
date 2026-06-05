"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface RankingItem {
  rank: number;
  userId: number;
  inviteCount: number;
  maskedPhone: string;
}

const POLL_INTERVAL_MS = 30_000;

export default function ActivityPage() {
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRanking = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const { getAdminApi } = await import("../../src/api");
      const data = await getAdminApi().captainRanking();
      setRanking(
        data.map((item, index) => ({
          rank: index + 1,
          userId: item.captainId,
          inviteCount: item.monthInvites,
          maskedPhone: item.name
        }))
      );
      setLastUpdated(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
    } catch (err) {
      console.error("加载排名失败", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /* 首次加载 + 30秒轮询 */
  useEffect(() => {
    void fetchRanking(true);
    pollTimerRef.current = setInterval(() => {
      void fetchRanking(false);
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchRanking]);

  /* 从排名数据聚合统计 */
  const aggregatedStats = useMemo(() => {
    const totalInvites = ranking.reduce((sum, item) => sum + item.inviteCount, 0);
    const participants = ranking.length;
    const estimatedReward = ranking.reduce((sum, item) => {
      if (item.rank === 1) return sum + 1000;
      if (item.rank === 2) return sum + 600;
      if (item.rank === 3) return sum + 400;
      if (item.rank <= 10) return sum + 200;
      return sum + 80;
    }, 0);
    return { totalInvites, participants, estimatedReward };
  }, [ranking]);

  return (
    <div style={{ background: "#0a0c10", minHeight: "100vh", color: "#fff" }}>
      <main style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
        <header
          style={{
            marginBottom: "30px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start"
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 700,
                background: "linear-gradient(90deg, #fff, #5b8cff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            >
              拉新活动实时监控
            </h1>
            <p style={{ color: "rgba(255,255,255,0.5)", marginTop: "8px" }}>
              周期：2026-03-30 ~ 2026-04-13 | 奖池：¥5000 | 实时前 30 名排行
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {lastUpdated ? (
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>
                最后更新: {lastUpdated}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void fetchRanking(false)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(91,140,255,0.3)",
                background: "rgba(91,140,255,0.1)",
                color: "#5b8cff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s"
              }}
            >
              ↻ 手动刷新
            </button>
          </div>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
            marginBottom: "40px"
          }}
        >
          <div className="stat-card">
            <label>累计邀请人数</label>
            <div className="value">{aggregatedStats.totalInvites.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <label>当前参与人数</label>
            <div className="value">{aggregatedStats.participants.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <label>预计发放积分</label>
            <div className="value">{aggregatedStats.estimatedReward.toLocaleString()}</div>
          </div>
        </section>

        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden"
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.05)", textAlign: "left" }}>
                <th style={{ padding: "15px 20px" }}>排名</th>
                <th style={{ padding: "15px 20px" }}>用户 ID</th>
                <th style={{ padding: "15px 20px" }}>手机号</th>
                <th style={{ padding: "15px 20px" }}>拉新数</th>
                <th style={{ padding: "15px 20px" }}>预计奖励</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: "40px", textAlign: "center" }}>
                    加载中...
                  </td>
                </tr>
              ) : (
                ranking.map((item) => (
                  <tr
                    key={item.userId}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <td style={{ padding: "15px 20px" }}>
                      <span
                        style={{
                          color: item.rank <= 3 ? "#ffae00" : "#fff",
                          fontWeight: item.rank <= 3 ? 800 : 400
                        }}
                      >
                        {item.rank}
                      </span>
                    </td>
                    <td style={{ padding: "15px 20px" }}>{item.userId}</td>
                    <td style={{ padding: "15px 20px" }}>{item.maskedPhone}</td>
                    <td style={{ padding: "15px 20px" }}>{item.inviteCount}</td>
                    <td style={{ padding: "15px 20px", color: "#00e5a0" }}>
                      ¥
                      {item.rank === 1
                        ? 1000
                        : item.rank === 2
                          ? 600
                          : item.rank === 3
                            ? 400
                            : item.rank <= 10
                              ? 200
                              : 80}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 轮询状态指示 */}
        <div
          style={{
            marginTop: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            justifyContent: "center"
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#00e5a0",
              display: "inline-block",
              boxShadow: "0 0 6px #00e5a0",
              animation: "pulse 2s infinite"
            }}
          />
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>
            每 30 秒自动刷新
          </span>
        </div>
      </main>

      <style jsx>{`
        .stat-card {
          background: rgba(255, 255, 255, 0.03);
          padding: 24px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .stat-card label {
          display: block;
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
          margin-bottom: 8px;
        }
        .stat-card .value {
          font-size: 32px;
          font-weight: 700;
          font-family: "JetBrains Mono", monospace;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { AdminStats } from "../src/api/admin-api";
import { getAdminToken, saveAdminSession } from "../lib/auth";
import styles from "./page.module.css";

const QUICK_LINKS = [
  {
    href: "/dashboard",
    title: "数据看板",
    description: "查看平台整体运营指标",
    icon: "📊",
    color: "rgba(91,140,255,0.15)",
    border: "rgba(91,140,255,0.3)"
  },
  {
    href: "/users",
    title: "用户管理",
    description: "查询账号状态与角色",
    icon: "👥",
    color: "rgba(0,212,255,0.12)",
    border: "rgba(0,212,255,0.25)"
  },
  {
    href: "/resources/review",
    title: "资源审核",
    description: "处理待审核资源提交",
    icon: "🔍",
    color: "rgba(157,124,255,0.12)",
    border: "rgba(157,124,255,0.28)"
  },
  {
    href: "/risk/brush-order-penalties",
    title: "风控处罚",
    description: "复核刷单处罚与回滚",
    icon: "🛡️",
    color: "rgba(248,113,113,0.1)",
    border: "rgba(248,113,113,0.25)"
  },
  {
    href: "/captain/ranking",
    title: "团长排行",
    description: "团长得分与佣金等级",
    icon: "🏆",
    color: "rgba(255,179,64,0.10)",
    border: "rgba(255,179,64,0.25)"
  },
  {
    href: "/announcements",
    title: "平台公告",
    description: "发布与管理平台公告",
    icon: "📢",
    color: "rgba(0,229,160,0.10)",
    border: "rgba(0,229,160,0.22)"
  },
  {
    href: "/ai-briefs",
    title: "AI快报",
    description: "管理公开 AI 资讯流",
    icon: "🧠",
    color: "rgba(91,140,255,0.12)",
    border: "rgba(91,140,255,0.28)"
  },
  {
    href: "/solo-signals",
    title: "AI一人公司情报",
    description: "管理个体 AI 变现情报",
    icon: "💼",
    color: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.28)"
  },
  {
    href: "/matches",
    title: "匹配记录",
    description: "查看系统撮合结果与状态",
    icon: "🧩",
    color: "rgba(129,140,248,0.12)",
    border: "rgba(129,140,248,0.28)"
  }
];

const STAT_CARDS = [
  { key: "totalUsers", label: "用户总数", unit: "", accent: "#5b8cff" },
  { key: "pendingResources", label: "待审资源", unit: "", accent: "#ff4d6d" },
  { key: "activeCaptains", label: "活跃团长", unit: "", accent: "#00d4ff" },
  { key: "matchRate", label: "匹配率", unit: "%", accent: "#9d7cff" }
] as const;

export default function AdminHomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    // 优先检测 URL 中的 Token 移交（实现秒进）
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const profileStr = params.get("profile");

      if (token && profileStr) {
        try {
          const profileData = JSON.parse(profileStr);
          saveAdminSession(token, profileData);
          // 清理 URL 参数，避免刷新时重复处理且保持美观
          window.history.replaceState({}, "", "/");
        } catch (e) {
          console.error("Token handover failed", e);
        }
      }
    }

    const savedToken = getAdminToken();
    if (!savedToken) {
      router.replace("/login");
      return;
    }
    setSessionReady(true);

    import("../src/api").then(({ getAdminApi }) => {
      getAdminApi()
        .stats()
        .then((data) => {
          setStats(data);
        })
        .catch((err) => console.error("获取统计数据失败", err))
        .finally(() => setLoading(false));
    });
  }, [router]);

  if (!sessionReady) {
    return (
      <main className={styles.page}>
        <p className={styles.loading}>正在验证管理员身份...</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {/* 页头 */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>运营概览</h1>
        </div>
        {/* 系统状态标签 */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid rgba(0,229,160,0.25)",
              background: "rgba(0,229,160,0.06)",
              fontSize: "12px",
              color: "#34d399",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#00e5a0",
                display: "inline-block",
                boxShadow: "0 0 6px #00e5a0"
              }}
            />
            系统运行正常
          </div>
        </div>
      </div>

      {loading ? <p className={styles.loading}>正在加载概览信息...</p> : null}

      {/* 统计卡片 */}
      <section className={styles.statsGrid}>
        {STAT_CARDS.map((card) => {
          const raw = stats?.[card.key];
          const value = raw !== undefined && raw !== null ? `${raw}${card.unit}` : "—";
          return (
            <article
              key={card.key}
              className={styles.statCard}
              style={{ "--card-accent": card.accent } as React.CSSProperties}
            >
              {/* 右上角装饰圆 */}
              <div
                style={{
                  position: "absolute",
                  top: "-20px",
                  right: "-20px",
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${card.accent}22 0%, transparent 70%)`
                }}
              />
              <span className={styles.statLabel} style={{ color: `${card.accent}99` }}>
                {card.label}
              </span>
              <strong
                className={styles.statValue}
                style={{
                  background: `linear-gradient(135deg, #fff 0%, ${card.accent} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}
              >
                {value}
              </strong>
              {/* 底部 accent 线 */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: "20px",
                  right: "20px",
                  height: "2px",
                  borderRadius: "2px 2px 0 0",
                  background: `linear-gradient(90deg, transparent, ${card.accent}60, transparent)`
                }}
              />
            </article>
          );
        })}
      </section>

      {/* 快捷入口 + 快照 */}
      <section className={styles.panelSplit}>
        {/* 快捷入口 */}
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>快捷入口</h2>
            <span style={{ fontSize: "11px", color: "#4a5880", letterSpacing: "0.06em" }}>
              QUICK ACCESS
            </span>
          </div>
          <div style={{ padding: "14px 16px", display: "grid", gap: "10px" }}>
            {QUICK_LINKS.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                onMouseEnter={() => setHovered(item.href)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: `1px solid ${hovered === item.href ? item.border : "rgba(99,139,255,0.12)"}`,
                  background: hovered === item.href ? item.color : "rgba(255,255,255,0.02)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                  fontFamily: "inherit",
                  transform: hovered === item.href ? "translateX(4px)" : "translateX(0)"
                }}
              >
                <span style={{ fontSize: "22px", flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#e8eeff",
                      marginBottom: "2px"
                    }}
                  >
                    {item.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "#8ba0cc" }}>{item.description}</div>
                </div>
                <span style={{ marginLeft: "auto", color: "#4a5880", fontSize: "16px" }}>›</span>
              </button>
            ))}
          </div>
        </article>

        {/* 平台快照 */}
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>平台快照</h2>
            <span style={{ fontSize: "11px", color: "#4a5880", letterSpacing: "0.06em" }}>
              SNAPSHOT
            </span>
          </div>
          <div style={{ padding: "16px" }}>
            {[
              { label: "活跃用户", value: stats?.activeUsers, accent: "#5b8cff" },
              { label: "资源总数", value: stats?.totalResources, accent: "#00d4ff" },
              { label: "公告数量", value: stats?.announcementCount, accent: "#9d7cff" },
              { label: "审核队列", value: stats?.pendingResources, accent: "#ff4d6d" }
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom: "1px solid rgba(99,139,255,0.08)"
                }}
              >
                <span style={{ fontSize: "13px", color: "#8ba0cc" }}>{item.label}</span>
                <span
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: item.accent,
                    fontFamily: "'JetBrains Mono', monospace"
                  }}
                >
                  {item.value ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

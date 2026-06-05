"use client";

import { useEffect, useState } from "react";

import { getAdminApi } from "../../src/api";
import type { AdminStats } from "../../src/api/admin-api";
import styles from "../page.module.css";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await getAdminApi().stats();
        if (active) {
          setStats(result);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard.");
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

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>数据看板</h1>
          <p className={styles.subtitle}>用户、资源与团长的运营概况汇总。</p>
        </div>
      </div>

      {loading ? <p className={styles.loading}>正在加载看板数据...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>用户总数</span>
          <strong className={styles.statValue}>{stats?.totalUsers ?? "-"}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>活跃用户</span>
          <strong className={styles.statValue}>{stats?.activeUsers ?? "-"}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>资源总数</span>
          <strong className={styles.statValue}>{stats?.totalResources ?? "-"}</strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>待审核</span>
          <strong className={styles.statValue}>{stats?.pendingResources ?? "-"}</strong>
        </article>
      </section>

      {!loading && stats ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>平台健康状态</h2>
          </div>
          <p className={styles.message}>
            当前匹配率：{stats.matchRate}% | 活跃团长：{stats.activeCaptains} |公告数量：
            {stats.announcementCount}
          </p>
        </section>
      ) : null}
    </main>
  );
}

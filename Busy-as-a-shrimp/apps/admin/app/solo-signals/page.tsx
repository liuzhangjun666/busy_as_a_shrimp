"use client";

import { FormEvent, useEffect, useState } from "react";
import { getAdminApi } from "../../src/api";
import type { AdminSoloSignal } from "../../src/api/admin-api";
import styles from "../page.module.css";

export default function SoloSignalsAdminPage() {
  const [list, setList] = useState<AdminSoloSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [incomeSnippet, setIncomeSnippet] = useState("");

  useEffect(() => {
    void getAdminApi()
      .soloSignals(100)
      .then((data) => setList(data))
      .catch((err) => {
        console.error("加载 AI 一人公司情报失败", err);
        setError("加载 AI 一人公司情报失败");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !sourceName.trim() || !sourceUrl.trim()) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await getAdminApi().createSoloSignal({
        title: title.trim(),
        sourceName: sourceName.trim(),
        sourceUrl: sourceUrl.trim(),
        summary: summary.trim() || undefined,
        publishedAt: publishedAt || undefined,
        incomeSnippet: incomeSnippet.trim() || undefined
      });
      setList((prev) => [created, ...prev]);
      setTitle("");
      setSourceName("");
      setSourceUrl("");
      setSummary("");
      setPublishedAt("");
      setIncomeSnippet("");
    } catch (err) {
      console.error("创建 AI 一人公司情报失败", err);
      setError("创建失败，请检查输入内容或稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>AI一人公司情报管理</h1>
          <p className={styles.subtitle}>人工兜底发布个体 AI 变现情报。</p>
        </div>
      </div>

      <section className={styles.panel} style={{ marginBottom: "24px" }}>
        <div className={styles.panelHeader}>
          <h2>新建情报</h2>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "16px", display: "grid", gap: "10px" }}>
          <div className={styles.formRow}>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="标题"
              required
            />
            <input
              value={sourceName}
              onChange={(event) => setSourceName(event.target.value)}
              placeholder="来源名称"
              required
            />
          </div>

          <div className={styles.formRow}>
            <input
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="来源链接 (https://...)"
              required
            />
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(event) => setPublishedAt(event.target.value)}
            />
          </div>

          <input
            value={incomeSnippet}
            onChange={(event) => setIncomeSnippet(event.target.value)}
            placeholder="变现片段（可选）"
          />

          <textarea
            className={styles.textarea}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="摘要（可选）"
            rows={3}
          />

          {error ? <p className={styles.error}>{error}</p> : null}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className={styles.refreshBtn} type="submit" disabled={submitting}>
              {submitting ? "发布中..." : "发布情报"}
            </button>
          </div>
        </form>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>已发布情报</h2>
          <span style={{ color: "#8ba0cc", fontSize: "12px" }}>{list.length} 条</span>
        </div>

        {loading ? <p className={styles.loading}>正在加载...</p> : null}

        {!loading && list.length === 0 ? (
          <p className={styles.message} style={{ textAlign: "center", padding: "28px 0" }}>
            暂无情报记录
          </p>
        ) : (
          <div style={{ padding: "16px", display: "grid", gap: "10px" }}>
            {list.map((item) => (
              <article
                key={item.id}
                style={{
                  border: "1px solid rgba(99,139,255,0.18)",
                  borderRadius: "12px",
                  background: "rgba(7,12,40,0.65)",
                  padding: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                  <strong style={{ color: "#e8eeff", fontSize: "14px" }}>{item.title}</strong>
                  <span style={{ color: "#8ba0cc", fontSize: "11px" }}>
                    {new Date(item.publishedAt).toLocaleString("zh-CN", { hour12: false })}
                  </span>
                </div>
                <p style={{ margin: "6px 0", color: "#9fb1d9", fontSize: "12px" }}>
                  来源：{item.sourceName}
                </p>
                {item.incomeSnippet ? (
                  <p
                    style={{
                      margin: "0 0 8px",
                      color: "#9de4bd",
                      fontSize: "12px",
                      lineHeight: 1.6
                    }}
                  >
                    变现片段：{item.incomeSnippet}
                  </p>
                ) : null}
                {item.summary ? (
                  <p
                    style={{
                      margin: "0 0 8px",
                      color: "#c4d6ff",
                      fontSize: "12px",
                      lineHeight: 1.6
                    }}
                  >
                    {item.summary}
                  </p>
                ) : null}
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#7eb3ff", fontSize: "12px" }}
                >
                  打开原文
                </a>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

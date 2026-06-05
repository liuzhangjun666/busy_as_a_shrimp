"use client";

import { FormEvent, useEffect, useState } from "react";
import { getAdminApi } from "../../src/api";
import type { AdminAiBrief } from "../../src/api/admin-api";
import styles from "../page.module.css";

export default function AiBriefAdminPage() {
  const [list, setList] = useState<AdminAiBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [publishedAt, setPublishedAt] = useState("");

  useEffect(() => {
    void getAdminApi()
      .aiBriefs(100)
      .then((data) => setList(data))
      .catch((err) => {
        console.error("加载 AI 快报失败", err);
        setError("加载 AI 快报失败");
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
      const created = await getAdminApi().createAiBrief({
        title: title.trim(),
        sourceName: sourceName.trim(),
        sourceUrl: sourceUrl.trim(),
        summary: summary.trim() || undefined,
        publishedAt: publishedAt || undefined
      });
      setList((prev) => [created, ...prev]);
      setTitle("");
      setSourceName("");
      setSourceUrl("");
      setSummary("");
      setPublishedAt("");
    } catch (err) {
      console.error("创建 AI 快报失败", err);
      setError("创建失败，请检查输入内容或稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>AI快报管理</h1>
          <p className={styles.subtitle}>人工兜底发布全站可见的 AI 快报。</p>
        </div>
      </div>

      <section className={styles.panel} style={{ marginBottom: "24px" }}>
        <div className={styles.panelHeader}>
          <h2>新建快报</h2>
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
              placeholder="来源名称 (如 OpenAI News)"
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
              {submitting ? "发布中..." : "发布 AI 快报"}
            </button>
          </div>
        </form>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>已发布 AI 快报</h2>
          <span style={{ color: "#8ba0cc", fontSize: "12px" }}>{list.length} 条</span>
        </div>

        {loading ? <p className={styles.loading}>正在加载...</p> : null}

        {!loading && list.length === 0 ? (
          <p className={styles.message} style={{ textAlign: "center", padding: "28px 0" }}>
            暂无快报记录
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

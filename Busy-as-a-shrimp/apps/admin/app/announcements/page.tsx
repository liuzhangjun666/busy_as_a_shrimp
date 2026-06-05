"use client";

import { useState, useEffect } from "react";
import { getAdminApi } from "../../src/api";
import type { AdminAnnouncement, AnnouncementType } from "../../src/api/admin-api";
import styles from "../page.module.css";

const TYPE_CONFIG: Record<
  AnnouncementType,
  { label: string; color: string; bg: string; border: string }
> = {
  notice: {
    label: "通知",
    color: "#93c5fd",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.3)"
  },
  activity: {
    label: "活动",
    color: "#86efac",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.3)"
  },
  warning: {
    label: "警告",
    color: "#fca5a5",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.3)"
  }
};

const TYPE_OPTIONS: { value: AnnouncementType; label: string }[] = [
  { value: "notice", label: "通知" },
  { value: "activity", label: "活动" },
  { value: "warning", label: "警告" }
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

export default function AnnouncementsPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<AnnouncementType>("notice");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  // 本地维护公告列表（先展示乐观更新，API 成功后持久化）
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);

  useEffect(() => {
    getAdminApi()
      .announcements()
      .then((data) => setAnnouncements(data))
      .catch((err) => console.error("加载公告失败", err));
  }, []);

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setPublishing(true);
    setPublishError(null);

    // 乐观更新：先在本地插入
    const optimistic: AdminAnnouncement = {
      id: `local-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      type,
      publishedAt: new Date().toISOString(),
      publishedBy: "admin"
    };

    try {
      // 尝试调用 API
      const result = await getAdminApi().announce({
        title: title.trim(),
        content: content.trim(),
        type
      });
      setAnnouncements((prev) => [result, ...prev]);
    } catch {
      // API 不可用时保留本地公告（乐观UI）
      setAnnouncements((prev) => [optimistic, ...prev]);
      setPublishError("API 暂不可用，公告已在本地保存（刷新后丢失）。");
    } finally {
      setPublishing(false);
      setTitle("");
      setContent("");
      setType("notice");
    }
  }

  async function handleDelete(id: string) {
    /* 乐观删除：先从 UI 移除 */
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    try {
      await getAdminApi().deleteAnnouncement(id);
    } catch (err) {
      console.error("删除公告失败", err);
      /* 如果 API 调用失败，重新拉取列表恢复 */
      getAdminApi()
        .announcements()
        .then((data) => setAnnouncements(data))
        .catch(() => {});
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>平台公告</h1>
          <p className={styles.subtitle}>发布面向所有用户的平台通知、活动与警告公告。</p>
        </div>
      </div>

      {/* 发布表单 */}
      <section className={styles.panel} style={{ marginBottom: "24px" }}>
        <div className={styles.panelHeader}>
          <h2>发布新公告</h2>
        </div>
        <form
          onSubmit={handlePublish}
          style={{ display: "flex", flexDirection: "column", gap: "14px" }}
        >
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="公告标题（必填）"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                flex: 1,
                minWidth: "200px",
                height: "42px",
                padding: "0 14px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "#f8fafc",
                fontSize: "14px",
                outline: "none",
                fontFamily: "inherit"
              }}
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AnnouncementType)}
              style={{
                height: "42px",
                padding: "0 14px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.06)",
                color: "#f8fafc",
                fontSize: "14px",
                cursor: "pointer",
                fontFamily: "inherit"
              }}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <textarea
            placeholder="公告内容（必填）"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={4}
            style={{
              padding: "12px 14px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              color: "#f8fafc",
              fontSize: "14px",
              outline: "none",
              resize: "vertical",
              fontFamily: "inherit",
              lineHeight: 1.6
            }}
          />

          {publishError ? (
            <p
              style={{
                margin: 0,
                padding: "10px 14px",
                borderRadius: "10px",
                background: "rgba(251,191,36,0.08)",
                border: "1px solid rgba(251,191,36,0.2)",
                color: "#fde68a",
                fontSize: "13px"
              }}
            >
              ⚠️ {publishError}
            </p>
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={publishing || !title.trim() || !content.trim()}
              style={{
                height: "42px",
                padding: "0 28px",
                borderRadius: "10px",
                border: "none",
                background:
                  publishing || !title.trim() || !content.trim()
                    ? "rgba(99,102,241,0.3)"
                    : "rgba(99,102,241,0.8)",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: publishing ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                transition: "background 0.2s"
              }}
            >
              {publishing ? "发布中..." : "发布公告"}
            </button>
          </div>
        </form>
      </section>

      {/* 公告列表 */}
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>已发布公告</h2>
          <span style={{ color: "#64748b", fontSize: "13px" }}>{announcements.length} 条</span>
        </div>

        {announcements.length === 0 ? (
          <p className={styles.message} style={{ textAlign: "center", padding: "32px 0" }}>
            暂无已发布的公告，请在上方表单发布第一条公告。
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px" }}>
            {announcements.map((ann) => {
              const cfg = TYPE_CONFIG[ann.type];
              return (
                <div
                  key={ann.id}
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    border: `1px solid ${cfg.border}`,
                    background: cfg.bg
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "12px",
                      marginBottom: "8px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        style={{
                          padding: "2px 10px",
                          borderRadius: "20px",
                          border: `1px solid ${cfg.border}`,
                          background: cfg.bg,
                          color: cfg.color,
                          fontSize: "12px",
                          fontWeight: 600
                        }}
                      >
                        {cfg.label}
                      </span>
                      <strong style={{ color: "#f8fafc", fontSize: "15px" }}>{ann.title}</strong>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ color: "#64748b", fontSize: "12px", whiteSpace: "nowrap" }}>
                        {formatTime(ann.publishedAt)} · {ann.publishedBy}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleDelete(ann.id)}
                        style={{
                          padding: "2px 10px",
                          borderRadius: "6px",
                          border: "1px solid rgba(248,113,113,0.3)",
                          background: "rgba(248,113,113,0.1)",
                          color: "#fca5a5",
                          fontSize: "12px",
                          cursor: "pointer",
                          fontFamily: "inherit"
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px", lineHeight: 1.6 }}>
                    {ann.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import type {
  AdminBountyTask,
  AdminStartupPost,
  AdminSubmission,
  StartupPostStatus
} from "../../src/api/admin-api";

type TaskTab = "bounty" | "startup";
type StartupStatusFilter = "all" | StartupPostStatus;

const cellStyle: React.CSSProperties = { padding: "12px 15px" };

export default function TasksAdminPage() {
  const [activeTab, setActiveTab] = useState<TaskTab>("bounty");

  const [tasks, setTasks] = useState<AdminBountyTask[]>([]);
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [loadingBounty, setLoadingBounty] = useState(false);

  const [startupPosts, setStartupPosts] = useState<AdminStartupPost[]>([]);
  const [startupTotal, setStartupTotal] = useState(0);
  const [startupPage, setStartupPage] = useState(1);
  const [startupPageSize] = useState(20);
  const [startupStatusFilter, setStartupStatusFilter] = useState<StartupStatusFilter>("all");
  const [startupKeywordInput, setStartupKeywordInput] = useState("");
  const [startupKeyword, setStartupKeyword] = useState("");
  const [loadingStartup, setLoadingStartup] = useState(false);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskContent, setNewTaskContent] = useState("");
  const [newTaskPoints, setNewTaskPoints] = useState<number>(100);
  const [newTaskDifficulty, setNewTaskDifficulty] = useState<"EASY" | "MEDIUM" | "HARD" | "EXPERT">(
    "MEDIUM"
  );
  const [isTaskSubmitting, setIsTaskSubmitting] = useState(false);

  const [isStartupModalOpen, setIsStartupModalOpen] = useState(false);
  const [editingStartupId, setEditingStartupId] = useState<string | null>(null);
  const [startupTitle, setStartupTitle] = useState("");
  const [startupSummary, setStartupSummary] = useState("");
  const [startupContent, setStartupContent] = useState("");
  const [startupCategory, setStartupCategory] = useState("");
  const [startupTagsInput, setStartupTagsInput] = useState("");
  const [startupContactInfo, setStartupContactInfo] = useState("");
  const [startupSourceUrl, setStartupSourceUrl] = useState("");
  const [startupCoverImageUrl, setStartupCoverImageUrl] = useState("");
  const [startupSort, setStartupSort] = useState(0);
  const [startupStatus, setStartupStatus] = useState<StartupPostStatus>("draft");
  const [isStartupSubmitting, setIsStartupSubmitting] = useState(false);

  const startupTotalPages = Math.max(1, Math.ceil(startupTotal / startupPageSize));

  function normalizeTags(input: string): string[] {
    return input
      .split(/[，,]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  function resetStartupForm() {
    setEditingStartupId(null);
    setStartupTitle("");
    setStartupSummary("");
    setStartupContent("");
    setStartupCategory("");
    setStartupTagsInput("");
    setStartupContactInfo("");
    setStartupSourceUrl("");
    setStartupCoverImageUrl("");
    setStartupSort(0);
    setStartupStatus("draft");
  }

  async function fetchBountyData() {
    setLoadingBounty(true);
    try {
      const { getAdminApi } = await import("../../src/api");
      const [tasksData, submissionsData] = await Promise.all([
        getAdminApi().tasks(),
        getAdminApi().submissions()
      ]);
      setTasks(tasksData);
      setSubmissions(submissionsData);
    } catch (err) {
      console.error("加载悬赏任务数据失败", err);
      alert("加载悬赏任务数据失败");
    } finally {
      setLoadingBounty(false);
    }
  }

  async function fetchStartupPosts() {
    setLoadingStartup(true);
    try {
      const { getAdminApi } = await import("../../src/api");
      const result = await getAdminApi().startupPosts({
        status: startupStatusFilter === "all" ? undefined : startupStatusFilter,
        keyword: startupKeyword || undefined,
        page: startupPage,
        pageSize: startupPageSize
      });
      setStartupPosts(result.list);
      setStartupTotal(result.total);
    } catch (err) {
      console.error("加载创业信息失败", err);
      alert("加载创业信息失败");
    } finally {
      setLoadingStartup(false);
    }
  }

  useEffect(() => {
    void fetchBountyData();
  }, []);

  useEffect(() => {
    void fetchStartupPosts();
  }, [startupPage, startupStatusFilter, startupKeyword]);

  async function handleCreateTask() {
    if (!newTaskTitle.trim() || !newTaskContent.trim() || newTaskPoints <= 0) {
      alert("请填写完整的任务信息");
      return;
    }
    try {
      setIsTaskSubmitting(true);
      const { getAdminApi } = await import("../../src/api");
      await getAdminApi().createTask({
        title: newTaskTitle.trim(),
        content: newTaskContent.trim(),
        points: newTaskPoints,
        difficulty: newTaskDifficulty
      });
      setIsTaskModalOpen(false);
      setNewTaskTitle("");
      setNewTaskContent("");
      setNewTaskPoints(100);
      setNewTaskDifficulty("MEDIUM");
      await fetchBountyData();
    } catch (err) {
      console.error("发布任务失败", err);
      alert("发布任务失败");
    } finally {
      setIsTaskSubmitting(false);
    }
  }

  async function handleReviewSubmission(id: number, decision: "approve" | "reject") {
    try {
      const { getAdminApi } = await import("../../src/api");
      await getAdminApi().reviewSubmission(id, decision);
      setSubmissions((prev) => prev.filter((sub) => sub.submissionId !== id));
    } catch (err) {
      console.error("审核失败", err);
      alert("审核失败");
    }
  }

  async function openCreateStartupModal() {
    resetStartupForm();
    setIsStartupModalOpen(true);
  }

  async function openEditStartupModal(postId: string) {
    try {
      const { getAdminApi } = await import("../../src/api");
      const detail = await getAdminApi().startupPost(postId);
      setEditingStartupId(detail.id);
      setStartupTitle(detail.title ?? "");
      setStartupSummary(detail.summary ?? "");
      setStartupContent(detail.content ?? "");
      setStartupCategory(detail.category ?? "");
      setStartupTagsInput((detail.tags ?? []).join(", "));
      setStartupContactInfo(detail.contactInfo ?? "");
      setStartupSourceUrl(detail.sourceUrl ?? "");
      setStartupCoverImageUrl(detail.coverImageUrl ?? "");
      setStartupSort(detail.sort ?? 0);
      setStartupStatus(detail.status ?? "draft");
      setIsStartupModalOpen(true);
    } catch (err) {
      console.error("加载创业信息详情失败", err);
      alert("加载创业信息详情失败");
    }
  }

  async function handleSaveStartupPost() {
    if (!startupTitle.trim() || !startupContent.trim()) {
      alert("标题和正文是必填项");
      return;
    }

    const payload = {
      title: startupTitle.trim(),
      summary: startupSummary.trim() || undefined,
      content: startupContent.trim(),
      category: startupCategory.trim() || undefined,
      tags: normalizeTags(startupTagsInput),
      contactInfo: startupContactInfo.trim() || undefined,
      sourceUrl: startupSourceUrl.trim() || undefined,
      coverImageUrl: startupCoverImageUrl.trim() || undefined,
      sort: startupSort,
      status: startupStatus
    };

    try {
      setIsStartupSubmitting(true);
      const { getAdminApi } = await import("../../src/api");

      if (editingStartupId) {
        await getAdminApi().updateStartupPost(editingStartupId, payload);
      } else {
        await getAdminApi().createStartupPost(payload);
      }

      setIsStartupModalOpen(false);
      resetStartupForm();
      await fetchStartupPosts();
    } catch (err) {
      console.error("保存创业信息失败", err);
      alert("保存创业信息失败");
    } finally {
      setIsStartupSubmitting(false);
    }
  }

  async function handleDeleteStartupPost(id: string) {
    if (!window.confirm("确认删除这条创业信息吗？")) {
      return;
    }

    try {
      const { getAdminApi } = await import("../../src/api");
      await getAdminApi().deleteStartupPost(id);
      await fetchStartupPosts();
    } catch (err) {
      console.error("删除创业信息失败", err);
      alert("删除创业信息失败");
    }
  }

  async function handleChangeStartupStatus(id: string, status: StartupPostStatus) {
    try {
      const { getAdminApi } = await import("../../src/api");
      await getAdminApi().updateStartupPostStatus(id, status);
      setStartupPosts((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
    } catch (err) {
      console.error("更新状态失败", err);
      alert("更新状态失败");
    }
  }

  return (
    <div style={{ background: "#0a0c10", minHeight: "100vh", color: "#fff" }}>
      <main style={{ padding: "40px", maxWidth: "1300px", margin: "0 auto" }}>
        <header
          style={{
            marginBottom: "30px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px"
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
              任务管理
            </h1>
            <p style={{ color: "rgba(255,255,255,0.55)", marginTop: "8px" }}>
              在同一模块下管理悬赏任务与创业信息，互不影响、独立发布。
            </p>

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button
                onClick={() => setActiveTab("bounty")}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border:
                    activeTab === "bounty"
                      ? "1px solid #5b8cff"
                      : "1px solid rgba(255,255,255,0.15)",
                  background: activeTab === "bounty" ? "rgba(91,140,255,0.2)" : "transparent",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                悬赏任务
              </button>
              <button
                onClick={() => setActiveTab("startup")}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border:
                    activeTab === "startup"
                      ? "1px solid #5b8cff"
                      : "1px solid rgba(255,255,255,0.15)",
                  background: activeTab === "startup" ? "rgba(91,140,255,0.2)" : "transparent",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                创业信息
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              if (activeTab === "bounty") {
                setIsTaskModalOpen(true);
              } else {
                void openCreateStartupModal();
              }
            }}
            style={{
              background: "#5b8cff",
              border: "none",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            {activeTab === "bounty" ? "发布新任务" : "发布创业信息"}
          </button>
        </header>

        {activeTab === "bounty" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "30px" }}>
            <section>
              <h2
                style={{ fontSize: "18px", marginBottom: "15px", color: "rgba(255,255,255,0.85)" }}
              >
                现有任务
              </h2>
              {loadingBounty ? (
                <div style={{ color: "rgba(255,255,255,0.6)" }}>加载中...</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {tasks.map((task) => (
                    <div
                      key={task.taskId}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        padding: "15px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.08)"
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start"
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: "4px" }}>{task.title}</div>
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "rgba(91,140,255,0.15)",
                            color: "#5b8cff",
                            border: "1px solid rgba(91,140,255,0.3)"
                          }}
                        >
                          {task.difficulty}
                        </span>
                      </div>
                      <div style={{ fontSize: "13px", color: "#00e5a0" }}>
                        奖励: {task.points} 积分
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2
                style={{ fontSize: "18px", marginBottom: "15px", color: "rgba(255,255,255,0.85)" }}
              >
                待审核证明
              </h2>
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
                      <th style={cellStyle}>提交者ID</th>
                      <th style={cellStyle}>任务</th>
                      <th style={cellStyle}>证明内容</th>
                      <th style={cellStyle}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingBounty ? (
                      <tr>
                        <td colSpan={4} style={{ padding: "20px", textAlign: "center" }}>
                          加载中...
                        </td>
                      </tr>
                    ) : submissions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          style={{
                            padding: "20px",
                            textAlign: "center",
                            color: "rgba(255,255,255,0.55)"
                          }}
                        >
                          暂无待审核提交
                        </td>
                      </tr>
                    ) : (
                      submissions.map((sub) => (
                        <tr
                          key={sub.submissionId}
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                        >
                          <td style={cellStyle}>{sub.userId}</td>
                          <td style={cellStyle}>taskId: {sub.taskId}</td>
                          <td
                            style={{
                              ...cellStyle,
                              fontSize: "12px",
                              color: "rgba(255,255,255,0.65)"
                            }}
                          >
                            {sub.proof}
                          </td>
                          <td style={cellStyle}>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={() =>
                                  void handleReviewSubmission(sub.submissionId, "approve")
                                }
                                style={{
                                  background: "#00e5a0",
                                  border: "none",
                                  color: "#000",
                                  padding: "4px 10px",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  cursor: "pointer"
                                }}
                              >
                                通过
                              </button>
                              <button
                                onClick={() =>
                                  void handleReviewSubmission(sub.submissionId, "reject")
                                }
                                style={{
                                  background: "rgba(255,77,109,0.2)",
                                  border: "1px solid rgba(255,77,109,0.5)",
                                  color: "#ff4d6d",
                                  padding: "4px 10px",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  cursor: "pointer"
                                }}
                              >
                                拒绝
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : (
          <section>
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                marginBottom: "16px",
                flexWrap: "wrap"
              }}
            >
              <input
                value={startupKeywordInput}
                onChange={(e) => setStartupKeywordInput(e.target.value)}
                placeholder="搜索标题/摘要/正文"
                style={{
                  width: "320px",
                  maxWidth: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff"
                }}
              />
              <select
                value={startupStatusFilter}
                onChange={(e) => {
                  setStartupStatusFilter(e.target.value as StartupStatusFilter);
                  setStartupPage(1);
                }}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff"
                }}
              >
                <option value="all" style={{ color: "#111" }}>
                  全部状态
                </option>
                <option value="draft" style={{ color: "#111" }}>
                  草稿
                </option>
                <option value="published" style={{ color: "#111" }}>
                  已发布
                </option>
                <option value="offline" style={{ color: "#111" }}>
                  已下线
                </option>
              </select>
              <button
                onClick={() => {
                  setStartupPage(1);
                  setStartupKeyword(startupKeywordInput.trim());
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(91,140,255,0.4)",
                  background: "rgba(91,140,255,0.18)",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                查询
              </button>
              <button
                onClick={() => {
                  setStartupPage(1);
                  setStartupKeywordInput("");
                  setStartupKeyword("");
                  setStartupStatusFilter("all");
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "transparent",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                重置
              </button>
            </div>

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
                    <th style={cellStyle}>标题</th>
                    <th style={cellStyle}>分类</th>
                    <th style={cellStyle}>状态</th>
                    <th style={cellStyle}>浏览量</th>
                    <th style={cellStyle}>发布时间</th>
                    <th style={cellStyle}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingStartup ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "20px", textAlign: "center" }}>
                        加载中...
                      </td>
                    </tr>
                  ) : startupPosts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: "20px",
                          textAlign: "center",
                          color: "rgba(255,255,255,0.55)"
                        }}
                      >
                        暂无创业信息
                      </td>
                    </tr>
                  ) : (
                    startupPosts.map((post) => (
                      <tr
                        key={post.id}
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                      >
                        <td style={cellStyle}>
                          <div style={{ fontWeight: 600 }}>{post.title}</div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "rgba(255,255,255,0.6)",
                              marginTop: "4px"
                            }}
                          >
                            {post.summary || "-"}
                          </div>
                        </td>
                        <td style={cellStyle}>{post.category || "-"}</td>
                        <td style={cellStyle}>
                          <select
                            value={post.status}
                            onChange={(e) =>
                              void handleChangeStartupStatus(
                                post.id,
                                e.target.value as StartupPostStatus
                              )
                            }
                            style={{
                              padding: "6px 8px",
                              borderRadius: "6px",
                              background: "rgba(255,255,255,0.06)",
                              border: "1px solid rgba(255,255,255,0.15)",
                              color: "#fff"
                            }}
                          >
                            <option value="draft" style={{ color: "#111" }}>
                              草稿
                            </option>
                            <option value="published" style={{ color: "#111" }}>
                              已发布
                            </option>
                            <option value="offline" style={{ color: "#111" }}>
                              已下线
                            </option>
                          </select>
                        </td>
                        <td style={cellStyle}>{post.viewCount}</td>
                        <td style={cellStyle}>
                          {post.publishedAt
                            ? new Date(post.publishedAt).toLocaleString("zh-CN")
                            : "-"}
                        </td>
                        <td style={cellStyle}>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => void openEditStartupModal(post.id)}
                              style={{
                                background: "rgba(91,140,255,0.18)",
                                border: "1px solid rgba(91,140,255,0.4)",
                                color: "#8fb0ff",
                                padding: "4px 10px",
                                borderRadius: "4px",
                                fontSize: "12px",
                                cursor: "pointer"
                              }}
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => void handleDeleteStartupPost(post.id)}
                              style={{
                                background: "rgba(255,77,109,0.2)",
                                border: "1px solid rgba(255,77,109,0.5)",
                                color: "#ff4d6d",
                                padding: "4px 10px",
                                borderRadius: "4px",
                                fontSize: "12px",
                                cursor: "pointer"
                              }}
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div
              style={{
                marginTop: "14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: "rgba(255,255,255,0.7)"
              }}
            >
              <span>
                共 {startupTotal} 条，第 {startupPage}/{startupTotalPages} 页
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  disabled={startupPage <= 1}
                  onClick={() => setStartupPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "transparent",
                    color: "#fff",
                    cursor: startupPage <= 1 ? "not-allowed" : "pointer",
                    opacity: startupPage <= 1 ? 0.5 : 1
                  }}
                >
                  上一页
                </button>
                <button
                  disabled={startupPage >= startupTotalPages}
                  onClick={() => setStartupPage((p) => Math.min(startupTotalPages, p + 1))}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "transparent",
                    color: "#fff",
                    cursor: startupPage >= startupTotalPages ? "not-allowed" : "pointer",
                    opacity: startupPage >= startupTotalPages ? 0.5 : 1
                  }}
                >
                  下一页
                </button>
              </div>
            </div>
          </section>
        )}

        {isTaskModalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.7)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000
            }}
          >
            <div
              style={{
                background: "#1a1d24",
                padding: "30px",
                borderRadius: "16px",
                width: "500px",
                border: "1px solid rgba(255,255,255,0.1)"
              }}
            >
              <h2 style={{ marginBottom: "20px", fontSize: "20px" }}>发布新任务</h2>

              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.7)"
                  }}
                >
                  任务标题
                </label>
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff"
                  }}
                  placeholder="例如：开发一个爬虫脚本"
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.7)"
                  }}
                >
                  详细描述
                </label>
                <textarea
                  value={newTaskContent}
                  onChange={(e) => setNewTaskContent(e.target.value)}
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                    resize: "vertical"
                  }}
                  placeholder="任务的具体要求..."
                />
              </div>

              <div style={{ display: "flex", gap: "15px", marginBottom: "25px" }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.7)"
                    }}
                  >
                    奖励积分
                  </label>
                  <input
                    type="number"
                    value={newTaskPoints}
                    onChange={(e) => setNewTaskPoints(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff"
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.7)"
                    }}
                  >
                    难度
                  </label>
                  <select
                    value={newTaskDifficulty}
                    onChange={(e) =>
                      setNewTaskDifficulty(e.target.value as "EASY" | "MEDIUM" | "HARD" | "EXPERT")
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff"
                    }}
                  >
                    <option value="EASY" style={{ color: "#000" }}>
                      EASY
                    </option>
                    <option value="MEDIUM" style={{ color: "#000" }}>
                      MEDIUM
                    </option>
                    <option value="HARD" style={{ color: "#000" }}>
                      HARD
                    </option>
                    <option value="EXPERT" style={{ color: "#000" }}>
                      EXPERT
                    </option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  onClick={() => setIsTaskModalOpen(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff",
                    cursor: "pointer"
                  }}
                >
                  取消
                </button>
                <button
                  onClick={() => void handleCreateTask()}
                  disabled={isTaskSubmitting}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: "#5b8cff",
                    border: "none",
                    color: "#fff",
                    cursor: isTaskSubmitting ? "not-allowed" : "pointer",
                    opacity: isTaskSubmitting ? 0.7 : 1
                  }}
                >
                  {isTaskSubmitting ? "发布中..." : "确认发布"}
                </button>
              </div>
            </div>
          </div>
        )}

        {isStartupModalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.7)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000
            }}
          >
            <div
              style={{
                background: "#1a1d24",
                padding: "24px",
                borderRadius: "16px",
                width: "640px",
                maxWidth: "92vw",
                border: "1px solid rgba(255,255,255,0.1)",
                maxHeight: "88vh",
                overflowY: "auto"
              }}
            >
              <h2 style={{ marginBottom: "16px", fontSize: "20px" }}>
                {editingStartupId ? "编辑创业信息" : "发布创业信息"}
              </h2>

              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.7)"
                  }}
                >
                  标题
                </label>
                <input
                  value={startupTitle}
                  onChange={(e) => setStartupTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff"
                  }}
                  placeholder="例如：适合普通人启动的轻资产项目"
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.7)"
                  }}
                >
                  摘要
                </label>
                <input
                  value={startupSummary}
                  onChange={(e) => setStartupSummary(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff"
                  }}
                  placeholder="一句话说明这个创业信息"
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "14px",
                    color: "rgba(255,255,255,0.7)"
                  }}
                >
                  正文
                </label>
                <textarea
                  value={startupContent}
                  onChange={(e) => setStartupContent(e.target.value)}
                  rows={7}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                    resize: "vertical"
                  }}
                  placeholder="请填写项目介绍、投入成本、收益模型、风险提示等"
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginBottom: "12px"
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.7)"
                    }}
                  >
                    分类
                  </label>
                  <input
                    value={startupCategory}
                    onChange={(e) => setStartupCategory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff"
                    }}
                    placeholder="例如：副业、餐饮、电商"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.7)"
                    }}
                  >
                    标签（逗号分隔）
                  </label>
                  <input
                    value={startupTagsInput}
                    onChange={(e) => setStartupTagsInput(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff"
                    }}
                    placeholder="低成本, 可复制"
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginBottom: "12px"
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.7)"
                    }}
                  >
                    联系方式
                  </label>
                  <input
                    value={startupContactInfo}
                    onChange={(e) => setStartupContactInfo(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff"
                    }}
                    placeholder="微信号/邮箱/电话"
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.7)"
                    }}
                  >
                    来源链接
                  </label>
                  <input
                    value={startupSourceUrl}
                    onChange={(e) => setStartupSourceUrl(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff"
                    }}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "12px",
                  marginBottom: "20px"
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.7)"
                    }}
                  >
                    封面图链接
                  </label>
                  <input
                    value={startupCoverImageUrl}
                    onChange={(e) => setStartupCoverImageUrl(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff"
                    }}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.7)"
                    }}
                  >
                    排序
                  </label>
                  <input
                    type="number"
                    value={startupSort}
                    onChange={(e) => setStartupSort(Number(e.target.value) || 0)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff"
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.7)"
                    }}
                  >
                    状态
                  </label>
                  <select
                    value={startupStatus}
                    onChange={(e) => setStartupStatus(e.target.value as StartupPostStatus)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff"
                    }}
                  >
                    <option value="draft" style={{ color: "#000" }}>
                      草稿
                    </option>
                    <option value="published" style={{ color: "#000" }}>
                      已发布
                    </option>
                    <option value="offline" style={{ color: "#000" }}>
                      已下线
                    </option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  onClick={() => {
                    setIsStartupModalOpen(false);
                    resetStartupForm();
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff",
                    cursor: "pointer"
                  }}
                >
                  取消
                </button>
                <button
                  onClick={() => void handleSaveStartupPost()}
                  disabled={isStartupSubmitting}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    background: "#5b8cff",
                    border: "none",
                    color: "#fff",
                    cursor: isStartupSubmitting ? "not-allowed" : "pointer",
                    opacity: isStartupSubmitting ? 0.7 : 1
                  }}
                >
                  {isStartupSubmitting ? "保存中..." : "确认保存"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

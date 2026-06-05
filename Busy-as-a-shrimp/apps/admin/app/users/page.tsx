"use client";

import { useEffect, useMemo, useState } from "react";

import { getAdminApi } from "../../src/api";
import type { AdminUser, UserStatus } from "../../src/api/admin-api";
import { EmptyState } from "../../src/components/empty-state";
import styles from "../page.module.css";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("zh-CN", { hour12: false });
}

const ROLE_LABEL: Record<string, string> = {
  service: "服务方",
  resource: "资源方",
  both: "双角色"
};

const MEMBER_LABEL: Record<string, string> = {
  free: "免费版",
  monthly: "月度版",
  yearly: "年度版",
  lifetime: "终身版"
};

const STATUS_LABEL: Record<string, string> = {
  active: "正常",
  frozen: "已冻结",
  banned: "已封禁"
};

const STATUS_FILTER_TABS: Array<{ key: "all" | UserStatus; label: string }> = [
  { key: "all", label: "全部" },
  { key: "active", label: "正常" },
  { key: "frozen", label: "已冻结" },
  { key: "banned", label: "已封禁" }
];

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [operating, setOperating] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await getAdminApi().users({
          status: statusFilter === "all" ? undefined : statusFilter,
          page,
          pageSize
        });
        if (active) {
          setUsers(result.list);
          setTotal(result.total);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "加载用户数据失败。");
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
  }, [statusFilter, page, pageSize]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      return (
        search === "" ||
        String(u.userId).includes(search) ||
        u.phoneMasked.includes(search) ||
        (u.city ?? "").includes(search)
      );
    });
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [statusFilter, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function handleStatusChange(userId: number, next: UserStatus) {
    setOperating(userId);
    setNotice(null);
    try {
      await getAdminApi().updateUserStatus(userId, next);
      setUsers((prev) => prev.map((u) => (u.userId === userId ? { ...u, status: next } : u)));
      setNotice(`用户 #${userId} 状态已更新为「${STATUS_LABEL[next]}」。`);
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
          <h1 className={styles.title}>用户管理</h1>
          <p className={styles.subtitle}>查看用户状态、角色与最近注册记录。</p>
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
          placeholder="搜索用户ID / 手机号 / 城市"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            height: "38px",
            padding: "0 14px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
            color: "#f8fafc",
            fontSize: "14px",
            outline: "none",
            width: "260px"
          }}
        />
        <div style={{ display: "flex", gap: "6px" }}>
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
          总 {total} 条{search ? `（当前页匹配 ${filtered.length} 条）` : ""}
        </span>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          style={{
            height: "36px",
            padding: "0 12px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)",
            color: "#94a3b8",
            fontSize: "13px"
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
        >
          {notice}
        </p>
      ) : null}

      {loading ? <p className={styles.loading}>正在加载用户数据...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !error && filtered.length === 0 ? (
        <EmptyState title="暂无用户" text="没有符合当前筛选条件的用户记录。" />
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>用户列表</h2>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>用户ID</th>
                  <th>手机号</th>
                  <th>角色</th>
                  <th>城市</th>
                  <th>会员等级</th>
                  <th>团长级别</th>
                  <th>状态</th>
                  <th>注册时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.userId}>
                    <td>#{item.userId}</td>
                    <td>{item.phoneMasked}</td>
                    <td>{ROLE_LABEL[item.role] ?? item.role}</td>
                    <td>{item.city || "-"}</td>
                    <td>{MEMBER_LABEL[item.memberLevel] ?? item.memberLevel}</td>
                    <td>
                      {item.captainLevel
                        ? { normal: "普通", advanced: "高级", gold: "金牌" }[item.captainLevel]
                        : "-"}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles[item.status]}`}>
                        {STATUS_LABEL[item.status] ?? item.status}
                      </span>
                    </td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {item.status !== "active" && (
                          <button
                            type="button"
                            disabled={operating === item.userId}
                            onClick={() => handleStatusChange(item.userId, "active")}
                            style={{
                              fontSize: "12px",
                              padding: "3px 10px",
                              borderRadius: "6px",
                              border: "1px solid rgba(52,211,153,0.4)",
                              background: "rgba(52,211,153,0.1)",
                              color: "#6ee7b7",
                              cursor: "pointer",
                              fontFamily: "inherit"
                            }}
                          >
                            解封
                          </button>
                        )}
                        {item.status === "active" && (
                          <button
                            type="button"
                            disabled={operating === item.userId}
                            onClick={() => handleStatusChange(item.userId, "frozen")}
                            style={{
                              fontSize: "12px",
                              padding: "3px 10px",
                              borderRadius: "6px",
                              border: "1px solid rgba(251,191,36,0.4)",
                              background: "rgba(251,191,36,0.1)",
                              color: "#fde68a",
                              cursor: "pointer",
                              fontFamily: "inherit"
                            }}
                          >
                            冻结
                          </button>
                        )}
                        {item.status !== "banned" && (
                          <button
                            type="button"
                            disabled={operating === item.userId}
                            onClick={() => handleStatusChange(item.userId, "banned")}
                            style={{
                              fontSize: "12px",
                              padding: "3px 10px",
                              borderRadius: "6px",
                              border: "1px solid rgba(248,113,113,0.4)",
                              background: "rgba(248,113,113,0.1)",
                              color: "#fca5a5",
                              cursor: "pointer",
                              fontFamily: "inherit"
                            }}
                          >
                            封禁
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "12px"
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
        </section>
      ) : null}
    </main>
  );
}

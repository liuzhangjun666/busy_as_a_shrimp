"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getAdminToken, saveAdminSession, type AdminSessionProfile } from "../../lib/auth";
import styles from "./page.module.css";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface AdminLoginResult {
  token: string;
  expiresIn: number;
  profile: AdminSessionProfile;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081/api/v1";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirectTo, setRedirectTo] = useState("/");
  // 处理来自用户端的 token 移交跳转，避免闪现登录表单
  const [handingOver, setHandingOver] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const redirectTarget = params.get("redirect") || "/";
      setRedirectTo(redirectTarget);
      const token = params.get("token");
      const profileStr = params.get("profile");

      if (token && profileStr) {
        // 立即标记移交中，隐藏登录表单
        setHandingOver(true);
        try {
          const profile = JSON.parse(profileStr) as AdminSessionProfile;
          saveAdminSession(token, profile);
          // 使用 replace 避免留下历史记录（含 token 的 URL）
          router.replace(redirectTarget);
          return;
        } catch (handoverError) {
          console.error("Failed to restore admin session", handoverError);
          setHandingOver(false);
        }
      }

      if (getAdminToken()) {
        router.replace(redirectTarget);
      }
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username: username.trim(), password: password.trim() })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const body = (await response.json()) as ApiResponse<AdminLoginResult>;
      if (!body.success) {
        throw new Error(body.message || "登录失败");
      }

      saveAdminSession(body.data.token, body.data.profile);
      router.replace(redirectTo || "/");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "登录失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  // token 移交跳转中，显示过渡屏避免闪现表单
  if (handingOver) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <p style={{ color: "#8de6ff", textAlign: "center", fontSize: "15px" }}>
            正在跳转到管理后台...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>虾忙后台管理平台</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            用户名
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </label>

          <label>
            密码
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword((current) => !current)}
                title={showPassword ? "隐藏密码" : "显示密码"}
              >
                {showPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          {error ? <p className={styles.error}>{error}</p> : null}

          <button type="submit" disabled={loading}>
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
      </section>
    </main>
  );
}

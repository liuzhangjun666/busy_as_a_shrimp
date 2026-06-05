"use client";

import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { clearAdminSession, getAdminProfile, type AdminSessionProfile } from "../lib/auth";

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<AdminSessionProfile | null>(null);
  const [time, setTime] = useState("");

  useEffect(() => {
    if (pathname !== "/login") {
      setProfile(getAdminProfile());
    }
  }, [pathname]);

  // 实时时钟
  useEffect(() => {
    function tick() {
      setTime(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (pathname === "/login") return null;

  function navigate(path: string) {
    router.push(path);
  }

  const navItems = [
    { path: "/", label: "首页" },
    { path: "/dashboard", label: "数据看板" },
    { path: "/users", label: "用户管理" },
    { path: "/resources/review", label: "资源审核" },
    { path: "/captain/ranking", label: "团长排行" },
    { path: "/activity", label: "拉新活动" },
    { path: "/tasks", label: "任务管理" },
    { path: "/risk/brush-order-penalties", label: "风控处罚" },
    { path: "/matches", label: "匹配记录" },
    { path: "/dict", label: "数据字典" },
    { path: "/announcements", label: "平台公告" },
    { path: "/ai-briefs", label: "AI快报" },
    { path: "/solo-signals", label: "AI一人公司情报" }
  ];

  return (
    <nav className="admin-nav">
      {/* 品牌区域 */}
      <button
        type="button"
        onClick={() => navigate("/")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginRight: "20px",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          flexShrink: 0
        }}
      >
        {/* Logo 图标 */}
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            overflow: "hidden",
            border: "1px solid rgba(0, 212, 255, 0.35)",
            background: "rgba(0, 0, 0, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 16px rgba(91,140,255,0.4), inset 0 0 10px rgba(0,212,255,0.1)",
            flexShrink: 0,
            padding: "2px"
          }}
        >
          <img
            src="/logo.png"
            alt="Logo"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(1.1) contrast(1.05) saturate(1.1)"
            }}
          />
        </div>
        {/* 品牌文字 */}
        <div
          style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0px" }}
        >
          <span
            style={{
              fontSize: "15px",
              fontWeight: 700,
              letterSpacing: "0.02em",
              background: "linear-gradient(90deg, #c4d6ff, #00d4ff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              lineHeight: 1.2
            }}
          >
            虾忙后台
          </span>
          <span
            style={{
              fontSize: "10px",
              color: "rgba(99,139,255,0.6)",
              letterSpacing: "0.12em",
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1,
              textTransform: "uppercase"
            }}
          >
            Admin Console
          </span>
        </div>
      </button>

      {/* 分隔线 */}
      <div
        style={{
          width: "1px",
          height: "20px",
          background: "rgba(99,139,255,0.2)",
          marginRight: "12px",
          flexShrink: 0
        }}
      />

      {/* 导航菜单 */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1 }}>
        {navItems.map((item) => (
          <button
            key={item.path}
            type="button"
            className={`nav-item ${pathname === item.path ? "active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 右侧控制区 */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
        {/* 实时时钟 */}
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "12px",
            color: "rgba(0,212,255,0.6)",
            letterSpacing: "0.05em"
          }}
        >
          {time}
        </span>

        {/* 状态指示点 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 10px",
            borderRadius: "20px",
            border: "1px solid rgba(0,229,160,0.2)",
            background: "rgba(0,229,160,0.06)"
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#00e5a0",
              boxShadow: "0 0 6px #00e5a0",
              animation: "pulse 2s ease-in-out infinite"
            }}
          />
          <span style={{ fontSize: "11px", color: "rgba(0,229,160,0.8)", fontWeight: 500 }}>
            在线
          </span>
        </div>

        {/* 管理员信息 */}
        <span
          style={{
            fontSize: "13px",
            color: "rgba(140,180,255,0.8)",
            fontWeight: 500
          }}
        >
          {profile?.username ?? "admin"}
        </span>

        {/* 退出按钮 */}
        <button
          type="button"
          onClick={() => {
            clearAdminSession();
            window.location.href = "http://localhost:3000";
          }}
          style={{
            height: "32px",
            padding: "0 14px",
            borderRadius: "8px",
            border: "1px solid rgba(255,77,109,0.3)",
            background: "rgba(255,77,109,0.08)",
            color: "rgba(255,150,170,0.9)",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.2s",
            letterSpacing: "0.02em"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,77,109,0.18)";
            e.currentTarget.style.borderColor = "rgba(255,77,109,0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,77,109,0.08)";
            e.currentTarget.style.borderColor = "rgba(255,77,109,0.3)";
          }}
        >
          退出
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </nav>
  );
}

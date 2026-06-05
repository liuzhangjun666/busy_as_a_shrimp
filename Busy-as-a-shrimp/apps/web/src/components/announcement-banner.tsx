"use client";

import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { getAnnouncementApi } from "@/api";
import type { Announcement } from "@/api/announcement-api";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "shrimp_dismissed_announcements";

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    getAnnouncementApi()
      .list()
      .then((data) => {
        if (data && data.length > 0) {
          const latest = data[0];
          // 检查是否已被用户关闭过
          try {
            const dismissedIds = JSON.parse(
              localStorage.getItem(DISMISSED_KEY) || "[]"
            ) as string[];
            if (!dismissedIds.includes(latest.id)) {
              setAnnouncement(latest);
              setVisible(true);
            }
          } catch {
            setAnnouncement(latest);
            setVisible(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    if (!announcement) return;
    setVisible(false);
    try {
      const dismissedIds = JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]") as string[];
      if (!dismissedIds.includes(announcement.id)) {
        dismissedIds.push(announcement.id);
        localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissedIds));
      }
    } catch {
      // ignore
    }
  };

  if (!visible || !announcement) return null;

  const typeConfig: Record<string, { bg: string; text: string; glow: string; label: string }> = {
    notice: {
      bg: "bg-blue-950/60 border-blue-500/30",
      text: "text-blue-100",
      glow: "shadow-[0_4px_20px_rgba(59,130,246,0.15)]",
      label: "系统通知"
    },
    activity: {
      bg: "bg-emerald-950/60 border-emerald-500/30",
      text: "text-emerald-100",
      glow: "shadow-[0_4px_20px_rgba(16,185,129,0.15)]",
      label: "近期活动"
    },
    warning: {
      bg: "bg-red-950/60 border-red-500/30",
      text: "text-red-100",
      glow: "shadow-[0_4px_20px_rgba(239,68,68,0.15)]",
      label: "安全警告"
    }
  };

  const config = typeConfig[announcement.type] || typeConfig.notice;

  return (
    <div
      className={cn(
        "relative w-full flex items-center justify-between px-4 py-2 rounded-lg border overflow-hidden mb-5 backdrop-blur-md",
        config.bg,
        config.text,
        config.glow
      )}
    >
      <div className="flex items-center w-full min-w-0 z-10">
        <span className="flex items-center justify-center shrink-0 mr-3">
          <Megaphone className="w-[18px] h-[18px] opacity-90 text-current drop-shadow-md" />
        </span>

        {/* 跑马灯滚动容器 */}
        <div className="flex-1 overflow-hidden relative h-[22px] flex items-center shadow-inner">
          <div className="animate-marquee whitespace-nowrap flex items-center h-full">
            <span className="text-[11px] uppercase tracking-widest opacity-80 font-mono font-bold mr-2 bg-black/20 px-1.5 py-0.5 rounded border border-white/5">
              {config.label}
            </span>
            <span className="text-sm font-medium tracking-wide">
              <span className="mr-2 text-white/95">{announcement.title}</span>
              <span className="opacity-80 mx-2">—</span>
              <span className="opacity-80">{announcement.content}</span>
            </span>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 ml-3 rounded-md hover:bg-white/10 transition-colors shrink-0 text-inherit opacity-60 hover:opacity-100"
          aria-label="关闭公告"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

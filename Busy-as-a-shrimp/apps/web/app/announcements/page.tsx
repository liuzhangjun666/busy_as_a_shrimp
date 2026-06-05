"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  ChevronLeft,
  User,
  Clock,
  Loader2,
  Info,
  AlertTriangle,
  Star
} from "lucide-react";
import { getAnnouncementApi } from "@/api";
import type { Announcement } from "@/api/announcement-api";
import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";

const typeStyles: Record<
  string,
  { bg: string; border: string; text: string; icon: LucideIcon; label: string; glow: string }
> = {
  notice: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    text: "text-blue-400",
    icon: Info,
    label: "系统通知",
    glow: "group-hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]"
  },
  activity: {
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    icon: Star,
    label: "活动资讯",
    glow: "group-hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]"
  },
  warning: {
    bg: "bg-rose-500/5",
    border: "border-rose-500/20",
    text: "text-rose-400",
    icon: AlertTriangle,
    label: "安全警告",
    glow: "group-hover:shadow-[0_0_20px_rgba(244,63,94,0.1)]"
  }
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnnouncementApi()
      .list()
      .then((data) => {
        setAnnouncements(data);
      })
      .catch((error) => {
        console.error("Failed to fetch announcements:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-cyan-500/30">
      {/* 科技背景背景装饰 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.02]" />
        <div className="absolute top-[-10%] righ-[-10%] w-[800px] h-[400px] bg-cyan-500/10 blur-[130px] rounded-full" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-12 lg:py-20 z-10">
        {/* 顶部导航 */}
        <header className="mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-zinc-400 hover:text-cyan-400 hover:bg-white/10 hover:border-cyan-500/20 transition-all group mb-8"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-bold tracking-widest uppercase">
              返回终端 (BACK_TO_TERMINAL)
            </span>
          </Link>

          <div className="flex items-end gap-5">
            <div className="flex items-center justify-center w-16 h-16 rounded-3xl bg-zinc-900 border border-t-cyan-500/40 border-white/5 shadow-2xl backdrop-blur-xl">
              <Megaphone className="w-8 h-8 text-cyan-500" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500 uppercase">
                系统公告中心
              </h1>
              <p className="text-zinc-500 text-sm font-medium mt-1 uppercase tracking-widest">
                System Broadcast & Security Alerts
              </p>
            </div>
          </div>
        </header>

        {/* 公告列表 */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            <span className="text-xs font-mono text-zinc-600 tracking-[0.2em] uppercase">
              数据同步中 (SYNCING_RECORDS)...
            </span>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-32 border border-dashed border-white/5 rounded-[2rem] bg-white/[0.02]">
            <p className="text-zinc-500 text-sm font-mono tracking-widest">
              目前暂无分发的公告信息
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {announcements.map((item) => {
              const style = typeStyles[item.type] || typeStyles.notice;
              const Icon = style.icon;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "group relative p-8 rounded-[2rem] border transition-all duration-500 hover:-translate-y-1",
                    style.bg,
                    style.border,
                    style.glow
                  )}
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-6">
                    {/* 公告分类与图标 */}
                    <div className="shrink-0 flex md:flex-col items-center gap-3">
                      <div
                        className={cn(
                          "flex items-center justify-center w-12 h-12 rounded-2xl border transition-all",
                          style.border,
                          "bg-black/40 group-hover:scale-110"
                        )}
                      >
                        <Icon className={cn("w-5 h-5", style.text)} />
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-black uppercase tracking-[0.2em] md:rotate-180 md:[writing-mode:vertical-lr] opacity-30 group-hover:opacity-60 transition-opacity",
                          style.text
                        )}
                      >
                        {style.label}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-4 mb-4">
                        <h2 className="text-xl font-bold tracking-tight text-zinc-100 group-hover:text-cyan-400 transition-colors">
                          {item.title}
                        </h2>
                      </div>

                      <div className="prose prose-invert max-w-none mb-8">
                        <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">
                          {item.content}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-y-2 gap-x-6 border-t border-white/5 pt-6 mt-auto">
                        <div className="flex items-center gap-2 text-zinc-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-mono tracking-wider uppercase">
                            {new Date(item.publishedAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500">
                          <User className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-mono tracking-wider uppercase">
                            {item.publishedBy}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 修饰性角标 */}
                  <div className="absolute top-6 right-8 text-[8px] font-mono text-zinc-700 select-none">
                    REF_ID: #{item.id.padStart(4, "0")}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <footer className="mt-20 text-center">
          <p className="text-[10px] font-mono text-zinc-700 tracking-[0.3em] uppercase">
            End of Transmission — Busy as a Shrimp Network
          </p>
        </footer>
      </div>
    </div>
  );
}

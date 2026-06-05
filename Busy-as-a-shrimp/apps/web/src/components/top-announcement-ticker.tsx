"use client";

import { useEffect, useMemo, useState } from "react";
import { Megaphone } from "lucide-react";

import { getAnnouncementApi } from "@/api";
import type { Announcement } from "@/api/announcement-api";

function pickLatestAnnouncement(list: Announcement[]): Announcement | null {
  if (!Array.isArray(list) || list.length === 0) {
    return null;
  }

  return [...list].sort((a, b) => {
    const aTs = new Date(a.publishedAt).getTime();
    const bTs = new Date(b.publishedAt).getTime();
    return bTs - aTs;
  })[0];
}

export function TopAnnouncementTicker() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    getAnnouncementApi()
      .list()
      .then((data) => {
        setAnnouncement(pickLatestAnnouncement(data));
      })
      .catch(() => {
        setAnnouncement(null);
      });
  }, []);

  const tickerText = useMemo(() => {
    if (!announcement) {
      return "";
    }

    return `${announcement.title} · ${announcement.content}`;
  }, [announcement]);

  if (!tickerText) {
    return null;
  }

  return (
    <div className="relative z-[45] w-full border-b border-slate-200 bg-white/95">
      <div className="mx-auto flex h-7 max-w-6xl items-center gap-3 px-4 md:px-6">
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-600">
          <Megaphone className="h-3 w-3" />
          公告
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="animate-marquee-loop inline-flex min-w-max items-center whitespace-nowrap text-xs font-medium text-slate-600">
            <span className="pr-10">{tickerText}</span>
            <span aria-hidden="true" className="pr-10">
              {tickerText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

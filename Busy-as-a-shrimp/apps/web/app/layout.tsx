import type { Metadata } from "next";
import React from "react";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { MswProvider } from "../src/components/msw-provider";
import { QueryProvider } from "../src/components/providers/query-provider";
import { TopNav } from "../src/components/top-nav";
import { PageProgressBar } from "../src/components/page-progress-bar";
import { ActivationGuard } from "../src/components/activation/activation-guard";
import { TopAnnouncementTicker } from "../src/components/top-announcement-ticker";
import { SiteFooter } from "../src/components/site-footer";
import { DeferredGlobalWidgets } from "../src/components/deferred-global-widgets";
import "./globals.css";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "AI资源共享平台 - H5",
  description: "用户端H5入口",
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={cn("font-sans")}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <MswProvider>
          <QueryProvider>
            <Suspense fallback={null}>
              <PageProgressBar />
            </Suspense>
            <Suspense fallback={null}>
              <ActivationGuard />
            </Suspense>
            <Suspense fallback={null}>
              <TopNav />
            </Suspense>
            <Suspense fallback={null}>
              <TopAnnouncementTicker />
            </Suspense>
            <div className="mx-auto min-h-screen max-w-7xl px-4 pb-4 pt-0 md:px-6 md:pb-5 md:pt-0">
              <main className="pb-8">{children}</main>
            </div>
            <SiteFooter />
            <DeferredGlobalWidgets />
            <Toaster />
          </QueryProvider>
        </MswProvider>
      </body>
    </html>
  );
}

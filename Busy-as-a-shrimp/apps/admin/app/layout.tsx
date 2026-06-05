import type { Metadata } from "next";
import React from "react";
import { AdminAuthGate } from "./admin-auth-gate";
import { AdminNav } from "./AdminNav";
import { MswProvider } from "../src/components/msw-provider";
import { QueryProvider } from "../src/components/providers/query-provider";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "虾忙后台管理平台",
  description: "虾忙 AI 资源共享平台 · 运营管理控制台",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🦐</text></svg>"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <MswProvider />
        <QueryProvider>
          <AdminAuthGate>
            <div className="admin-shell">
              <AdminNav />
              {children}
            </div>
          </AdminAuthGate>
        </QueryProvider>
      </body>
    </html>
  );
}

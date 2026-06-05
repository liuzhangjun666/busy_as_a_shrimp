"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  clearAdminSession,
  getAdminToken,
  saveAdminSession,
  type AdminSessionProfile
} from "../lib/auth";

interface AdminAuthGateProps {
  children: React.ReactNode;
}

function buildCurrentPath(pathname: string, searchParams: URLSearchParams): string {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function AdminAuthGate({ children }: AdminAuthGateProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const searchKey = useMemo(() => searchParams.toString(), [searchParams]);

  useEffect(() => {
    const isLoginPage = pathname === "/login";
    const tokenFromUrl = searchParams.get("token");
    const profileFromUrl = searchParams.get("profile");

    if (tokenFromUrl && profileFromUrl) {
      try {
        const profile = JSON.parse(profileFromUrl) as AdminSessionProfile;
        saveAdminSession(tokenFromUrl, profile);
      } catch {
        clearAdminSession();
      }
    }

    const currentToken = getAdminToken();

    if (!currentToken && !isLoginPage) {
      const redirect = buildCurrentPath(pathname, new URLSearchParams(searchKey));
      const target = `/login?redirect=${encodeURIComponent(redirect)}`;
      router.replace(target);
      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          if (window.location.pathname !== "/login") {
            window.location.replace(target);
          }
        }, 120);
      }
      return;
    }

    if (currentToken && isLoginPage) {
      router.replace("/");
      return;
    }

    if (tokenFromUrl || profileFromUrl) {
      const cleanUrl = pathname === "/login" ? "/" : pathname;
      router.replace(cleanUrl);
      return;
    }

    setReady(true);
  }, [pathname, router, searchKey, searchParams]);

  if (!ready) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0c10",
          color: "rgba(226,232,240,0.9)",
          fontSize: "14px"
        }}
      >
        正在验证登录状态...
      </div>
    );
  }

  return <>{children}</>;
}

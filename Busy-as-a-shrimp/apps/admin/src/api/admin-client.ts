import { createHttpClient } from "@airp/http-client";
import { loadClientEnv } from "../env";
import { clearAdminSession, getAdminToken } from "../../lib/auth";

export function getAdminClient(): ReturnType<typeof createHttpClient> {
  const env = loadClientEnv();

  return createHttpClient({
    baseUrl: env.apiBaseUrl,
    onAuthExpired: () => {
      clearAdminSession();
      if (typeof window === "undefined") {
        return;
      }
      if (window.location.pathname !== "/login") {
        const redirect = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`;
      }
    },
    fetcher: (url, init) => {
      const headers = new Headers(init?.headers);
      const token = getAdminToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return fetch(url, { ...init, headers });
    }
  });
}

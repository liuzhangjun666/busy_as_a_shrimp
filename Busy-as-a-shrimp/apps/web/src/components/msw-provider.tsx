"use client";

import { useEffect, useState, type ReactNode } from "react";

export function MswProvider({ children }: { children: ReactNode }) {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_MSW === "1";
  const [ready, setReady] = useState(!enabled);

  useEffect(() => {
    // Clean up stale MSW workers in non-mock mode to avoid serving outdated assets.
    if (!enabled) {
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        void navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            const scriptUrls = [
              registration.active?.scriptURL,
              registration.waiting?.scriptURL,
              registration.installing?.scriptURL
            ]
              .filter(Boolean)
              .join(" ");

            if (scriptUrls.includes("mockServiceWorker.js")) {
              void registration.unregister();
            }
          }
        });
      }
      return;
    }
    void import("../mocks/browser").then(async ({ worker }) => {
      await worker.start({
        onUnhandledRequest: "bypass"
      });
      setReady(true);
    });
  }, [enabled]);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}

"use client";

import { useEffect } from "react";

export function MswProvider() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_MSW !== "1") {
      return;
    }
    void import("../mocks/browser").then(({ worker }) => {
      void worker.start({
        onUnhandledRequest: "bypass"
      });
    });
  }, []);

  return null;
}

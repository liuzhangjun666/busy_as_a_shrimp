"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const MomoFloatingAssistant = dynamic(
  () => import("./console/momo-floating-assistant").then((mod) => mod.MomoFloatingAssistant),
  { ssr: false }
);

export function DeferredGlobalWidgets() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const onReady = () => {
      if (!cancelled) {
        setReady(true);
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => onReady(), { timeout: 1500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    }

    const timer = setTimeout(() => onReady(), 800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <>
      <MomoFloatingAssistant />
    </>
  );
}

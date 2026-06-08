"use client";

import { MessageCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuthStatus } from "@/stores/use-auth-status";
import { useUserStore } from "@/stores/user-store";
import { useResourceActivationStatus } from "@/hooks/use-resource-activation-status";
import { ActivationSheet } from "@/components/activation/activation-sheet";
import { ExecutionConsole } from "@/components/console/execution-console";

type MomoOpenEvent = CustomEvent<{ command?: string }>;

function isProfilePath(pathname: string): boolean {
  return pathname === "/profile" || pathname.startsWith("/profile/");
}

export function MomoFloatingAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const { hydrated, isLoggedIn } = useAuthStatus();
  const memberLevel = useUserStore((state) => state.memberLevel);
  const activationQuery = useResourceActivationStatus(hydrated && isLoggedIn);
  const resourceCount = activationQuery.data?.length ?? 0;
  const isLocked = hydrated && isLoggedIn && !activationQuery.isPending && resourceCount === 0;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [momoOpen, setMomoOpen] = useState(false);
  const [defaultCommand, setDefaultCommand] = useState("");
  const [momoOffset, setMomoOffset] = useState({ x: 0, y: 0 });

  const momoPanelRef = useRef<HTMLDivElement | null>(null);
  const momoDragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
    startRect: DOMRect;
  } | null>(null);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const customEvent = event as MomoOpenEvent;
      const command = customEvent.detail?.command?.trim() ?? "";
      setDefaultCommand(command);
      setMomoOpen(true);
    };

    window.addEventListener("momo:open", handleOpen as EventListener);
    return () => {
      window.removeEventListener("momo:open", handleOpen as EventListener);
    };
  }, []);

  const handleMomoPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const panel = momoPanelRef.current;
      if (!panel) {
        return;
      }

      const target = event.target as HTMLElement;
      if (!target.closest('[data-momo-drag-handle="true"]')) {
        return;
      }
      if (target.closest('[data-momo-no-drag="true"],button,input,textarea,a,[role="button"]')) {
        return;
      }

      momoDragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startOffsetX: momoOffset.x,
        startOffsetY: momoOffset.y,
        startRect: panel.getBoundingClientRect()
      };

      panel.setPointerCapture(event.pointerId);
    },
    [momoOffset.x, momoOffset.y]
  );

  const handleMomoPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = momoDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    const margin = 12;

    const minLeft = margin;
    const maxLeft = Math.max(margin, window.innerWidth - dragState.startRect.width - margin);
    const minTop = margin;
    const maxTop = Math.max(margin, window.innerHeight - dragState.startRect.height - margin);

    const nextLeft = Math.min(Math.max(dragState.startRect.left + dx, minLeft), maxLeft);
    const nextTop = Math.min(Math.max(dragState.startRect.top + dy, minTop), maxTop);

    const clampedDx = nextLeft - dragState.startRect.left;
    const clampedDy = nextTop - dragState.startRect.top;

    setMomoOffset({
      x: dragState.startOffsetX + clampedDx,
      y: dragState.startOffsetY + clampedDy
    });
  }, []);

  const handleMomoPointerEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const panel = momoPanelRef.current;
    const dragState = momoDragStateRef.current;

    if (panel && dragState && dragState.pointerId === event.pointerId) {
      if (panel.hasPointerCapture(event.pointerId)) {
        panel.releasePointerCapture(event.pointerId);
      }
      momoDragStateRef.current = null;
    }
  }, []);

  if (isProfilePath(pathname)) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!isLoggedIn) {
            router.push(`/auth?redirect=${encodeURIComponent(pathname)}`);
            return;
          }
          if (isLocked) {
            setSheetOpen(true);
            return;
          }
          setMomoOpen((prev) => !prev);
        }}
        className="fixed right-4 top-1/2 z-[75] inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_16px_36px_rgba(37,99,235,0.35)] transition-all hover:scale-105 hover:from-blue-500 hover:to-indigo-500"
        aria-label="打开 momo 助手"
      >
        <MessageCircle className="h-5 w-5" />
      </button>

      {momoOpen ? (
        <div className="pointer-events-none fixed inset-0 z-[70]">
          <div
            ref={momoPanelRef}
            onPointerDown={handleMomoPointerDown}
            onPointerMove={handleMomoPointerMove}
            onPointerUp={handleMomoPointerEnd}
            onPointerCancel={handleMomoPointerEnd}
            onLostPointerCapture={handleMomoPointerEnd}
            className="pointer-events-auto absolute bottom-3 right-3 h-[min(84vh,760px)] w-[min(460px,calc(100vw-1.5rem))] touch-none sm:bottom-6 sm:right-6"
            style={{
              transform: `translate(${momoOffset.x}px, ${momoOffset.y}px)`
            }}
          >
            <ExecutionConsole
              defaultCommand={defaultCommand}
              isLocked={isLocked}
              onNeedActivation={() => setSheetOpen(true)}
              compact
              onClose={() => setMomoOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <ActivationSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}

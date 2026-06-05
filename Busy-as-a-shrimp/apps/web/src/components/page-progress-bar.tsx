"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

NProgress.configure({
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.08
});

export function PageProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 当 pathname 或 searchParams 变化时，代表跳转已经“完成”或者正在进行中
    // 由于我们在 TopNav 中手动触发了跳转逻辑，
    // 我们在全局 layout 中捕捉路径变化来停止。
    NProgress.done();
  }, [pathname, searchParams]);

  return null;
}

/**
 * 暴露给外部组件手动开启进度条的工具
 */
export const startProgress = () => NProgress.start();

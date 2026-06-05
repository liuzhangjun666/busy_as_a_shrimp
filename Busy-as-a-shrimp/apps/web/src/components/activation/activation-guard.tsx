"use client";

import { useEffect, useMemo } from "react";
import {
  type ReadonlyURLSearchParams,
  usePathname,
  useRouter,
  useSearchParams
} from "next/navigation";
import { Compass, LockKeyhole, Sparkles } from "lucide-react";
import { useAuthStatus } from "@/stores/use-auth-status";
import { useResourceActivationStatus } from "@/hooks/use-resource-activation-status";
import { Button } from "@/components/ui/button";

const AUTH_PATH = "/auth";
const ACTIVATION_PATH = "/activation";
const REGISTER_PATH = "/register";
const FORGOT_PASSWORD_PATH = "/forgot-password";
const TERMS_PATH = "/terms";
const PRIVACY_PATH = "/privacy";
const PUBLIC_PREFIXES = [
  AUTH_PATH,
  ACTIVATION_PATH,
  REGISTER_PATH,
  FORGOT_PASSWORD_PATH,
  TERMS_PATH,
  PRIVACY_PATH
] as const;
const ACTIVATION_REQUIRED_PREFIXES = [
  "/resource",
  "/match",
  "/content",
  "/captain",
  "/member",
  "/profile"
] as const;

function isBypassPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function requiresActivation(pathname: string): boolean {
  return ACTIVATION_REQUIRED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function buildCurrentPath(pathname: string, searchParams: ReadonlyURLSearchParams): string {
  const query = searchParams.toString();
  if (!query) {
    return pathname;
  }
  return `${pathname}?${query}`;
}

function sanitizeRedirect(redirect: string | null): string {
  if (!redirect || !redirect.startsWith("/")) {
    return "/";
  }
  return redirect;
}

export function ActivationGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hydrated, isLoggedIn } = useAuthStatus();
  const onActivation = pathname.startsWith(ACTIVATION_PATH);
  const shouldGuardCurrentPath = requiresActivation(pathname) || onActivation;

  const shouldCheckActivation = hydrated && isLoggedIn && shouldGuardCurrentPath;
  const activationQuery = useResourceActivationStatus(shouldCheckActivation);
  const onBypassPath = isBypassPath(pathname);
  const redirectTarget = useMemo(
    () => buildCurrentPath(pathname, searchParams),
    [pathname, searchParams]
  );
  const hasActivatedResource = (activationQuery.data?.length ?? 0) > 0;
  const shouldShowActivationPrompt =
    shouldCheckActivation &&
    !activationQuery.isPending &&
    !activationQuery.isError &&
    !hasActivatedResource &&
    !onBypassPath;

  useEffect(() => {
    if (!shouldCheckActivation || activationQuery.isPending || activationQuery.isError) {
      return;
    }

    if (hasActivatedResource && onActivation) {
      router.replace(sanitizeRedirect(searchParams.get("redirect")));
    }
  }, [
    activationQuery.isError,
    activationQuery.isPending,
    hasActivatedResource,
    onActivation,
    pathname,
    router,
    searchParams,
    shouldCheckActivation
  ]);

  if (!shouldShowActivationPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-cyan-100 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
        <div className="relative overflow-hidden px-7 pb-6 pt-7 sm:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.22),transparent_72%)]"
          />

          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="min-w-0 space-y-3">
              <div className="space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-600/80">
                  Cyber Avatar Activation
                </p>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">
                  还差一步，先完成赛博分身激活三步曲
                </h2>
              </div>

              <p className="text-sm leading-7 text-slate-600">
                为了给你更准确的资源匹配、AI推荐和合作路径，当前账号需要先补充
                <span className="font-semibold text-slate-900">资源、技能、愿望</span>
                三部分信息。完成后就可以正常访问资源列表、AI快报、AI一人公司等内容。
              </p>

              <div className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/85 p-4 text-sm text-slate-600">
                <div className="flex items-start gap-3">
                  <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span>当前页面已为你保留，完成激活后会自动回到这里继续浏览。</span>
                </div>
                <div className="flex items-start gap-3">
                  <Compass className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span>整个流程只需要几分钟，填完一次，后续就不用反复填写。</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button
                  type="button"
                  className="h-12 rounded-2xl bg-slate-900 px-6 text-sm font-semibold text-white hover:bg-slate-800"
                  onClick={() =>
                    router.replace(`${ACTIVATION_PATH}?redirect=${encodeURIComponent(redirectTarget)}`)
                  }
                >
                  去完成激活三步曲
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-2xl border-slate-200 px-6 text-sm font-medium text-slate-600"
                  onClick={() => router.replace("/")}
                >
                  先返回首页
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

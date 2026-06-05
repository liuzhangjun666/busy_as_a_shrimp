"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import {
  Activity,
  BarChart3,
  BookCopy,
  BriefcaseBusiness,
  Crown,
  GraduationCap,
  Home,
  List,
  ListChecks,
  LogIn,
  LogOut,
  Menu,
  Newspaper,
  Plus,
  Target,
  UserCircle2
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getAiBriefApi, getDictApi, getResourceApi, getSoloSignalApi, getSopTemplateApi } from "@/api";
import { useAuthStatus } from "@/stores/use-auth-status";
import { useUserStore } from "@/stores/user-store";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { startProgress } from "@/components/page-progress-bar";

const MessageBell = dynamic(() => import("./chat/message-bell"), { ssr: false });
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { AiBriefListResponse } from "@/api/ai-brief-api";
import type { SoloSignalListResponse } from "@/api/solo-signal-api";

const publicNavItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/?module=campus", label: "实习秋招汇总", icon: GraduationCap },
  { href: "/resource/list", label: "资源列表", icon: List },
  { href: "/bounty-hall", label: "悬赏大厅", icon: Target },
  { href: "/ai-brief", label: "AI快报", icon: Newspaper },
  { href: "/solo-ai", label: "AI一人公司", icon: BriefcaseBusiness },
  { href: "/sop-library", label: "SOP模板库", icon: BookCopy },
  { href: "/content", label: "内容中心", icon: ListChecks },
  { href: "/member", label: "星际通行证", icon: Crown },
  { href: "/captain", label: "团长中枢", icon: BarChart3 }
] as const;

const authNavItems = [{ href: "/match/list", label: "匹配列表", icon: Activity }] as const;
const AI_BRIEF_PAGE_SIZE = 20;
const SOLO_AI_PAGE_SIZE = 20;
const SOP_LIBRARY_PAGE_SIZE = 12;
const RESOURCE_LIST_DICT_TYPES = [
  "RESOURCE_TYPE",
  "RESOURCE_CITY_NODES",
  "RESOURCE_SKILL_TAGS",
  "RESOURCE_REGION_CODES",
  "RESOURCE_WISH_TAGS",
  "RESOURCE_NEED_TAGS",
  "RESOURCE_CUSTOM_TAGS"
] as const;

function getRoleLabel(role: "service" | "resource" | "both"): string {
  if (role === "service") {
    return "服务方";
  }
  if (role === "resource") {
    return "资源方";
  }
  return "双角色";
}

function maskPhone(phone: string): string {
  if (!phone) {
    return "未绑定手机号";
  }
  if (phone.length < 7) {
    return phone;
  }
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { hydrated, isLoggedIn, role, phone, logout } = useAuthStatus();
  const avatar = useUserStore((state) => state.avatar);
  const setAvatar = useUserStore((state) => state.setAvatar);

  const loggedIn = hydrated && isLoggedIn;
  const navItems = loggedIn ? [...publicNavItems, ...authNavItems] : publicNavItems;

  useEffect(() => {
    if (!hydrated || loggedIn) {
      return;
    }
    router.prefetch("/auth");
  }, [hydrated, loggedIn, router]);

  function isActivePath(href: string) {
    if (href === "/") {
      return pathname === "/" && searchParams.toString() === "";
    }
    // 处理带参数的路径
    if (href.includes("?")) {
      const [path, query] = href.split("?");
      return pathname === path && searchParams.toString().includes(query);
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const prefetchRouteData = useCallback(
    (href: string) => {
      if (href === "/resource/list") {
        if (!loggedIn) {
          return;
        }
        void queryClient.prefetchQuery({
          queryKey: ["resource", "list"],
          queryFn: () => getResourceApi().list(),
          staleTime: 60 * 1000
        });
        void queryClient.prefetchQuery({
          queryKey: ["resource", "tags"],
          queryFn: () => getResourceApi().tags(),
          staleTime: 6 * 60 * 60 * 1000
        });
        for (const dictType of RESOURCE_LIST_DICT_TYPES) {
          void queryClient.prefetchQuery({
            queryKey: ["dict", "v1", dictType],
            queryFn: () => getDictApi().getByType(dictType, "v1"),
            staleTime: 6 * 60 * 60 * 1000
          });
        }
        return;
      }

      if (href === "/ai-brief") {
        void queryClient.prefetchInfiniteQuery({
          queryKey: ["ai-briefs"],
          initialPageParam: undefined as string | undefined,
          queryFn: ({ pageParam }) =>
            getAiBriefApi().list({
              limit: AI_BRIEF_PAGE_SIZE,
              cursor: pageParam
            }),
          getNextPageParam: (lastPage: AiBriefListResponse) => lastPage.nextCursor ?? undefined,
          staleTime: 2 * 60 * 1000
        });
        return;
      }

      if (href === "/solo-ai") {
        void queryClient.prefetchInfiniteQuery({
          queryKey: ["solo-signals"],
          initialPageParam: undefined as string | undefined,
          queryFn: ({ pageParam }) =>
            getSoloSignalApi().list({
              limit: SOLO_AI_PAGE_SIZE,
              cursor: pageParam
            }),
          getNextPageParam: (lastPage: SoloSignalListResponse) => lastPage.nextCursor ?? undefined,
          staleTime: 2 * 60 * 1000
        });
        return;
      }

      if (href === "/sop-library") {
        void queryClient.prefetchQuery({
          queryKey: ["sop-library", { keyword: "", category: "" }],
          queryFn: () =>
            getSopTemplateApi().list({
              page: 1,
              pageSize: SOP_LIBRARY_PAGE_SIZE
            }),
          staleTime: 2 * 60 * 1000
        });
      }
    },
    [queryClient]
  );

  function prefetchOnIntent(href: string) {
    router.prefetch(href);
    prefetchRouteData(href);
  }

  useEffect(() => {
      if (!hydrated) {
        return;
      }

    const warmupRoutes = loggedIn
      ? ["/resource/list", "/ai-brief", "/solo-ai", "/sop-library"]
      : ["/ai-brief", "/solo-ai", "/sop-library"];
    const runWarmup = () => {
      warmupRoutes.forEach((href) => {
        router.prefetch(href);
        prefetchRouteData(href);
      });
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(runWarmup, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timer = setTimeout(runWarmup, 800);
    return () => clearTimeout(timer);
  }, [hydrated, loggedIn, prefetchRouteData, router]);

  function onLogout() {
    logout();
    setDrawerOpen(false);
    toast({
      title: "已退出登录",
      description: "当前登录态已清除。"
    });
    router.replace("/");
  }

  const protectedPaths = ["/resource", "/member", "/captain", "/match", "/bounty-hall"];

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    const isProtected = protectedPaths.some((p) => href.startsWith(p));
    if (isProtected && !loggedIn) {
      e.preventDefault();
      router.push(`/auth?redirect=${encodeURIComponent(href)}`);
      return;
    }
    startProgress();
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <div className="md:hidden">
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full border border-slate-200 bg-slate-50 text-slate-500 shadow-sm transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-slate-100 hover:text-slate-700 md:hidden"
                  aria-label="打开导航菜单"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="border-slate-200 bg-white text-slate-900 shadow-2xl">
                <DrawerHeader>
                  <DrawerTitle>导航菜单</DrawerTitle>
                </DrawerHeader>
                <nav className="grid gap-2 px-4 pb-4" aria-label="移动端导航">
                  {navItems.map((item) => (
                    <DrawerClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className="w-full"
                        onClick={(e) => handleNavClick(e, item.href)}
                      >
                        <Button
                          variant={isActivePath(item.href) ? "default" : "ghost"}
                          className={cn(
                            "w-full justify-start rounded-full transition-all duration-200 ease-out",
                            isActivePath(item.href)
                              ? "bg-slate-100 text-slate-900 shadow-sm ring-1 ring-slate-200"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          )}
                          onMouseEnter={() => prefetchOnIntent(item.href)}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Button>
                      </Link>
                    </DrawerClose>
                  ))}
                  {loggedIn ? (
                    <>
                      <DrawerClose asChild>
                        <Link href="/resource/new" className="w-full">
                          <Button
                            className="mt-2 w-full justify-start rounded-full bg-slate-900 text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-slate-800"
                            onMouseEnter={() => prefetchOnIntent("/resource/new")}
                          >
                            <Plus className="h-4 w-4" />
                            发布资源
                          </Button>
                        </Link>
                      </DrawerClose>
                      <DrawerClose asChild>
                        <Link href="/profile" className="w-full">
                          <Button
                            variant="ghost"
                            className="w-full justify-start rounded-full text-slate-500 transition-all duration-200 ease-out hover:bg-slate-100 hover:text-slate-900"
                            onMouseEnter={() => prefetchOnIntent("/profile")}
                          >
                            <UserCircle2 className="h-4 w-4" />
                            个人中心
                          </Button>
                        </Link>
                      </DrawerClose>
                      <Button
                        variant="ghost"
                        onClick={onLogout}
                        className="justify-start rounded-full text-slate-500 transition-all duration-200 ease-out hover:bg-slate-100 hover:text-slate-900"
                      >
                        <LogOut className="h-4 w-4" />
                        退出登录
                      </Button>
                    </>
                  ) : (
                    <DrawerClose asChild>
                      <Link href="/auth" className="w-full" onClick={() => startProgress()}>
                        <Button
                          className="mt-2 w-full justify-start rounded-full border border-slate-200 bg-white text-slate-700 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-slate-50"
                          onMouseEnter={() => prefetchOnIntent("/auth")}
                        >
                          <LogIn className="h-4 w-4" />
                          登录 / 注册
                        </Button>
                      </Link>
                    </DrawerClose>
                  )}
                </nav>
              </DrawerContent>
            </Drawer>
          </div>

          <Link
            href="/"
            onMouseEnter={() => prefetchOnIntent("/")}
            className="cursor-pointer rounded-full px-3 py-1.5 text-lg font-bold tracking-tighter text-slate-900 transition-all duration-200 ease-out hover:bg-slate-50"
          >
            虾忙
          </Link>

          <nav className="hidden md:flex flex-wrap items-center gap-1.5" aria-label="主导航">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => prefetchOnIntent(item.href)}
                onClick={(e) => handleNavClick(e, item.href)}
                className={cn(
                  "cursor-pointer px-2 py-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900 whitespace-nowrap",
                  isActivePath(item.href) &&
                    "relative font-semibold text-slate-900 after:absolute after:-bottom-[calc(1rem+1px)] after:left-0 after:h-[2px] after:w-full after:bg-slate-900"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {loggedIn ? (
            <>
              <Link href="/resource/new">
                <Button className="hidden rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-800 sm:inline-flex">
                  <Plus className="h-4 w-4" />
                  发布资源
                </Button>
              </Link>

              <MessageBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                  >
                    {avatar ? (
                      <img
                        src={avatar}
                        alt="User Avatar"
                        onError={() => setAvatar(null)}
                        className="h-8 w-8 rounded-full border border-slate-200 object-cover"
                      />
                    ) : (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
                        <UserCircle2 className="h-4 w-4 text-slate-500" />
                      </span>
                    )}
                    <span className="hidden text-sm text-slate-700 sm:inline">
                      {maskPhone(phone)}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl"
                >
                  <DropdownMenuLabel className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <UserCircle2 className="h-4 w-4" />
                      {maskPhone(phone)}
                    </div>
                    <p className="text-xs font-normal text-slate-500">{getRoleLabel(role)}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center gap-2 focus:bg-slate-100 focus:text-slate-900"
                    onClick={() => router.push("/profile")}
                    onMouseEnter={() => prefetchOnIntent("/profile")}
                  >
                    <UserCircle2 className="h-4 w-4" />
                    个人中心
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="flex items-center gap-2 text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:text-slate-900"
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link
              href="/auth"
              onMouseEnter={() => prefetchOnIntent("/auth")}
              onFocus={() => prefetchOnIntent("/auth")}
              onClick={() => startProgress()}
            >
              <Button className="rounded-full border border-slate-200 bg-white text-slate-700 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-slate-50">
                <LogIn className="h-4 w-4" />
                登录 / 注册
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

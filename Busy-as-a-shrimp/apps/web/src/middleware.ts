import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 需要登录才能访问的路径前缀
const PROTECTED_PATHS = [
  "/resource",
  // "/solo-ai", // 开放列表页访问
  "/activation",
  "/profile",
  "/member",
  "/match",
  "/captain",
  "/bounty-hall"
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. 检查当前路径是否在受保护列表中
  // 特殊逻辑：ai-brief 和 solo-ai 列表页放行，但详情页 (如 /ai-brief/123) 拦截
  const isProtectedBriefDetail = pathname.startsWith("/ai-brief/") && pathname !== "/ai-brief";
  const isProtectedSoloDetail = pathname.startsWith("/solo-ai/") && pathname !== "/solo-ai";

  const isProtected =
    PROTECTED_PATHS.some((path) => pathname.startsWith(path)) ||
    isProtectedBriefDetail ||
    isProtectedSoloDetail;

  if (isProtected) {
    // 2. 检查是否存在登录 Token (从 Cookie 中读取)
    const token = request.cookies.get("airp_token")?.value;

    if (!token) {
      // 3. 未登录，直接重定向到登录页，并带上回跳地址
      const url = new URL("/auth", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// 配置中间件匹配范围，优化性能
export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * 1. api (API 路由)
     * 2. _next/static (静态文件)
     * 3. _next/image (图片优化)
     * 4. favicon.ico (图标)
     * 5. public 目录下的静态资源
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"
  ]
};

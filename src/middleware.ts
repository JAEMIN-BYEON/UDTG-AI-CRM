// /staff, /admin 접근 보호 — 고객 개인정보 화면은 로그인 필수 (설계서 §11)
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const role = await verifyToken(req.cookies.get(COOKIE_NAME)?.value);
  const { pathname } = req.nextUrl;

  const needsAdmin = pathname.startsWith("/admin");
  const authorized = needsAdmin ? role === "admin" : role !== null;

  if (!authorized) {
    // API 경로는 리다이렉트 대신 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/staff/:path*", "/admin/:path*", "/api/quotes/:path*"],
};

import { NextResponse, type NextRequest } from "next/server";
import { isDemoMode } from "@/lib/demo";
import { updateSession } from "@/lib/supabase/proxy";
import { PROTECTED_PREFIXES, PUBLIC_API_PREFIXES } from "@/lib/site";

function matches(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Dev-only demo mode: no Supabase, everyone is the demo user.
  if (isDemoMode()) {
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  const { response, userId } = await updateSession(request);

  const isApi = pathname === "/api" || pathname.startsWith("/api/");
  const needsAuth = isApi
    ? !matches(pathname, PUBLIC_API_PREFIXES)
    : matches(pathname, PROTECTED_PREFIXES);

  if (needsAuth && !userId) {
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (userId && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb)$).*)",
  ],
};

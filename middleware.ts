import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME || "atms_session";

const PUBLIC_API_PATHS = ["/api/auth/login", "/api/auth/bootstrap"];
const PUBLIC_PAGE_PATHS = ["/login"];

function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.some((path) => pathname.startsWith(path));
}

function isPublicPagePath(pathname: string): boolean {
  return PUBLIC_PAGE_PATHS.includes(pathname);
}

function isIgnoredPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/assets")
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ignore static/internal paths
  if (isIgnoredPath(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME);
  const hasSession = Boolean(sessionCookie?.value);

  // Handle API routes
  if (pathname.startsWith("/api")) {
    if (isPublicApiPath(pathname)) {
      return NextResponse.next();
    }

    if (!hasSession) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required.",
          },
        },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  // Handle public pages (e.g., login)
  if (isPublicPagePath(pathname)) {
    if (hasSession) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  }

  // Handle protected pages
  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname); // nice UX upgrade
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
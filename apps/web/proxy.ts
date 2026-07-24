import { NextResponse, type NextRequest } from "next/server";

const authenticatedRoutes = [
  "/overview",
  "/live",
  "/workflows",
  "/events",
  "/violations",
  "/explore",
  "/rules",
];

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hasSession = request.cookies.has("tg_access");
  const requiresSession = authenticatedRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`),
  );

  if (requiresSession && !hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("returnTo", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  if ((path === "/login" || path === "/signup") && hasSession) {
    return NextResponse.redirect(new URL("/overview", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/overview/:path*",
    "/live/:path*",
    "/workflows/:path*",
    "/events/:path*",
    "/violations/:path*",
    "/explore/:path*",
    "/rules/:path*",
  ],
};

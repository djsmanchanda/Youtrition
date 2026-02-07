// middleware.ts  (project root)

import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow root path, API routes, and static assets
  if (pathname === "/" || pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
    return NextResponse.next();
  }

  // 2. For dynamic user routes, validate numeric ID format ( /123 or /123/... )
  const isNumericUserRoute = /^\/\d+(\/.*)?$/.test(pathname);
  if (!isNumericUserRoute) {
    // Allow Next.js to handle 404 naturally for invalid routes
    return NextResponse.next();
  }

  // 3. Continue as normal
  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",          // apply to every route
};

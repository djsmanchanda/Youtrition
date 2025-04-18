// middleware.ts  (project root)

import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Redirect "/"  →  "/1"
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/1", req.url));
  }

  // 2. Allow only numeric top‑level paths ( /123 or /123/... )
  const isNumeric = /^\/\d+(\/.*)?$/.test(pathname);
  if (!isNumeric) {
    return NextResponse.rewrite(new URL("/404", req.url));   // or let Next handle default 404
  }

  // 3. Continue as normal
  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",          // apply to every route
};

import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard"];

/** Allow our own pages to be framed by the workspace preview host. */
const FRAME_POLICY = [
  "frame-ancestors 'self' https://*.e2b.app https://*.arena.ai http://localhost:3000",
].join("; ");

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get("slotly_session")?.value);

  if (PROTECTED.some((p) => pathname.startsWith(p)) && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  // The demo is embedded in the hosted preview iframe, so framing is limited by
  // CSP (self + the preview host) instead of the stricter X-Frame-Options header.
  res.headers.set("Content-Security-Policy", FRAME_POLICY);
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/hms/:path*", "/hms"],
};

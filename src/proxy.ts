import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/admin/config";
import { verifySessionToken } from "@/lib/admin/session";

/**
 * Next.js 16 renamed the `middleware` file convention to `proxy` - same
 * behaviour, new file and export names. Proxy defaults to the Node.js runtime
 * in 16, and the `runtime` segment config is not permitted here.
 *
 * This is the *first* gate, not the only one: it gives unauthenticated
 * visitors a clean redirect to the login page. The dashboard layout re-checks
 * the same token server-side, because a matcher is easy to get subtly wrong
 * and must never be the sole thing standing in front of customer data.
 */
export const config = {
  matcher: ["/admin/:path*"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authenticated = await verifySessionToken(token);

  if (pathname === "/admin/login") {
    // Already signed in? Skip the form.
    return authenticated
      ? NextResponse.redirect(new URL("/admin", request.url))
      : NextResponse.next();
  }

  if (!authenticated) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

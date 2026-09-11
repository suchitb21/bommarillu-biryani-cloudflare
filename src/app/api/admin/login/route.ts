import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminPassword } from "@/lib/admin/auth";
import { createSessionToken } from "@/lib/admin/session";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  isProductionEnvironment,
} from "@/lib/admin/config";
import {
  clearAttempts,
  isRateLimited,
  recordFailedAttempt,
} from "@/lib/admin/rate-limit";

/**
 * Exchanges the shared admin password for a signed session cookie.
 *
 * Error responses are deliberately uniform: a wrong password, a missing
 * password, and a malformed body must not let a caller distinguish "this
 * account exists" from "that value was wrong".
 */
export async function POST(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientKey = forwardedFor?.split(",")[0]?.trim() || "unknown";

  if (isRateLimited(clientKey)) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Please wait 15 minutes and try again." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 }
    );
  }

  const password =
    typeof body === "object" && body !== null && "password" in body
      ? (body as { password?: unknown }).password
      : undefined;

  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Please enter the password." },
      { status: 400 }
    );
  }

  let valid: boolean;
  try {
    valid = await verifyAdminPassword(password);
  } catch (error) {
    // Misconfiguration (missing/malformed ADMIN_PASSWORD_HASH), not a bad
    // password - log it rather than blaming the person typing.
    console.error("[admin] Password verification failed:", error);
    return NextResponse.json(
      { ok: false, error: "The admin login is not configured correctly." },
      { status: 500 }
    );
  }

  if (!valid) {
    recordFailedAttempt(clientKey);
    return NextResponse.json(
      { ok: false, error: "Incorrect password." },
      { status: 401 }
    );
  }

  clearAttempts(clientKey);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: await createSessionToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: isProductionEnvironment(),
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return response;
}

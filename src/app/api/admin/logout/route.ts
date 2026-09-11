import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  isProductionEnvironment,
} from "@/lib/admin/config";

/**
 * Sessions are stateless, so signing out is just clearing the cookie. Any
 * copied token stays valid until it expires - to invalidate every outstanding
 * session at once, change ADMIN_PASSWORD_HASH or SESSION_SECRET.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isProductionEnvironment(),
    path: "/",
    maxAge: 0,
  });
  return response;
}

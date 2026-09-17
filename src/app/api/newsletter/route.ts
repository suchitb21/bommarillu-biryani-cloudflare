import { NextResponse, type NextRequest } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/validation/email";
import { subscribeToNewsletter } from "@/lib/newsletter/subscribers";
import { isHoneypotFilled } from "@/lib/validation/honeypot";
import {
  clientKeyFromHeaders,
  isRateLimited,
  recordAttempt,
} from "@/lib/rate-limit";

/** One signup is the norm; five in ten minutes covers a shared household. */
const RATE_LIMIT_MAX_SUBMISSIONS = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

/**
 * Newsletter signup from the contact page.
 *
 * Public and unauthenticated, defended with a rate limit, a honeypot, then
 * validation. A duplicate is a success rather than an error - the person's
 * intent was to be on the list.
 */
export async function POST(request: NextRequest) {
  const clientKey = `newsletter:${clientKeyFromHeaders(request.headers)}`;

  if (isRateLimited(clientKey, RATE_LIMIT_MAX_SUBMISSIONS, RATE_LIMIT_WINDOW_MS)) {
    return NextResponse.json(
      { ok: false, error: "Too many signups from here. Please try again later." },
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

  // Honeypot: answer as though it worked, but store nothing.
  if (isHoneypotFilled(body)) {
    console.warn("[newsletter] honeypot triggered - signup discarded");
    return NextResponse.json({ ok: true, alreadySubscribed: false });
  }

  const raw =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const email = normalizeEmail(raw.email);

  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Please enter your email address." },
      { status: 400 }
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  // Counted only once the address is otherwise acceptable.
  recordAttempt(clientKey, RATE_LIMIT_WINDOW_MS);

  try {
    const alreadySubscribed = !(await subscribeToNewsletter(email));
    return NextResponse.json({ ok: true, alreadySubscribed });
  } catch (error) {
    console.error("[newsletter] Failed to save subscriber:", error);
    return NextResponse.json(
      { ok: false, error: "We couldn't add you to the list. Please try again." },
      { status: 500 }
    );
  }
}

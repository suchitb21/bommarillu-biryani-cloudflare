import { NextRequest, NextResponse } from "next/server";
import { validateContactPayload } from "@/lib/contact/validate";
import { insertContactSubmission } from "@/lib/contact/submissions";
import { isHoneypotFilled } from "@/lib/validation/honeypot";
import {
  clientKeyFromHeaders,
  isRateLimited,
  recordAttempt,
} from "@/lib/rate-limit";

/** A genuine customer sends one message; five in ten minutes is generous. */
const RATE_LIMIT_MAX_SUBMISSIONS = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const CONTACT_FALLBACK =
  "Please try again, or call us at +1 425-999-6271.";

/**
 * Receives the contact form on /contact and stores the message in Postgres.
 *
 * Public and unauthenticated, so it is defended in layers: a rate limit, a
 * honeypot, then validation before anything reaches the database. Errors are
 * never echoed back to the client.
 */
export async function POST(request: NextRequest) {
  const clientKey = `contact:${clientKeyFromHeaders(request.headers)}`;

  if (isRateLimited(clientKey, RATE_LIMIT_MAX_SUBMISSIONS, RATE_LIMIT_WINDOW_MS)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Too many messages sent. Please wait a few minutes and try again, or call us at +1 425-999-6271.`,
      },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  // Honeypot: the hidden field is filled only by automated submissions. Answer
  // as though it worked so the bot gets no signal to adapt, but store nothing.
  if (isHoneypotFilled(body)) {
    console.warn("[contact] honeypot triggered - submission discarded");
    return NextResponse.json({ ok: true });
  }

  const result = validateContactPayload(body);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  // Counted only once the submission is otherwise valid, so a customer fixing a
  // typo does not burn their quota.
  recordAttempt(clientKey, RATE_LIMIT_WINDOW_MS);

  try {
    await insertContactSubmission(result.data);
  } catch (error) {
    // Log the real cause server-side; hand the customer something actionable.
    console.error("[contact] Failed to save submission:", error);
    return NextResponse.json(
      {
        ok: false,
        error: `We couldn't send your message right now. ${CONTACT_FALLBACK}`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse, type NextRequest } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/validation/email";
import { subscribeToNewsletter } from "@/lib/newsletter/subscribers";

/**
 * Newsletter signup from the contact page. Public and unauthenticated, so the
 * address is validated before it reaches the database, and a duplicate is a
 * success rather than an error - the person's intent was to be on the list.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 }
    );
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

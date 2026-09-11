import { NextRequest, NextResponse } from "next/server";
import { validateContactPayload } from "@/lib/contact/validate";
import { insertContactSubmission } from "@/lib/contact/submissions";

/**
 * Receives the contact form on /contact and stores the message in Postgres.
 * Public and unauthenticated, so the payload is validated before it reaches
 * the database and errors are never echoed back to the client.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  const result = validateContactPayload(body);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  try {
    await insertContactSubmission(result.data);
  } catch (error) {
    // Log the real cause server-side; hand the customer something actionable.
    console.error("[contact] Failed to save submission:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          "We couldn't send your message right now. Please try again, or call us at +1 425-420-0160.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

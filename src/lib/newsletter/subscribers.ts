import "server-only";
import { getSql } from "@/lib/db";

/**
 * Newsletter signups from the contact page.
 *
 * Table and index are created on first use, matching the contact_submissions
 * pattern, so a fresh database needs no separate migration step.
 */
let schemaReady: Promise<void> | undefined;

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    const attempt = (async () => {
      const sql = getSql();

      await sql`
        CREATE TABLE IF NOT EXISTS newsletter_subscribers (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          email TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;

      // Case-insensitive uniqueness, so "Sam@x.com" and "sam@x.com" are one
      // person rather than two rows. The neon HTTP driver runs one statement
      // per query, hence a separate call.
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_key
        ON newsletter_subscribers (lower(email))
      `;
    })();

    attempt.catch(() => {
      schemaReady = undefined;
    });

    schemaReady = attempt;
  }

  return schemaReady;
}

/**
 * Returns true when the address was newly added, false when it was already on
 * the list - the caller uses this to thank them rather than claim a duplicate.
 */
export async function subscribeToNewsletter(email: string): Promise<boolean> {
  await ensureSchema();

  const sql = getSql();
  // ON CONFLICT DO NOTHING makes re-subscribing a no-op instead of an error,
  // so someone signing up twice is not shown a failure.
  const rows = (await sql`
    INSERT INTO newsletter_subscribers (email)
    VALUES (${email})
    ON CONFLICT DO NOTHING
    RETURNING id::text AS id
  `) as Array<{ id: string }>;

  return rows.length > 0;
}

export type NewsletterSubscriber = {
  id: string;
  email: string;
  /** Already formatted in Pacific time - see the note in src/lib/admin/types.ts. */
  subscribedLabel: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const DEFAULT_LIMIT = 500;

export async function getNewsletterSubscribers(
  limit: number = DEFAULT_LIMIT
): Promise<{ subscribers: NewsletterSubscriber[]; total: number }> {
  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    SELECT id::text AS id, email, created_at
    FROM newsletter_subscribers
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as Array<{ id: string; email: string; created_at: string | Date }>;

  // Counted separately so the page can report the true total even when the
  // list itself is capped.
  const countRows = (await sql`
    SELECT count(*)::int AS total FROM newsletter_subscribers
  `) as Array<{ total: number }>;

  return {
    subscribers: rows.map((row) => {
      const subscribed = new Date(row.created_at);
      return {
        id: row.id,
        email: row.email,
        subscribedLabel: Number.isNaN(subscribed.getTime())
          ? "—"
          : `${dateTimeFormatter.format(subscribed)} PT`,
      };
    }),
    total: countRows[0]?.total ?? rows.length,
  };
}

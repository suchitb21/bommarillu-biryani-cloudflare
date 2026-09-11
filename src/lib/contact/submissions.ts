import "server-only";
import { getSql } from "@/lib/db";
import type { ContactPayload } from "@/lib/contact/validate";

/**
 * Created on first write so a brand new database or Neon branch works without
 * a separate migration step. Wrapped in a module-level promise so concurrent
 * requests share one CREATE TABLE instead of racing each other.
 */
let schemaReady: Promise<void> | undefined;

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    const attempt = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS contact_submissions (
          id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          message TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
    })();

    // Don't cache a failed attempt - let the next request retry instead of
    // permanently breaking the form for the life of the process.
    attempt.catch(() => {
      schemaReady = undefined;
    });

    schemaReady = attempt;
  }

  return schemaReady;
}

export async function insertContactSubmission(
  input: ContactPayload
): Promise<void> {
  await ensureSchema();

  const sql = getSql();
  await sql`
    INSERT INTO contact_submissions (name, email, phone, message)
    VALUES (${input.name}, ${input.email}, ${input.phone}, ${input.message})
  `;
}

export type ContactSubmission = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  /** Already formatted in Pacific time - see the note in src/lib/admin/types.ts. */
  receivedLabel: string;
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

const DEFAULT_LIMIT = 200;

export async function listContactSubmissions(
  limit: number = DEFAULT_LIMIT
): Promise<ContactSubmission[]> {
  await ensureSchema();

  const sql = getSql();
  // `id` is a BIGINT, which the driver hands back as a string - cast it
  // explicitly so the shape does not depend on driver defaults.
  const rows = (await sql`
    SELECT
      id::text AS id,
      name,
      email,
      phone,
      message,
      created_at
    FROM contact_submissions
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    message: string;
    created_at: string | Date;
  }>;

  return rows.map((row) => {
    const received = new Date(row.created_at);
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      message: row.message,
      receivedLabel: Number.isNaN(received.getTime())
        ? "—"
        : `${dateTimeFormatter.format(received)} PT`,
    };
  });
}

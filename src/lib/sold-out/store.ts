import "server-only";
import { getSql } from "@/lib/db";
import type { SoldOutEntry, SoldOutKind } from "./logic";

/**
 * Sold-out menu groups/items. Table is created on first use, matching the
 * newsletter_subscribers pattern, so a fresh database needs no migration.
 * `expires_at` is NULL for "until restored".
 */
let schemaReady: Promise<void> | undefined;

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    const attempt = (async () => {
      const sql = getSql();
      await sql`
        CREATE TABLE IF NOT EXISTS sold_out_items (
          square_id TEXT PRIMARY KEY,
          kind TEXT NOT NULL CHECK (kind IN ('group', 'item')),
          menu_name TEXT NOT NULL,
          label TEXT NOT NULL,
          expires_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
    })();

    attempt.catch(() => {
      schemaReady = undefined;
    });

    schemaReady = attempt;
  }

  return schemaReady;
}

type Row = {
  square_id: string;
  kind: SoldOutKind;
  menu_name: string;
  label: string;
  expires_at: string | Date | null;
  created_at: string | Date;
};

function toIso(value: string | Date): string {
  return new Date(value).toISOString();
}

/** Every row, including expired ones. Callers filter with activeEntries. */
export async function listAll(): Promise<SoldOutEntry[]> {
  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    SELECT square_id, kind, menu_name, label, expires_at, created_at
    FROM sold_out_items
    ORDER BY created_at DESC
  `) as Row[];

  return rows.map((row) => ({
    squareId: row.square_id,
    kind: row.kind,
    menuName: row.menu_name,
    label: row.label,
    expiresAt: row.expires_at === null ? null : toIso(row.expires_at),
    createdAt: toIso(row.created_at),
  }));
}

/** Insert, or replace the existing row for the same id (changing duration). */
export async function markSoldOut(args: {
  squareId: string;
  kind: SoldOutKind;
  menuName: string;
  label: string;
  expiresAt: string | null;
}): Promise<void> {
  await ensureSchema();
  const sql = getSql();

  await sql`
    INSERT INTO sold_out_items (square_id, kind, menu_name, label, expires_at)
    VALUES (${args.squareId}, ${args.kind}, ${args.menuName}, ${args.label}, ${args.expiresAt})
    ON CONFLICT (square_id) DO UPDATE SET
      kind = EXCLUDED.kind,
      menu_name = EXCLUDED.menu_name,
      label = EXCLUDED.label,
      expires_at = EXCLUDED.expires_at,
      created_at = now()
  `;
}

export async function restore(squareId: string): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`DELETE FROM sold_out_items WHERE square_id = ${squareId}`;
}

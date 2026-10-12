import type { MenuView } from "@/lib/square/menu";
import type { SoldOutEntry } from "@/lib/sold-out/logic";
import {
  markSoldOutAction,
  restoreAction,
} from "@/app/admin/(dashboard)/sold-out/actions";

function chipLabel(entry: SoldOutEntry): string {
  return entry.expiresAt === null ? "Sold out · until restored" : "Sold out · today";
}

function Controls({
  menuName,
  id,
  entry,
  lockedNote,
}: {
  menuName: string;
  id: string;
  entry: SoldOutEntry | undefined;
  lockedNote?: string;
}) {
  if (lockedNote) return <span className="admin-soldout-note">{lockedNote}</span>;

  if (entry) {
    return (
      <form action={restoreAction} className="admin-soldout-controls">
        <input type="hidden" name="menu" value={menuName} />
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="admin-soldout-btn admin-soldout-btn--restore">
          Restore
        </button>
      </form>
    );
  }

  return (
    <form action={markSoldOutAction} className="admin-soldout-controls">
      <input type="hidden" name="menu" value={menuName} />
      <input type="hidden" name="id" value={id} />
      <button type="submit" name="duration" value="today" className="admin-soldout-btn">
        Sold out today
      </button>
      <button
        type="submit"
        name="duration"
        value="until-restored"
        className="admin-soldout-btn admin-soldout-btn--ghost"
      >
        Sold out until restored
      </button>
    </form>
  );
}

/** One menu's groups and items with their sold-out controls. Server-rendered:
 * every control is a plain form posting to a server action. */
export function AdminSoldOutList({
  menu,
  menuName,
  active,
}: {
  menu: MenuView;
  menuName: string;
  active: SoldOutEntry[];
}) {
  const byId = new Map(active.map((entry) => [entry.squareId, entry]));

  return (
    <div className="admin-soldout-list">
      {menu.sections.map((section) => {
        const groupEntry = byId.get(section.id);

        return (
          <section key={section.id} className="admin-soldout-group">
            <div className="admin-soldout-row admin-soldout-row--group">
              <div>
                <strong>{section.name}</strong>
                {groupEntry ? (
                  <span className="admin-soldout-chip">{chipLabel(groupEntry)}</span>
                ) : null}
              </div>
              <Controls menuName={menuName} id={section.id} entry={groupEntry} />
            </div>

            <details>
              <summary>
                {section.items.length} item{section.items.length === 1 ? "" : "s"}
              </summary>
              <ul className="admin-soldout-items">
                {section.items.map((item) => {
                  const itemEntry = byId.get(item.id);
                  return (
                    <li key={item.id} className="admin-soldout-row">
                      <div>
                        {item.name}
                        {itemEntry ? (
                          <span className="admin-soldout-chip">{chipLabel(itemEntry)}</span>
                        ) : null}
                      </div>
                      <Controls
                        menuName={menuName}
                        id={item.id}
                        entry={itemEntry}
                        lockedNote={groupEntry ? "Sold out (group)" : undefined}
                      />
                    </li>
                  );
                })}
              </ul>
            </details>
          </section>
        );
      })}
    </div>
  );
}

import Image from "next/image";
import "./menu-item-card.css";
import type { MenuItemView } from "@/lib/square/menu";

// Shared between the dine-in Menu and Catering pages. Catering items
// currently have no imageUrl - rather than a placeholder block, the card
// just skips the image area entirely and stays text-only, so no layout
// space is reserved for an image that isn't coming.
export function MenuItemCard({
  item,
  onClick,
}: {
  item: MenuItemView;
  onClick?: () => void;
}) {
  const clickable = Boolean(onClick);

  return (
    <article
      className={clickable ? "menu-item-card menu-item-card--clickable" : "menu-item-card"}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {item.imageUrl ? (
        <div className="menu-item-card-media">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
            className="menu-item-card-image"
          />
        </div>
      ) : null}

      <div className="menu-item-card-body">
        <h3 className="menu-item-card-name">{item.name}</h3>
        {item.description ? <p className="menu-item-card-desc">{item.description}</p> : null}

        <ul className="menu-item-card-variations">
          {item.variations.map((variation) => (
            <li
              key={variation.id}
              className={
                variation.hasFixedPrice
                  ? "menu-item-card-variation"
                  : "menu-item-card-variation menu-item-card-variation--market"
              }
            >
              <span className="menu-item-card-variation-name">{variation.name}</span>
              <span
                className={
                  variation.hasFixedPrice
                    ? "menu-item-card-variation-price"
                    : "menu-item-card-variation-price menu-item-card-variation-price--market"
                }
              >
                {variation.priceLabel}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

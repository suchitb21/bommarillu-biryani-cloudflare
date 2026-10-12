"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MenuItemCard } from "./menu-item-card";
import { MenuItemModal } from "./menu-item-modal";
import type { MenuItemView, MenuSectionView } from "@/lib/square/menu";
import type { CartSource } from "@/lib/cart/types";
import { isWeekendDate, todayInRestaurantTimeZone } from "@/lib/time-slots";

// Renders one category tab per Menu Group and only mounts the active
// section's cards - with 150+ items across 12 groups, this keeps the first
// paint small and defers every non-visible section's images until clicked,
// instead of loading and rendering the entire menu at once.
export function MenuSections({
  sections,
  source,
}: {
  sections: MenuSectionView[];
  source: CartSource;
}) {
  // Null until mounted, so server and first client render agree (both show
  // every group). Order Online then hides groups that don't apply today.
  const [isWeekendToday, setIsWeekendToday] = useState<boolean | null>(null);
  useEffect(() => {
    setIsWeekendToday(isWeekendDate(todayInRestaurantTimeZone()));
  }, []);

  const visibleSections = sections.filter((section) => {
    if (section.items.length === 0) return false;
    if (source !== "menu" || isWeekendToday === null) return true;
    if (section.dayAvailability === "weekend") return isWeekendToday;
    if (section.dayAvailability === "weekday") return !isWeekendToday;
    return true;
  });
  const [activeId, setActiveId] = useState(visibleSections[0]?.id);
  const activeSection = visibleSections.find((section) => section.id === activeId) ?? visibleSections[0];

  const [openItem, setOpenItem] = useState<MenuItemView | null>(null);

  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  // Defaults true (rather than measuring from nothing) since with 12
  // categories the tab row virtually always overflows - avoids the right
  // arrow flashing disabled before the layout effect below measures it.
  const [canScrollRight, setCanScrollRight] = useState(true);

  useLayoutEffect(() => {
    const el = tabsRef.current;
    if (!el) return;

    // Chromium over-reports `scrollWidth` by ~30-40px on this layout
    // (flex row + `overflow-x: auto` + `scrollbar-width: none`), so the
    // element's real max `scrollLeft` ends up a bit short of what
    // `scrollWidth - clientWidth` predicts. A small epsilon like 2px still
    // leaves the right arrow looking enabled after it's already a no-op -
    // this tolerance is generous enough to absorb that gap.
    const SCROLL_EPSILON = 48;

    const updateScrollState = () => {
      setCanScrollLeft(el.scrollLeft > SCROLL_EPSILON / 2);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - SCROLL_EPSILON);
    };

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [visibleSections.length]);

  const scrollTabs = (direction: -1 | 1) => {
    const el = tabsRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: "smooth" });
  };

  if (!activeSection) return null;

  return (
    <>
      <div className="menu-tabs-row">
        <button
          type="button"
          className="menu-tabs-nav"
          onClick={() => scrollTabs(-1)}
          disabled={!canScrollLeft}
          aria-label="Scroll categories left"
        >
          <ChevronIcon direction="left" />
        </button>

        <div className="menu-tabs" role="tablist" aria-label="Menu categories" ref={tabsRef}>
          {visibleSections.map((section) => (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={section.id === activeSection.id}
              className={
                section.id === activeSection.id ? "menu-tab menu-tab--active" : "menu-tab"
              }
              onClick={() => setActiveId(section.id)}
            >
              {section.name}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="menu-tabs-nav"
          onClick={() => scrollTabs(1)}
          disabled={!canScrollRight}
          aria-label="Scroll categories right"
        >
          <ChevronIcon direction="right" />
        </button>
      </div>

      <div className="menu-section">
        <h2>{activeSection.name}</h2>
        {activeSection.soldOut ? (
          <p className="menu-section-soldout">Currently sold out</p>
        ) : null}
        <div className="menu-section-grid">
          {activeSection.items.map((item) => (
            <MenuItemCard
              item={item}
              key={item.id}
              onClick={item.soldOut ? undefined : () => setOpenItem(item)}
            />
          ))}
        </div>
      </div>

      {openItem ? (
        <MenuItemModal item={openItem} source={source} onClose={() => setOpenItem(null)} />
      ) : null}
    </>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden="true">
      <path
        d={direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

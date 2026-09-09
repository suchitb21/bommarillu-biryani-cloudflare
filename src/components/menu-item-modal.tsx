"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import "./menu-item-modal.css";
import type { MenuItemView, ModifierGroupView } from "@/lib/square/menu";
import { useOrderOnlineCart, useCateringCart } from "@/lib/cart/cart-context";
import { buildLineId, CART_SOURCE_LABELS, type CartSource } from "@/lib/cart/types";

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function MenuItemModal({
  item,
  source,
  onClose,
}: {
  item: MenuItemView;
  source: CartSource;
  onClose: () => void;
}) {
  // Both carts are always mounted (see layout.tsx) so hooks can be called
  // unconditionally; which one actually gets written to is picked by `source`.
  const orderOnlineCart = useOrderOnlineCart();
  const cateringCart = useCateringCart();
  const cart = source === "menu" ? orderOnlineCart : cateringCart;
  const [quantity, setQuantity] = useState(1);
  const [variationId, setVariationId] = useState(item.variations[0]?.id);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const selectedVariation = item.variations.find((v) => v.id === variationId) ?? item.variations[0];
  const showSizes = item.variations.length > 1;

  function toggleModifier(group: ModifierGroupView, optionId: string) {
    setSelectedModifiers((prev) => {
      const current = prev[group.id] ?? [];
      if (group.selectionType === "SINGLE") {
        return { ...prev, [group.id]: [optionId] };
      }
      if (current.includes(optionId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      }
      if (group.maxSelected != null && current.length >= group.maxSelected) {
        return prev;
      }
      return { ...prev, [group.id]: [...current, optionId] };
    });
  }

  const selectedModifierOptions = useMemo(
    () =>
      item.modifierGroups.flatMap((group) => {
        const selectedIds = selectedModifiers[group.id] ?? [];
        return group.options.filter((option) => selectedIds.includes(option.id));
      }),
    [item.modifierGroups, selectedModifiers]
  );

  const modifiersTotalCents = selectedModifierOptions.reduce((sum, o) => sum + o.priceCents, 0);
  const unitCents = (selectedVariation?.priceCents ?? 0) + modifiersTotalCents;
  const totalCents = unitCents * quantity;

  const missingRequiredGroup = item.modifierGroups.find(
    (group) => group.minSelected > 0 && (selectedModifiers[group.id]?.length ?? 0) < group.minSelected
  );
  const canAdd = Boolean(selectedVariation?.hasFixedPrice) && !missingRequiredGroup;

  function handleAdd() {
    if (!canAdd || !selectedVariation) return;
    cart.addLine({
      lineId: buildLineId(
        item.id,
        selectedVariation.id,
        selectedModifierOptions.map((o) => o.id)
      ),
      itemId: item.id,
      itemName: item.name,
      imageUrl: item.imageUrl,
      variationId: selectedVariation.id,
      variationName: selectedVariation.name,
      unitPriceCents: unitCents,
      modifiers: selectedModifierOptions.map((o) => ({ id: o.id, name: o.name, priceCents: o.priceCents })),
      quantity,
      source,
    });
    onClose();
  }

  return (
    <div
      className="item-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="item-modal" role="dialog" aria-modal="true" aria-label={item.name}>
        <div className="item-modal-scroll">
          {item.imageUrl ? (
            <div className="item-modal-media">
              <Image src={item.imageUrl} alt={item.name} fill sizes="560px" className="item-modal-image" />
              <button type="button" className="item-modal-close" onClick={onClose} aria-label="Close">
                <CloseIcon />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="item-modal-close"
              style={{ position: "absolute" }}
              onClick={onClose}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          )}

          <div className="item-modal-body">
            <div className="item-modal-header">
              <span className={`item-modal-source-badge item-modal-source-badge--${source}`}>
                {CART_SOURCE_LABELS[source]}
              </span>
              <h2 className="item-modal-name">{item.name}</h2>
              <div className="item-modal-price">
                {selectedVariation?.hasFixedPrice ? formatMoney(unitCents) : "Ask staff for price"}
              </div>
              {item.description ? <p className="item-modal-desc">{item.description}</p> : null}
            </div>

            <div className="item-modal-qty">
              <button
                type="button"
                className="item-modal-qty-btn"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                &minus;
              </button>
              <span className="item-modal-qty-value">{quantity}</span>
              <button
                type="button"
                className="item-modal-qty-btn"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            {showSizes ? (
              <div className="item-modal-section">
                <div className="item-modal-section-header">
                  <span className="item-modal-section-title">Sizes</span>
                  <span className="item-modal-section-flag item-modal-section-flag--required">Required</span>
                </div>
                {item.variations.map((variation) => (
                  <label className="item-modal-option" key={variation.id}>
                    <span className="item-modal-option-left">
                      <input
                        type="radio"
                        name={`variation-${item.id}`}
                        checked={variation.id === selectedVariation?.id}
                        onChange={() => setVariationId(variation.id)}
                      />
                      <span className="item-modal-option-name">{variation.name}</span>
                    </span>
                    <span className="item-modal-option-price">{variation.priceLabel}</span>
                  </label>
                ))}
              </div>
            ) : null}

            {item.modifierGroups.map((group) => {
              const selectedIds = selectedModifiers[group.id] ?? [];
              const atMax = group.maxSelected != null && selectedIds.length >= group.maxSelected;
              return (
                <div className="item-modal-section" key={group.id}>
                  <div className="item-modal-section-header">
                    <span className="item-modal-section-title">{group.name}</span>
                    <span
                      className={
                        group.minSelected > 0
                          ? "item-modal-section-flag item-modal-section-flag--required"
                          : "item-modal-section-flag item-modal-section-flag--optional"
                      }
                    >
                      {group.minSelected > 0 ? "Required" : "Optional"}
                    </span>
                  </div>
                  {group.options.map((option) => {
                    const checked = selectedIds.includes(option.id);
                    return (
                      <label className="item-modal-option" key={option.id}>
                        <span className="item-modal-option-left">
                          <input
                            type={group.selectionType === "SINGLE" ? "radio" : "checkbox"}
                            name={`group-${group.id}`}
                            checked={checked}
                            disabled={!checked && atMax}
                            onChange={() => toggleModifier(group, option.id)}
                          />
                          <span className="item-modal-option-name">{option.name}</span>
                        </span>
                        {option.priceLabel ? (
                          <span className="item-modal-option-price">+{option.priceLabel}</span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div className="item-modal-footer">
          <button type="button" className="item-modal-add-btn" onClick={handleAdd} disabled={!canAdd}>
            <span>{selectedVariation?.hasFixedPrice ? "Add to order" : "Ask staff for price"}</span>
            {selectedVariation?.hasFixedPrice ? <span>{formatMoney(totalCents)}</span> : null}
          </button>
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

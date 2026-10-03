"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import type { CartLine, CartSource } from "./types";
import { lineTotalCents } from "./types";

type CartState = { lines: CartLine[] };

type CartAction =
  | { type: "hydrate"; lines: CartLine[] }
  | { type: "add"; line: CartLine }
  | { type: "setQuantity"; lineId: string; quantity: number }
  | { type: "remove"; lineId: string }
  | { type: "clear" };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "hydrate":
      return { lines: action.lines };
    case "add": {
      const existing = state.lines.find((l) => l.lineId === action.line.lineId);
      if (!existing) return { lines: [...state.lines, action.line] };
      return {
        lines: state.lines.map((l) =>
          l.lineId === action.line.lineId
            ? { ...l, quantity: l.quantity + action.line.quantity }
            : l
        ),
      };
    }
    case "setQuantity": {
      if (action.quantity <= 0) {
        return { lines: state.lines.filter((l) => l.lineId !== action.lineId) };
      }
      return {
        lines: state.lines.map((l) =>
          l.lineId === action.lineId ? { ...l, quantity: action.quantity } : l
        ),
      };
    }
    case "remove":
      return { lines: state.lines.filter((l) => l.lineId !== action.lineId) };
    case "clear":
      return { lines: [] };
    default:
      return state;
  }
}

type CartContextValue = {
  lines: CartLine[];
  totalCount: number;
  totalCents: number;
  addLine: (line: CartLine) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
};

/**
 * Order Online and Catering are separate carts with separate storage - the
 * restaurant wants them kept apart entirely (separate checkouts, separate
 * fulfillment rules) rather than one cart with mixed sources. Each call to
 * this factory produces its own independent Context/Provider/hook pair.
 */
function createCartStore(storageKey: string, defaultSource: CartSource) {
  const CartContext = createContext<CartContextValue | null>(null);

  function CartProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(cartReducer, { lines: [] });
    const [hydrated, setHydrated] = useState(false);

    // Cart starts empty on both server and first client render (so hydration
    // matches), then loads whatever was saved from a previous visit.
    useEffect(() => {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const lines: CartLine[] = JSON.parse(raw);
          dispatch({
            type: "hydrate",
            lines: lines.map((l) => ({
              ...l,
              source: l.source ?? defaultSource,
              isWeekendOnly: l.isWeekendOnly ?? false,
              isWeekdayOnly: l.isWeekdayOnly ?? false,
            })),
          });
        }
      } catch {
        // Corrupt or inaccessible localStorage - just start with an empty cart.
      } finally {
        setHydrated(true);
      }
    }, []);

    useEffect(() => {
      // Both effects run after the same first commit - without this guard,
      // this one would fire before the hydrate dispatch above is processed
      // and overwrite the saved cart with the still-empty initial state.
      if (!hydrated) return;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(state.lines));
      } catch {
        // Ignore write failures (private browsing, storage full, etc).
      }
    }, [state.lines, hydrated]);

    const value = useMemo<CartContextValue>(() => {
      const totalCount = state.lines.reduce((sum, l) => sum + l.quantity, 0);
      const totalCents = state.lines.reduce((sum, l) => sum + lineTotalCents(l), 0);
      return {
        lines: state.lines,
        totalCount,
        totalCents,
        addLine: (line) => dispatch({ type: "add", line }),
        setQuantity: (lineId, quantity) => dispatch({ type: "setQuantity", lineId, quantity }),
        removeLine: (lineId) => dispatch({ type: "remove", lineId }),
        clear: () => dispatch({ type: "clear" }),
      };
    }, [state.lines]);

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
  }

  function useCart(): CartContextValue {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error("useCart must be used within its CartProvider");
    return ctx;
  }

  return { CartProvider, useCart };
}

export const {
  CartProvider: OrderOnlineCartProvider,
  useCart: useOrderOnlineCart,
} = createCartStore("bommarillu-cart-order-online-v1", "menu");

export const {
  CartProvider: CateringCartProvider,
  useCart: useCateringCart,
} = createCartStore("bommarillu-cart-catering-v1", "catering");

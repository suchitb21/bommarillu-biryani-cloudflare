"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { SESSION_COOKIE_NAME } from "@/lib/admin/config";
import { verifySessionToken } from "@/lib/admin/session";
import { SQUARE_MENU_NAMES } from "@/lib/square/config";
import { getMenuByName } from "@/lib/square/menu";
import { findTarget } from "@/lib/sold-out/logic";
import { midnightPacific } from "@/lib/sold-out/midnight";
import { SOLD_OUT_CACHE_TAG } from "@/lib/sold-out/read";
import { markSoldOut, restore } from "@/lib/sold-out/store";

const MENU_NAMES: string[] = [SQUARE_MENU_NAMES.onlineOrdering, SQUARE_MENU_NAMES.catering];

/** Server actions are public POST endpoints: re-check the session here rather
 * than trusting that the page which rendered the form was gated. */
async function requireAdmin(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!(await verifySessionToken(token))) redirect("/admin/login");
}

/** Back to the list. redirect() throws, so callers must not wrap it in try/catch. */
function backTo(menuName: string, error?: string): never {
  const params = new URLSearchParams({
    menu: menuName === SQUARE_MENU_NAMES.catering ? "catering" : "menu",
  });
  if (error) params.set("error", error);
  redirect(`/admin/sold-out?${params.toString()}`);
}

export async function markSoldOutAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const menuName = String(formData.get("menu") ?? "");
  const squareId = String(formData.get("id") ?? "");
  const duration = String(formData.get("duration") ?? "");

  if (
    !MENU_NAMES.includes(menuName) ||
    !squareId ||
    (duration !== "today" && duration !== "until-restored")
  ) {
    backTo(menuName, "That request wasn't valid. Please try again.");
  }

  let failure: string | null = null;
  try {
    const menu = await getMenuByName(menuName);
    const target = findTarget(menu, squareId);
    if (!target) {
      // A stale page: the item or group is no longer in the Square menu.
      failure = "That item is no longer on the menu. The list has been refreshed.";
    } else {
      await markSoldOut({
        squareId,
        kind: target.kind,
        menuName,
        label: target.label,
        expiresAt: duration === "today" ? midnightPacific(new Date()).toISOString() : null,
      });
      updateTag(SOLD_OUT_CACHE_TAG);
    }
  } catch (error) {
    console.error("[sold-out] Could not mark sold out:", error);
    failure = "Couldn't save that. Please try again.";
  }

  backTo(menuName, failure ?? undefined);
}

export async function restoreAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const menuName = String(formData.get("menu") ?? "");
  const squareId = String(formData.get("id") ?? "");

  if (!MENU_NAMES.includes(menuName) || !squareId) {
    backTo(menuName, "That request wasn't valid. Please try again.");
  }

  let failure: string | null = null;
  try {
    await restore(squareId);
    updateTag(SOLD_OUT_CACHE_TAG);
  } catch (error) {
    console.error("[sold-out] Could not restore:", error);
    failure = "Couldn't save that. Please try again.";
  }

  backTo(menuName, failure ?? undefined);
}

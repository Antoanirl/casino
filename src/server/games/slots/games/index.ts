import type { SlotConfig } from "@/server/games/slots/engine";
import { classicSlots } from "@/server/games/slots/games/classic";

/** Every slot game the server can spin, by slug. Gem and Adventure Slots join in Phase 7. */
export const slotConfigs: Readonly<Record<string, SlotConfig>> = {
  classic: classicSlots,
};

export function getSlotConfig(slug: string): SlotConfig | undefined {
  return Object.hasOwn(slotConfigs, slug) ? slotConfigs[slug] : undefined;
}

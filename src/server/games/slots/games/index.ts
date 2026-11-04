import type { SlotConfig } from "@/server/games/slots/engine";
import { adventureSlots } from "@/server/games/slots/games/adventure";
import { classicSlots } from "@/server/games/slots/games/classic";
import { gemSlots } from "@/server/games/slots/games/gems";

/** Every slot game the server can spin, by slug. */
export const slotConfigs: Readonly<Record<string, SlotConfig>> = {
  classic: classicSlots,
  gems: gemSlots,
  adventure: adventureSlots,
};

export function getSlotConfig(slug: string): SlotConfig | undefined {
  return Object.hasOwn(slotConfigs, slug) ? slotConfigs[slug] : undefined;
}

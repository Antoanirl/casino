import type { SlotConfig } from "@/server/games/slots/engine";

/**
 * Adventure Slots: five reels, three rows, ten paylines, with free spins.
 *
 * Reels 1, 3 and 5 hold boots 11, rope 6, lantern 6, compass 5, idol 3, map 1;
 * reels 2 and 4 swap one pair of boots for a second map (32 symbols each).
 * Line wins need three or more matching symbols from the leftmost reel.
 * The map is a scatter: it pays anywhere in the window, never on a line.
 * Three, four or five maps also start 8, 12 or 20 free spins at the same bet,
 * where every win pays double. Free spins can't retrigger.
 * Pays are in hundredths of the total bet (10000 = 100x).
 *
 * Exact return to player: 96.10%, free spins included (about one round in 40 starts them).
 * Asserted in slots.test.ts, and a simulation must agree.
 */
export const adventureSlots: SlotConfig = {
  slug: "adventure",
  name: "Adventure Slots",
  rows: 3,
  symbols: [
    { id: "boots", name: "Boots", kind: "normal" },
    { id: "rope", name: "Rope", kind: "normal" },
    { id: "lantern", name: "Lantern", kind: "normal" },
    { id: "compass", name: "Compass", kind: "normal" },
    { id: "idol", name: "Golden idol", kind: "normal" },
    { id: "map", name: "Map", kind: "scatter" },
  ],
  reels: [
    "lantern,boots,idol,boots,compass,boots,rope,rope,rope,boots,boots,rope,lantern,boots,rope,compass,boots,boots,boots,lantern,lantern,boots,boots,map,compass,idol,rope,lantern,idol,compass,lantern,compass".split(
      ",",
    ),
    "compass,rope,boots,boots,idol,rope,lantern,compass,boots,map,boots,map,rope,boots,compass,boots,lantern,boots,compass,lantern,boots,rope,idol,lantern,boots,compass,lantern,lantern,idol,rope,rope,boots".split(
      ",",
    ),
    "idol,compass,rope,compass,boots,boots,boots,idol,idol,rope,compass,boots,lantern,compass,rope,rope,boots,rope,boots,boots,rope,lantern,lantern,lantern,lantern,boots,boots,boots,map,boots,lantern,compass".split(
      ",",
    ),
    "boots,map,boots,idol,boots,rope,lantern,rope,rope,lantern,idol,compass,boots,boots,map,compass,boots,boots,rope,boots,lantern,compass,lantern,lantern,lantern,idol,compass,rope,boots,boots,compass,rope".split(
      ",",
    ),
    "boots,rope,rope,lantern,lantern,boots,boots,lantern,idol,compass,idol,map,boots,compass,boots,boots,boots,boots,rope,rope,rope,idol,rope,compass,lantern,boots,boots,compass,lantern,compass,lantern,boots".split(
      ",",
    ),
  ],
  paylines: [
    [1, 1, 1, 1, 1], // middle row
    [0, 0, 0, 0, 0], // top row
    [2, 2, 2, 2, 2], // bottom row
    [0, 1, 2, 1, 0], // V shape
    [2, 1, 0, 1, 2], // upside-down V
    [0, 0, 1, 2, 2], // slope down
    [2, 2, 1, 0, 0], // slope up
    [1, 0, 0, 0, 1], // top dip
    [1, 2, 2, 2, 1], // bottom dip
    [1, 0, 1, 2, 1], // zigzag
  ],
  paylineNames: [
    "middle row",
    "top row",
    "bottom row",
    "V shape",
    "upside-down V",
    "slope down",
    "slope up",
    "top dip",
    "bottom dip",
    "zigzag",
  ],
  linePays: {
    idol: { 3: 180, 4: 900, 5: 5_500 },
    compass: { 3: 90, 4: 360, 5: 1_500 },
    lantern: { 3: 60, 4: 220, 5: 900 },
    rope: { 3: 45, 4: 180, 5: 600 },
    boots: { 3: 35, 4: 150, 5: 450 },
  },
  scatterPays: { 3: 170, 4: 1_000, 5: 5_000 },
  freeSpins: { triggers: { 3: 8, 4: 12, 5: 20 }, multiplier: 2 },
  bets: [100, 200, 500, 1_000, 2_500, 5_000, 10_000],
};

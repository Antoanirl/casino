import type { SlotConfig } from "@/server/games/slots/engine";

/**
 * Gem Slots: five reels, three rows, ten paylines.
 *
 * Every reel holds the same 32 symbols in a different order:
 * topaz 7, amethyst 6, sapphire 6, emerald 5, ruby 4, diamond 2, prism 2.
 * The prism is wild: it stands in for any gem, and a winning line that uses
 * at least one prism pays double. Five prisms on a line pay 100x on their own.
 * Wins need three or more matching symbols from the leftmost reel.
 * Pays are in hundredths of the total bet (10000 = 100x).
 *
 * Exact return to player: 95.70%. Asserted in slots.test.ts, and a simulation must agree.
 */
export const gemSlots: SlotConfig = {
  slug: "gems",
  name: "Gem Slots",
  rows: 3,
  symbols: [
    { id: "topaz", name: "Topaz", kind: "normal" },
    { id: "amethyst", name: "Amethyst", kind: "normal" },
    { id: "sapphire", name: "Sapphire", kind: "normal" },
    { id: "emerald", name: "Emerald", kind: "normal" },
    { id: "ruby", name: "Ruby", kind: "normal" },
    { id: "diamond", name: "Diamond", kind: "normal" },
    { id: "prism", name: "Prism", kind: "wild", multiplier: 2 },
  ],
  reels: [
    "sapphire,topaz,ruby,ruby,amethyst,amethyst,sapphire,emerald,sapphire,amethyst,emerald,prism,emerald,topaz,amethyst,topaz,sapphire,ruby,emerald,sapphire,topaz,diamond,topaz,prism,diamond,topaz,ruby,emerald,amethyst,amethyst,topaz,sapphire".split(
      ",",
    ),
    "emerald,amethyst,ruby,amethyst,amethyst,emerald,ruby,emerald,topaz,sapphire,ruby,amethyst,diamond,topaz,emerald,sapphire,topaz,prism,sapphire,diamond,emerald,sapphire,topaz,sapphire,amethyst,amethyst,sapphire,topaz,topaz,prism,topaz,ruby".split(
      ",",
    ),
    "ruby,emerald,topaz,topaz,sapphire,prism,emerald,amethyst,amethyst,ruby,sapphire,topaz,topaz,topaz,amethyst,diamond,sapphire,amethyst,sapphire,ruby,sapphire,sapphire,ruby,emerald,topaz,diamond,emerald,prism,emerald,topaz,amethyst,amethyst".split(
      ",",
    ),
    "topaz,diamond,diamond,amethyst,emerald,sapphire,ruby,sapphire,sapphire,amethyst,topaz,ruby,emerald,amethyst,sapphire,topaz,sapphire,topaz,prism,sapphire,emerald,topaz,ruby,amethyst,ruby,topaz,amethyst,topaz,emerald,emerald,prism,amethyst".split(
      ",",
    ),
    "topaz,amethyst,amethyst,topaz,amethyst,prism,topaz,topaz,emerald,ruby,sapphire,ruby,amethyst,sapphire,sapphire,amethyst,topaz,emerald,topaz,emerald,sapphire,emerald,diamond,amethyst,topaz,emerald,sapphire,diamond,prism,sapphire,ruby,ruby".split(
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
    prism: { 5: 10_000 },
    diamond: { 3: 110, 4: 650, 5: 4_000 },
    ruby: { 3: 65, 4: 260, 5: 1_100 },
    emerald: { 3: 45, 4: 175, 5: 650 },
    sapphire: { 3: 35, 4: 130, 5: 440 },
    amethyst: { 3: 25, 4: 110, 5: 350 },
    topaz: { 3: 20, 4: 90, 5: 260 },
  },
  bets: [100, 200, 500, 1_000, 2_500, 5_000, 10_000],
};

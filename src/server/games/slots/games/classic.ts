import type { SlotConfig } from "@/server/games/slots/engine";

/**
 * Classic Slots: three reels, three rows, five paylines.
 *
 * Every reel holds the same 32 symbols in a different order:
 * cherry 6, lemon 7, orange 6, plum 5, bell 4, bar 3, seven 1.
 * Three of a kind on a line pays; two cherries from the left pay too.
 * Pays are in hundredths of the total bet (10000 = 100x).
 *
 * Exact return to player: 95.70%. Hit frequency: 25.6% of spins win something.
 * Both are asserted in slots.test.ts, and a 1,000,000-spin simulation must agree.
 */
export const classicSlots: SlotConfig = {
  slug: "classic",
  name: "Classic Slots",
  rows: 3,
  symbols: [
    { id: "cherry", name: "Cherry", kind: "normal" },
    { id: "lemon", name: "Lemon", kind: "normal" },
    { id: "orange", name: "Orange", kind: "normal" },
    { id: "plum", name: "Plum", kind: "normal" },
    { id: "bell", name: "Bell", kind: "normal" },
    { id: "bar", name: "Bar", kind: "normal" },
    { id: "seven", name: "Seven", kind: "normal" },
  ],
  reels: [
    "plum,lemon,orange,seven,plum,orange,bell,bar,cherry,bar,cherry,lemon,bar,cherry,lemon,cherry,cherry,plum,bell,plum,orange,cherry,orange,orange,lemon,bell,lemon,bell,lemon,lemon,plum,orange".split(
      ",",
    ),
    "bell,orange,bell,plum,bell,cherry,seven,lemon,cherry,orange,lemon,cherry,plum,orange,plum,orange,plum,bell,cherry,orange,lemon,lemon,cherry,plum,orange,cherry,lemon,lemon,bar,bar,bar,lemon".split(
      ",",
    ),
    "orange,orange,bar,plum,bell,plum,orange,cherry,cherry,lemon,lemon,seven,plum,plum,lemon,lemon,cherry,bar,bell,bell,lemon,lemon,bell,cherry,plum,bar,orange,cherry,lemon,orange,cherry,orange".split(
      ",",
    ),
  ],
  paylines: [
    [1, 1, 1], // middle row
    [0, 0, 0], // top row
    [2, 2, 2], // bottom row
    [0, 1, 2], // diagonal down
    [2, 1, 0], // diagonal up
  ],
  paylineNames: ["middle row", "top row", "bottom row", "diagonal down", "diagonal up"],
  linePays: {
    seven: { 3: 10_000 },
    bar: { 3: 2_500 },
    bell: { 3: 1_500 },
    plum: { 3: 700 },
    orange: { 3: 500 },
    lemon: { 3: 400 },
    cherry: { 2: 60, 3: 300 },
  },
  bets: [100, 200, 500, 1_000, 2_500, 5_000, 10_000],
};

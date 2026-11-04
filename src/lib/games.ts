/**
 * Single source of truth for the game catalogue.
 * Navigation, the homepage, the slots hub and routing all read from here,
 * so adding a game is a one-line change.
 */

export type GameCategory = "table" | "slots";
export type GameStatus = "coming-soon" | "playable";

export interface Game {
  slug: string;
  name: string;
  category: GameCategory;
  href: string;
  description: string;
  status: GameStatus;
  /** Roadmap phase in which the game becomes playable. */
  opensIn: string;
  /** Short facts shown on the game's page, as term/definition pairs. */
  rules: readonly { term: string; detail: string }[];
}

export const SLOT_SLUGS = ["classic", "gems", "adventure"] as const;
export type SlotSlug = (typeof SLOT_SLUGS)[number];

export const games: readonly Game[] = [
  {
    slug: "blackjack",
    name: "Blackjack",
    category: "table",
    href: "/blackjack",
    description: "Beat the dealer to 21 with hit, stand, double down and split.",
    status: "playable",
    opensIn: "Phase 4",
    rules: [
      { term: "Goal", detail: "Get closer to 21 than the dealer without going over." },
      { term: "Your moves", detail: "Hit, stand, double down, and split a pair." },
      { term: "Blackjack", detail: "An ace with a ten-value card pays 3 to 2." },
      { term: "Dealer", detail: "Draws until reaching 17 or more." },
    ],
  },
  {
    slug: "roulette",
    name: "Roulette",
    category: "table",
    href: "/roulette",
    description: "European single-zero roulette with inside and outside bets.",
    status: "playable",
    opensIn: "Phase 5",
    rules: [
      { term: "Wheel", detail: "European single zero: 37 pockets, numbered 0 to 36." },
      { term: "Inside bets", detail: "A single number pays 35 to 1." },
      {
        term: "Outside bets",
        detail: "Red or black and odd or even pay 1 to 1; dozens and columns pay 2 to 1.",
      },
      { term: "Zero", detail: "Outside bets lose when the ball lands on 0." },
    ],
  },
  {
    slug: "classic",
    name: "Classic Slots",
    category: "slots",
    href: "/slots/classic",
    description: "Three reels of fruit, bars and sevens.",
    status: "playable",
    opensIn: "Phase 6",
    rules: [
      { term: "Reels", detail: "Three reels of fruit, bars and sevens." },
      {
        term: "Paytable",
        detail: "Every winning combination and its payout is listed before you spin.",
      },
      {
        term: "Return",
        detail:
          "95.70% of all bets come back over time, calculated exactly and checked with a million-spin simulation.",
      },
    ],
  },
  {
    slug: "gems",
    name: "Gem Slots",
    category: "slots",
    href: "/slots/gems",
    description: "Five reels of gemstones with wilds and multipliers.",
    status: "playable",
    opensIn: "Phase 7",
    rules: [
      { term: "Reels", detail: "Five reels of gemstones and ten paylines." },
      {
        term: "Prism wild",
        detail: "The prism stands in for any gem, and any win it is part of pays double.",
      },
      {
        term: "Return",
        detail:
          "95.70% of all bets come back over time, calculated exactly and checked by simulation.",
      },
    ],
  },
  {
    slug: "adventure",
    name: "Adventure Slots",
    category: "slots",
    href: "/slots/adventure",
    description: "An expedition-themed slot with a bonus round.",
    status: "playable",
    opensIn: "Phase 7",
    rules: [
      { term: "Reels", detail: "Five reels of expedition gear and ten paylines." },
      {
        term: "Free spins",
        detail:
          "Three, four or five maps anywhere start 8, 12 or 20 free spins, with every win doubled.",
      },
      {
        term: "Return",
        detail:
          "96.10% of all bets come back over time, free spins included, calculated exactly and checked by simulation.",
      },
    ],
  },
];

export const slotGames = games.filter((game) => game.category === "slots");

export function isSlotSlug(value: string): value is SlotSlug {
  return (SLOT_SLUGS as readonly string[]).includes(value);
}

export function getGame(slug: string): Game | undefined {
  return games.find((game) => game.slug === slug);
}

export function getSlotGame(slug: string): Game | undefined {
  return isSlotSlug(slug) ? slotGames.find((game) => game.slug === slug) : undefined;
}

/** Top-level navigation. Slots is a hub page that links to the three slot games. */
export const mainNav = [
  { label: "Blackjack", href: "/blackjack" },
  { label: "Roulette", href: "/roulette" },
  { label: "Slots", href: "/slots" },
  { label: "Dashboard", href: "/dashboard" },
] as const;

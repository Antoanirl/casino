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
    status: "coming-soon",
  },
  {
    slug: "roulette",
    name: "Roulette",
    category: "table",
    href: "/roulette",
    description: "European single-zero roulette with inside and outside bets.",
    status: "coming-soon",
  },
  {
    slug: "classic",
    name: "Classic Slots",
    category: "slots",
    href: "/slots/classic",
    description: "Three reels of fruit, bars and sevens.",
    status: "coming-soon",
  },
  {
    slug: "gems",
    name: "Gem Slots",
    category: "slots",
    href: "/slots/gems",
    description: "Five reels of gemstones with wilds and multipliers.",
    status: "coming-soon",
  },
  {
    slug: "adventure",
    name: "Adventure Slots",
    category: "slots",
    href: "/slots/adventure",
    description: "An expedition-themed slot with a bonus round.",
    status: "coming-soon",
  },
];

export const slotGames = games.filter((game) => game.category === "slots");

export function isSlotSlug(value: string): value is SlotSlug {
  return (SLOT_SLUGS as readonly string[]).includes(value);
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

/** Cards, shoes and hand values. Pure functions: no randomness, no I/O. */

export const SUITS = ["S", "H", "D", "C"] as const;
export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];

export interface Card {
  rank: Rank;
  suit: Suit;
}

/** An unshuffled shoe of `decks` standard 52-card decks. Shuffle it with rng.shuffle before dealing. */
export function createShoe(decks: number): Card[] {
  if (!Number.isInteger(decks) || decks < 1)
    throw new RangeError("decks must be a positive integer");
  const shoe: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) shoe.push({ rank, suit });
    }
  }
  return shoe;
}

/** Points for one card, counting an ace as 1 (handValue decides when it counts as 11). */
export function cardPoints(rank: Rank): number {
  if (rank === "A") return 1;
  if (rank === "J" || rank === "Q" || rank === "K") return 10;
  return Number(rank);
}

export interface HandValue {
  total: number;
  /** True when an ace is being counted as 11 (the hand can't bust on the next card). */
  soft: boolean;
}

/** Best blackjack value of a hand: one ace counts as 11 if that doesn't go over 21. */
export function handValue(cards: readonly Card[]): HandValue {
  let total = 0;
  let hasAce = false;
  for (const card of cards) {
    total += cardPoints(card.rank);
    if (card.rank === "A") hasAce = true;
  }
  if (hasAce && total + 10 <= 21) return { total: total + 10, soft: true };
  return { total, soft: false };
}

/** Two cards worth 21. (A hand created by splitting never counts as blackjack; see the engine.) */
export function isNaturalBlackjack(cards: readonly Card[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21;
}

export function isBust(cards: readonly Card[]): boolean {
  return handValue(cards).total > 21;
}

/** Splitting needs two cards of equal value: 10-J or K-Q count as a pair. */
export function isPair(cards: readonly Card[]): boolean {
  return cards.length === 2 && cardPoints(cards[0]!.rank) === cardPoints(cards[1]!.rank);
}

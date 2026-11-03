import {
  handValue,
  isBust,
  isNaturalBlackjack,
  isPair,
  type Card,
  type HandValue,
} from "@/server/games/blackjack/cards";

/**
 * Blackjack rules engine.
 *
 * Pure and deterministic: given the same (already shuffled) shoe and the same actions,
 * it always produces the same round. The server shuffles with the secure RNG, stores the
 * round state, and calls these functions; the browser only ever sees `toPublicView`.
 * Every function returns a new state and never mutates its input.
 *
 * Money is in minor units (100 = 1 credit), like the ledger.
 */

export const RULES = {
  decks: 6,
  /** 1 credit */
  minBet: 100,
  /** 500 credits */
  maxBet: 50_000,
  /** Bets are whole credits, so a 3:2 payout is always a whole number of minor units. */
  betStep: 100,
  /** Splitting can create at most this many hands. */
  maxHands: 4,
  /** The dealer stands on soft 17 (an ace counted as 11 plus six). */
  dealerHitsSoft17: false,
} as const;

export type Action = "hit" | "stand" | "double" | "split";

export type HandStatus = "playing" | "stood" | "bust" | "blackjack";

export interface PlayerHand {
  cards: Card[];
  /** Current stake on this hand, doubled by `double`. */
  bet: number;
  doubled: boolean;
  /** Hands created by splitting never count as blackjack. */
  fromSplit: boolean;
  /** Split aces get exactly one card each and can't be split again. */
  splitAces: boolean;
  status: HandStatus;
}

export type HandResult = "blackjack" | "win" | "push" | "lose";

export interface HandOutcome {
  result: HandResult;
  /** Total returned to the player for this hand, including the stake (0 on a loss). */
  payout: number;
}

export interface RoundState {
  phase: "player" | "settled";
  /** Remaining cards in dealing order. Server only: never send this to the browser. */
  shoe: Card[];
  dealer: Card[];
  hands: PlayerHand[];
  /** Index of the hand the player is acting on. */
  active: number;
  /** Set once the round is settled, one entry per hand. */
  outcomes: HandOutcome[] | null;
}

export class InvalidBetError extends Error {
  constructor(readonly bet: number) {
    super(
      `Bet must be a whole number of credits between ${RULES.minBet / 100} and ${RULES.maxBet / 100}`,
    );
    this.name = "InvalidBetError";
  }
}

export class IllegalActionError extends Error {
  constructor(readonly action: string) {
    super(`"${action}" is not allowed right now`);
    this.name = "IllegalActionError";
  }
}

export function isValidBet(bet: number): boolean {
  return (
    Number.isSafeInteger(bet) &&
    bet >= RULES.minBet &&
    bet <= RULES.maxBet &&
    bet % RULES.betStep === 0
  );
}

function draw(state: RoundState): Card {
  const card = state.shoe.shift();
  if (!card) throw new Error("The shoe ran out of cards");
  return card;
}

function newHand(cards: Card[], bet: number, fromSplit = false, splitAces = false): PlayerHand {
  return { cards, bet, doubled: false, fromSplit, splitAces, status: "playing" };
}

/** A hand that reaches 21 or busts is finished automatically; there's nothing left to decide. */
function updateStatus(hand: PlayerHand): void {
  if (isBust(hand.cards)) hand.status = "bust";
  else if (handValue(hand.cards).total === 21) hand.status = "stood";
}

/**
 * Deals a new round from an already shuffled shoe: player, dealer, player, dealer (hole card).
 * If either side has blackjack the round is settled immediately (the dealer "peeks").
 */
export function startRound(shoe: readonly Card[], bet: number): RoundState {
  if (!isValidBet(bet)) throw new InvalidBetError(bet);

  const state: RoundState = {
    phase: "player",
    shoe: [...shoe],
    dealer: [],
    hands: [],
    active: 0,
    outcomes: null,
  };
  const playerCards = [draw(state)];
  state.dealer.push(draw(state));
  playerCards.push(draw(state));
  state.dealer.push(draw(state));
  state.hands.push(newHand(playerCards, bet));

  const playerBlackjack = isNaturalBlackjack(playerCards);
  const dealerBlackjack = isNaturalBlackjack(state.dealer);
  if (playerBlackjack) state.hands[0]!.status = "blackjack";
  if (playerBlackjack || dealerBlackjack) return settle(state);

  return state;
}

/** The moves the player may make right now. Empty once the round is settled. */
export function legalActions(state: RoundState): Action[] {
  if (state.phase !== "player") return [];
  const hand = state.hands[state.active];
  if (!hand || hand.status !== "playing") return [];

  const actions: Action[] = ["hit", "stand"];
  const firstTwoCards = hand.cards.length === 2;
  if (firstTwoCards && !hand.splitAces) actions.push("double");
  if (
    firstTwoCards &&
    isPair(hand.cards) &&
    !hand.splitAces &&
    state.hands.length < RULES.maxHands
  ) {
    actions.push("split");
  }
  return actions;
}

/**
 * Extra stake the player must put down for an action: doubling and splitting each cost
 * another bet equal to the hand's current bet. The server debits this through the ledger
 * BEFORE applying the action.
 */
export function additionalStake(state: RoundState, action: Action): number {
  if (action !== "double" && action !== "split") return 0;
  return state.hands[state.active]?.bet ?? 0;
}

export function applyAction(current: RoundState, action: Action): RoundState {
  if (!legalActions(current).includes(action)) throw new IllegalActionError(action);

  const state = structuredClone(current);
  const hand = state.hands[state.active]!;

  switch (action) {
    case "hit": {
      hand.cards.push(draw(state));
      updateStatus(hand);
      break;
    }
    case "stand": {
      hand.status = "stood";
      break;
    }
    case "double": {
      hand.bet *= 2;
      hand.doubled = true;
      hand.cards.push(draw(state));
      hand.status = isBust(hand.cards) ? "bust" : "stood";
      break;
    }
    case "split": {
      const aces = hand.cards[0]!.rank === "A";
      const first = newHand([hand.cards[0]!, draw(state)], hand.bet, true, aces);
      const second = newHand([hand.cards[1]!, draw(state)], hand.bet, true, aces);
      for (const split of [first, second]) {
        if (aces) split.status = "stood";
        else updateStatus(split);
      }
      state.hands.splice(state.active, 1, first, second);
      break;
    }
  }

  return advance(state);
}

/** Moves to the next hand that still needs a decision, or finishes the round. */
function advance(state: RoundState): RoundState {
  const next = state.hands.findIndex((hand, i) => i >= state.active && hand.status === "playing");
  if (next !== -1) {
    state.active = next;
    return state;
  }
  playDealer(state);
  return settle(state);
}

function dealerShouldDraw(cards: readonly Card[]): boolean {
  const { total, soft } = handValue(cards);
  if (total < 17) return true;
  return RULES.dealerHitsSoft17 && total === 17 && soft;
}

function playDealer(state: RoundState): void {
  // If every hand already busted, the dealer wins without drawing.
  if (state.hands.every((hand) => hand.status === "bust")) return;
  while (dealerShouldDraw(state.dealer)) state.dealer.push(draw(state));
}

function outcomeFor(hand: PlayerHand, dealer: readonly Card[]): HandOutcome {
  const lose: HandOutcome = { result: "lose", payout: 0 };
  if (hand.status === "bust") return lose;

  const playerBlackjack = hand.status === "blackjack" && !hand.fromSplit;
  const dealerBlackjack = isNaturalBlackjack(dealer);
  if (playerBlackjack && dealerBlackjack) return { result: "push", payout: hand.bet };
  if (playerBlackjack) return { result: "blackjack", payout: hand.bet + (hand.bet * 3) / 2 };
  if (dealerBlackjack) return lose;

  const player = handValue(hand.cards).total;
  const house = handValue(dealer).total;
  if (house > 21 || player > house) return { result: "win", payout: hand.bet * 2 };
  if (player === house) return { result: "push", payout: hand.bet };
  return lose;
}

function settle(state: RoundState): RoundState {
  state.phase = "settled";
  state.outcomes = state.hands.map((hand) => outcomeFor(hand, state.dealer));
  return state;
}

/** Sum of every stake the player put down in the round (initial bet, doubles, splits). */
export function totalStake(state: RoundState): number {
  return state.hands.reduce((sum, hand) => sum + hand.bet, 0);
}

/** Sum of everything returned to the player. Only meaningful once settled. */
export function totalPayout(state: RoundState): number {
  return (state.outcomes ?? []).reduce((sum, outcome) => sum + outcome.payout, 0);
}

// ---------------------------------------------------------------------------
// What the browser is allowed to see
// ---------------------------------------------------------------------------

export interface PublicHand {
  cards: Card[];
  value: HandValue;
  bet: number;
  doubled: boolean;
  /** Split aces take exactly one card each, so the player can't hit them. */
  splitAces: boolean;
  status: HandStatus;
  outcome: HandOutcome | null;
}

export interface PublicRound {
  phase: RoundState["phase"];
  /** While the player is acting, the dealer's hole card is hidden (null). */
  dealer: (Card | null)[];
  /** Value of the dealer's visible cards only. */
  dealerValue: HandValue;
  hands: PublicHand[];
  active: number;
  actions: Action[];
  totalStake: number;
  totalPayout: number | null;
}

/** Strips everything the player must not see: the shoe and, until the end, the hole card. */
export function toPublicView(state: RoundState): PublicRound {
  const hideHole = state.phase === "player";
  const visibleDealer = hideHole ? state.dealer.slice(0, 1) : state.dealer;

  return {
    phase: state.phase,
    dealer: hideHole ? [state.dealer[0]!, null] : [...state.dealer],
    dealerValue: handValue(visibleDealer),
    hands: state.hands.map((hand, i) => ({
      cards: [...hand.cards],
      value: handValue(hand.cards),
      bet: hand.bet,
      doubled: hand.doubled,
      splitAces: hand.splitAces,
      status: hand.status,
      outcome: state.outcomes?.[i] ?? null,
    })),
    active: state.active,
    actions: legalActions(state),
    totalStake: totalStake(state),
    totalPayout: state.phase === "settled" ? totalPayout(state) : null,
  };
}

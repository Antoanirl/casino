import { describe, expect, it } from "vitest";
import { shuffle } from "@/server/rng";
import {
  createShoe,
  handValue,
  isNaturalBlackjack,
  isPair,
  type Card,
  type Rank,
} from "@/server/games/blackjack/cards";
import {
  IllegalActionError,
  InvalidBetError,
  RULES,
  additionalStake,
  applyAction,
  legalActions,
  startRound,
  toPublicView,
  totalPayout,
  totalStake,
  type Action,
  type RoundState,
} from "@/server/games/blackjack/engine";

const BET = 1_000; // 10 credits

/** Builds cards from ranks, cycling suits so equal ranks stay distinguishable. */
function cards(...ranks: Rank[]): Card[] {
  const suits = ["S", "H", "D", "C"] as const;
  return ranks.map((rank, i) => ({ rank, suit: suits[i % 4]! }));
}

/**
 * A rigged shoe. Deal order is player, dealer, player, dealer, then every later card in order.
 * `rest` defaults to plenty of 2s so tests never run out of cards by accident.
 */
function rigged(player: [Rank, Rank], dealer: [Rank, Rank], ...rest: Rank[]): Card[] {
  return cards(player[0], dealer[0], player[1], dealer[1], ...rest, ...Array<Rank>(30).fill("2"));
}

function play(state: RoundState, ...actions: Action[]): RoundState {
  return actions.reduce((s, action) => applyAction(s, action), state);
}

describe("cards", () => {
  it("builds a full shoe", () => {
    const shoe = createShoe(6);
    expect(shoe).toHaveLength(312);
    expect(shoe.filter((c) => c.rank === "A")).toHaveLength(24);
    expect(() => createShoe(0)).toThrow(RangeError);
  });

  it("counts aces as 11 only when that doesn't bust", () => {
    expect(handValue(cards("A", "6"))).toEqual({ total: 17, soft: true });
    expect(handValue(cards("A", "6", "10"))).toEqual({ total: 17, soft: false });
    expect(handValue(cards("A", "A"))).toEqual({ total: 12, soft: true });
    expect(handValue(cards("A", "A", "9"))).toEqual({ total: 21, soft: true });
    expect(handValue(cards("K", "Q", "2"))).toEqual({ total: 22, soft: false });
    expect(handValue([])).toEqual({ total: 0, soft: false });
  });

  it("recognises blackjack and pairs", () => {
    expect(isNaturalBlackjack(cards("A", "K"))).toBe(true);
    expect(isNaturalBlackjack(cards("10", "A"))).toBe(true);
    expect(isNaturalBlackjack(cards("7", "7", "7"))).toBe(false);
    expect(isPair(cards("8", "8"))).toBe(true);
    expect(isPair(cards("10", "K"))).toBe(true);
    expect(isPair(cards("A", "K"))).toBe(false);
  });
});

describe("betting", () => {
  it.each([0, 50, 150, 99, RULES.maxBet + 100, 1.5, Number.NaN])("rejects a bet of %s", (bet) => {
    expect(() => startRound(rigged(["10", "7"], ["9", "8"]), bet)).toThrow(InvalidBetError);
  });

  it("accepts the table limits", () => {
    expect(() => startRound(rigged(["10", "7"], ["9", "8"]), RULES.minBet)).not.toThrow();
    expect(() => startRound(rigged(["10", "7"], ["9", "8"]), RULES.maxBet)).not.toThrow();
  });
});

describe("the deal", () => {
  it("deals player, dealer, player, dealer and waits for the player", () => {
    const state = startRound(rigged(["10", "7"], ["9", "8"]), BET);
    expect(state.phase).toBe("player");
    expect(state.hands[0]!.cards.map((c) => c.rank)).toEqual(["10", "7"]);
    expect(state.dealer.map((c) => c.rank)).toEqual(["9", "8"]);
    expect(legalActions(state)).toEqual(["hit", "stand", "double"]);
  });

  it("pays blackjack 3 to 2 at once", () => {
    const state = startRound(rigged(["A", "K"], ["9", "8"]), BET);
    expect(state.phase).toBe("settled");
    expect(state.outcomes).toEqual([{ result: "blackjack", payout: 2_500 }]);
  });

  it("pushes when both have blackjack", () => {
    const state = startRound(rigged(["A", "K"], ["A", "Q"]), BET);
    expect(state.outcomes).toEqual([{ result: "push", payout: BET }]);
  });

  it("ends the round when the dealer has blackjack", () => {
    const state = startRound(rigged(["10", "9"], ["A", "K"]), BET);
    expect(state.phase).toBe("settled");
    expect(state.outcomes).toEqual([{ result: "lose", payout: 0 }]);
    expect(state.dealer).toHaveLength(2);
  });

  it("does not mutate the shoe it was given", () => {
    const shoe = rigged(["10", "7"], ["9", "8"]);
    const copy = structuredClone(shoe);
    startRound(shoe, BET);
    expect(shoe).toEqual(copy);
  });
});

describe("hit and stand", () => {
  it("busts over 21 and the dealer doesn't draw", () => {
    const start = startRound(rigged(["10", "6"], ["9", "5"], "K", "5"), BET);
    const state = play(start, "hit");
    expect(state.hands[0]!.status).toBe("bust");
    expect(state.outcomes).toEqual([{ result: "lose", payout: 0 }]);
    expect(state.dealer).toHaveLength(2); // no draw: every hand busted
  });

  it("stands automatically on 21", () => {
    const state = play(startRound(rigged(["10", "6"], ["10", "8"], "5"), BET), "hit");
    expect(state.phase).toBe("settled");
    expect(state.outcomes).toEqual([{ result: "win", payout: 2 * BET }]);
  });

  it("wins when the dealer busts", () => {
    // Dealer 16 draws a 10 and busts.
    const state = play(startRound(rigged(["10", "8"], ["10", "6"], "10"), BET), "stand");
    expect(state.dealer.map((c) => c.rank)).toEqual(["10", "6", "10"]);
    expect(state.outcomes).toEqual([{ result: "win", payout: 2 * BET }]);
  });

  it("pushes on equal totals and loses on lower", () => {
    const push = play(startRound(rigged(["10", "8"], ["9", "9"]), BET), "stand");
    expect(push.outcomes).toEqual([{ result: "push", payout: BET }]);
    const lose = play(startRound(rigged(["10", "7"], ["9", "9"]), BET), "stand");
    expect(lose.outcomes).toEqual([{ result: "lose", payout: 0 }]);
  });
});

describe("dealer rules", () => {
  it("stands on soft 17", () => {
    const state = play(startRound(rigged(["10", "8"], ["A", "6"]), BET), "stand");
    expect(state.dealer).toHaveLength(2);
    expect(state.outcomes![0]!.result).toBe("win");
  });

  it("draws on soft 16 and hard 16", () => {
    const soft = play(startRound(rigged(["10", "8"], ["A", "5"], "3"), BET), "stand");
    expect(soft.dealer.map((c) => c.rank)).toEqual(["A", "5", "3"]); // soft 19
    const hard = play(startRound(rigged(["10", "8"], ["10", "6"], "2"), BET), "stand");
    expect(hard.dealer.map((c) => c.rank)).toEqual(["10", "6", "2"]); // hard 18
  });
});

describe("double down", () => {
  it("doubles the bet, takes exactly one card and ends the hand", () => {
    const start = startRound(rigged(["6", "5"], ["10", "7"], "10"), BET);
    expect(additionalStake(start, "double")).toBe(BET);
    const state = play(start, "double");
    expect(state.hands[0]).toMatchObject({ bet: 2 * BET, doubled: true });
    expect(state.hands[0]!.cards).toHaveLength(3);
    expect(state.outcomes).toEqual([{ result: "win", payout: 4 * BET }]);
  });

  it("is only allowed on the first two cards", () => {
    const state = play(startRound(rigged(["2", "3"], ["10", "7"], "2"), BET), "hit");
    expect(legalActions(state)).toEqual(["hit", "stand"]);
    expect(() => applyAction(state, "double")).toThrow(IllegalActionError);
  });
});

describe("split", () => {
  it("makes two hands, each with its own bet and a new card", () => {
    const start = startRound(rigged(["8", "8"], ["10", "7"], "3", "10"), BET);
    expect(legalActions(start)).toContain("split");
    expect(additionalStake(start, "split")).toBe(BET);

    const state = applyAction(start, "split");
    expect(state.hands).toHaveLength(2);
    expect(state.hands.map((h) => h.cards.map((c) => c.rank))).toEqual([
      ["8", "3"],
      ["8", "10"],
    ]);
    expect(state.hands.every((h) => h.bet === BET && h.fromSplit)).toBe(true);
    expect(totalStake(state)).toBe(2 * BET);
    expect(state.active).toBe(0);
  });

  it("plays the hands in order, then settles each one", () => {
    // Hands: 8+3 (11) and 8+10 (18). Double the first (draws 10 -> 21), stand on the second.
    const start = startRound(rigged(["8", "8"], ["10", "7"], "3", "10", "10"), BET);
    const state = play(start, "split", "double", "stand");
    expect(state.phase).toBe("settled");
    expect(state.outcomes).toEqual([
      { result: "win", payout: 4 * BET }, // 21 vs 17, doubled
      { result: "win", payout: 2 * BET }, // 18 vs 17
    ]);
    expect(totalStake(state)).toBe(3 * BET);
    expect(totalPayout(state)).toBe(6 * BET);
  });

  it("gives split aces one card each, and 21 after a split is not blackjack", () => {
    const start = startRound(rigged(["A", "A"], ["10", "7"], "K", "5"), BET);
    const state = applyAction(start, "split");
    expect(state.phase).toBe("settled"); // both ace hands finish immediately
    expect(state.hands.every((h) => h.cards.length === 2)).toBe(true);
    expect(state.outcomes).toEqual([
      { result: "win", payout: 2 * BET }, // A+K = 21 pays 1:1, not 3:2
      { result: "lose", payout: 0 }, // A+5 = 16 vs 17
    ]);
  });

  it("allows resplitting up to four hands", () => {
    let state = startRound(rigged(["8", "8"], ["10", "7"], "8", "8", "8", "8", "8"), BET);
    state = applyAction(state, "split"); // 2 hands
    state = applyAction(state, "split"); // 3 hands
    state = applyAction(state, "split"); // 4 hands
    expect(state.hands).toHaveLength(RULES.maxHands);
    expect(legalActions(state)).not.toContain("split");
  });

  it("does not split unequal cards", () => {
    const state = startRound(rigged(["8", "9"], ["10", "7"]), BET);
    expect(() => applyAction(state, "split")).toThrow(IllegalActionError);
  });
});

describe("state safety", () => {
  it("never mutates the previous state", () => {
    const start = startRound(rigged(["8", "8"], ["10", "7"], "3", "10"), BET);
    const before = structuredClone(start);
    play(start, "split", "stand", "stand");
    expect(start).toEqual(before);
  });

  it("rejects every action once the round is settled", () => {
    const state = play(startRound(rigged(["10", "8"], ["10", "7"]), BET), "stand");
    for (const action of ["hit", "stand", "double", "split"] as const) {
      expect(() => applyAction(state, action)).toThrow(IllegalActionError);
    }
  });

  it("hides the hole card and the shoe from the public view", () => {
    const state = startRound(rigged(["10", "7"], ["9", "8"]), BET);
    const view = toPublicView(state);
    expect(view.dealer).toEqual([state.dealer[0], null]);
    expect(view.dealerValue.total).toBe(9);
    expect(view).not.toHaveProperty("shoe");
    expect(JSON.stringify(view)).not.toContain('"rank":"8"'); // the hole card
    expect(view.totalPayout).toBeNull();

    const settled = toPublicView(applyAction(state, "stand"));
    expect(settled.dealer).toHaveLength(2);
    expect(settled.totalPayout).toBe(BET); // 17 vs 17 is a push
  });
});

describe("random rounds", () => {
  it("keep every card accounted for and pay valid amounts", () => {
    const strategies: Action[] = ["hit", "stand", "double", "split"];
    for (let round = 0; round < 3_000; round++) {
      const shoe = shuffle(createShoe(RULES.decks));
      let state = startRound(shoe, BET);
      let steps = 0;
      while (state.phase === "player") {
        const actions = legalActions(state);
        expect(actions.length).toBeGreaterThan(0);
        const preferred = strategies[round % strategies.length]!;
        const action = actions.includes(preferred) ? preferred : actions[steps % actions.length]!;
        state = applyAction(state, action);
        expect(++steps).toBeLessThan(60);
      }

      const used = state.dealer.length + state.hands.reduce((n, h) => n + h.cards.length, 0);
      expect(used + state.shoe.length).toBe(shoe.length);
      expect(state.outcomes).toHaveLength(state.hands.length);
      state.hands.forEach((hand, i) => {
        const { result, payout } = state.outcomes![i]!;
        const expected = { lose: 0, push: hand.bet, win: 2 * hand.bet, blackjack: 2.5 * hand.bet };
        expect(payout).toBe(expected[result]);
        expect(Number.isInteger(payout)).toBe(true);
      });
    }
  });
});

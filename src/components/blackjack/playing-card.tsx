import type { Card } from "@/server/games/blackjack/cards";

const suitSymbol = { S: "♠", H: "♥", D: "♦", C: "♣" } as const;
const suitName = { S: "spades", H: "hearts", D: "diamonds", C: "clubs" } as const;
const rankName: Record<string, string> = { A: "Ace", J: "Jack", Q: "Queen", K: "King" };

export function cardLabel(card: Card): string {
  return `${rankName[card.rank] ?? card.rank} of ${suitName[card.suit]}`;
}

const size = "h-24 w-16 sm:h-28 sm:w-20";

/**
 * One card on the felt. `card === null` is the dealer's face-down card.
 * `delay` staggers the deal animation so cards arrive one after another.
 */
export function PlayingCard({ card, delay = 0 }: { card: Card | null; delay?: number }) {
  const style = { animationDelay: `${delay}ms` };

  if (!card) {
    return (
      <div
        role="img"
        aria-label="Face-down card"
        style={style}
        className={`${size} animate-deal border-paper/90 bg-felt-deep shrink-0 rounded-lg border-2 p-1.5 shadow-md`}
      >
        <div className="border-brass/60 h-full w-full rounded-[5px] border bg-[repeating-linear-gradient(45deg,transparent_0_5px,rgb(200_160_74/0.35)_5px_6px)]" />
      </div>
    );
  }

  const red = card.suit === "H" || card.suit === "D";
  const symbol = suitSymbol[card.suit];

  return (
    <div
      role="img"
      aria-label={cardLabel(card)}
      style={style}
      className={`${size} animate-deal border-ink/15 bg-sheet relative shrink-0 rounded-lg border shadow-md ${red ? "text-stamp" : "text-ink"}`}
    >
      <span aria-hidden="true" className="absolute top-1 left-1.5 text-center leading-none">
        <span className="font-display block text-lg sm:text-xl">{card.rank}</span>
        <span className="block text-sm">{symbol}</span>
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-3xl sm:text-4xl"
      >
        {symbol}
      </span>
      <span
        aria-hidden="true"
        className="absolute right-1.5 bottom-1 rotate-180 text-center leading-none"
      >
        <span className="font-display block text-lg sm:text-xl">{card.rank}</span>
        <span className="block text-sm">{symbol}</span>
      </span>
    </div>
  );
}

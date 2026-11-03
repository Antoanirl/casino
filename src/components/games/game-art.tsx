/**
 * Line illustrations for game cards: brass ink on felt.
 * Decorative only (aria-hidden); the card text carries the meaning.
 */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function BlackjackArt() {
  return (
    <g {...stroke}>
      <g transform="rotate(-10 120 80)">
        <rect x="78" y="22" width="64" height="92" rx="6" />
        <text
          x="88"
          y="44"
          fontSize="16"
          fill="currentColor"
          stroke="none"
          style={{ fontFamily: "var(--font-display)" }}
        >
          A
        </text>
        {/* Heart */}
        <path d="M110 92 L97 77 a8 8 0 0 1 13-9 a8 8 0 0 1 13 9 Z" />
      </g>
      <g transform="rotate(8 150 80)">
        <rect x="118" y="30" width="64" height="92" rx="6" />
        <text
          x="128"
          y="52"
          fontSize="16"
          fill="currentColor"
          stroke="none"
          style={{ fontFamily: "var(--font-display)" }}
        >
          K
        </text>
        <path d="M150 70l-10 12 10 12 10-12z" />
      </g>
    </g>
  );
}

function RouletteArt() {
  const pockets = 18;
  return (
    <g {...stroke}>
      <circle cx="130" cy="72" r="56" />
      <circle cx="130" cy="72" r="40" />
      <circle cx="130" cy="72" r="12" />
      {Array.from({ length: pockets }, (_, i) => {
        const a = (i / pockets) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={130 + Math.cos(a) * 40}
            y1={72 + Math.sin(a) * 40}
            x2={130 + Math.cos(a) * 56}
            y2={72 + Math.sin(a) * 56}
            strokeWidth={1.25}
          />
        );
      })}
      <circle cx="160" cy="34" r="4.5" fill="currentColor" />
    </g>
  );
}

const reelSymbols: Record<string, [string, string, string]> = {
  classic: ["7", "♦", "7"],
  gems: ["◆", "◇", "◆"],
  adventure: ["⚑", "✦", "⚑"],
};

function SlotsArt({ variant }: { variant: string }) {
  const symbols = reelSymbols[variant] ?? reelSymbols.classic!;
  return (
    <g {...stroke}>
      <rect x="58" y="22" width="144" height="100" rx="10" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={70 + i * 42} y="38" width="36" height="68" rx="4" strokeWidth={1.5} />
          <text
            x={88 + i * 42}
            y="80"
            textAnchor="middle"
            fontSize="22"
            fill="currentColor"
            stroke="none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {symbols[i]}
          </text>
        </g>
      ))}
      <line x1="64" y1="72" x2="196" y2="72" strokeWidth={1} strokeDasharray="3 4" />
    </g>
  );
}

export function GameArt({ slug, className = "" }: { slug: string; className?: string }) {
  return (
    <svg viewBox="0 0 260 144" aria-hidden="true" className={`text-brass ${className}`}>
      {slug === "blackjack" ? <BlackjackArt /> : null}
      {slug === "roulette" ? <RouletteArt /> : null}
      {slug !== "blackjack" && slug !== "roulette" ? <SlotsArt variant={slug} /> : null}
    </svg>
  );
}

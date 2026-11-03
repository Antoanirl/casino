/**
 * Slot symbols, drawn in the site's palette: stamp red, brass, ink and felt.
 * Symbols without a drawing (future games) fall back to their name in display type.
 */

const stroke = { stroke: "var(--color-ink)", strokeWidth: 2.5, strokeLinejoin: "round" as const };

const drawings: Record<string, React.ReactNode> = {
  cherry: (
    <g {...stroke}>
      <path
        d="M50 18 C46 34 36 44 32 58 M50 18 C56 34 64 44 70 54"
        fill="none"
        stroke="var(--color-felt)"
        strokeWidth={4}
      />
      <path d="M50 18 C58 12 70 12 76 18 C68 22 58 22 50 18 Z" fill="var(--color-felt)" />
      <circle cx="32" cy="68" r="14" fill="var(--color-stamp)" />
      <circle cx="70" cy="64" r="14" fill="var(--color-stamp)" />
    </g>
  ),
  lemon: (
    <g {...stroke}>
      <ellipse
        cx="50"
        cy="52"
        rx="32"
        ry="22"
        fill="var(--color-brass)"
        transform="rotate(-20 50 52)"
      />
      <path d="M20 66 L14 70 M80 38 L86 34" />
    </g>
  ),
  orange: (
    <g {...stroke}>
      <circle cx="50" cy="56" r="28" fill="#d9822b" />
      <path d="M50 28 C52 20 60 16 68 18 C64 26 56 28 50 28 Z" fill="var(--color-felt)" />
    </g>
  ),
  plum: (
    <g {...stroke}>
      <path d="M50 26 C74 26 82 48 74 66 C66 82 34 82 26 66 C18 48 26 26 50 26 Z" fill="#5b3a6e" />
      <path
        d="M50 26 C48 34 48 44 50 52"
        fill="none"
        stroke="var(--color-paper)"
        strokeOpacity={0.5}
      />
      <path d="M50 26 L54 14" />
    </g>
  ),
  bell: (
    <g {...stroke}>
      <path
        d="M50 16 C66 16 72 30 72 46 C72 58 78 64 84 70 L16 70 C22 64 28 58 28 46 C28 30 34 16 50 16 Z"
        fill="var(--color-brass)"
      />
      <circle cx="50" cy="78" r="7" fill="var(--color-brass)" />
    </g>
  ),
  bar: (
    <g>
      <rect x="12" y="34" width="76" height="32" rx="5" fill="var(--color-ink)" />
      <text
        x="50"
        y="57"
        textAnchor="middle"
        fontSize="22"
        fontWeight={800}
        fill="var(--color-paper)"
        style={{ letterSpacing: 2 }}
      >
        BAR
      </text>
    </g>
  ),
  seven: (
    <text
      x="50"
      y="80"
      textAnchor="middle"
      fontSize="78"
      fill="var(--color-stamp)"
      stroke="var(--color-ink)"
      strokeWidth={2}
      style={{ fontFamily: "var(--font-display)" }}
    >
      7
    </text>
  ),
};

export function SymbolArt({
  id,
  name,
  className = "",
}: {
  id: string;
  name: string;
  className?: string;
}) {
  const drawing = drawings[id];
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={name} className={className}>
      {drawing ?? (
        <text
          x="50"
          y="60"
          textAnchor="middle"
          fontSize="26"
          fill="var(--color-ink)"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {name}
        </text>
      )}
    </svg>
  );
}

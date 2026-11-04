/**
 * Slot symbols, drawn in the site's palette: stamp red, brass, ink and felt, plus a few
 * extra hues where a gem or object needs its own colour. Every symbol in a game also has
 * its own silhouette, so they stay distinguishable without colour.
 * Symbols without a drawing fall back to their name in display type.
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

  // ---- Gem Slots --------------------------------------------------------
  topaz: (
    <g {...stroke}>
      <path
        d="M50 12 C64 32 78 48 78 64 C78 80 66 88 50 88 C34 88 22 80 22 64 C22 48 36 32 50 12 Z"
        fill="#e0982f"
      />
      <path d="M50 12 L50 50 M36 60 L50 50 L64 60 M50 50 L50 88" fill="none" strokeWidth={1.5} />
      <path d="M38 40 C34 48 32 56 33 62" fill="none" stroke="#fff" strokeOpacity={0.6} />
    </g>
  ),
  amethyst: (
    <g {...stroke}>
      <path d="M50 12 L82 30 L82 70 L50 88 L18 70 L18 30 Z" fill="#7b4fa0" />
      <path
        d="M50 28 L66 38 L66 62 L50 72 L34 62 L34 38 Z M50 12 L50 28 M82 30 L66 38 M82 70 L66 62 M50 88 L50 72 M18 70 L34 62 M18 30 L34 38"
        fill="none"
        strokeWidth={1.5}
      />
    </g>
  ),
  sapphire: (
    <g {...stroke}>
      <rect x="18" y="18" width="64" height="64" rx="18" fill="#2f5d9e" />
      <path
        d="M50 28 L72 50 L50 72 L28 50 Z M18 36 L28 50 L18 64 M82 36 L72 50 L82 64 M36 18 L50 28 L64 18 M36 82 L50 72 L64 82"
        fill="none"
        strokeWidth={1.5}
      />
    </g>
  ),
  emerald: (
    <g {...stroke}>
      <path d="M34 12 L66 12 L80 26 L80 74 L66 88 L34 88 L20 74 L20 26 Z" fill="#23875e" />
      <path
        d="M38 24 L62 24 L68 30 L68 70 L62 76 L38 76 L32 70 L32 30 Z M34 12 L38 24 M66 12 L62 24 M80 26 L68 30 M80 74 L68 70 M66 88 L62 76 M34 88 L38 76 M20 74 L32 70 M20 26 L32 30"
        fill="none"
        strokeWidth={1.5}
      />
    </g>
  ),
  ruby: (
    <g {...stroke}>
      <path
        d="M50 86 C22 66 14 48 20 34 C26 20 44 18 50 32 C56 18 74 20 80 34 C86 48 78 66 50 86 Z"
        fill="var(--color-stamp)"
      />
      <path d="M50 32 L50 86 M30 40 L50 56 L70 40" fill="none" strokeWidth={1.5} />
      <path d="M28 32 C26 36 26 40 27 44" fill="none" stroke="#fff" strokeOpacity={0.6} />
    </g>
  ),
  diamond: (
    <g {...stroke}>
      <path d="M30 22 L70 22 L86 40 L50 88 L14 40 Z" fill="#dcecf3" />
      <path
        d="M14 40 L86 40 M30 22 L40 40 L50 22 L60 40 L70 22 M40 40 L50 88 L60 40"
        fill="none"
        strokeWidth={1.5}
      />
    </g>
  ),
  prism: (
    <g>
      <path d="M8 58 L38 52" stroke="var(--color-ink)" strokeWidth={3} strokeLinecap="round" />
      {["var(--color-stamp)", "#e0982f", "var(--color-brass)", "#23875e", "#2f5d9e", "#7b4fa0"].map(
        (colour, i) => (
          <path
            key={colour}
            d={`M62 52 L95 ${34 + i * 8}`}
            stroke={colour}
            strokeWidth={5}
            strokeLinecap="round"
          />
        ),
      )}
      <path
        d="M50 12 L82 70 L18 70 Z"
        fill="#a9d3e2"
        stroke="var(--color-ink)"
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <path d="M50 12 L50 70 M50 12 L36 70" stroke="#fff" strokeOpacity={0.7} strokeWidth={2} />
      <circle cx="50" cy="84" r="14" fill="var(--color-ink)" />
      <text
        x="50"
        y="90"
        textAnchor="middle"
        fontSize="16"
        fontWeight={800}
        fill="var(--color-paper)"
      >
        2x
      </text>
    </g>
  ),

  // ---- Adventure Slots ---------------------------------------------------
  boots: (
    <g {...stroke}>
      <path
        d="M30 14 L56 14 L56 56 C70 58 84 64 86 76 L86 84 L26 84 L26 70 C28 60 30 48 30 14 Z"
        fill="#7a4a2a"
      />
      <path d="M26 76 L86 76" fill="none" />
      <path d="M44 26 L56 26 M44 36 L56 36 M44 46 L56 46" fill="none" stroke="var(--color-paper)" />
      <path d="M28 14 L58 14" fill="none" strokeWidth={5} />
    </g>
  ),
  rope: (
    <g fill="none" strokeLinecap="round">
      <path
        d="M50 22 A28 28 0 1 1 49.9 22 M50 34 A16 16 0 1 1 49.9 34 M76 62 C84 72 86 80 82 88"
        stroke="var(--color-ink)"
        strokeWidth={11}
      />
      <path
        d="M50 22 A28 28 0 1 1 49.9 22 M50 34 A16 16 0 1 1 49.9 34 M76 62 C84 72 86 80 82 88"
        stroke="#c69a55"
        strokeWidth={6}
      />
      <circle cx="50" cy="50" r="5" fill="#c69a55" stroke="var(--color-ink)" strokeWidth={2.5} />
    </g>
  ),
  lantern: (
    <g {...stroke}>
      <path d="M38 20 C38 8 62 8 62 20" fill="none" />
      <path d="M34 20 L66 20 L70 30 L30 30 Z" fill="var(--color-brass)" />
      <rect x="32" y="30" width="36" height="44" rx="4" fill="#f6dfa0" />
      <path
        d="M50 40 C58 50 58 62 50 66 C42 62 42 50 50 40 Z"
        fill="#e0982f"
        stroke="var(--color-stamp)"
        strokeWidth={2}
      />
      <path d="M32 30 L32 74 M68 30 L68 74 M50 30 L50 38" fill="none" />
      <path d="M28 74 L72 74 L68 86 L32 86 Z" fill="var(--color-brass)" />
    </g>
  ),
  compass: (
    <g {...stroke}>
      <circle cx="50" cy="54" r="34" fill="var(--color-brass)" />
      <circle cx="50" cy="54" r="26" fill="var(--color-sheet)" />
      <path d="M50 30 L57 54 L50 54 Z" fill="var(--color-stamp)" strokeWidth={1.5} />
      <path d="M50 78 L43 54 L50 54 Z" fill="var(--color-ink)" strokeWidth={1.5} />
      <path d="M50 30 L43 54 L50 54 Z M50 78 L57 54 L50 54 Z" fill="none" strokeWidth={1.5} />
      <circle cx="50" cy="14" r="5" fill="var(--color-brass)" />
    </g>
  ),
  idol: (
    <g {...stroke}>
      <path d="M32 86 L36 56 L64 56 L68 86 Z" fill="var(--color-brass)" />
      <rect x="30" y="14" width="40" height="44" rx="14" fill="var(--color-brass)" />
      <path d="M30 26 L70 26" fill="none" strokeWidth={1.5} />
      <circle cx="41" cy="38" r="4" fill="var(--color-ink)" />
      <circle cx="59" cy="38" r="4" fill="var(--color-ink)" />
      <path d="M42 49 L58 49" fill="none" />
      <path d="M36 70 L64 70" fill="none" strokeWidth={1.5} />
    </g>
  ),
  map: (
    <g {...stroke}>
      <path d="M12 24 L36 16 L64 24 L88 16 L88 78 L64 86 L36 78 L12 86 Z" fill="#ecdcae" />
      <path d="M36 16 L36 78 M64 24 L64 86" fill="none" strokeWidth={1.5} />
      <path
        d="M20 72 C30 64 28 52 40 50 C52 48 50 38 62 38"
        fill="none"
        stroke="var(--color-stamp)"
        strokeWidth={3}
        strokeDasharray="4 5"
      />
      <path
        d="M66 30 L78 42 M78 30 L66 42"
        fill="none"
        stroke="var(--color-stamp)"
        strokeWidth={4.5}
        strokeLinecap="round"
      />
    </g>
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

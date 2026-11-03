"use client";

import { pocketColor, WHEEL_ORDER } from "@/server/games/roulette/engine";

const SEGMENT = 360 / WHEEL_ORDER.length;
const CENTER = 120;
const OUTER = 116;
const INNER = 78;

const fill = { red: "var(--color-stamp)", black: "var(--color-ink)", green: "var(--color-felt)" };

function point(radius: number, degrees: number): [number, number] {
  // 0 degrees is straight up; angles grow clockwise.
  const radians = ((degrees - 90) * Math.PI) / 180;
  // Rounded so the server-rendered and browser-rendered SVG match exactly.
  const round = (n: number) => Math.round(n * 100) / 100;
  return [round(CENTER + radius * Math.cos(radians)), round(CENTER + radius * Math.sin(radians))];
}

function segmentPath(index: number): string {
  const start = index * SEGMENT - SEGMENT / 2;
  const end = start + SEGMENT;
  const [x1, y1] = point(OUTER, start);
  const [x2, y2] = point(OUTER, end);
  const [x3, y3] = point(INNER, end);
  const [x4, y4] = point(INNER, start);
  return `M${x1} ${y1} A${OUTER} ${OUTER} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${INNER} ${INNER} 0 0 0 ${x4} ${y4} Z`;
}

/**
 * Rotation (in degrees) that brings `pocket` under the pointer, at least `turns` full turns
 * past the current rotation. Rotation only ever increases, so the wheel always spins forward.
 */
export function rotationFor(pocket: number, current: number, turns = 5): number {
  const index = WHEEL_ORDER.indexOf(pocket as (typeof WHEEL_ORDER)[number]);
  const target = (((-index * SEGMENT - current) % 360) + 360) % 360;
  return current + turns * 360 + target;
}

export const SPIN_MS = 3_600;

/**
 * The wheel only shows a result the server already decided; the animation is decoration.
 * `rotation` comes from rotationFor(); `spinning` turns the long ease-out transition on.
 */
export function RouletteWheel({ rotation, spinning }: { rotation: number; spinning: boolean }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-72" aria-hidden="true">
      <svg viewBox="0 0 240 240" className="h-full w-full drop-shadow-lg">
        <circle cx={CENTER} cy={CENTER} r={OUTER + 3} fill="var(--color-brass)" />
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: `${CENTER}px ${CENTER}px`,
            transition: spinning
              ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.6, 0.1, 1)`
              : "none",
          }}
        >
          {WHEEL_ORDER.map((pocket, i) => {
            const [tx, ty] = point((OUTER + INNER) / 2, i * SEGMENT);
            return (
              <g key={pocket}>
                <path
                  d={segmentPath(i)}
                  fill={fill[pocketColor(pocket)]}
                  stroke="var(--color-brass)"
                  strokeWidth={0.6}
                />
                <text
                  x={tx}
                  y={ty}
                  fill="var(--color-paper)"
                  fontSize="10"
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(${Math.round(i * SEGMENT * 100) / 100} ${tx} ${ty})`}
                  style={{ fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums" }}
                >
                  {pocket}
                </text>
              </g>
            );
          })}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={INNER}
            fill="var(--color-felt-deep)"
            stroke="var(--color-brass)"
          />
          {Array.from({ length: 4 }, (_, i) => {
            const [x, y] = point(INNER - 8, i * 90);
            return (
              <line
                key={i}
                x1={CENTER}
                y1={CENTER}
                x2={x}
                y2={y}
                stroke="var(--color-brass)"
                strokeWidth={3}
                strokeLinecap="round"
              />
            );
          })}
          <circle cx={CENTER} cy={CENTER} r={14} fill="var(--color-brass)" />
        </g>
        {/* Pointer: fixed at the top, outside the rotating group. */}
        <path
          d={`M${CENTER - 9} 0 L${CENTER + 9} 0 L${CENTER} 18 Z`}
          fill="var(--color-paper)"
          stroke="var(--color-ink)"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}

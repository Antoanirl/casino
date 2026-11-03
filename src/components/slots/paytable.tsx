import { SymbolArt } from "@/components/slots/symbol-art";
import type { SlotConfig } from "@/server/games/slots/engine";

function times(pays: number): string {
  return `${(pays / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}x`;
}

/** The game's paytable, built from its config, with the exact return to player. */
export function Paytable({ config, rtp }: { config: SlotConfig; rtp: number }) {
  const rows = config.symbols
    .flatMap((symbol) =>
      Object.entries(config.linePays[symbol.id] ?? {}).map(([count, pays]) => ({
        symbol,
        count: Number(count),
        pays: pays ?? 0,
        scatter: false,
      })),
    )
    .concat(
      Object.entries(config.scatterPays ?? {}).flatMap(([count, pays]) => {
        const scatter = config.symbols.find((s) => s.kind === "scatter");
        return scatter
          ? [{ symbol: scatter, count: Number(count), pays: pays ?? 0, scatter: true }]
          : [];
      }),
    )
    .sort((a, b) => b.pays - a.pays);

  const top = rows[0]?.pays ?? 0;
  const wild = config.symbols.find((s) => s.kind === "wild");

  return (
    <section aria-labelledby="paytable-heading" className="space-y-4">
      <h2 id="paytable-heading" className="font-display text-2xl">
        Paytable
      </h2>
      <p className="text-ink-soft text-sm">
        Wins are multiples of your total bet, matching from the leftmost reel along any of the{" "}
        {config.paylines.length} lines{config.scatterPays ? ", or scattered anywhere" : ""}.
      </p>
      <table className="figures w-full text-sm">
        <tbody className="divide-rule border-rule divide-y border-y">
          {rows.map(({ symbol, count, pays, scatter }) => (
            <tr key={`${symbol.id}-${count}`}>
              <td className="py-1.5">
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: count }, (_, i) => (
                    <SymbolArt key={i} id={symbol.id} name={symbol.name} className="h-7 w-7" />
                  ))}
                  <span className="sr-only">
                    {count} {symbol.name}
                    {scatter ? " anywhere" : ""}
                  </span>
                </span>
              </td>
              <td className="py-1.5 text-right font-semibold">{times(pays)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {wild ? (
        <p className="text-ink-soft text-sm">
          {wild.name} stands in for any symbol except the scatter.
        </p>
      ) : null}
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="border-rule bg-sheet rounded-md border px-3 py-2">
          <dt className="text-ink-soft">Return to player</dt>
          <dd className="font-display text-2xl">{(rtp * 100).toFixed(2)}%</dd>
        </div>
        <div className="border-rule bg-sheet rounded-md border px-3 py-2">
          <dt className="text-ink-soft">Top win</dt>
          <dd className="font-display text-2xl">{times(top)}</dd>
        </div>
      </dl>
      <p className="text-ink-soft text-xs">
        The return is calculated exactly from the reels and this table, and checked by simulating a
        million spins in the test suite. Over many spins you get back about that share of what you
        bet; any single session can go either way.
      </p>
    </section>
  );
}

import { describe, expect, it } from "vitest";
import { CHART_HEIGHT, CHART_WIDTH, chartGeometry } from "@/lib/balance-chart";

describe("balance chart geometry", () => {
  it("spans the full width, oldest on the left", () => {
    const g = chartGeometry([100_000, 90_000, 120_000], 100_000);
    const coords = g.path
      .replace("M", "")
      .split(" L")
      .map((p) => p.split(",").map(Number));
    expect(coords.map(([x]) => x)).toEqual([0, CHART_WIDTH / 2, CHART_WIDTH]);
    // Higher balances sit higher up (smaller y), and everything stays inside the chart.
    expect(coords[2]![1]).toBeLessThan(coords[0]![1]!);
    expect(coords[1]![1]).toBeGreaterThan(coords[0]![1]!);
    for (const [, y] of coords) {
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(CHART_HEIGHT);
    }
  });

  it("finds the low and high points, preferring the latest on a tie", () => {
    const g = chartGeometry([500, 200, 900, 200, 900], 500);
    expect(g.lowIndex).toBe(3);
    expect(g.highIndex).toBe(4);
  });

  it("keeps the reference line on the scale even when every balance is above it", () => {
    const g = chartGeometry([150_000, 160_000], 100_000);
    expect(g.scaleMin).toBeLessThan(100_000);
    expect(g.referenceAt).toBeGreaterThan(0);
    expect(g.referenceAt).toBeLessThan(1);
  });

  it("draws a single balance as a flat line", () => {
    const g = chartGeometry([100_000], 100_000);
    expect(g.path).toMatch(/^M0,[\d.]+ L1000,[\d.]+$/);
    expect(g.referenceAt).toBe(0.5);
  });

  it("refuses an empty series", () => {
    expect(() => chartGeometry([], 0)).toThrow(RangeError);
  });
});

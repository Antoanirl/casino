/**
 * Geometry for the dashboard's balance line. Pure, so it can be tested without a browser.
 * The chart is drawn in a fixed viewBox that is stretched to fit, so x and y here are in
 * viewBox units; labels are placed in HTML using the 0-1 fractions.
 */

export interface ChartGeometry {
  /** SVG path for the balance line. */
  path: string;
  /** Lowest and highest value on the vertical scale (padded around the data). */
  scaleMin: number;
  scaleMax: number;
  /** Where the reference value sits, from the top (0) to the bottom (1). */
  referenceAt: number;
  /** Index of the lowest and highest balance (the latest one on a tie). */
  lowIndex: number;
  highIndex: number;
}

export const CHART_WIDTH = 1000;
export const CHART_HEIGHT = 300;

export function chartGeometry(values: readonly number[], reference: number): ChartGeometry {
  if (values.length === 0) throw new RangeError("a chart needs at least one value");
  let lowIndex = 0;
  let highIndex = 0;
  values.forEach((v, i) => {
    if (v <= values[lowIndex]!) lowIndex = i;
    if (v >= values[highIndex]!) highIndex = i;
  });
  const low = Math.min(values[lowIndex]!, reference);
  const high = Math.max(values[highIndex]!, reference);
  // Keep the line off the edges, and give a flat line some room.
  const padding = Math.max((high - low) * 0.08, Math.abs(high) * 0.02, 100);
  const scaleMin = low - padding;
  const scaleMax = high + padding;

  const y = (v: number) => ((scaleMax - v) / (scaleMax - scaleMin)) * CHART_HEIGHT;
  const x = (i: number) => (values.length === 1 ? 0 : (i / (values.length - 1)) * CHART_WIDTH);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const path =
    values.length === 1
      ? `M0,${y(values[0]!).toFixed(1)} L${CHART_WIDTH},${y(values[0]!).toFixed(1)}`
      : `M${points.join(" L")}`;

  return {
    path,
    scaleMin,
    scaleMax,
    referenceAt: y(reference) / CHART_HEIGHT,
    lowIndex,
    highIndex,
  };
}

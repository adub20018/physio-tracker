// Axis-domain helpers for charts that set an explicit domain. Recharts puts a tick at
// exactly the domain endpoint, so an unrounded max (a raw mean or ratio) renders as a
// long decimal clipped on top of the round tick beside it.

// Next multiple of `step` at or above `value`, kept off floating-point edges so a value
// already sitting on a step doesn't round up a whole one.
export function roundUpTo(value: number, step: number): number {
  return Math.ceil(value / step - 1e-9) * step;
}

// Every tick from 0 to `max` inclusive, so the axis endpoint is always a round label.
export function stepTicks(max: number, step: number): number[] {
  const ticks: number[] = [];
  for (let t = 0; t <= max + 1e-9; t += step) ticks.push(Number(t.toFixed(2)));
  return ticks;
}

// A step that yields roughly `target` gridlines across `max`, snapped to a 1/2/5×10ⁿ
// value so labels stay readable whatever the metric's magnitude (0–3 ratios, 0–12000
// steps). Used where the axis maximum is data-driven rather than fixed.
export function niceStep(max: number, target = 5): number {
  const rough = max / Math.max(1, target);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const snapped = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return snapped * magnitude;
}

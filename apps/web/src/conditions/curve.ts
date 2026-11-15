/** Geometry of the 24-hour temperature curve, kept apart from React to be testable. */

export interface CurveFrame {
  readonly width: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export interface CurveScale {
  readonly x: (hour: number) => number;
  readonly y: (celsius: number) => number;
  /** Rounded to 20 °C so the gridlines fall on readable values. */
  readonly ticks: readonly number[];
}

const TICK_STEP = 20;

export function curveScale(values: readonly (number | null)[], frame: CurveFrame): CurveScale {
  const measured = values.filter((value): value is number => value !== null);
  const low = Math.floor(Math.min(...measured, 0) / TICK_STEP) * TICK_STEP;
  const high = Math.ceil(Math.max(...measured, low + TICK_STEP) / TICK_STEP) * TICK_STEP;
  const plotWidth = frame.width - frame.left - frame.right;
  const plotHeight = frame.height - frame.top - frame.bottom;
  const ticks: number[] = [];
  for (let tick = low; tick <= high; tick += TICK_STEP) ticks.push(tick);
  return {
    // Each hour is drawn at its middle: 14 h covers 14:00 to 15:00.
    x: (hour) => frame.left + ((hour + 0.5) / 24) * plotWidth,
    y: (celsius) => frame.top + ((high - celsius) / (high - low)) * plotHeight,
    ticks,
  };
}

/** SVG path through the measured hours; an hour without value breaks the line instead of bridging it. */
export function curvePath(values: readonly (number | null)[], scale: CurveScale): string {
  let path = '';
  let drawing = false;
  values.forEach((value, hour) => {
    if (value === null) {
      drawing = false;
      return;
    }
    path += `${drawing ? 'L' : 'M'}${scale.x(hour).toFixed(1)} ${scale.y(value).toFixed(1)}`;
    drawing = true;
  });
  return path;
}

/** Hour under a finger, from its position across the plot (0 = left edge, 1 = right edge). */
export function hourAt(fraction: number): number {
  return Math.min(23, Math.max(0, Math.floor(fraction * 24)));
}

/** Finger travel, in CSS pixels, before a touch on the curve counts as a gesture. */
const GESTURE_SLOP = 8;

/**
 * What a finger moving on the curve means: a mostly horizontal move scrubs the hours, a mostly
 * vertical one scrolls the page and must not change the hour.
 */
export function gestureIntent(dx: number, dy: number): 'undecided' | 'scrub' | 'scroll' {
  if (Math.hypot(dx, dy) < GESTURE_SLOP) return 'undecided';
  return Math.abs(dx) > Math.abs(dy) ? 'scrub' : 'scroll';
}

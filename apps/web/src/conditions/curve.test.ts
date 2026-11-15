import { describe, expect, it } from 'vitest';
import { curvePath, curveScale, gestureIntent, hourAt } from './curve';

const frame = { width: 240, height: 100, left: 0, right: 0, top: 0, bottom: 0 };

describe('temperature curve', () => {
  it('spans whole 20 °C steps around the measured range', () => {
    const scale = curveScale([-82, -39, -13], frame);
    expect(scale.ticks).toEqual([-100, -80, -60, -40, -20, 0]);
    expect(scale.y(0)).toBe(0);
    expect(scale.y(-100)).toBe(100);
  });

  it('breaks the line at an hour without measurement instead of joining its neighbours', () => {
    const values = [-80, -70, null, -50];
    const path = curvePath(values, curveScale(values, frame));
    expect(path.match(/M/g)).toHaveLength(2);
    expect(path.match(/L/g)).toHaveLength(1);
  });

  it('draws nothing for a sol without any measured hour', () => {
    const values = Array.from({ length: 24 }, () => null);
    expect(curvePath(values, curveScale(values, frame))).toBe('');
  });

  it('reads the hour under the finger, edges included', () => {
    expect(hourAt(0)).toBe(0);
    expect(hourAt(14.5 / 24)).toBe(14);
    expect(hourAt(1)).toBe(23);
    // A drag that leaves the plot keeps the nearest edge hour.
    expect(hourAt(-0.2)).toBe(0);
    expect(hourAt(1.3)).toBe(23);
  });

  it('scrubs on a horizontal swipe and leaves a vertical swipe to page scrolling', () => {
    expect(gestureIntent(3, 2)).toBe('undecided');
    expect(gestureIntent(40, 6)).toBe('scrub');
    expect(gestureIntent(-25, 10)).toBe('scrub');
    expect(gestureIntent(5, 60)).toBe('scroll');
    expect(gestureIntent(-12, -30)).toBe('scroll');
  });
});

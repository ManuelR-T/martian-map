import { describe, expect, it } from 'vitest';
import { minutesToSeconds } from './index';

describe('duration units', () => {
  it('converts zero and fractional minutes into seconds', () => {
    expect(minutesToSeconds(0)).toBe(0);
    expect(minutesToSeconds(1.5)).toBe(90);
  });
  it.each([-1, NaN, Infinity, -Infinity])('rejects invalid duration %s', (value) => {
    expect(() => minutesToSeconds(value)).toThrow(RangeError);
  });
});

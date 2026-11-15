import { describe, expect, it } from 'vitest';
import { marsSolarTime } from './marsTime';

describe('Mars24 independent NASA worked examples', () => {
  it('matches the January 2000 prime meridian benchmark', () => {
    const time = marsSolarTime(Date.parse('2000-01-06T00:00:00Z'), 0);
    expect(time.meanHours).toBeCloseTo(23.99425, 4);
    expect(time.trueHours).toBeCloseTo(23.64840, 4);
    expect(time.solarLongitude).toBeCloseTo(277.18758, 4);
  });
  it('matches Spirit landing target with west converted to east', () => {
    const time = marsSolarTime(Date.parse('2004-01-03T13:46:31Z'), -184.702);
    expect(time.meanHours).toBeCloseTo(.85190, 4);
    expect(time.trueHours).toBeCloseTo(.00025, 4);
    expect(time.solarLongitude).toBeCloseTo(327.32416, 4);
  });
  it('wraps east longitudes and refuses dates outside verified UTC coverage', () => {
    const utc = Date.parse('2026-11-15T00:00:00Z');
    expect(marsSolarTime(utc, 180).meanHours).toBeCloseTo(marsSolarTime(utc, -180).meanHours, 8);
    expect(() => marsSolarTime(Date.parse('2027-01-01'), 0)).toThrow(RangeError);
    expect(() => marsSolarTime(NaN, 0)).toThrow(RangeError);
  });
});

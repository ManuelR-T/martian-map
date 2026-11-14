import { describe, expect, it } from 'vitest';
import { formatCoordinate } from './format';

describe('formatCoordinate', () => {
  it('écrit la latitude puis la longitude avec la virgule décimale française', () => {
    expect(formatCoordinate({ longitude: 77.58, latitude: 18.44 })).toBe('18,44° N, 77,58° E');
  });

  it('remplace le signe par l’hémisphère', () => {
    expect(formatCoordinate({ longitude: -137.4, latitude: -4.5 })).toBe('4,50° S, 137,40° O');
  });
});

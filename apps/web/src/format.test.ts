import { describe, expect, it } from 'vitest';
import { formatCelsius, formatCoordinate, formatLmst, formatMonthYear, formatPascals } from './format';

describe('formatCoordinate', () => {
  it('écrit la latitude puis la longitude avec la virgule décimale française', () => {
    expect(formatCoordinate({ longitude: 77.58, latitude: 18.44 })).toBe('18,44° N, 77,58° E');
  });

  it('remplace le signe par l’hémisphère', () => {
    expect(formatCoordinate({ longitude: -137.4, latitude: -4.5 })).toBe('4,50° S, 137,40° O');
  });
});

describe('conditions MEDA', () => {
  it('arrondit la température au degré avec le signe moins', () => {
    expect(formatCelsius(-39.37)).toBe('−39 °C');
    expect(formatCelsius(-0.4)).toBe('0 °C');
    expect(formatCelsius(2.6)).toBe('3 °C');
  });

  it('garde la pression en pascals', () => {
    expect(formatPascals(787.31)).toBe('787 Pa');
  });

  it("écrit l'heure martienne et le mois de la mesure", () => {
    expect(formatLmst('14:20:31')).toBe('14 h 20');
    expect(formatMonthYear('2022-07-16T22:18:04.706Z')).toBe('juillet 2022');
  });
});

import type { MarsCoordinate } from './index';
import {
  MARS_RADIUS_METRES,
  nonNegative,
  routeSegments,
  validateCoordinate,
  validateMission,
  validateOxygenParameters,
  type Mission,
  type OxygenParameters,
} from './mission';

export function distanceMetres(
  a: MarsCoordinate,
  b: MarsCoordinate,
  radius = MARS_RADIUS_METRES,
): number {
  validateCoordinate(a);
  validateCoordinate(b);
  nonNegative(radius, 'Rayon');
  if (!radius) throw new Error('Rayon nul.');
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.latitude - a.latitude) * rad) / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(((b.longitude - a.longitude) * rad) / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
export function calculateBudget(m: Mission) {
  validateMission(m);
  if (!m.camp || !m.steps.length) return null;
  const segments = routeSegments(m).map((s) => {
    const metres = distanceMetres(s.from, s.to, m.radiusMetres);
    const factor = m.events.reduce(
      (f, e) =>
        e.type === 'slowdown' && e.segmentIds.includes(s.id) ? f * e.factor : f,
      1,
    );
    return {
      ...s,
      metres,
      kilometres: metres / 1000,
      seconds: (metres / 1000 / m.parameters.speedKmh) * 3600 * factor,
      speedKmh: m.parameters.speedKmh / factor,
    };
  });
  const activities = m.steps.flatMap((s) =>
    s.activities.map((a) => ({
      ...a,
      seconds:
        a.durationSeconds +
        m.events.reduce(
          (sum, e) =>
            sum + (e.type === 'delay' && e.activityId === a.id ? e.seconds : 0),
          0,
        ),
    })),
  );
  const explorationMetres = segments
    .filter((s) => !s.returning)
    .reduce((n, s) => n + s.metres, 0);
  const returnMetres = segments
    .filter((s) => s.returning)
    .reduce((n, s) => n + s.metres, 0);
  const walkingSeconds = segments.reduce((n, s) => n + s.seconds, 0);
  const returnSeconds = segments
    .filter((s) => s.returning)
    .reduce((n, s) => n + s.seconds, 0);
  const activitySeconds = activities.reduce((n, a) => n + a.seconds, 0);
  const marginSeconds =
    m.parameters.availableSeconds -
    walkingSeconds -
    activitySeconds -
    m.parameters.reserveSeconds;
  const result = {
    segments,
    activities,
    explorationMetres,
    returnMetres,
    totalMetres: explorationMetres + returnMetres,
    totalKilometres: (explorationMetres + returnMetres) / 1000,
    walkingSeconds,
    returnSeconds,
    activitySeconds,
    marginSeconds,
  };
  if (
    ![
      result.totalMetres,
      walkingSeconds,
      activitySeconds,
      marginSeconds,
      ...segments.map((s) => s.speedKmh),
    ].every(Number.isFinite) ||
    segments.some((s) => s.speedKmh <= 0)
  )
    throw new Error('Calcul hors domaine numérique.');
  return result;
}
export const OXYGEN_MODEL_VERSION = 'simulated-multiplicative-v1';
/** Grade is signed rise/run (0.1 = 10%). No physiological calibration. */
export function oxygenRate(
  p: OxygenParameters,
  speedKmh: number,
  grade: number,
): number {
  validateOxygenParameters(p);
  nonNegative(speedKmh, 'Vitesse');
  if (!speedKmh || !Number.isFinite(grade) || Math.abs(grade) > 1)
    throw new Error('Modèle O₂ : pente hors domaine ±100 % ou vitesse nulle.');
  const rate =
    p.referenceGramsPerMinute *
    (1 + p.speedCoefficient * (speedKmh / p.referenceSpeedKmh - 1) ** 2) *
    (1 +
      p.uphillCoefficient * Math.max(0, grade) +
      p.downhillCoefficient * Math.max(0, -grade)) *
    (1 + p.loadCoefficient * p.loadKg);
  if (!Number.isFinite(rate) || rate < 0) throw new Error('Débit O₂ hors domaine numérique.');
  return rate;
}
/** Supply signed per-segment grades from a terrain profile, or explicitly opt into flat terrain. */
export function calculateOxygen(
  m: Mission,
  grades: Readonly<Record<string, number | null>> = {},
) {
  const budget = calculateBudget(m);
  const p = m.parameters.oxygen;
  if (!p.enabled) return { status: 'disabled' as const };
  if (!budget)
    return {
      status: 'unavailable' as const,
      reason: 'Camp et étape nécessaires.',
    };
  const consumption: { id: string; grams: number; rate: number }[] = [];
  for (const s of budget.segments) {
    const grade = p.flatTerrain ? 0 : grades[s.id];
    if (grade === null || grade === undefined || !Number.isFinite(grade))
      return {
        status: 'unavailable' as const,
        reason:
          'Relief absent ou NoData : activez explicitement le terrain plat pour simuler.',
      };
    const rate = oxygenRate(p, s.speedKmh, grade);
    consumption.push({ id: s.id, rate, grams: (rate * s.seconds) / 60 });
  }
  for (const a of budget.activities)
    consumption.push({
      id: a.id,
      rate: p.restingGramsPerMinute,
      grams: (p.restingGramsPerMinute * a.seconds) / 60,
    });
  const totalGrams = consumption.reduce((n, c) => n + c.grams, 0);
  if (!Number.isFinite(totalGrams))
    throw new Error('Calcul O₂ hors domaine numérique.');
  return {
    status: 'ready' as const,
    version: OXYGEN_MODEL_VERSION,
    consumption,
    totalGrams,
    remainingGrams: p.stockGrams - totalGrams,
    marginGrams: p.stockGrams - totalGrams - p.reserveGrams,
    flatTerrain: p.flatTerrain,
  };
}

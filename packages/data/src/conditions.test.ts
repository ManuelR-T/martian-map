import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  availableHours,
  conditionsAt,
  kelvinToCelsius,
  loadMedaConditions,
  preparedSols,
  temperatureCurve,
  type DataManifest,
  type MedaConditions,
} from './index';

const dataRoot = new URL('../../../apps/web/public/data/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', dataRoot), 'utf8')) as DataManifest;

/** Serves the frozen files as the app does, from `/data/`. */
const localFetch = ((url: string) => {
  const body = readFileSync(new URL(url.replace(/^\/data\//, ''), dataRoot), 'utf8');
  return Promise.resolve(new Response(body, { status: 200 }));
}) as typeof fetch;

const loadSol500 = async (): Promise<MedaConditions> => {
  const conditions = await loadMedaConditions(manifest.datasets, '/data/', localFetch);
  if (!conditions) throw new Error('MEDA datasets missing from the manifest');
  return conditions;
};

describe('kelvinToCelsius', () => {
  it('subtracts 273.15, the offset of the Celsius scale', () => {
    expect(kelvinToCelsius(273.15)).toBe(0);
    expect(kelvinToCelsius(199.93)).toBeCloseTo(-73.22, 2);
  });
});

describe('MEDA conditions of sol 500', () => {
  it('offers only the prepared sol', async () => {
    expect(preparedSols(await loadSol500())).toEqual([500]);
  });

  it('gives the temperature of ATS1 and the pressure at 14 h, with what was measured and where', async () => {
    const at14 = conditionsAt(await loadSol500(), 500, 14);
    expect(at14.temperature?.celsius).toBeCloseTo(-39, 0);
    expect(at14.temperature).toMatchObject({ firstLmst: '14:00:03', lastLmst: '14:20:31' });
    expect(at14.pressure?.pascals).toBeGreaterThan(700);
    expect(at14.pressure?.pascals).toBeLessThan(850);
    expect(at14.location).toMatchObject({ waypoint: '26_1004', nearestSite: { name: 'Skinner Ridge', distanceMetres: 2 } });
  });

  it('draws the 24 hours of the sol, coldest before dawn', async () => {
    const curve = temperatureCurve(await loadSol500(), 500);
    expect(curve).toHaveLength(24);
    const coldest = curve.indexOf(Math.min(...curve.filter((value): value is number => value !== null)));
    expect(coldest).toBeGreaterThanOrEqual(4);
    expect(coldest).toBeLessThanOrEqual(7);
  });

  it('reports an unprepared sol or hour as unavailable, never as a value', async () => {
    const conditions = await loadSol500();
    expect(conditionsAt(conditions, 501, 14)).toMatchObject({ temperature: null, pressure: null, location: null });
    expect(conditionsAt(conditions, 500, 24)).toMatchObject({ temperature: null, pressure: null });
  });

  it('keeps an hour without valid sample unavailable', async () => {
    const conditions = await loadSol500();
    const emptied: MedaConditions = {
      ...conditions,
      temperature: conditions.temperature.map((series) => ({
        ...series,
        hours: series.hours.map((hour) =>
          hour.hour === 17 ? { ...hour, median: null, samples: 0, firstLmst: null, lastLmst: null } : hour,
        ),
      })),
    };
    expect(conditionsAt(emptied, 500, 17).temperature).toBeNull();
    expect(conditionsAt(emptied, 500, 17).pressure).not.toBeNull();
    expect(temperatureCurve(emptied, 500)[17]).toBeNull();
    // Pressure was still measured at 17 h: the hour stays selectable.
    expect(availableHours(emptied, 500).has(17)).toBe(true);
  });

  it('makes an hour without any measure impossible to choose', async () => {
    const conditions = await loadSol500();
    const withoutHour17 = (series: MedaConditions['temperature']) =>
      series.map((one) => ({
        ...one,
        hours: one.hours.map((hour) =>
          hour.hour === 17 ? { ...hour, median: null, samples: 0, firstLmst: null, lastLmst: null } : hour,
        ),
      }));
    const emptied = { ...conditions, temperature: withoutHour17(conditions.temperature), pressure: withoutHour17(conditions.pressure) };
    expect(availableHours(conditions, 500).size).toBe(24);
    expect(availableHours(emptied, 500).has(17)).toBe(false);
    expect(availableHours(emptied, 500).size).toBe(23);
    expect(availableHours(conditions, 501).size).toBe(0);
  });
});

describe('loadMedaConditions', () => {
  it('returns null when the manifest has no MEDA dataset', async () => {
    expect(await loadMedaConditions([], '/data/', localFetch)).toBeNull();
  });

  it('refuses a file whose unit differs from the manifest', async () => {
    const wrongUnit = ((url: string) =>
      localFetch(url).then(async (response) => {
        const series = (await response.json()) as { unit: string };
        return new Response(JSON.stringify({ ...series, unit: 'celsius' }), { status: 200 });
      })) as typeof fetch;
    await expect(loadMedaConditions(manifest.datasets, '/data/', wrongUnit)).rejects.toThrow(/unit/);
  });

  it('reports an unreachable file', async () => {
    const failing = (() => Promise.resolve(new Response('', { status: 404 }))) as typeof fetch;
    await expect(loadMedaConditions(manifest.datasets, '/data/', failing)).rejects.toThrow(/HTTP 404/);
  });
});

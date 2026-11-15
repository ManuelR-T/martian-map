import type { DatasetDescriptor, RegionCoverage } from './contracts';
import { DATA_BASE_URL } from './coverage';

/** Past conditions measured at the rover by MEDA; never a forecast along a traverse. */
export type MedaMeasure = 'temperature' | 'pressure';

const UNITS = { temperature: 'kelvin', pressure: 'pascal' } as const satisfies Record<MedaMeasure, string>;
export const MEDA_DATASET_IDS = {
  temperature: 'jezero-meda-temperature',
  pressure: 'jezero-meda-pressure',
} as const satisfies Record<MedaMeasure, string>;

/** One Local Mean Solar Time hour; `median` is null when no valid sample exists. */
export interface MedaHour {
  readonly hour: number;
  readonly median: number | null;
  readonly samples: number;
  readonly invalid: number;
  /** `hh:mm:ss` LMST of the first and last valid sample: MEDA measures only part of each hour. */
  readonly firstLmst: string | null;
  readonly lastLmst: string | null;
}

export interface MedaLocation {
  readonly longitude: number;
  readonly latitude: number;
  /** NASA end-of-drive waypoint where the rover stood during the whole sol. */
  readonly waypoint: string;
  readonly sinceSol: number;
  readonly untilSol: number | null;
  readonly nearestSite: { readonly id: string; readonly name: string; readonly distanceMetres: number };
}

/** Frozen file `jezero/meda/<measure>-solNNNN.json`, written by tools/data/marps_data/prepare.py. */
export interface MedaSeries {
  readonly measure: MedaMeasure;
  readonly sol: number;
  readonly column: string;
  readonly unit: (typeof UNITS)[MedaMeasure];
  readonly sensor: string;
  readonly aggregation: 'median';
  readonly timeScale: 'LMST';
  readonly startUtc: string;
  readonly stopUtc: string;
  readonly location: MedaLocation;
  readonly hours: readonly MedaHour[];
}

export interface MedaConditions {
  readonly temperature: readonly MedaSeries[];
  readonly pressure: readonly MedaSeries[];
  readonly datasets: { readonly temperature: DatasetDescriptor; readonly pressure: DatasetDescriptor };
}

interface MeasuredWindow {
  readonly samples: number;
  readonly firstLmst: string;
  readonly lastLmst: string;
}

export interface HourConditions {
  readonly sol: number;
  readonly hour: number;
  /** Null when this sol or hour was not measured: shown as unavailable, never filled in. */
  readonly temperature: (MeasuredWindow & { readonly celsius: number }) | null;
  readonly pressure: (MeasuredWindow & { readonly pascals: number }) | null;
  readonly location: MedaLocation | null;
}

/** The Celsius scale is the kelvin scale shifted by exactly 273.15. */
export function kelvinToCelsius(kelvin: number): number {
  return kelvin - 273.15;
}

async function fetchSeries(url: string, unit: string, fetcher: typeof fetch): Promise<MedaSeries> {
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`MEDA series unavailable (HTTP ${response.status}).`);
  const series = (await response.json()) as MedaSeries;
  if (series.unit !== unit) throw new Error(`MEDA series ${url} is in ${series.unit}, expected unit ${unit}.`);
  return series;
}

/** Loads every prepared sol of both measures; null when the manifest lists no MEDA data. */
export async function loadMedaConditions(
  datasets: readonly DatasetDescriptor[],
  baseUrl = DATA_BASE_URL,
  fetcher: typeof fetch = fetch,
): Promise<MedaConditions | null> {
  const temperature = datasets.find((dataset) => dataset.id === MEDA_DATASET_IDS.temperature);
  const pressure = datasets.find((dataset) => dataset.id === MEDA_DATASET_IDS.pressure);
  if (!temperature || !pressure) return null;
  const load = (dataset: DatasetDescriptor, measure: MedaMeasure) =>
    Promise.all(dataset.files.map((file) => fetchSeries(`${baseUrl}${file.path}`, UNITS[measure], fetcher)));
  const [temperatureSeries, pressureSeries] = await Promise.all([load(temperature, 'temperature'), load(pressure, 'pressure')]);
  return { temperature: temperatureSeries, pressure: pressureSeries, datasets: { temperature, pressure } };
}

/** Sols with at least one prepared measure, in order. Only these can be chosen. */
export function preparedSols(conditions: MedaConditions): number[] {
  const sols = new Set([...conditions.temperature, ...conditions.pressure].map((series) => series.sol));
  return [...sols].sort((a, b) => a - b);
}

function hourOf(series: readonly MedaSeries[], sol: number, hour: number) {
  const match = series.find((candidate) => candidate.sol === sol);
  const measured = match?.hours.find((candidate) => candidate.hour === hour);
  return { series: match, hour: measured?.median != null && measured.firstLmst && measured.lastLmst ? measured : null };
}

export function conditionsAt(conditions: MedaConditions, sol: number, hour: number): HourConditions {
  const temperature = hourOf(conditions.temperature, sol, hour);
  const pressure = hourOf(conditions.pressure, sol, hour);
  const window = (measured: MedaHour) => ({
    samples: measured.samples,
    firstLmst: measured.firstLmst ?? '',
    lastLmst: measured.lastLmst ?? '',
  });
  return {
    sol,
    hour,
    temperature: temperature.hour
      ? { ...window(temperature.hour), celsius: kelvinToCelsius(temperature.hour.median ?? Number.NaN) }
      : null,
    pressure: pressure.hour ? { ...window(pressure.hour), pascals: pressure.hour.median ?? Number.NaN } : null,
    location: (temperature.series ?? pressure.series)?.location ?? null,
  };
}

/** Temperature in °C for hours 0 to 23 of a sol; null where nothing was measured. */
export function temperatureCurve(conditions: MedaConditions, sol: number): (number | null)[] {
  return Array.from({ length: 24 }, (_, hour) => conditionsAt(conditions, sol, hour).temperature?.celsius ?? null);
}

/** Hours of a sol with at least one measure: only these can be chosen, the others are unavailable. */
export function availableHours(conditions: MedaConditions, sol: number): Set<number> {
  const hours = Array.from({ length: 24 }, (_, hour) => hour);
  return new Set(
    hours.filter((hour) => {
      const at = conditionsAt(conditions, sol, hour);
      return at.temperature !== null || at.pressure !== null;
    }),
  );
}

export interface WindStatus {
  readonly reason: string;
  readonly reasonUrl?: string;
}

const WIND_CAPABILITY = 'weather-wind';

/**
 * MEDA wind of the Jezero sector. No wind dataset is prepared (#27): it is always unpublished,
 * with the manifest's reason when it gives one.
 */
export function windStatus(coverage: readonly RegionCoverage[] | undefined): WindStatus {
  const wind = coverage
    ?.find((region) => region.id === 'jezero')
    ?.capabilities.find((capability) => capability.id === WIND_CAPABILITY);
  return wind?.status === 'unavailable' && wind.reason
    ? { reason: wind.reason, ...(wind.reasonUrl ? { reasonUrl: wind.reasonUrl } : {}) }
    : { reason: 'Vent non publié.' };
}

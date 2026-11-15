import type { MarsCoordinate } from '@marps/mission-core';

const degrees = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Coordonnées planétocentriques lisibles : « 18,44° N, 77,58° E ». Mise en forme seule. */
export function formatCoordinate({ latitude, longitude }: MarsCoordinate): string {
  const northSouth = latitude >= 0 ? 'N' : 'S';
  const eastWest = longitude >= 0 ? 'E' : 'O';
  return `${degrees.format(Math.abs(latitude))}° ${northSouth}, ${degrees.format(Math.abs(longitude))}° ${eastWest}`;
}

const wholeNumber = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const monthYear = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** « −39 °C » : arrondi au degré, vrai signe moins typographique. */
export function formatCelsius(celsius: number): string {
  // `|| 0` turns −0 into 0: −0,4 °C is shown as « 0 °C », never « −0 °C ».
  return `${wholeNumber.format(Math.round(celsius) || 0).replace('-', '−')} °C`;
}

/** « 787 Pa » : la pression martienne reste en pascals, unité de la source. */
export function formatPascals(pascals: number): string {
  return `${wholeNumber.format(pascals)} Pa`;
}

/** « 14:00:03 » LMST → « 14 h 00 ». */
export function formatLmst(clock: string): string {
  const [hours, minutes] = clock.split(':');
  return `${hours} h ${minutes}`;
}

/** Instant UTC → « juillet 2022 ». */
export function formatMonthYear(isoUtc: string): string {
  return monthYear.format(new Date(isoUtc));
}

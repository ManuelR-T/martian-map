/** NASA GISS Mars24 equations (2025-01-07), east-positive longitudes.
 * https://www.giss.nasa.gov/tools/mars24/help/algorithm.html
 * UTC coverage is deliberately bounded to the verified leap-second table.
 */
const mod = (value: number, period: number) => ((value % period) + period) % period;
const sin = (degrees: number) => Math.sin(degrees * Math.PI / 180);
const cos = (degrees: number) => Math.cos(degrees * Math.PI / 180);
const leaps = [
  ['2000-01-01', 32], ['2006-01-01', 33], ['2009-01-01', 34],
  ['2012-07-01', 35], ['2015-07-01', 36], ['2017-01-01', 37],
] as const;

export function marsSolarTime(utcMilliseconds: number, longitudeEast: number) {
  if (!Number.isFinite(utcMilliseconds) || !Number.isFinite(longitudeEast)) throw new RangeError('Finite date and longitude required.');
  if (utcMilliseconds < Date.parse('2000-01-01T00:00:00Z') || utcMilliseconds >= Date.parse('2027-01-01T00:00:00Z')) {
    throw new RangeError('UTC conversion verified only for 2000–2026.');
  }
  let taiMinusUtc = 32;
  for (const [date, offset] of leaps) if (utcMilliseconds >= Date.parse(`${date}T00:00:00Z`)) taiMinusUtc = offset;
  const jd = 2440587.5 + utcMilliseconds / 86400000 + (taiMinusUtc + 32.184) / 86400;
  const days = jd - 2451545;
  const anomaly = 19.3871 + .52402073 * days;
  const fms = 270.3871 + .524038496 * days;
  const perturbations = [[.0071, 2.2353, 49.409], [.0057, 2.7543, 168.173], [.0039, 1.1177, 191.837], [.0037, 15.7866, 21.736], [.0021, 2.1354, 15.704], [.002, 2.4694, 95.528], [.0018, 32.8493, 49.095]] as const;
  const pbs = perturbations.reduce((sum, [a, period, phase]) => sum + a * cos(.985626 * days / period + phase), 0);
  const center = (10.691 + 3e-7 * days) * sin(anomaly) + .623 * sin(2 * anomaly) + .05 * sin(3 * anomaly) + .005 * sin(4 * anomaly) + .0005 * sin(5 * anomaly) + pbs;
  const solarLongitude = mod(fms + center, 360);
  const eot = (2.861 * sin(2 * solarLongitude) - .071 * sin(4 * solarLongitude) + .002 * sin(6 * solarLongitude) - center) / 15;
  const prime = 24 * ((jd - 2451549.5) / 1.0274912517 + 44796 - .0009626);
  const meanHours = mod(prime + longitudeEast / 15, 24);
  return { meanHours, trueHours: mod(meanHours + eot, 24), solarLongitude };
}

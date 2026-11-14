import type { MarsCoordinate } from '@marps/mission-core';

export interface RegionDefinition {
  readonly id: string;
  readonly name: string;
  readonly center: MarsCoordinate;
}

export interface DatasetDescriptor {
  readonly id: string;
  readonly regionId: string;
  readonly title: string;
  readonly sourceUrl: string;
  readonly localPath: string;
  readonly attribution: string;
}

/** Navigation metadata only; no scientific dataset has been integrated yet. */
export const regions = [
  { id: 'jezero', name: 'Jezero', center: { longitude: 77.58, latitude: 18.44 } },
] as const satisfies readonly RegionDefinition[];

export const datasets: readonly DatasetDescriptor[] = [];

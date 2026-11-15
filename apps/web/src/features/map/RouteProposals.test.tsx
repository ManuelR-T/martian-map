// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { detailedRegions, exampleCamps, type Catalog, type DataManifest } from '@marps/data';
import { PlannerProvider, usePlannerDispatch, usePlannerState } from '../../state/PlannerProvider';
import { RouteProposals } from './RouteProposals';

const manifest = JSON.parse(readFileSync('apps/web/public/data/manifest.json', 'utf8')) as DataManifest;
const catalog: Catalog = { manifest, coverage: manifest.regions, regions: detailedRegions(manifest.regions), datasets: manifest.datasets, sites: manifest.sites };
const camp = exampleCamps[1]!;
const site = (id: string) => manifest.sites.find((candidate) => candidate.id === id)!;

let root: Root;
let container: HTMLDivElement;

function Screen({ sites }: { sites: readonly string[] }) {
  const dispatch = usePlannerDispatch();
  const { mission } = usePlannerState();
  const prepare = () => {
    dispatch({ type: 'viewChanged', view: 'region' });
    dispatch({ type: 'campPlaced', camp });
    sites.forEach((id) => dispatch({ type: 'stepAdded', step: { id, siteId: id, name: site(id).name, position: site(id).coordinate, activities: [] } }));
  };
  const names = [camp.name, ...mission.steps.map((step) => step.name), camp.name];
  return <><button onClick={prepare}>Préparer</button><output>{mission.routeLegs?.length ?? 'direct'}</output>{mission.camp && mission.steps.length > 0 && <RouteProposals map={null} names={names} />}</>;
}

const click = async (label: string) => {
  const button = [...container.querySelectorAll('button')].find((candidate) => candidate.textContent === label);
  expect(button, label).toBeTruthy();
  await act(async () => { button!.click(); });
};

async function open(sites: readonly string[], fetcher: typeof fetch) {
  vi.stubGlobal('fetch', fetcher);
  await act(async () => { root.render(<PlannerProvider load={async () => catalog}><Screen sites={sites} /></PlannerProvider>); });
  await click('Préparer');
  await click('Proposer un chemin');
  await act(async () => { await vi.waitFor(() => expect(container.textContent).not.toContain('Chargement des pentes')); });
}
const frozen: typeof fetch = async (input) => new Response(readFileSync(`apps/web/public${String(input)}`));

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal('indexedDB', new IDBFactory()); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const type = async (value: string) => {
  const input = container.querySelector<HTMLInputElement>('input[type="number"]')!;
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => { set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
};

it('proposes a path under the chosen slope, compares it with the current route and applies it to the mission', async () => {
  await open(['wildcat-ridge', 'amalik'], frozen);
  expect((container.querySelector('input[type="number"]') as HTMLInputElement).value).toBe('20');
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(container.querySelector('dl')!.textContent).toMatch(/Chemin proposé.* m, coût .* m à plat.*Tracé actuel/);
  expect(container.textContent).toContain('Hypothèses et limites');
  expect(container.textContent).toContain('cellules de 4 m');

  expect(container.querySelector('output')!.textContent).toBe('direct');
  await click('Appliquer ce chemin au parcours');
  expect(container.querySelector('output')!.textContent).toBe('3');
  // Once applied, the current route is the proposal: same distance and cost on both lines.
  const [proposed, current] = [...container.querySelectorAll('dd')].map((cell) => cell.textContent);
  expect(current).toBe(proposed);
});

it('says there is no solution, and why, when the chosen slope is too low, then finds one again on a higher slope', async () => {
  await open(['skinner-ridge', 'amalik'], frozen);
  // Skinner Ridge sits on a 20.1° cell of the 4 m grid.
  const alert = container.querySelector('[role="alert"]')!;
  expect(alert.textContent).toContain('Aucune solution à 20°.');
  expect(alert.textContent).toContain('Arrivée « Skinner Ridge » inutilisable : pente au-delà de 20° à cet endroit.');
  expect(alert.textContent).toContain('Essayez une pente maximale plus élevée.');
  expect(container.textContent).not.toContain('Appliquer ce chemin au parcours');

  await type('25');
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(container.textContent).toContain('Appliquer ce chemin au parcours');
});

it('names the leg without a path when a ridge cannot be crossed', async () => {
  await open(['wildcat-ridge', 'amalik'], frozen);
  await type('1');
  expect(container.querySelector('[role="alert"]')!.textContent).toMatch(/Aucune solution à 1°\..*(inutilisable|Aucun chemin de)/);
});

it('asks for a valid slope instead of searching with a nonsense one', async () => {
  await open(['wildcat-ridge', 'amalik'], frozen);
  for (const value of ['', '0', '-3', '61', 'abc']) {
    await type(value);
    expect(container.querySelector('[role="alert"]')!.textContent, value).toBe('Saisissez une pente entre 1° et 60°.');
    expect(container.textContent).not.toContain('Appliquer ce chemin au parcours');
  }
});

it('says the slope grid could not be read and proposes nothing', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  await open(['amalik'], async () => new Response(null, { status: 404 }));
  expect(container.querySelector('[role="alert"]')!.textContent).toContain('Grille de pentes inaccessible : aucun chemin proposé.');
  expect(container.textContent).not.toContain('Appliquer ce chemin au parcours');
});

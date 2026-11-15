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
const scenario = (name: string) => [...container.querySelectorAll('li')].find((item) => item.textContent?.startsWith(name))!;

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

it('compares each scenario with the current route, shows why one fails, and applies the chosen path to the mission', async () => {
  await open(['skinner-ridge', 'amalik'], frozen);
  // Skinner Ridge sits on a 20.1° cell of the 4 m grid: closed to the two stricter scenarios.
  expect(scenario('Prudent').querySelector('[role="alert"]')!.textContent).toBe('Arrivée « Skinner Ridge » inutilisable : pente au-delà de 15° à cet endroit.');
  expect(scenario('Équilibré').querySelector('input')!.disabled).toBe(true);
  const bold = scenario('Audacieux');
  expect(bold.querySelector('input')!.checked).toBe(true);
  expect(bold.textContent).toMatch(/Chemin proposé.* m, coût .* m à plat.*Tracé actuel/);
  expect(container.textContent).toContain('Hypothèses et limites');
  expect(container.textContent).toContain('cellules de 4 m');

  expect(container.querySelector('output')!.textContent).toBe('direct');
  await click('Appliquer ce chemin au parcours');
  expect(container.querySelector('output')!.textContent).toBe('3');
  // Once applied, the current route is the proposal: same distance and cost on both lines.
  const [proposed, current] = [...scenario('Audacieux').querySelectorAll('dd')].map((cell) => cell.textContent);
  expect(current).toBe(proposed);
});

it('offers a path for every scenario between sites on gentle ground', async () => {
  await open(['wildcat-ridge', 'amalik'], frozen);
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect([...container.querySelectorAll('input')].every((input) => !input.disabled)).toBe(true);
});

it('says the slope grid could not be read and proposes nothing', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  await open(['amalik'], async () => new Response(null, { status: 404 }));
  expect(container.querySelector('[role="alert"]')!.textContent).toContain('Grille de pentes inaccessible : aucun chemin proposé.');
  expect(container.textContent).not.toContain('Appliquer ce chemin au parcours');
});

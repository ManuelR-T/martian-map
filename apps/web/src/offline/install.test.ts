import { afterEach, expect, it, vi } from 'vitest';
import { waitForOfflineInstall } from './install';

function worker(initial: ServiceWorkerState) {
  const target = new EventTarget() as ServiceWorker;
  Object.defineProperty(target, 'state', { value: initial, writable: true });
  return { target, transition(state: ServiceWorkerState) { Object.assign(target, { state }); target.dispatchEvent(new Event('statechange')); } };
}
afterEach(() => vi.useRealTimers());
it('rejects failed precaching instead of waiting forever', async () => {
  const candidate = worker('installing');
  const result = waitForOfflineInstall({ installing: candidate.target } as ServiceWorkerRegistration);
  const assertion = expect(result).rejects.toThrow('installation failed');
  candidate.transition('redundant');
  await assertion;
});
it('does not hide an update failure behind an older active worker', async () => {
  const candidate = worker('installing');
  const result = waitForOfflineInstall({ installing: candidate.target, active: worker('activated').target } as ServiceWorkerRegistration);
  const assertion = expect(result).rejects.toThrow('installation failed');
  candidate.transition('redundant');
  await assertion;
});
it('reports ready after activation and distinguishes a waiting update', async () => {
  const candidate = worker('installing');
  const result = waitForOfflineInstall({ installing: candidate.target } as ServiceWorkerRegistration);
  candidate.transition('activated');
  await expect(result).resolves.toBe('ready');
  await expect(waitForOfflineInstall({ waiting: worker('installed').target, active: worker('activated').target } as ServiceWorkerRegistration)).resolves.toBe('waiting');
});
it('bounds a stalled installation', async () => {
  vi.useFakeTimers();
  const result = waitForOfflineInstall({ installing: worker('installing').target } as ServiceWorkerRegistration);
  const assertion = expect(result).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(30_000);
  await assertion;
});

it('waits for first-install activation instead of reporting an update', async () => {
  const candidate = worker('installed');
  const result = waitForOfflineInstall({ waiting: candidate.target } as ServiceWorkerRegistration);
  candidate.transition('activated');
  await expect(result).resolves.toBe('ready');
});

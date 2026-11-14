export type OfflineInstallResult = 'ready' | 'waiting';

export function waitForOfflineInstall(registration: ServiceWorkerRegistration): Promise<OfflineInstallResult> {
  const worker = registration.installing ?? registration.waiting ?? registration.active;
  if (!worker) return Promise.reject(new Error('Offline installation failed: no worker.'));
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      worker.removeEventListener('statechange', check);
    };
    const check = () => {
      if (worker.state === 'redundant') {
        cleanup();
        reject(new Error('Offline installation failed.'));
      } else if (worker.state === 'activated') {
        cleanup();
        resolve('ready');
      } else if (worker.state === 'installed' && registration.active) {
        cleanup();
        resolve('waiting');

      }
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Offline installation timed out.'));
    }, 30_000);
    worker.addEventListener('statechange', check);
    check();
  });
}

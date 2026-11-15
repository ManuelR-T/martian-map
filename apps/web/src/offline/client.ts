export interface OfflineReport { ready: boolean; bytes: number; budget: number; extraCount: number }
export function inspectOffline(worker: ServiceWorker, prepare = false, progress?: (done: number, total: number) => void): Promise<OfflineReport> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => { channel.port1.close(); reject(new Error('timeout')); }, 300_000);
    channel.port1.onmessage = ({ data }) => {
      if ('progress' in data) { progress?.(data.progress, data.count); return; }
      clearTimeout(timeout); channel.port1.close();
      if (data.error) reject(new Error(data.error)); else resolve(data as OfflineReport);
    };
    worker.postMessage(prepare ? 'PREPARE' : 'STATUS', [channel.port2]);
  });
}

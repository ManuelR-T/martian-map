import { exampleCamps } from '@marps/data';
import { isMission, validCamp, type Camp, type Mission } from '@marps/mission-core';

/** Local IndexedDB repository. Replace this boundary to connect a future shared catalogue. */
export interface MissionHistoryEntry { readonly id: string; readonly mission: Mission; readonly updatedAt: string }

export class MissionDatabase {
  private connection?: Promise<IDBDatabase>;
  constructor(private readonly factory?: IDBFactory) {}
  private open(): Promise<IDBDatabase> {
    if (!this.connection) this.connection = new Promise<IDBDatabase>((resolve, reject) => {
      const request = (this.factory ?? indexedDB).open('marps-missions', 3);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('camps')) {
          const camps = db.createObjectStore('camps', { keyPath: 'id' });
          exampleCamps.forEach(camp => camps.put(camp));
        }
        if (!db.objectStoreNames.contains('missions')) db.createObjectStore('missions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('tracking')) db.createObjectStore('tracking');
        if (!db.objectStoreNames.contains('templates')) db.createObjectStore('templates', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('history')) db.createObjectStore('history', { keyPath: 'id' });
      };
      request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); this.connection = undefined; }; resolve(request.result); };
      request.onerror = () => { this.connection = undefined; reject(request.error); };
      request.onblocked = () => { this.connection = undefined; reject(new Error('Fermez les autres onglets pour ouvrir la base locale.')); };
    }).catch(error => { this.connection = undefined; throw error; });
    return this.connection;
  }
  private async run<T>(store: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const request = operation(tx.objectStore(store));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error ?? request.error);
      tx.onabort = () => reject(tx.error ?? new Error('Écriture locale annulée.'));
    });
  }
  async activeMission(): Promise<Mission | null> {
    const value: unknown = await this.run('tracking', 'readonly', store => store.get('active'));
    if (value === undefined) return null;
    if (!isMission(value)) throw new Error('Suivi sauvegardé incompatible ou endommagé.');
    return value;
  }
  async saveActiveMission(mission: Mission): Promise<void> {
    if (!isMission(mission)) throw new Error('Suivi invalide.');
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['tracking', 'history'], 'readwrite');
      tx.objectStore('tracking').put(mission, 'active');
      tx.objectStore('history').put({ id: mission.id, mission, updatedAt: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error('Sauvegarde du suivi annulée.'));
    });
  }
  /** Ends the walk: the history keeps its last saved state, and a reload no longer restores it. */
  async endActiveMission(): Promise<void> {
    await this.run('tracking', 'readwrite', store => store.delete('active'));
  }
  async camps(): Promise<Camp[]> {
    const values: unknown[] = await this.run('camps', 'readonly', store => store.getAll());
    return values.filter((value): value is Camp => { try { return validCamp(value as Camp); } catch { return false; } });
  }
  async missions(): Promise<Mission[]> {
    const values: unknown[] = await this.run('missions', 'readonly', store => store.getAll());
    if (!values.every(isMission)) throw new Error('Une mission sauvegardée est incompatible ou endommagée.');
    return values;
  }
  async templates(): Promise<Mission[]> {
    const values: unknown[] = await this.run('templates', 'readonly', store => store.getAll());
    if (!values.every(isMission)) throw new Error('Un modèle est incompatible ou endommagé.');
    return values;
  }
  async saveTemplate(mission: Mission): Promise<void> {
    if (!isMission(mission)) throw new Error('Modèle invalide.');
    await this.run('templates', 'readwrite', store => store.put(mission));
  }
  async deleteTemplate(id: string): Promise<void> {
    await this.run('templates', 'readwrite', store => store.delete(id));
  }
  async history(): Promise<MissionHistoryEntry[]> {
    const values: MissionHistoryEntry[] = await this.run('history', 'readonly', store => store.getAll());
    if (!values.every(v => isMission(v.mission) && v.id === v.mission.id && Number.isFinite(Date.parse(v.updatedAt)))) throw new Error('Historique incompatible.');
    return values.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async deleteMission(id: string): Promise<void> {
    await this.run('missions', 'readwrite', store => store.delete(id));
  }
  async deleteCamp(id: string): Promise<void> {
    await this.run('camps', 'readwrite', store => store.delete(id));
  }
  async saveMission(mission: Mission): Promise<void> {
    if (!isMission(mission)) throw new Error('Mission invalide.');
    await this.run('missions', 'readwrite', store => store.put(mission));
  }
  async saveCamp(camp: Camp): Promise<void> {
    if (!validCamp(camp)) throw new Error('Camp invalide.');
    await this.run('camps', 'readwrite', store => store.put(camp));
  }
}

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { writeOfflineWorker } from './tools/offline';

export default defineConfig({ plugins: [react(), tailwindcss(), {
  name: 'offline-app',
  async writeBundle(options) {
    if (!options.dir) throw new Error('Offline builds require an output directory.');
    await writeOfflineWorker(options.dir);
  },
}] });

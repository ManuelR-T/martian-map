import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { regions } from '@marps/data';
import { minutesToSeconds } from '@marps/mission-core';
import { Panel } from '@marps/ui';
import 'ol/ol.css';
import '@marps/ui/styles.css';

function App() {
  return (
    <main>
      <p>Marps</p>
      <h1>Préparer une sortie sur Mars</h1>
      <Panel title="Socle de développement prêt">
        <p>Région de démonstration : {regions[0].name}.</p>
        <p>Unité du moteur : une minute = {minutesToSeconds(1)} secondes.</p>
        <p>La carte, les données scientifiques et la planification seront intégrées dans les prochaines étapes.</p>
      </Panel>
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing application root.');
createRoot(root).render(<StrictMode><App /></StrictMode>);

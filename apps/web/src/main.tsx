import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { regions } from '@martian-map/data';
import { minutesToSeconds } from '@martian-map/mission-core';
import { Panel } from '@martian-map/ui';
import 'ol/ol.css';
import '@martian-map/ui/styles.css';

function App() {
  return (
    <main>
      <p>Marswalk Planner</p>
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

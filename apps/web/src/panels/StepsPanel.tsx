import { Panel } from '@marps/ui';
import { PlanningGate } from './PlanningGate';
import { MissionEditor } from './MissionEditor';
export function StepsPanel({ className }: { className?: string }) {
  return (
    <Panel
      title="Mission et étapes"
      description="Camp → étapes → retour au camp"
      collapsible
      className={className}
      contentClassName="overflow-y-auto"
    >
      <PlanningGate
        loadingTitle="Chargement de la mission"
        coverageTitle="Édition disponible à Jezero"
        offerRegion
      >
        <MissionEditor />
      </PlanningGate>
    </Panel>
  );
}

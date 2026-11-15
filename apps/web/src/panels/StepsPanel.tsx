import { useState } from 'react';
import { Panel } from '@marps/ui';
import { MissionTracking } from './MissionTracking';
import type { RadiationAlertState } from './RadiationAlert';
import { MissionEditor } from './MissionEditor';
import { usePlannerState } from '../state/PlannerProvider';
import { PlanningGate } from './PlanningGate';

export function StepsPanel({ className }: { className?: string }) {
  const { workspace } = usePlannerState();
  const [radiation, setRadiation] = useState<RadiationAlertState | null>(null);
  return <>
    <div className={workspace === 'base' ? 'flex min-h-0 shrink-0 flex-col gap-3' : 'hidden'}><MissionEditor className={className} /></div>
    {workspace === 'mission' && <Panel title="Suivi de mission" description="Activités pendant la sortie"
    collapsible className={className} contentClassName="overflow-y-auto">
    <PlanningGate loadingTitle="Chargement des missions" coverageTitle="Ouvrez Jezero pour suivre une mission" offerRegion>
      <MissionTracking radiation={radiation} onRadiationChange={setRadiation} />
    </PlanningGate>
  </Panel>}
  </>;
}

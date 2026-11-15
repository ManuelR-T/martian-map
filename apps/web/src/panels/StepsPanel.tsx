import { localize } from '@marps/ui';
import '../i18n';
import { useState } from 'react';
import { Panel } from '@marps/ui';
import { MissionTracking } from './MissionTracking';
import type { RadiationAlertState } from './RadiationAlert';
import { MissionEditor } from './MissionEditor';
import { usePlannerState } from '../state/PlannerProvider';
import { PlanningGate } from './PlanningGate';

export function StepsPanel({ className, collapsible = true, routeHostRef }: { className?: string; collapsible?: boolean; routeHostRef?: (host: HTMLDivElement | null) => void }) {
  const { workspace } = usePlannerState();
  const [radiation, setRadiation] = useState<RadiationAlertState | null>(null);
  return <>
    <div className={workspace === 'base' ? 'flex min-h-0 shrink-0 flex-col gap-3' : 'hidden'}><MissionEditor routeHostRef={routeHostRef} className={className} collapsible={collapsible} /></div>
    {workspace === 'mission' && <Panel title={localize("Suivi de mission")} description={localize("Activités pendant la sortie")}
    collapsible={collapsible} floating className={className} contentClassName="overflow-y-auto">
    <PlanningGate loadingTitle="Chargement des missions" coverageTitle="Ouvrez Jezero pour suivre une mission" offerRegion>
      <MissionTracking radiation={radiation} onRadiationChange={setRadiation} />
    </PlanningGate>
  </Panel>}
  </>;
}

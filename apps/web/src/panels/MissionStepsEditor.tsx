import { localize } from '@marps/ui';
import '../i18n';
import { useState } from 'react';
import type { MissionStep } from '@marps/mission-core';
import { Button, DataState, StepList, StepListItem } from '@marps/ui';
import { ActivityEditor } from './MissionEditor';
import { formatCoordinate } from '../format';
import { usePlannerDispatch, usePlannerState } from '../state/PlannerProvider';
export function MissionStepsEditor() {
  const { mission } = usePlannerState();
  const dispatch = usePlannerDispatch();
  // A step leaves at once, without a question; the last one removed can be put back where it was.
  const [removed, setRemoved] = useState<{ step: MissionStep; index: number } | null>(null);
  const restorable = removed && !mission.steps.some(step => step.id === removed.step.id) ? removed : null;
  const restore = () => {
    if (!restorable) return;
    dispatch({ type: 'stepAdded', step: restorable.step });
    dispatch({ type: 'stepMoved', id: restorable.step.id, to: Math.min(restorable.index, mission.steps.length) });
    setRemoved(null);
  };
  return <>
        <p role="status" className="flex flex-wrap items-center justify-between gap-2 border border-dashed p-2 empty:hidden">{restorable && <>
          <span>{localize("Étape «")} {localize(restorable.step.name)} {localize("» supprimée.")}</span>
          <Button size="sm" variant="outline" onClick={restore}>{localize("Annuler la suppression")}</Button>
        </>}</p>
        {mission.steps.length === 0 ? (
          <DataState
            kind="empty"
            title={localize("Aucune étape")}
            description={localize("La mission ne contient encore aucune étape. Elles s'afficheront ici dans l'ordre de visite.")}
          />
        ) : (
          <StepList label={localize("Étapes de la mission")}>
            {mission.camp && <StepListItem kind="camp" title={mission.camp.name} description={formatCoordinate(mission.camp.position)} />}
            {mission.steps.map((step, index) => (
              <StepListItem
                key={step.id}
                position={index + 1}
                title={step.name}
                description={<><span className="tabular-nums">{formatCoordinate(step.position)}</span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Button variant="outline" disabled={index === 0} aria-label={`Monter ${step.name}`} onClick={() => dispatch({ type: 'stepMoved', id: step.id, to: index - 1 })}>{localize("↑")}</Button>
                    <Button variant="outline" disabled={index === mission.steps.length - 1} aria-label={`Descendre ${step.name}`} onClick={() => dispatch({ type: 'stepMoved', id: step.id, to: index + 1 })}>{localize("↓")}</Button>
                    <Button variant="danger" aria-label={localize("Supprimer {{v0}}", { v0: step.name })} onClick={() => { setRemoved({ step, index }); dispatch({ type: 'stepRemoved', id: step.id }); }}>{localize("Supprimer")}</Button>
                  </div>
                  <ActivityEditor step={step} />
                </>}
              />
            ))}
            {mission.camp && <StepListItem kind="return" title={mission.camp.name} />}
          </StepList>
        )}
  </>;
}

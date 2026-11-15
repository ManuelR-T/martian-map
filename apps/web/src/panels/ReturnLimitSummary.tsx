import { activityLabels } from './MissionEditor';
import { localize, Button } from '@marps/ui';
import { useTranslation } from 'react-i18next';
import { DEFAULT_OXYGEN_PARAMETERS, type MissionReturnLimit, type ReturnPoint } from '@marps/mission-core';
import { useReturnLimit } from '../mission/ReturnLimitProvider';
import { usePlannerDispatch, usePlannerState } from '../state/PlannerProvider';
import { formatBudgetMinutes } from './budgetView';

export function returnLimitStatus(result: MissionReturnLimit): string {
  if (result.status !== 'ready') return 'Indeterminate';
  if (result.initial.state === 'reserve-reached') return 'Reserve reached at departure';
  const first = result.crossings.find(c => c.direction === 'entry');
  if (first) return !first.firstCertain ? 'Known limit; earlier O₂ uncertain' : 'Return reserve reached';
  return result.indeterminate ? 'Indeterminate' : 'All margins positive';
}
function Margins({ point, oxygenEnabled = false }: { point: ReturnPoint; oxygenEnabled?: boolean }) {
  const { i18n } = useTranslation();
  return <p className="text-sm tabular-nums">{localize('Time margin')}: {formatBudgetMinutes(point.timeMarginSeconds / 60)} · {localize('O₂ margin')}: {point.oxygenMarginGrams === null ? localize(oxygenEnabled ? 'Indeterminate' : 'Not evaluated') : `${new Intl.NumberFormat(i18n.language, { maximumSignificantDigits: 4 }).format(point.oxygenMarginGrams)} g`}</p>;
}
export function ReturnLimitDetails({ result, point }: { result: MissionReturnLimit; point?: ReturnPoint }) {
  useTranslation();
  return <div className="grid gap-2 text-sm">
    <p role="status" className="font-semibold">{localize(returnLimitStatus(result))}</p>
    {result.status !== 'ready' ? <p>{localize(result.status === 'too-large' ? 'Route too large to evaluate at this resolution.' : 'Check mission, route and parameter inputs.')}</p> : <>
      {result.indeterminate && <p>{localize('O₂ indeterminate: missing parameters or terrain. Unknown costs are not zero; choose flat terrain explicitly if appropriate.')}</p>}
      <Margins point={point ?? (result.initial.state === 'reserve-reached' ? result.initial : result.crossings[0] ?? result.portions.at(-1)?.to ?? result.initial)} oxygenEnabled={result.oxygenEnabled} />
      <p>{localize(result.oxygenEnabled ? 'Time and O₂ constraints' : 'Time constraint only')}</p>
      <p>{localize(result.flatTerrain && result.oxygenEnabled ? 'Explicit flat-terrain assumption; slopes ignored.' : 'Travel estimates use hypothetical geometry and scenario speed.')}</p>
    </>}
  </div>;
}
export function ReturnLimitSummary() {
  useTranslation();
  const shared = useReturnLimit();
  const state = usePlannerState();
  const dispatch = usePlannerDispatch();
  const mission = state.workspace === 'base' ? state.mission : state.runningMission;
  if (!shared) return null;
  const { result, selected, select } = shared;
  const activityName = (stepId: string | null, activityId: string) => {
    const activity = mission?.steps.find(step => step.id === stepId)?.activities.find(item => item.id === activityId);
    return activity ? localize(activityLabels[activity.type]) : localize('Activity');
  };
  const active = result.status === 'ready' ? result.crossings.find(c => c.id === selected) ?? result.crossings[0] : undefined;
  return <section className="mb-3 grid gap-3 border-b pb-3" aria-label={localize('Return limit under mission assumptions')}>
    <h3 className="font-semibold">{localize('Return limit under mission assumptions')}</h3>
    <p className="text-xs">{localize('Immediate retreat reverses the traveled route, including on the planned return leg. Future activities are abandoned. Planned scenario, not live position or a return guarantee.')}</p>
    {mission && state.workspace === 'base' && <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={mission.parameters.returnLimitMode === 'time-and-oxygen'} onChange={event => dispatch({ type: 'parametersChanged', parameters: { ...mission.parameters, returnLimitMode: event.target.checked ? 'time-and-oxygen' : 'time-only' } })} />{localize('Include O₂ in return limit')}</label>}
    {mission && state.workspace === 'base' && mission.parameters.returnLimitMode === 'time-and-oxygen' && !mission.parameters.oxygen && <Button onClick={() => dispatch({ type: 'parametersChanged', parameters: { ...mission.parameters, oxygen: { ...DEFAULT_OXYGEN_PARAMETERS } } })}>{localize('Initialize simulated O₂ parameters')}</Button>}
    {active && <p className="text-sm font-semibold">{mission?.steps.find(step => step.id === active.stepId)?.name ?? localize('Return to camp')} · {localize('Leg')} {active.legIndex + 1} · {active.constraints.map(constraint => localize(constraint === 'time' ? 'Time' : 'O₂')).join(' + ')}{active.activityId && <> · {localize('Activity')}: {activityName(active.stepId, active.activityId)} · {formatBudgetMinutes(active.activityOffsetSeconds / 60)}</>}</p>}
    <ReturnLimitDetails result={result} point={active} />
    {result.status === 'ready' && <>
      <p className="text-xs">{localize('Map patterns: solid = positive; dashes = reserve reached; dots = indeterminate. Triangle = threshold.')}</p>
      <p className="text-xs">{localize('Overlapping route portions show the later passage; use the list for chronological states.')}</p>
      <details><summary className="min-h-11 cursor-pointer">{localize('Thresholds and estimation precision')} ({result.crossings.length})</summary>
        <ol className="grid gap-2">{result.crossings.map(c => {
          const step = mission?.steps.find(s => s.id === c.stepId);
          return <li key={c.id} className="border p-2"><Button variant="outline" className="min-h-11 w-full whitespace-normal" aria-pressed={selected === c.id} onClick={() => select(c.id)}>{localize(c.direction === 'entry' ? 'Reserve entry' : 'Reserve exit')} · {step?.name ?? localize('Return to camp')} · {localize('Leg')} {c.legIndex + 1} · {c.constraints.map(constraint => localize(constraint === 'time' ? 'Time' : 'O₂')).join(' + ')}</Button>
            {c.activityId && <p>{localize('Activity')}: {activityName(c.stepId, c.activityId)} · {formatBudgetMinutes(c.activityOffsetSeconds / 60)}</p>}
            <Margins point={c} oxygenEnabled={result.oxygenEnabled} />
            <p>{localize('Travel bracket')}: {Math.ceil(c.bracketMetres)} m · {localize('Planned elapsed')}: {formatBudgetMinutes(c.elapsedSeconds / 60)}</p>
            {!c.firstCertain && <p>{localize('Earlier O₂ unknown; first overall limit is indeterminate.')}</p>}
          </li>;
        })}</ol>
        <p>{localize('Interpolated scenario estimate, not navigation accuracy. Activity offsets use planned durations. O₂ model v1 is uncalibrated.')}{result.spacingMetres !== null && ` ${result.spacingMetres} m`}</p>
      </details>
    </>}
  </section>;
}

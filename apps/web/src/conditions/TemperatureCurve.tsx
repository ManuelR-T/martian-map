import { localize } from '@marps/ui';
import '../i18n';
import { useId, useRef, type PointerEvent } from 'react';
import { formatCelsius } from '../format';
import { curvePath, curveScale, gestureIntent, hourAt } from './curve';

const FRAME = { width: 320, height: 128, left: 30, right: 6, top: 8, bottom: 18 };
const HOUR_TICKS = [0, 6, 12, 18];

export interface TemperatureCurveProps {
  /** °C for hours 0 to 23; null where nothing was measured. */
  values: readonly (number | null)[];
  selectedHour: number;
  /** Hours that can be chosen, the same as in the hour menu (pressure alone is enough). */
  selectable: ReadonlySet<number>;
  onSelect: (hour: number) => void;
}

/**
 * Cycle de température d'un sol. Toucher ou balayer la courbe choisit l'heure sous le doigt :
 * une heure ne fait que ~11 px de large, trop peu pour viser. Le menu des heures reste le
 * contrôle accessible au clavier.
 */
export function TemperatureCurve({ values, selectedHour, selectable, onSelect }: TemperatureCurveProps) {
  const gesture = useRef<{ id: number; x: number; y: number; intent: ReturnType<typeof gestureIntent> } | null>(null);
  const hatchId = useId();
  const scale = curveScale(values, FRAME);
  const slot = (FRAME.width - FRAME.left - FRAME.right) / 24;
  const plotBottom = FRAME.height - FRAME.bottom;
  const selected = values[selectedHour];
  const measured = values.filter((value): value is number => value !== null);
  const selectAt = (event: PointerEvent<SVGRectElement>) => {
    const zone = event.currentTarget.getBoundingClientRect();
    const hour = hourAt((event.clientX - zone.left) / zone.width);
    // Une heure sans aucune mesure ne se choisit pas : l'heure précédente reste affichée.
    if (selectable.has(hour) && hour !== selectedHour) onSelect(hour);
  };
  const summary = measured.length
    ? localize("Température sur le sol : de {{v0}} à {{v1}}.", { v0: formatCelsius(Math.min(...measured)), v1: formatCelsius(Math.max(...measured)) })
    : localize("Aucune température mesurée sur ce sol.");

  return (
    <svg viewBox={`0 0 ${FRAME.width} ${FRAME.height}`} role="img" aria-label={localize(summary)} className="h-auto w-full max-w-md select-none"
      // Le doigt balaie à l'horizontale ; un geste vertical fait toujours défiler le panneau.
      // Sur l'élément <svg> : Chrome ignore touch-action sur ses formes internes.
      style={{ touchAction: 'pan-y' }}
    >
      {scale.ticks.map((tick) => (
        <g key={tick}>
          <line x1={FRAME.left} x2={FRAME.width - FRAME.right} y1={scale.y(tick)} y2={scale.y(tick)} stroke="var(--border)" strokeWidth={1} />
          <text x={FRAME.left - 4} y={scale.y(tick)} dy="0.32em" textAnchor="end" fontSize={9} fill="var(--muted-foreground)">
            {formatCelsius(tick).replace(' °C', '°')}
          </text>
        </g>
      ))}
      {HOUR_TICKS.map((hour) => (
        <text key={hour} x={scale.x(hour)} y={FRAME.height - 4} textAnchor="middle" fontSize={9} fill="var(--muted-foreground)">
          {localize(hour)} {localize("h")} </text>
      ))}
      {values.map((value, hour) =>
        value === null ? (
          // Heure non mesurée : bande hachurée, jamais une valeur interpolée.
          <rect key={hour} x={FRAME.left + hour * slot} y={FRAME.top} width={slot} height={plotBottom - FRAME.top} fill={`url(#${hatchId})`} />
        ) : null,
      )}
      <defs>
        <pattern id={hatchId} width={4} height={4} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={4} stroke="var(--muted-foreground)" strokeWidth={1} opacity={0.5} />
        </pattern>
      </defs>
      <line
        x1={scale.x(selectedHour)}
        x2={scale.x(selectedHour)}
        y1={FRAME.top}
        y2={plotBottom}
        stroke="var(--muted-foreground)"
        strokeWidth={1}
        strokeDasharray="2 2"
      />
      <path d={curvePath(values, scale)} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {selected != null ? (
        <circle cx={scale.x(selectedHour)} cy={scale.y(selected)} r={4.5} fill="var(--primary)" stroke="var(--card)" strokeWidth={2} />
      ) : null}
      <rect
        x={FRAME.left}
        y={0}
        width={FRAME.width - FRAME.left - FRAME.right}
        height={plotBottom}
        fill="transparent"
        className="cursor-pointer"
        // Rien n'est choisi au contact : un glissé vertical qui part de la courbe fait défiler la page
        // sans changer l'heure. Un toucher bref choisit au relâcher, un glissé horizontal balaie.
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, intent: 'undecided' };
        }}
        onPointerMove={(event) => {
          const current = gesture.current;
          if (!current || current.id !== event.pointerId || current.intent === 'scroll') return;
          if (current.intent === 'undecided') current.intent = gestureIntent(event.clientX - current.x, event.clientY - current.y);
          if (current.intent === 'scrub') selectAt(event);
        }}
        onPointerUp={(event) => {
          if (gesture.current?.id === event.pointerId && gesture.current.intent !== 'scroll') selectAt(event);
          gesture.current = null;
        }}
        onPointerCancel={() => {
          gesture.current = null;
        }}
      />
    </svg>
  );
}

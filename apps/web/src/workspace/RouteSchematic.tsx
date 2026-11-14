import { MapPin } from 'lucide-react';
import type { Mission, MarsCoordinate } from '@marps/mission-core';
/** Adapter contract for the future editable OpenLayers mission layer. */
export interface MissionMapAdapterProps {
  mission: Mission;
  onPlaceCamp: (position: MarsCoordinate) => void;
  onAddStep: (position: MarsCoordinate) => void;
  onSelectStep: (id: string) => void;
}
export function RouteSchematic({ mission: m }: { mission: Mission }) {
  const points = [
    ...(m.camp ? [{ name: 'Camp fictif', position: m.camp }] : []),
    ...m.steps,
  ];
  if (!points.length)
    return (
      <div className="schematic-empty">
        <MapPin size={36} />
        <p>
          Le parcours apparaîtra ici après le placement du camp et des étapes.
        </p>
      </div>
    );
  const xs = points.map((p) => p.position.longitude),
    ys = points.map((p) => p.position.latitude);
  const minX = Math.min(...xs),
    minY = Math.min(...ys),
    dx = Math.max(...xs) - minX,
    dy = Math.max(...ys) - minY;
  const scale = Math.min(280 / (dx || 0.001), 210 / (dy || 0.001));
  const xy = points.map((p) => ({
    x: 60 + (p.position.longitude - minX) * scale,
    y: 260 - (p.position.latitude - minY) * scale,
  }));
  return (
    <figure>
      <svg
        viewBox="0 0 400 320"
        className="route-schematic"
        role="img"
        aria-label="Schéma du parcours avec le camp et les étapes numérotées"
      >
        <defs>
          <pattern
            id="route-grid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.15"
            />
          </pattern>
        </defs>
        <rect width="400" height="320" fill="url(#route-grid)" />
        <text x="365" y="25" className="map-label">
          N ↑
        </text>
        <polyline
          points={xy.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        {m.camp && xy.length > 1 && (
          <line
            x1={xy.at(-1)!.x}
            y1={xy.at(-1)!.y}
            x2={xy[0]!.x}
            y2={xy[0]!.y}
            stroke="currentColor"
            strokeDasharray="5 5"
          />
        )}
        {xy.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="14"
              className={i === 0 && m.camp ? 'camp-dot' : 'step-dot'}
            />
            <text
              x={p.x}
              y={p.y + 5}
              textAnchor="middle"
              className="point-label"
            >
              {i === 0 && m.camp ? 'C' : m.camp ? i : i + 1}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="fine-print">
        C : camp fictif · numéros : ordre de visite · pointillés : retour.
      </figcaption>
    </figure>
  );
}

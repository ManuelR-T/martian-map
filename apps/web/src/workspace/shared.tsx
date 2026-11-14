import type { ReactNode } from 'react';
import type { MissionAction } from '@marps/mission-core';
export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export const duration = (s: number) =>
  `${(s / 60).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} min`;
export const date = (s: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(s));
export const names = {
  photo: 'Photo',
  observation: 'Observation',
  sampling: 'Prélèvement',
};
export type Act = (action: MissionAction) => boolean;
export function Section({
  eyebrow,
  title,
  children,
  actions,
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="work-card">
      <div className="section-heading">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

import { Panel } from '@marps/ui';
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
  return <Panel title={title} description={eyebrow} actions={actions} className="work-panel" contentClassName="mission-section-content">{children}</Panel>;
}

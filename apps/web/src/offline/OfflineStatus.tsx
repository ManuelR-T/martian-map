import { useEffect, useState } from 'react';
import { Button } from '@marps/ui';
import { waitForOfflineInstall } from './install';

type Status = 'preparing' | 'ready' | 'waiting' | 'failed' | 'unsupported';
const messages: Record<Status, string> = {
  preparing: 'Préparation hors ligne…',
  ready: 'Application et données locales prêtes hors ligne.',
  waiting: 'Mise à jour téléchargée. Fermez tous les onglets puis rouvrez l’application pour l’activer.',
  failed: 'La préparation hors ligne a échoué. Reconnectez-vous puis réessayez.',
  unsupported: 'Installation hors ligne indisponible. Utilisez un navigateur compatible en HTTPS ou sur localhost.',
};

export function OfflineStatus() {
  const [status, setStatus] = useState<Status>(() => 'serviceWorker' in navigator ? 'preparing' : 'unsupported');
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let active = true;
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
      .then(waitForOfflineInstall)
      .then(result => { if (active) setStatus(result); })
      .catch(() => { if (active) setStatus('failed'); });
    return () => { active = false; };
  }, []);
  return <div className="offline-status relative z-20 flex flex-wrap items-center gap-2 border-b bg-card px-4 py-1 text-xs text-muted-foreground">
    <p role="status" title={import.meta.env.PROD ? messages[status] : 'Mode développement : installation hors ligne disponible dans la version compilée.'}>
      <span className="offline-full">{import.meta.env.PROD ? messages[status] : 'Mode développement : installation hors ligne disponible dans la version compilée.'}</span>
      <span className="offline-short">{!import.meta.env.PROD ? 'Développement · hors ligne non installé' : status === 'ready' ? 'Prêt hors ligne' : status === 'preparing' ? 'Préparation hors ligne…' : messages[status]}</span>
    </p>
    {status === 'failed' && <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Réessayer l’installation</Button>}
  </div>;
}

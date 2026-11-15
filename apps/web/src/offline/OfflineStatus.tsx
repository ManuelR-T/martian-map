import { localize } from '@marps/ui';
import '../i18n';
import { useEffect, useState } from 'react';
import { Button } from '@marps/ui';
import { Check, Download, CircleAlert, RefreshCw } from 'lucide-react';
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
    const hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => { if (hadController) window.location.reload(); };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
      .then(waitForOfflineInstall)
      .then(result => { if (active) setStatus(result); })
      .catch(() => { if (active) setStatus('failed'); });
    return () => { active = false; navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange); };
  }, []);
  if (!import.meta.env.PROD) return null;
  const label = status === 'ready' ? localize("Prêt hors ligne") : status === 'preparing' ? localize("Préparation hors ligne") : status === 'waiting' ? localize("Mise à jour disponible") : localize("Hors ligne indisponible");
  const Icon = status === 'ready' ? Check : status === 'preparing' ? Download : status === 'waiting' ? RefreshCw : CircleAlert;
  const needsAttention = status === 'failed' || status === 'unsupported';
  return <details className="relative shrink-0">
    <summary
      aria-label={localize(label)}
      title={localize(label)}
      className={`flex size-11 cursor-pointer list-none items-center justify-center hover:bg-accent hover:text-accent-foreground [&::-webkit-details-marker]:hidden ${needsAttention ? 'text-warning' : 'text-header-foreground/75'}`}
    >
      <Icon aria-hidden="true" className="size-5" />
    </summary>
    <span role="status" className="sr-only">{localize(label)}</span>
    <div className="absolute right-0 top-full z-50 w-[min(20rem,calc(100vw-2rem))] border bg-card p-4 text-sm text-card-foreground shadow-lg">
      <p className="font-semibold">{localize(label)}</p>
      <p className="mt-2 text-muted-foreground">{localize(messages[status])}</p>
      {status === 'ready' && <p className="mt-2 text-muted-foreground">{localize("Les tuiles mondiales non téléchargées nécessitent une connexion.")}</p>}
      {status === 'failed' && <Button className="mt-3" variant="outline" size="sm" onClick={() => window.location.reload()}>{localize("Réessayer l’installation")}</Button>}
    </div>
  </details>;
}

import { localize } from '@marps/ui';
import '../i18n';
import { useEffect, useState } from 'react';
import { Button } from '@marps/ui';
import { Check, Download, CircleAlert, RefreshCw } from 'lucide-react';
import { inspectOffline, type OfflineReport } from './client';
import { waitForOfflineInstall } from './install';

type Status = 'idle' |  'preparing' | 'ready' | 'waiting' | 'failed' | 'unsupported';
const messages: Record<Status, string> = {
  idle: 'Préparez explicitement Jezero avant de couper la connexion.',
  preparing: 'Préparation hors ligne…',
  ready: 'Application et données locales prêtes hors ligne.',
  waiting: 'Mise à jour téléchargée. Fermez tous les onglets puis rouvrez l’application pour l’activer.',
  failed: 'La préparation hors ligne a échoué. Reconnectez-vous puis réessayez.',
  unsupported: 'Installation hors ligne indisponible. Utilisez un navigateur compatible en HTTPS ou sur localhost.',
};

export function OfflineStatus() {
  const [status, setStatus] = useState<Status>(() => 'serviceWorker' in navigator ? 'preparing' : 'unsupported');
  const [report, setReport] = useState<OfflineReport>();
  const [progress, setProgress] = useState('');
  const [worker, setWorker] = useState<ServiceWorker>();
  const [error, setError] = useState('');
  const prepare = async () => {
    if (!worker) return;
    setStatus('preparing'); setError('');
    try {
      const result = await inspectOffline(worker, true, (done, total) => setProgress(`${done} / ${total}`));
      setReport(result); setStatus(result.ready ? 'ready' : 'failed');
    } catch (cause) { setError(cause instanceof Error ? cause.message : ''); setStatus('failed'); }
  };
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let active = true;
    const hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => { if (hadController) window.location.reload(); };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
       .then(async registration => {
        await waitForOfflineInstall(registration);
        const current = registration.active;
        if (!current) throw new Error('No worker');
        const refresh = async () => {
          const result = await inspectOffline(current);
          if (active) { setWorker(current); setReport(result); setStatus(result.ready ? 'ready' : 'idle'); }
        };
        await refresh();
      })
      .catch(() => { if (active) setStatus('failed'); });
    return () => { active = false; navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange); };
  }, []);
  useEffect(() => {
    if (!worker) return;
    const verify = () => {
      if (document.visibilityState === 'hidden') return;
      void inspectOffline(worker).then(result => { setReport(result); setStatus(result.ready ? 'ready' : 'idle'); }).catch(() => setStatus('failed'));
    };
    window.addEventListener('offline', verify);
    document.addEventListener('visibilitychange', verify);
    return () => { window.removeEventListener('offline', verify); document.removeEventListener('visibilitychange', verify); };
  }, [worker]);
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
      {report && <p className="mt-2">{(report.bytes / 1048576).toFixed(1)} MiB / {(report.budget / 1048576).toFixed(0)} MiB · HiRISE +{report.extraCount} (16 MiB max)</p>}
      <p className="mt-2">{localize('Secteur de mission Jezero : HiRISE z12–16, THEMIS z9, sites, relief et météo figés. Les tuiles HiRISE supplémentaires sont conservées séparément ; les zones non téléchargées nécessitent internet.')}</p>
      {status === 'preparing' && <p>{progress}</p>}
      {error && <p role="alert">{error === 'quota' ? localize('Stockage insuffisant. Libérez de la place puis réessayez.') : localize('Téléchargement incomplet ou stockage indisponible. Réessayez en ligne.')}</p>}
      {worker && status !== 'preparing' && <Button className="mt-3" onClick={() => void prepare()}>{localize('Préparer / vérifier Jezero')}</Button>}
      {status === 'failed' && <Button className="mt-3" variant="outline" size="sm" onClick={() => window.location.reload()}>{localize("Réessayer l’installation")}</Button>}
    </div>
  </details>;
}

import { useEffect, useRef, useState } from 'react';
import { Button } from '@marps/ui';

export interface ConfirmOptions {
  /** Libellé du bouton qui confirme : le verbe de l'action, pas « OK ». */
  confirmLabel?: string;
  cancelLabel?: string;
  /** L'action supprime ou remplace quelque chose. */
  destructive?: boolean;
}
interface Request extends ConfirmOptions { message: string; resolve: (accepted: boolean) => void }

let present: ((request: Request) => void) | null = null;

/**
 * Demande une confirmation dans un dialogue de l'application. Sans `ConfirmHost` monté
 * (tests de panneaux isolés), la question passe par le dialogue natif du navigateur.
 */
export function confirmAction(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  if (!present) return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => present!({ message, ...options, resolve }));
}

/** <dialog> natif : focus piégé, Échap et fond gérés par le navigateur. À monter une seule fois. */
export function ConfirmHost() {
  const [request, setRequest] = useState<Request | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    present = (next) => setRequest((current) => { current?.resolve(false); return next; });
    return () => { present = null; };
  }, []);
  useEffect(() => {
    if (request && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [request]);
  const answer = (accepted: boolean) => { request?.resolve(accepted); setRequest(null); };
  if (!request) return null;
  return (
    <dialog
      ref={dialog}
      aria-label="Confirmation"
      // Échap ou fermeture par le navigateur : la question est refusée.
      onClose={() => answer(false)}
      className="confirm-dialog m-auto w-[min(26rem,calc(100vw-2rem))] border bg-card p-0 text-card-foreground backdrop:bg-black/60"
    >
      <div className="grid gap-4 p-5">
        <p className="text-base">{request.message}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" autoFocus onClick={() => answer(false)}>{request.cancelLabel ?? 'Annuler'}</Button>
          <Button type="button" variant={request.destructive ? 'destructive' : 'default'} onClick={() => answer(true)}>{request.confirmLabel ?? 'Confirmer'}</Button>
        </div>
      </div>
    </dialog>
  );
}

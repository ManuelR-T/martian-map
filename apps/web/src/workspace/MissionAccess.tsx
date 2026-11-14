import { useRef } from 'react';
import { Button } from '@marps/ui';
import { MapMissionActions } from './MapMissionActions';
/** Optional mission controls; dev's map and panels keep their original positions. */
export function MissionAccess({className}:{className?:string}) {
 const dialog=useRef<HTMLDialogElement>(null);
 return <><Button variant="ghost" size="sm" className={className} onClick={()=>dialog.current?.showModal()}>Mes missions</Button>
 <dialog ref={dialog} className="mission-access-dialog border bg-card text-foreground p-4" style={{margin:'auto',width:'min(32rem, calc(100% - 2rem))',maxHeight:'85dvh',overflowY:'auto'}}>
  <div className="mb-3 flex items-center justify-between gap-4"><h2 className="label-caps">Missions et plan actif</h2><Button variant="outline" size="sm" onClick={()=>dialog.current?.close()}>Fermer</Button></div>
  <div onClick={event=>{if((event.target as HTMLElement).closest('a'))dialog.current?.close();}}><MapMissionActions /></div>
 </dialog></>;
}

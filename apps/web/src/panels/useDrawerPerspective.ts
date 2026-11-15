import { useEffect, type RefObject } from 'react';

/** Recule la carte autant que son arête avance : aucune arête ne dépasse le rail. */
export function drawerProjection(position: number, height: number) {
  const tilt = Math.max(-1, Math.min(1, position)) * 5;
  return {
    tilt,
    depth: -Math.sin(Math.abs(tilt) * Math.PI / 180) * height / 2,
    perspective: Math.max(1600, height * 4),
  };
}

/** Mesure le cadre non transformé pour éviter une boucle de rétroaction visuelle. */
export function useDrawerPerspective(ref: RefObject<HTMLDivElement | null>, open: boolean) {
  useEffect(() => {
    const card = ref.current;
    if (!card) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const update = () => {
      frame = 0;
      if (motion.matches) {
        card.style.removeProperty('--drawer-tilt');
        card.style.removeProperty('--drawer-depth');
        card.style.removeProperty('--drawer-perspective');
        return;
      }
      const rail = card.closest<HTMLElement>('.map-drawer-rail');
      const viewport = rail && getComputedStyle(rail).display !== 'contents'
        ? rail : card.closest<HTMLElement>('.map-drawer-rails');
      if (!viewport) return;
      const bounds = viewport.getBoundingClientRect();
      const rect = card.getBoundingClientRect();
      if (!bounds.height) return;
      const distance = (rect.top + rect.height / 2 - bounds.top - bounds.height / 2)
        / ((bounds.height + rect.height) / 2);
      const projection = drawerProjection(distance, rect.height);
      card.style.setProperty('--drawer-tilt', `${projection.tilt}deg`);
      card.style.setProperty('--drawer-depth', `${projection.depth}px`);
      card.style.setProperty('--drawer-perspective', `${projection.perspective}px`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    document.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    motion.addEventListener('change', schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(card);
    const rails = card.closest('.map-drawer-rails');
    if (rails) observer.observe(rails);
    update();
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      motion.removeEventListener('change', schedule);
      observer.disconnect();
      card.style.removeProperty('--drawer-tilt');
      card.style.removeProperty('--drawer-depth');
      card.style.removeProperty('--drawer-perspective');
    };
  }, [ref, open]);
}

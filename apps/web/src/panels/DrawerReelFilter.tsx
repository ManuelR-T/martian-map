import displacement from './assets/reel-displacement.png';

/**
 * Lentille attachée au viewport, jamais aux cartes. La carte de déplacement est
 * neutre au centre et courbe les 32,5 % supérieurs/inférieurs de la fenêtre.
 * R/G codent le déplacement horizontal/vertical ; 128 est la valeur neutre.
 * L'amplitude reste sous 6 px pour préserver la lisibilité et les cibles tactiles.
 */
export function DrawerReelFilter() {
  return <svg className="drawer-reel-filter" aria-hidden="true" focusable="false">
    <defs>
      <filter id="drawer-reel-lens" x="0" y="0" width="1" height="1" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feImage href={displacement} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="lens" />
        <feDisplacementMap in="SourceGraphic" in2="lens" scale="12" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>;
}

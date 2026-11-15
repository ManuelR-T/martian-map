import { Fill, Stroke, Text } from 'ol/style';

/** Étiquettes de carte : 13 px au minimum, comme le reste de l'interface. */
export const MAP_LABEL_FONT = '600 13px "Public Sans Variable", ui-sans-serif, system-ui, sans-serif';
/** Parcours et repères de la mission : la braise, distincte du bleu du secteur. */
export const MISSION_COLOUR = '#ff8a4c';
export const SECTOR_COLOUR = 'rgba(80, 200, 255, 0.75)';

export const mapLabel = (text: string, offsetY: number) => new Text({
  text, offsetY, font: MAP_LABEL_FONT, fill: new Fill({ color: '#fff' }), stroke: new Stroke({ color: '#151b25', width: 4 }),
});

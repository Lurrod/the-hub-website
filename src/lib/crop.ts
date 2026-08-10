/**
 * Maths du recadrage côté client. Pur et sans DOM : le composant se contente
 * de mesurer le cadre et d'appliquer les résultats (transform CSS + drawImage).
 *
 * Convention : `zoom` vaut 1 quand l'image couvre exactement le cadre (cover).
 * En dessous de 1 elle rentre entièrement dans le cadre, avec des marges
 * transparentes - utile pour un logo large qu'on ne veut pas rogner.
 */

export type CropShape = "square" | "round" | "wide";

export interface Size {
  width: number;
  height: number;
}

export interface Offset {
  x: number;
  y: number;
}

/** Fenêtre à découper dans l'image source, en pixels naturels (cf. drawImage). */
export interface CropRect {
  sx: number;
  sy: number;
  sWidth: number;
  sHeight: number;
}

/** Taille de l'image exportée, alignée sur ce que `processAndStoreImage` produit. */
export const CROP_OUTPUT: Record<CropShape, Size> = {
  square: { width: 512, height: 512 },
  round: { width: 512, height: 512 },
  wide: { width: 1280, height: 360 },
};

/** Rapport largeur/hauteur du cadre de recadrage, déduit de la sortie serveur. */
export const CROP_ASPECT: Record<CropShape, number> = {
  square: CROP_OUTPUT.square.width / CROP_OUTPUT.square.height,
  round: CROP_OUTPUT.round.width / CROP_OUTPUT.round.height,
  wide: CROP_OUTPUT.wide.width / CROP_OUTPUT.wide.height,
};

export const MAX_ZOOM = 5;

function usable(size: Size): boolean {
  return size.width > 0 && size.height > 0;
}

/** Échelle qui fait couvrir tout le cadre par l'image (rogne le débord). */
export function coverScale(image: Size, frame: Size): number {
  if (!usable(image) || !usable(frame)) return 1;
  return Math.max(frame.width / image.width, frame.height / image.height);
}

/** Échelle qui fait rentrer l'image entière dans le cadre (laisse des marges). */
export function containScale(image: Size, frame: Size): number {
  if (!usable(image) || !usable(frame)) return 1;
  return Math.min(frame.width / image.width, frame.height / image.height);
}

/** Zoom minimum autorisé : « image entière visible », exprimé en multiple de cover. */
export function minZoom(image: Size, frame: Size): number {
  const cover = coverScale(image, frame);
  if (cover <= 0) return 1;
  return Math.min(1, containScale(image, frame) / cover);
}

export function clampZoom(zoom: number, image: Size, frame: Size): number {
  if (!Number.isFinite(zoom)) return 1;
  return Math.min(MAX_ZOOM, Math.max(minZoom(image, frame), zoom));
}

/** Taille de l'image telle qu'affichée dans le cadre, au zoom donné. */
export function displayedSize(image: Size, frame: Size, zoom: number): Size {
  const scale = coverScale(image, frame) * zoom;
  return { width: image.width * scale, height: image.height * scale };
}

/**
 * Ramène le décalage dans les marges disponibles : on ne peut pas faire
 * apparaître de vide sur un axe où l'image dépasse déjà du cadre, et une image
 * plus petite que le cadre reste centrée.
 */
export function clampOffset(offset: Offset, image: Size, frame: Size, zoom: number): Offset {
  const shown = displayedSize(image, frame, zoom);
  const maxX = Math.max(0, (shown.width - frame.width) / 2);
  const maxY = Math.max(0, (shown.height - frame.height) / 2);
  const x = Number.isFinite(offset.x) ? offset.x : 0;
  const y = Number.isFinite(offset.y) ? offset.y : 0;
  // `+ 0` normalise le -0 que produit une borne nulle (bruit à l'affichage).
  return {
    x: Math.min(maxX, Math.max(-maxX, x)) + 0,
    y: Math.min(maxY, Math.max(-maxY, y)) + 0,
  };
}

/**
 * Fenêtre source correspondant au cadre, en pixels de l'image d'origine.
 * Peut déborder de l'image quand `zoom < 1` : `drawImage` clippe alors le
 * dessin et laisse les marges transparentes, ce qu'on veut.
 */
export function computeCropRect(image: Size, frame: Size, zoom: number, offset: Offset): CropRect {
  const scale = coverScale(image, frame) * zoom || 1;
  const shown = displayedSize(image, frame, zoom);
  return {
    sx: (shown.width / 2 - frame.width / 2 - offset.x) / scale,
    sy: (shown.height / 2 - frame.height / 2 - offset.y) / scale,
    sWidth: frame.width / scale,
    sHeight: frame.height / scale,
  };
}

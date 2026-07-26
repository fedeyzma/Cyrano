/**
 * Turn phone screenshots into vision-model input.
 *
 * A Samsung "scroll capture" is one enormous image — 1080 × 8000px and up.
 * Handing that to a vision model whole is useless: it gets squashed onto the
 * encoder's own fixed tile grid and every message dissolves into grey texture.
 * So we cut it into overlapping strips instead.
 *
 * Two rules the geometry has to respect:
 *  - **Full width, always.** Left/right bubble alignment is the only reliable
 *    signal for who said what. Cropping horizontally throws the speaker away.
 *  - **Overlap vertically.** A bubble sitting on a cut would otherwise be
 *    half-read twice and whole nowhere; with overlap it appears intact in at
 *    least one neighbour, and the stitch in llm.ts drops the repeat.
 */

/** Output width of each slice. Enough for chat text to survive the JPEG pass. */
const TILE_W = 900;
/** Output height of each slice. */
const TILE_H = 1250;
/** Vertical overlap between neighbouring slices — roughly two message bubbles. */
const OVERLAP = 200;
/** JPEG quality. Higher than the profile scan's 0.7: this is transcription, and ringing around small text costs accuracy. */
const QUALITY = 0.8;

/** Screenshots accepted per import. */
export const MAX_SHOTS = 6;
/**
 * Hard ceiling on slices across the whole import. Bounds the round-trips to
 * Cami (they run one after another), which is what actually costs the user time.
 */
export const MAX_TILES = 12;

export interface PreparedShot {
  id: string;
  /** Small preview of the top of the shot, for the thumbnail strip. */
  thumb: string;
  /** Ordered top-to-bottom slices, as data URLs. */
  tiles: string[];
  /** Source pixel dimensions, shown so a mis-picked image is obvious. */
  width: number;
  height: number;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Could not read that file"));
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Could not decode that image"));
    i.src = src;
  });
}

function crop(
  img: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
  quality: number,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Top edge of each slice, in output pixels. The last slice is flush to the
 * bottom rather than short, so the newest messages are never in a runt tile.
 */
export function tileTops(outH: number): number[] {
  if (outH <= TILE_H) return [0];
  const step = TILE_H - OVERLAP;
  const tops: number[] = [];
  for (let top = 0; top + TILE_H < outH; top += step) tops.push(top);
  tops.push(outH - TILE_H);
  return tops;
}

/** Decode one screenshot and slice it. Runs on the client (needs canvas). */
export async function prepareScreenshot(file: File, id: string): Promise<PreparedShot> {
  const img = await loadImage(await readAsDataUrl(file));
  if (!img.width || !img.height) throw new Error("That image is empty");

  const scale = Math.min(1, TILE_W / img.width); // never upscale a small shot
  const outW = Math.max(1, Math.round(img.width * scale));
  const outH = Math.max(1, Math.round(img.height * scale));

  const tiles = tileTops(outH).map((top) => {
    const h = Math.min(TILE_H, outH - top); // only ever short on a single-slice shot
    return crop(img, 0, top / scale, img.width, h / scale, outW, h, QUALITY);
  });

  // Thumbnail shows the TOP of the shot at a sane aspect — a scroll capture
  // scaled to fit would be a 2px smear.
  const thumbW = 160;
  const srcH = Math.min(img.height, Math.round(img.width * 1.25));
  const thumb = crop(img, 0, 0, img.width, srcH, thumbW, Math.round((thumbW / img.width) * srcH), 0.6);

  return { id, thumb, tiles, width: img.width, height: img.height };
}

/**
 * Flatten prepared screenshots into the ordered tile list to send.
 *
 * Over the ceiling we keep the LAST tiles and report how many went: the tail of
 * a thread is what a reply actually hangs off, and catching Cyrano up on the
 * recent part is the point of importing. The caller surfaces `dropped` — this
 * never silently truncates.
 */
export function collectTiles(shots: PreparedShot[]): { tiles: string[]; dropped: number } {
  const all = shots.flatMap((s) => s.tiles);
  if (all.length <= MAX_TILES) return { tiles: all, dropped: 0 };
  return { tiles: all.slice(all.length - MAX_TILES), dropped: all.length - MAX_TILES };
}

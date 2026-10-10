/** Scale a picture down so its longer side is at most `maxSide`, keeping the shape. Never scales up. */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) {
    return { width, height };
  }
  const scale = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** The same size the desktop app's barcode reader uses, so nothing readable is lost. */
export const PHOTO_MAX_SIDE = 1600;

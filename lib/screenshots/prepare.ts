// Runs in the BROWSER. Shrinks a screenshot before it's uploaded:
//  * max 2400px on the longest side (plenty for a chart, much smaller file);
//  * re-encoded as WebP (or JPEG where WebP encoding isn't supported, e.g. older Safari);
//  * re-encoding also strips hidden metadata such as a photo's GPS location.
// The server still checks the real file type and size; this only keeps uploads fast.

const MAX_SIDE = 2400;
const MAX_BYTES = 3.4 * 1024 * 1024; // just under the server's 3.5 MB cap

export class ScreenshotError extends Error {}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ScreenshotError("That file couldn't be opened as an image."));
    };
    img.src = url;
  });
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

export async function prepareScreenshot(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new ScreenshotError("Choose an image file.");
  const img = await loadImage(file);

  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ScreenshotError("Your browser couldn't process that image.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  for (const quality of [0.85, 0.7, 0.55]) {
    let blob = await toBlob(canvas, "image/webp", quality);
    // Browsers that can't encode WebP silently return a PNG instead: use JPEG then.
    if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", quality);
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw new ScreenshotError("That image is too large, even after shrinking it.");
}

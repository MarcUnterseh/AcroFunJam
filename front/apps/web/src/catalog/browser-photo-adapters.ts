import { recognizePhotoFormat, type PhotoInspector, type PhotoReducer } from '@acrofunjam/core';

// Story 10 (ADR 0039): the adapters of the browser for the photos. The name of a file is never trusted.

/** The upright dimensions, when the browser can read the photo (not HEIC outside Safari, not in jsdom). */
const dimensionsOf = async (file: Blob) => {
  if (typeof createImageBitmap !== 'function') return null;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return null;
  }
};

/** Reads the first bytes for the format, the weight, and the dimensions when the browser can decode the photo. */
export const browserPhotoInspector: PhotoInspector<File> = {
  async inspect(file) {
    const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    const format = recognizePhotoFormat(head);
    return { format, size: file.size, dimensions: format ? await dimensionsOf(file) : null };
  },
};

/** Draws the upright photo at these dimensions on a canvas, then encodes it in JPEG (quality 0.85, ADR 0039). */
export const canvasPhotoReducer: PhotoReducer<File> = {
  async reduce(file, target) {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
        resizeWidth: target.width,
        resizeHeight: target.height,
        resizeQuality: 'high',
      });
      const canvas = document.createElement('canvas');
      canvas.width = target.width;
      canvas.height = target.height;
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
      bitmap.close();
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
      if (!blob) return null;
      return new File([blob], file.name.replace(/\.[^.]*$/, '') + '.jpg', { type: 'image/jpeg' });
    } catch {
      return null;
    }
  },
};

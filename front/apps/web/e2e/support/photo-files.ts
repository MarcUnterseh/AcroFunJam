import type { Page } from '@playwright/test';

// Story 10: real files for the field « Photo » of the site (Playwright setInputFiles with a buffer). The site reads the
// format in the first bytes and the dimensions with createImageBitmap: a JPEG is drawn by the browser at the stated size,
// then brought to the stated weight with comment segments, which every decoder skips.

export type ChosenFile = { name: string; mimeType: string; buffer: Buffer };

const mebibyte = 1024 * 1024;

/** « 2 Mo », « 1,5 Mo »: a number of mebibytes, as the site and the API count them. */
export const bytesOf = (megabytes: string) => Math.round(Number(megabytes.replace(',', '.')) * mebibyte);

/** A JPEG of these dimensions drawn by the browser (a sky, a sun), at a small weight. */
const drawnJpeg = async (page: Page, width: number, height: number): Promise<Buffer> => {
  const base64 = await page.evaluate(
    async ([w, h]) => {
      const canvas = new OffscreenCanvas(w, h);
      const context = canvas.getContext('2d')!;
      const sky = context.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#5b4a8a');
      sky.addColorStop(1, '#e8b27a');
      context.fillStyle = sky;
      context.fillRect(0, 0, w, h);
      context.fillStyle = '#f6d365';
      context.beginPath();
      context.arc(w / 2, h / 2, Math.min(w, h) / 5, 0, Math.PI * 2);
      context.fill();
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000)
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(binary);
    },
    [width, height] as const,
  );
  return Buffer.from(base64, 'base64');
};

/** The JPEG brought to this weight: comment segments (FF FE) inserted after its start (FF D8). */
const weighed = (jpeg: Buffer, bytes: number): Buffer => {
  const segments: Buffer[] = [];
  let missing = bytes - jpeg.length;
  while (missing > 4) {
    const length = Math.min(0xffff, missing - 2);
    const segment = Buffer.alloc(length + 2, 0x20);
    segment[0] = 0xff;
    segment[1] = 0xfe;
    segment.writeUInt16BE(length, 2);
    segments.push(segment);
    missing -= segment.length;
  }
  return Buffer.concat([jpeg.subarray(0, 2), ...segments, jpeg.subarray(2)]);
};

/** Some bytes of this kind, starting with its signature, at this weight. */
const filled = (signature: Buffer, bytes: number): Buffer => {
  const buffer = Buffer.alloc(bytes, 0);
  signature.copy(buffer);
  return buffer;
};

/** The HEIC signature: a box « ftyp » of brand « heic »; the rest cannot be decoded by Chromium. */
const heicSignature = Buffer.concat([
  Buffer.from([0, 0, 0, 0x18]),
  Buffer.from('ftypheic\0\0\0\0mif1heic', 'latin1'),
]);

/**
 * The file a scenario names: « une photo JPEG de 2 Mo de 1600×1200 », « un document PDF de 1 Mo », « une photo HEIC de
 * 12 Mo que le navigateur ne sait pas lire ».
 */
export const fileNamed = async (page: Page, description: string): Promise<ChosenFile> => {
  const jpeg = /^une photo JPEG de ([\d,]+) Mo de (\d+)×(\d+)$/.exec(description);
  if (jpeg) {
    const [, megabytes, width, height] = jpeg;
    const buffer = weighed(await drawnJpeg(page, Number(width), Number(height)), bytesOf(megabytes!));
    return { name: 'photo.jpg', mimeType: 'image/jpeg', buffer };
  }
  const pdf = /^un document PDF de ([\d,]+) Mo$/.exec(description);
  if (pdf)
    return {
      name: 'document.pdf',
      mimeType: 'application/pdf',
      buffer: filled(Buffer.from('%PDF-1.7\n'), bytesOf(pdf[1]!)),
    };
  const heic = /^une photo HEIC de ([\d,]+) Mo que le navigateur ne sait pas lire$/.exec(description);
  if (heic)
    return { name: 'photo.heic', mimeType: 'image/heic', buffer: filled(heicSignature, bytesOf(heic[1]!)) };
  throw new Error(`Fichier inconnu : ${description}`);
};

/** « une photo PNG de 3 Mo de 1600×1200 »: the dimensions it states (the simulated catalog keeps only them). */
export const dimensionsNamed = (description: string): { width: number; height: number } => {
  const match = /de (\d+)×(\d+)$/.exec(description);
  if (!match) throw new Error(`Dimensions inconnues : ${description}`);
  return { width: Number(match[1]), height: Number(match[2]) };
};

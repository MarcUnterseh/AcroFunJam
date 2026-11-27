import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { bytesOf, fileNamed as photoFileNamed, type ChosenFile } from './photo-files';

// Story 12: files for the field « Vidéo » of the site. The site reads the format in the first bytes and the duration
// and the dimensions in the MP4/MOV header (ADR 0041): a header is written here (ftyp, moov with mvhd and a video
// track), then data up to the stated weight. No browser can play it: the page shows no preview, as for a HEVC video.

/** Playwright refuses a buffer above 50 MB: heavier files are written in the temporary directory. */
export type ChosenVideo = ChosenFile | string;

const u32 = (value: number) => {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32BE(value | 0);
  return buffer;
};
const box = (type: string, ...payload: Buffer[]) => {
  const content = Buffer.concat(payload);
  return Buffer.concat([u32(content.length + 8), Buffer.from(type, 'latin1'), content]);
};
const zeros = (count: number) => Buffer.alloc(count);
const matrix = (quarterTurn: boolean) =>
  Buffer.concat(
    (quarterTurn
      ? [0, -0x10000, 0, 0x10000, 0, 0, 0, 0, 0x40000000]
      : [0x10000, 0, 0, 0, 0x10000, 0, 0, 0, 0x40000000]
    ).map(u32),
  );

/** The header of a video of this duration, coded at these dimensions, turned a quarter when filmed in portrait. */
const header = (brand: string, durationMs: number, width: number, height: number, quarterTurn: boolean) => {
  const mvhd = box(
    'mvhd',
    u32(0),
    u32(0),
    u32(0),
    u32(1000),
    u32(durationMs),
    u32(0x10000),
    Buffer.from([1, 0]),
    zeros(10),
    matrix(false),
    zeros(24),
    u32(2),
  );
  const tkhd = box(
    'tkhd',
    u32(3),
    u32(0),
    u32(0),
    u32(1),
    u32(0),
    u32(durationMs),
    zeros(8),
    zeros(8),
    matrix(quarterTurn),
    u32(width * 0x10000),
    u32(height * 0x10000),
  );
  const hdlr = box('hdlr', u32(0), u32(0), Buffer.from('vide', 'latin1'), zeros(13));
  const moov = box('moov', mvhd, box('trak', tkhd, box('mdia', hdlr)));
  return Buffer.concat([
    box('ftyp', Buffer.from(brand, 'latin1'), u32(0), Buffer.from(brand, 'latin1')),
    moov,
  ]);
};

/**
 * The file a scenario names: « une vidéo MP4 de 12 s », « une vidéo MP4 de 31,7 s », « une vidéo MP4 de 30 s, 120 Mo,
 * 3840×2160 », « une vidéo MOV HEVC de 31 s filmée par un iPhone, que le navigateur ne sait pas lire », « un document PDF
 * de 1 Mo ».
 */
export const videoNamed = async (
  page: Parameters<typeof photoFileNamed>[0],
  description: string,
): Promise<ChosenVideo> => {
  if (description.startsWith('un document')) return photoFileNamed(page, description);
  const match =
    /^une vidéo (MP4|MOV HEVC) de ([\d,]+) s(?:, ([\d,]+) Mo, (\d+)×(\d+))?( filmée par un iPhone)?/.exec(
      description,
    );
  if (!match) throw new Error(`Vidéo inconnue : ${description}`);
  const [, format, seconds, megabytes, width, height, iPhone] = match;
  const mov = format === 'MOV HEVC';
  const durationMs = Math.round(Number(seconds!.replace(',', '.')) * 1000);
  const head = header(
    mov ? 'qt  ' : 'isom',
    durationMs,
    Number(width ?? 1920),
    Number(height ?? 1080),
    !!iPhone,
  );
  const size = megabytes ? bytesOf(megabytes) : 1024 * 1024;
  const mdat = Buffer.concat([u32(size - head.length), Buffer.from('mdat', 'latin1')]);
  const buffer = Buffer.concat([head, mdat, Buffer.alloc(size - head.length - mdat.length)]);
  const name = mov ? 'pop-to-bird.mov' : 'pop-to-bird.mp4';
  if (buffer.length <= 40 * 1024 * 1024)
    return { name, mimeType: mov ? 'video/quicktime' : 'video/mp4', buffer };
  const file = path.join(tmpdir(), `${crypto.randomUUID()}-${name}`);
  writeFileSync(file, buffer);
  return file;
};

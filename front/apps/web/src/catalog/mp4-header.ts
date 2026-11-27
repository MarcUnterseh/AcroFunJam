// Story 12 (ADR 0041, UX-55): a small reader of the header of an MP4 or MOV file (ISO base media format), so that the
// site knows the duration and the upright dimensions of a video it cannot play (HEVC outside Safari). A pre-check only:
// the API checks again. Anything unexpected (fragmented MP4, incoherent box) reads as unknown.

/** Slices of a file: nothing is sent, the file is read where it is (Blob.slice in the browser). */
export type ByteSource = {
  readonly size: number;
  read(start: number, end: number): Promise<Uint8Array>;
};

export type Mp4Header = {
  readonly durationMs: number;
  readonly dimensions: { readonly width: number; readonly height: number };
};

/** The largest « moov » box read: far above the header of a 30-second video. */
const maxMoovBytes = 16 * 1024 * 1024;

type Box = {
  readonly type: string;
  readonly start: number;
  readonly headerSize: number;
  readonly size: number;
};

const typeOf = (bytes: Uint8Array, offset: number) =>
  String.fromCharCode(...bytes.subarray(offset, offset + 4));

const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

/** The box starting at this offset of a header (8 or 16 bytes); null when incoherent. */
const boxAt = (header: Uint8Array, start: number, limit: number): Box | null => {
  if (header.length < 8) return null;
  const data = view(header);
  let size = data.getUint32(0);
  let headerSize = 8;
  if (size === 1) {
    if (header.length < 16) return null;
    size = Number(data.getBigUint64(8));
    headerSize = 16;
  } else if (size === 0) size = limit - start;
  if (size < headerSize || start + size > limit) return null;
  return { type: typeOf(header, 4), start, headerSize, size };
};

/** The boxes of a box already in memory (its payload from `from` to `to`). */
const children = (bytes: Uint8Array, from: number, to: number): Box[] | null => {
  const boxes: Box[] = [];
  let offset = from;
  while (offset + 8 <= to) {
    const box = boxAt(bytes.subarray(offset, offset + 16), offset, to);
    if (!box) return null;
    boxes.push(box);
    offset += box.size;
  }
  return boxes;
};

const payload = (bytes: Uint8Array, box: Box) =>
  bytes.subarray(box.start + box.headerSize, box.start + box.size);

const find = (bytes: Uint8Array, box: Box | undefined, type: string): Box | undefined => {
  if (!box) return undefined;
  return children(bytes, box.start + box.headerSize, box.start + box.size)?.find(
    (child) => child.type === type,
  );
};

/** Version 0 holds its times on 32 bits, version 1 on 64. */
const timeAt = (data: DataView, offset: number, version: number) =>
  version === 1 ? Number(data.getBigUint64(offset)) : data.getUint32(offset);

const movieTimes = (content: Uint8Array) => {
  const data = view(content);
  const version = content[0]!;
  const at = version === 1 ? 20 : 12;
  return { timescale: data.getUint32(at), duration: timeAt(data, at + 4, version) };
};

/** The width and height of the track, upright: a rotation of 90° or 270° in its matrix swaps them. */
const trackDimensions = (content: Uint8Array) => {
  const data = view(content);
  const version = content[0]!;
  const matrix = version === 1 ? 52 : 40;
  const [a, b] = [data.getInt32(matrix), data.getInt32(matrix + 4)];
  const width = data.getUint32(matrix + 36) / 0x10000;
  const height = data.getUint32(matrix + 40) / 0x10000;
  const quarterTurn = a === 0 && b !== 0;
  return quarterTurn
    ? { width: Math.round(height), height: Math.round(width) }
    : { width: Math.round(width), height: Math.round(height) };
};

/** The duration the edit list presents, in the time scale of the movie; null without edit list. */
const editedDuration = (content: Uint8Array): number | null => {
  const data = view(content);
  const version = content[0]!;
  const count = data.getUint32(4);
  let total = 0;
  let offset = 8;
  for (let i = 0; i < count; i++) {
    total += timeAt(data, offset, version);
    offset += version === 1 ? 20 : 12;
  }
  return count > 0 ? total : null;
};

/** The duration and the upright dimensions of an MP4 or MOV video; null when they cannot be read reliably. */
export const readMp4Header = async (source: ByteSource): Promise<Mp4Header | null> => {
  try {
    let offset = 0;
    let moov: Box | null = null;
    while (offset + 8 <= source.size) {
      const box = boxAt(await source.read(offset, Math.min(offset + 16, source.size)), offset, source.size);
      if (!box) return null;
      if (box.type === 'moov') {
        moov = box;
        break;
      }
      offset += box.size;
    }
    if (!moov || moov.size > maxMoovBytes) return null;
    const bytes = await source.read(moov.start, moov.start + moov.size);
    const local = { ...moov, start: 0 };
    const boxes = children(bytes, local.headerSize, local.size);
    if (!boxes || boxes.some((box) => box.type === 'mvex')) return null;
    const mvhd = boxes.find((box) => box.type === 'mvhd');
    const video = boxes
      .filter((box) => box.type === 'trak')
      .find((trak) => {
        const hdlr = find(bytes, find(bytes, trak, 'mdia'), 'hdlr');
        return hdlr !== undefined && typeOf(payload(bytes, hdlr), 8) === 'vide';
      });
    const tkhd = find(bytes, video, 'tkhd');
    if (!mvhd || !tkhd) return null;
    const { timescale, duration } = movieTimes(payload(bytes, mvhd));
    if (timescale === 0) return null;
    const elst = find(bytes, find(bytes, video, 'edts'), 'elst');
    const presented = (elst && editedDuration(payload(bytes, elst))) ?? duration;
    const dimensions = trackDimensions(payload(bytes, tkhd));
    if (dimensions.width === 0 || dimensions.height === 0) return null;
    return { durationMs: Math.round((presented / timescale) * 1000), dimensions };
  } catch {
    return null;
  }
};

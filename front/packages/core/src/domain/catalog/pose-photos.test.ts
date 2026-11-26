import { describe, expect, it } from 'vitest';
import {
  canAddPhoto,
  checkAltText,
  checkPhotoCredit,
  checkPhotoInput,
  enlargedPhotoIndex,
  maxPhotosPerPose,
  planPhotoUpload,
  recognizePhotoFormat,
  reductionTarget,
  removalConsequence,
  type PosePhoto,
} from './pose-photos';

// Story 10 « Photos des poses » (ADR 0039): what the site checks before sending a photo, and how it presents them.

const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]);
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

describe('recognizePhotoFormat', () => {
  it.each([
    ['jpeg', bytes(0xff, 0xd8, 0xff, 0xe0)],
    ['png', bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)],
    ['webp', bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP'))],
    ['heic', bytes(0, 0, 0, 0x18, ...ascii('ftypheic'))],
    ['heic', bytes(0, 0, 0, 0x18, ...ascii('ftypmif1'))],
  ] as const)('should recognise a %s photo from its first bytes', (format, content) => {
    expect(recognizePhotoFormat(content)).toBe(format);
  });

  it.each([
    ['a GIF', bytes(...ascii('GIF89a'))],
    ['a PDF', bytes(...ascii('%PDF-1.7'))],
    ['an MP4 video', bytes(0, 0, 0, 0x20, ...ascii('ftypisom'))],
    ['a text', bytes(...ascii('Folded Leaf'))],
    ['a file too short', new Uint8Array([0xff, 0xd8])],
  ])('should recognise no accepted format in %s', (_, content) => {
    expect(recognizePhotoFormat(content)).toBeNull();
  });
});

describe('reductionTarget', () => {
  it.each([
    [
      { width: 6000, height: 4000 },
      { width: 2400, height: 1600 },
    ],
    [
      { width: 4000, height: 6000 },
      { width: 1600, height: 2400 },
    ],
  ])('should bring the longer side of %j to 2400 pixels', (size, target) => {
    expect(reductionTarget(size)).toEqual(target);
  });

  it('should never bring the shorter side under 800 pixels, for a panorama', () => {
    expect(reductionTarget({ width: 20000, height: 900 })).toEqual({ width: 17778, height: 800 });
  });

  it('should not reduce a photo already small enough', () => {
    expect(reductionTarget({ width: 2000, height: 1500 })).toBeNull();
  });
});

describe('planPhotoUpload', () => {
  const mb = 1024 * 1024;

  it('should send a light photo as it is', () => {
    expect(
      planPhotoUpload({ format: 'jpeg', size: 2 * mb, dimensions: { width: 1600, height: 1200 } }),
    ).toEqual({
      kind: 'send',
    });
  });

  it('should refuse a file that is not an accepted photo', () => {
    expect(planPhotoUpload({ format: null, size: mb, dimensions: null })).toEqual({
      kind: 'refuse',
      reason: 'format',
    });
  });

  it('should refuse a photo too small, when its dimensions are known', () => {
    expect(planPhotoUpload({ format: 'jpeg', size: mb, dimensions: { width: 1200, height: 799 } })).toEqual({
      kind: 'refuse',
      reason: 'too-small',
    });
  });

  it('should reduce a photo over 10 MiB that the browser can read', () => {
    expect(
      planPhotoUpload({ format: 'jpeg', size: 12 * mb, dimensions: { width: 6000, height: 4000 } }),
    ).toEqual({
      kind: 'reduce',
      target: { width: 2400, height: 1600 },
    });
  });

  it('should refuse a photo over 10 MiB that the browser cannot read', () => {
    expect(planPhotoUpload({ format: 'heic', size: 12 * mb, dimensions: null })).toEqual({
      kind: 'refuse',
      reason: 'too-large',
    });
  });

  it('should send a HEIC photo the browser cannot read, the API checking its dimensions', () => {
    expect(planPhotoUpload({ format: 'heic', size: 3 * mb, dimensions: null })).toEqual({ kind: 'send' });
  });
});

describe('checkAltText and checkPhotoCredit', () => {
  it('should refuse an alternative text longer than 200 characters', () => {
    expect(checkAltText('a'.repeat(201))).toBe('too-long');
  });

  it.each(['', '    '])('should accept a missing alternative text %j, which is optional', (text) => {
    expect(checkAltText(text)).toBeNull();
  });

  it('should accept an alternative text of 200 characters', () => {
    expect(checkAltText('é'.repeat(200))).toBeNull();
  });

  it.each([
    ['', 'required'],
    ['  ', 'required'],
    ['l'.repeat(101), 'too-long'],
  ])('should refuse the credit %j', (credit, error) => {
    expect(checkPhotoCredit(credit)).toBe(error);
  });

  it('should leave the refusal of « inconnu » to the API', () => {
    expect(checkPhotoCredit('inconnu')).toBeNull();
  });
});

describe('checkPhotoInput', () => {
  it('should give every missing field at once', () => {
    expect(checkPhotoInput({ hasFile: false, altText: '', credit: ' ', rightsConfirmed: false })).toEqual({
      file: 'required',
      credit: 'required',
      rights: 'required',
    });
  });

  it('should give nothing when the input is complete', () => {
    expect(
      checkPhotoInput({
        hasFile: true,
        altText: 'Bird vue de profil',
        credit: 'Léa Martin',
        rightsConfirmed: true,
      }),
    ).toEqual({});
  });
});

const photo = (id: string): PosePhoto => ({
  id,
  altText: id,
  credit: 'Léa Martin',
  width: 1600,
  height: 1200,
  sources: { thumbnail: `/t/${id}`, page: `/p/${id}`, enlarged: `/e/${id}` },
});

describe('canAddPhoto and removalConsequence', () => {
  it('should allow adding a photo until there are 5', () => {
    expect(maxPhotosPerPose).toBe(5);
    expect(canAddPhoto(4)).toBe(true);
    expect(canAddPhoto(5)).toBe(false);
  });

  it.each([
    [['a'], 'a', 'last'],
    [['a', 'b'], 'a', 'main'],
    [['a', 'b'], 'b', 'other'],
  ] as const)('should tell what removing %j changes (%s)', (ids, removed, consequence) => {
    expect(removalConsequence(ids.map(photo), removed)).toBe(consequence);
  });
});

describe('enlargedPhotoIndex', () => {
  it.each([
    ['2', 3, 1],
    ['1', 3, 0],
    ['4', 3, null],
    ['0', 3, null],
    ['deux', 3, null],
    [null, 3, null],
  ] as const)('should read ?photo=%s among %d photos as the index %s', (param, count, index) => {
    expect(enlargedPhotoIndex(param, count)).toBe(index);
  });
});

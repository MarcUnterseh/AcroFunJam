import { describe, expect, it } from 'vitest';
import { browserPhotoInspector } from './browser-photo-adapters';

// Story 10 (ADR 0039): what the browser finds in a chosen file, before sending it.

const fileOf = (head: number[], size: number, name = 'bird.jpg') => {
  const bytes = new Uint8Array(size);
  bytes.set(head);
  return new File([bytes], name);
};

describe('browserPhotoInspector', () => {
  it('should recognise the format from the first bytes and give the weight', async () => {
    const facts = await browserPhotoInspector.inspect(fileOf([0xff, 0xd8, 0xff, 0xe0], 2048));

    expect(facts.format).toBe('jpeg');
    expect(facts.size).toBe(2048);
  });

  it('should not trust the name of a file that is not a photo', async () => {
    const text = new File(['Folded Leaf, notes de jam'], 'folded-leaf.jpg', { type: 'image/jpeg' });

    expect((await browserPhotoInspector.inspect(text)).format).toBeNull();
  });

  it('should give no dimensions when the browser cannot read the photo', async () => {
    expect((await browserPhotoInspector.inspect(fileOf([0xff, 0xd8, 0xff, 0xe0], 64))).dimensions).toBeNull();
  });
});

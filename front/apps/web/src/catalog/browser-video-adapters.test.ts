import { bytesOf } from '../test/data-url';
import portraitIphone from './test-media/portrait-iphone.mov?inline';
import { describe, expect, it } from 'vitest';
import { browserVideoInspector } from './browser-video-adapters';

// Story 12 (ADR 0041, UX-55): what the browser finds in a chosen video, before sending it.

const portrait = () => new File([bytesOf(portraitIphone)], 'portrait-iphone.mov');

describe('browserVideoInspector', () => {
  it('should read the format, the weight, the duration and the upright dimensions of a MOV of a phone', async () => {
    const file = portrait();

    expect(await browserVideoInspector.inspect(file)).toEqual({
      format: 'mov',
      size: file.size,
      durationMs: 2_600,
      dimensions: { width: 108, height: 192 },
    });
  });

  it('should not trust the name of a file that is not a video', async () => {
    const file = new File([new Uint8Array(2048).fill(0x20)], 'pop-to-bird.mp4');

    expect(await browserVideoInspector.inspect(file)).toEqual({
      format: null,
      size: 2048,
      durationMs: null,
      dimensions: null,
    });
  });
});

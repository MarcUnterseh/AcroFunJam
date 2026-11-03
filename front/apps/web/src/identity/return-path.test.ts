import { describe, expect, it } from 'vitest';
import { safeReturnPath } from './return-path';

describe('safeReturnPath', () => {
  it.each(['/', '/poses?difficulte=debutant', '/?page=2'])('should keep the internal path %s', (path) => {
    expect(safeReturnPath(path)).toBe(path);
  });

  it.each([
    null,
    '',
    '/connexion',
    '/inscription?retour=%2F',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    'poses',
  ])(
    'should fall back to the home page when the return path is %o (no open redirect, no identity page)',
    (path) => {
      expect(safeReturnPath(path)).toBe('/');
    },
  );
});

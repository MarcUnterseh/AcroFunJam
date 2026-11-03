import { describe, expect, it } from 'vitest';
import { signInPath } from './paths';

describe('signInPath', () => {
  it('should lead to the sign-in page, coming back to the given page afterwards', () => {
    expect(signInPath('/proposer-une-pose')).toBe('/connexion?retour=%2Fproposer-une-pose');
  });

  it('should keep the query of the page to come back to', () => {
    expect(signInPath('/?page=2')).toBe('/connexion?retour=%2F%3Fpage%3D2');
  });
});

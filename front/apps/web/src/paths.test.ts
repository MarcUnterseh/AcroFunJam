import { describe, expect, it } from 'vitest';
import { legalNoticePath, privacyPolicyPath, signInPath } from './paths';

describe('signInPath', () => {
  it('should lead to the sign-in page, coming back to the given page afterwards', () => {
    expect(signInPath('/proposer-une-pose')).toBe('/connexion?retour=%2Fproposer-une-pose');
  });

  it('should keep the query of the page to come back to', () => {
    expect(signInPath('/?page=2')).toBe('/connexion?retour=%2F%3Fpage%3D2');
  });
});

describe('legal pages', () => {
  it('should give the legal notice and the privacy policy French addresses', () => {
    expect(legalNoticePath).toBe('/mentions-legales');
    expect(privacyPolicyPath).toBe('/confidentialite');
  });
});

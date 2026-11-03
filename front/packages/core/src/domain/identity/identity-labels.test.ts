import { describe, expect, it } from 'vitest';
import { identityErrorLabel, passwordRequirementLabel } from './identity-labels';

describe('identity labels', () => {
  it.each([
    ['identity.email-required', 'Saisis ton adresse e-mail.'],
    ['identity.email-invalid', 'Saisis une adresse e-mail au format nom@exemple.org.'],
    ['identity.password-required', 'Saisis ton mot de passe.'],
    ['identity.password-too-short', 'Ton mot de passe est trop court : il doit contenir au moins 10 caractères.'],
    ['invalid-credentials', 'Adresse e-mail ou mot de passe incorrect. Vérifie-les et réessaie.'],
    ['email-already-used', 'Cette adresse e-mail sert déjà à un compte.'],
    ['locked-out', 'Trop de tentatives de connexion. Réessaie dans quelques minutes.'],
    ['unreachable', 'Impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie.'],
    ['registration-refused', "L'inscription n'a pas pu aboutir. Vérifie tes informations, puis réessaie."],
  ] as const)('should label %s in French with the informal tone', (code, label) => {
    expect(identityErrorLabel(code)).toBe(label);
  });

  it('should state the password requirement before typing', () => {
    expect(passwordRequirementLabel).toBe('Ton mot de passe doit contenir au moins 10 caractères.');
  });
});

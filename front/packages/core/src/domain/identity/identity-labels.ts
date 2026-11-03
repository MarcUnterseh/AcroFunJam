import { passwordPolicy, type FieldErrorCode } from './credentials';

/** Failures reported by the identity port (see application/identity/AuthGateway). */
export type AuthFailure =
  | 'invalid-credentials'
  | 'locked-out'
  | 'email-already-used'
  | 'password-too-short'
  | 'invalid-email'
  | 'registration-refused'
  | 'unreachable';

export const passwordRequirementLabel = `Ton mot de passe doit contenir au moins ${passwordPolicy.minLength} caractères.`;

/** Distinct from the requirement shown under the field, so that the error is noticed. */
const tooShortLabel = `Ton mot de passe est trop court : il doit contenir au moins ${passwordPolicy.minLength} caractères.`;

const labels: Readonly<Record<FieldErrorCode | AuthFailure, string>> = {
  'identity.email-required': 'Saisis ton adresse e-mail.',
  'identity.email-invalid': 'Saisis une adresse e-mail au format nom@exemple.org.',
  'identity.password-required': 'Saisis ton mot de passe.',
  'identity.password-too-short': tooShortLabel,
  'invalid-credentials': 'Adresse e-mail ou mot de passe incorrect. Vérifie-les et réessaie.',
  'locked-out': 'Trop de tentatives de connexion. Réessaie dans quelques minutes.',
  'email-already-used': 'Cette adresse e-mail sert déjà à un compte.',
  'password-too-short': tooShortLabel,
  'invalid-email': 'Saisis une adresse e-mail au format nom@exemple.org.',
  unreachable: 'Impossible de joindre AcroFunJam. Vérifie ta connexion Internet, puis réessaie.',
  'registration-refused': "L'inscription n'a pas pu aboutir. Vérifie tes informations, puis réessaie.",
};

/** French labels (informal tone, docs/design/principes.md), shared by the web and mobile apps. */
export const identityErrorLabel = (code: FieldErrorCode | AuthFailure): string => labels[code];

/**
 * The facts the footer and the legal pages state (story « Mentions légales et confidentialité »), written once. They
 * repeat facts kept elsewhere: read the privacy policy again when they change.
 * - session cookie: 14 days, renewed at each visit (api, Authentication/SessionCookie.cs);
 * - backups: 30 days (lifecycle rule of the R2 bucket, docs/deploiement.md);
 * - logs: 14 days (journald of the server, docs/deploiement.md);
 * - storage: IONOS (server, database, mailbox) in the European Union; Cloudflare R2 (photos, videos, backups, story 12:
 *   ADR 0041) in its default jurisdiction, possibly
 *   outside the European Union until the buckets move to its EU jurisdiction (Q276).
 */
export const contactAddress = 'contact@acrofunjam.fr';

export const contactMailto = `mailto:${contactAddress}`;

/** Date of the last update of the legal pages: shown under their titles. */
export const legalPagesUpdatedOn = { iso: '2026-11-27', label: '27 novembre 2026' } as const;

/**
 * The host of the site (LCEN, art. 6): IONOS SARL, which bills the server (invoice of 2026-11-26, Q270); its phone is
 * the one IONOS gives in its customer area.
 */
export const siteHost = {
  name: 'IONOS SARL',
  /** The name the privacy policy gives the processor. */
  shortName: 'IONOS',
  address: ['7 place de la Gare', 'BP 70109', '57201 Sarreguemines Cedex', 'France'],
  phone: '09 70 80 89 11',
} as const;

/** Minimum age to create an account (Q280). */
export const minimumAge = 15;

/** Site of the CNIL, for a complaint. */
export const cnilComplaintUrl = 'https://www.cnil.fr/fr/plaintes';

/** Days the session cookie lasts after the last visit (sliding, api/src/AcroFunJam.Api/Authentication/SessionCookie.cs). */
export const sessionCookieDays = 14;

/** Days the backups of the database are kept (lifecycle rule of the R2 bucket, docs/deploiement.md). */
export const backupDays = 30;

/** Days the logs of the server are kept (journald, docs/deploiement.md). */
export const logDays = 14;

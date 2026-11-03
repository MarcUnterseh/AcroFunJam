/**
 * What a role allows (glossary « Capacité »), as the stable codes published by the API (/me).
 * The site reasons on capabilities, never on the name of the role (ADR 0019).
 */
export type Capability = 'propose' | 'validate-proposals' | 'manage-roles';

const known: readonly string[] = [
  'propose',
  'validate-proposals',
  'manage-roles',
] satisfies readonly Capability[];

/** Codes the site does not know yet (a newer API) are ignored rather than trusted. */
export const isCapability = (code: string): code is Capability => known.includes(code);

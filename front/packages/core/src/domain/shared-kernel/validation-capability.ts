/**
 * Code of the capability « accepter ou refuser une proposition » (validator, administrator), as published by the
 * API (/me, ADR 0019). Shared by Identity (the session) and Contribution (direct publication): the bounded
 * contexts do not import each other, they share this code.
 */
export const validateProposalsCapability = 'validate-proposals';

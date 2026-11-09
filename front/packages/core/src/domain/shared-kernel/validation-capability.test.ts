import { describe, expect, it } from 'vitest';
import { validateProposalsCapability } from './validation-capability';

describe('validateProposalsCapability', () => {
  it('should be the code the API publishes for the capability to accept or reject a proposal', () => {
    expect(validateProposalsCapability).toBe('validate-proposals');
  });
});

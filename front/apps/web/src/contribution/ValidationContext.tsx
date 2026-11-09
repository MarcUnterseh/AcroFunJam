import type { DecisionInputStore, ValidationGateway } from '@acrofunjam/core';
import { createContext, useContext, type ReactNode } from 'react';

type Validation = { readonly gateway: ValidationGateway; readonly store: DecisionInputStore };

const ValidationContext = createContext<Validation | null>(null);

/** Injects the validation adapters chosen by the composition root (main.tsx, or fakes in tests). */
export function ValidationProvider({ gateway, store, children }: Validation & { children: ReactNode }) {
  return <ValidationContext.Provider value={{ gateway, store }}>{children}</ValidationContext.Provider>;
}

export function useValidation(): Validation {
  const validation = useContext(ValidationContext);
  if (!validation) throw new Error('useValidation must be used inside a ValidationProvider');
  return validation;
}

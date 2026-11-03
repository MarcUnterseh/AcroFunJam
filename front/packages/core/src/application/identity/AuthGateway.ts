import type { Result } from '../../domain/common/result';
import type { Capability } from '../../domain/identity/capability';
import type { Credentials } from '../../domain/identity/credentials';
import type { AuthFailure } from '../../domain/identity/identity-labels';

/** Port: the identity API (implemented by @acrofunjam/api-client). The session itself stays out of reach (cookies). */
export interface AuthGateway {
  signIn(credentials: Credentials): Promise<Result<void, AuthFailure>>;
  register(credentials: Credentials): Promise<Result<void, AuthFailure>>;
  signOut(): Promise<Result<void, AuthFailure>>;
  /** The signed-in account, or null for a visitor. */
  currentAccount(): Promise<Result<CurrentAccount | null, AuthFailure>>;
}

/** What the site reads of the signed-in account: its address and its capabilities (ADR 0019). */
export type CurrentAccount = { readonly email: string; readonly capabilities: readonly Capability[] };

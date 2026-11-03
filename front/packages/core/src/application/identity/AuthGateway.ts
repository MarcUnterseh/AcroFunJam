import type { Result } from '../../domain/common/result';
import type { Credentials } from '../../domain/identity/credentials';
import type { AuthFailure } from '../../domain/identity/identity-labels';

/** Port: the identity API (implemented by @acrofunjam/api-client). The session itself stays out of reach (cookies). */
export interface AuthGateway {
  signIn(credentials: Credentials): Promise<Result<void, AuthFailure>>;
  register(credentials: Credentials): Promise<Result<void, AuthFailure>>;
  signOut(): Promise<Result<void, AuthFailure>>;
  /** The signed-in account, or null for a visitor. */
  currentAccount(): Promise<Result<{ readonly email: string } | null, AuthFailure>>;
}

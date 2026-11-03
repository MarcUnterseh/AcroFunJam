import { useSearchParams } from 'react-router';
import { IdentityForm } from './IdentityForm';
import { safeReturnPath } from './return-path';
import { useSession } from './SessionContext';

/**
 * « Se connecter ». `contexts` (given by routes.tsx) says why the person has to sign in, by page to go back to:
 * Identity does not know the pages of the other contexts.
 */
export function SignInPage({ contexts = {} }: { readonly contexts?: Readonly<Record<string, string>> }) {
  const { signIn } = useSession();
  const [params] = useSearchParams();
  return (
    <IdentityForm kind="sign-in" context={contexts[safeReturnPath(params.get('retour'))]} onSubmit={signIn} />
  );
}

export function RegisterPage() {
  const { register } = useSession();
  return <IdentityForm kind="registration" onSubmit={register} />;
}

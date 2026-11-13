import { useSearchParams } from 'react-router';
import { IdentityForm } from './IdentityForm';
import { safeReturnPath } from './return-path';
import { useSession } from './SessionContext';

/**
 * « Se connecter ». `contextOf` (given by routes.tsx) says why the person has to sign in, from the page to go back
 * to: Identity does not know the pages of the other contexts.
 */
export function SignInPage({
  contextOf = () => undefined,
}: {
  readonly contextOf?: (returnPath: string) => string | undefined;
}) {
  const { signIn } = useSession();
  const [params] = useSearchParams();
  return (
    <IdentityForm kind="sign-in" context={contextOf(safeReturnPath(params.get('retour')))} onSubmit={signIn} />
  );
}

export function RegisterPage() {
  const { register } = useSession();
  return <IdentityForm kind="registration" onSubmit={register} />;
}

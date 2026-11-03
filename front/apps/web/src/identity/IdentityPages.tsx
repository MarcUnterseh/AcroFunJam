import { IdentityForm } from './IdentityForm';
import { useSession } from './SessionContext';

export function SignInPage() {
  const { signIn } = useSession();
  return <IdentityForm kind="sign-in" onSubmit={signIn} />;
}

export function RegisterPage() {
  const { register } = useSession();
  return <IdentityForm kind="registration" onSubmit={register} />;
}

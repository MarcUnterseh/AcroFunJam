import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CurrentLocation, FakeAuthGateway, renderSite } from '../test/site-harness';

const signedIn = (capabilities: Array<'propose' | 'validate-proposals'> = ['propose']) => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email: 'alice@example.org', capabilities };
  return gateway;
};

/** The session is still being checked: /me never answers. */
class CheckingAuthGateway extends FakeAuthGateway {
  override currentAccount = () => new Promise<never>(() => {});
}

const location = () => screen.getByLabelText('Adresse courante').textContent;
const proposalForm = () => screen.queryByRole('form', { name: 'Proposer une pose' });

describe('access to the page « Proposer une pose »', () => {
  it('should show the title only, busy, and never the form, while the session is being checked', async () => {
    renderSite('/proposer-une-pose', { gateway: new CheckingAuthGateway() });

    expect(await screen.findByRole('heading', { level: 1, name: 'Proposer une pose' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
    expect(proposalForm()).not.toBeInTheDocument();
  });

  it('should send a visitor to the sign-in page, coming back here afterwards, without ever showing the form', async () => {
    const { router } = renderSite('/proposer-une-pose', {}, <CurrentLocation />);

    await waitFor(() => expect(location()).toBe('/connexion?retour=%2Fproposer-une-pose'));
    expect(proposalForm()).not.toBeInTheDocument();
    // Replaced: going back does not lead to the page that only redirects.
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('should explain on the sign-in page why the person has to sign in first', async () => {
    renderSite('/proposer-une-pose');

    expect(await screen.findByText('Connecte-toi pour proposer une pose.')).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Se connecter' })).toBeInTheDocument();
  });

  it('should not explain anything on the sign-in page when the person comes from elsewhere', async () => {
    renderSite('/connexion?retour=%2F');

    await screen.findByRole('form', { name: 'Se connecter' });
    expect(screen.queryByText('Connecte-toi pour proposer une pose.')).not.toBeInTheDocument();
  });

  it('should present the form to a signed-in person who may propose', async () => {
    renderSite('/proposer-une-pose', { gateway: signedIn() });

    expect(await screen.findByRole('form', { name: 'Proposer une pose' })).toBeInTheDocument();
    expect(screen.getByRole('main')).not.toHaveAttribute('aria-busy');
    expect(document.title).toBe('Proposer une pose – AcroFunJam');
  });

  it('should never present the form to a signed-in person without the capability to propose', async () => {
    renderSite('/proposer-une-pose', { gateway: signedIn([]) }, <CurrentLocation />);

    await waitFor(() => expect(location()).toBe('/'));
    expect(proposalForm()).not.toBeInTheDocument();
  });
});

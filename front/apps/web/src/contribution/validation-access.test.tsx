import { fail } from '@acrofunjam/core';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  aPendingProposal,
  CurrentLocation,
  FakeAuthGateway,
  FakeValidationGateway,
  renderSite,
} from '../test/site-harness';

const signedIn = (capabilities: Array<'propose' | 'validate-proposals'>) => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email: 'bruno@example.org', capabilities };
  return gateway;
};

/** The session is still being checked: /me never answers. */
class CheckingAuthGateway extends FakeAuthGateway {
  override currentAccount = () => new Promise<never>(() => {});
}

const location = () => screen.getByLabelText('Adresse courante').textContent;
const title = () => screen.queryByRole('heading', { level: 1, name: 'Propositions à valider' });
const queue = () => screen.queryByRole('article', { name: 'Throne' });

describe('access to the page « Propositions à valider »', () => {
  it('should show the title only, busy, while the session is being checked', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    renderSite('/propositions-a-valider', { gateway: new CheckingAuthGateway(), validation });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Propositions à valider' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
    expect(queue()).not.toBeInTheDocument();
  });

  it('should send a visitor to the sign-in page, coming back here afterwards, telling why', async () => {
    const { router } = renderSite('/propositions-a-valider', {}, <CurrentLocation />);

    await waitFor(() => expect(location()).toBe('/connexion?retour=%2Fpropositions-a-valider'));
    expect(router.state.historyAction).toBe('REPLACE');
    expect(
      await screen.findByText('Connecte-toi pour accéder aux propositions à valider.'),
    ).toBeInTheDocument();
  });

  it('should send a signed-in person without the capability to validate to the catalog', async () => {
    renderSite('/propositions-a-valider', { gateway: signedIn(['propose']) }, <CurrentLocation />);

    await waitFor(() => expect(location()).toBe('/'));
    expect(title()).not.toBeInTheDocument();
  });

  it('should end the session and send to the sign-in page, for good, when it expired as the queue loads', async () => {
    const gateway = signedIn(['propose', 'validate-proposals']);
    const validation = new FakeValidationGateway();
    // The queue answers only once the account is gone: the API no longer knows the person, /me tells it too.
    validation.queue.set('held');
    const { router } = renderSite('/propositions-a-valider', { gateway, validation });
    const visited: string[] = [];
    router.subscribe((state) => visited.push(state.location.pathname));
    await screen.findByRole('heading', { level: 1, name: 'Propositions à valider' });
    await waitFor(() => expect(validation.queueRequests).toBe(1));
    gateway.account = null;
    validation.queue.release(fail({ kind: 'unauthenticated' }));

    expect(await screen.findByRole('form', { name: 'Se connecter' })).toBeInTheDocument();
    // The session is over on the site at once: the sign-in page does not send back to the queue (no ping-pong).
    expect(visited).toEqual(['/connexion']);
    expect(screen.queryByRole('navigation', { name: 'Contribution' })).not.toBeInTheDocument();
    expect(validation.queueRequests).toBe(1);
  });

  it('should present the validation queue to a validator', async () => {
    const validation = new FakeValidationGateway(aPendingProposal());
    renderSite('/propositions-a-valider', {
      gateway: signedIn(['propose', 'validate-proposals']),
      validation,
    });

    expect(await screen.findByRole('article', { name: 'Throne' })).toBeInTheDocument();
    expect(screen.getByRole('main')).not.toHaveAttribute('aria-busy');
    expect(document.title).toBe('Propositions à valider – AcroFunJam');
  });
});

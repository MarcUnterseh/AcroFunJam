import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fail, ok } from '@acrofunjam/core';
import {
  aMyProposal,
  CurrentLocation,
  FakeAuthGateway,
  FakeContributionGateway,
  FakeSessionMemory,
  renderSite,
} from '../test/site-harness';

const signedIn = (email = 'alice@example.org') => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email };
  return gateway;
};

const withProposals = (...proposals: ReturnType<typeof aMyProposal>[]) => {
  const contribution = new FakeContributionGateway();
  contribution.myProposals.set(ok(proposals));
  return contribution;
};

/** The session is still being checked: /me never answers. */
class CheckingAuthGateway extends FakeAuthGateway {
  override currentAccount = () => new Promise<never>(() => {});
}

const location = () => screen.getByLabelText('Adresse courante').textContent;

/** Texts of the status regions: the site announcer among them. */
const announcements = () => screen.getAllByRole('status').map((status) => status.textContent);

/** Lets the pending renders and their effects run (React Query notifies on the next tick). */
const settled = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

/** The block of the page that tells the session expired: no banner of the site, a link back here. */
const expectSignInAgain = () => {
  const main = screen.getByRole('main');
  expect(within(main).getByText('Connecte-toi de nouveau pour retrouver tes propositions.')).toBeInTheDocument();
  expect(within(main).getByRole('link', { name: 'Se connecter' })).toHaveAttribute(
    'href',
    '/connexion?retour=%2Fmes-propositions',
  );
  expect(screen.queryByRole('region', { name: 'Session expirée' })).not.toBeInTheDocument();
};

describe('access to the page « Mes propositions »', () => {
  it('should send a visitor to the sign-in page, coming back here afterwards, telling why', async () => {
    const { router, contribution } = renderSite('/mes-propositions', {}, <CurrentLocation />);

    await waitFor(() => expect(location()).toBe('/connexion?retour=%2Fmes-propositions'));
    expect(router.state.historyAction).toBe('REPLACE');
    expect(await screen.findByText('Connecte-toi pour accéder à tes propositions.')).toBeInTheDocument();
    expect(contribution.myProposalsRequests).toBe(0);
  });

  it('should show the title only, busy, while the session is being checked', async () => {
    const { contribution } = renderSite('/mes-propositions', { gateway: new CheckingAuthGateway() });

    expect(await screen.findByRole('heading', { level: 1, name: 'Mes propositions' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
    expect(contribution.myProposalsRequests).toBe(0);
  });

  it('should present their proposals to a signed-in person', async () => {
    renderSite('/mes-propositions', { gateway: signedIn(), contribution: withProposals(aMyProposal()) });

    expect(await screen.findByRole('article', { name: 'Throne' })).toBeInTheDocument();
    expect(screen.getByRole('main')).not.toHaveAttribute('aria-busy');
    expect(document.title).toBe('Mes propositions – AcroFunJam');
  });

  // The page tells it itself, in a lasting block (no banner, nothing to close): the list is gone, signing in
  // again is the only way back to it.
  it('should tell on the page that the session expired, offering to sign in again, when it expired as the list loads', async () => {
    const gateway = signedIn();
    const contribution = new FakeContributionGateway();
    contribution.myProposals.set(fail({ kind: 'unauthenticated' }));
    renderSite('/mes-propositions', { gateway, contribution }, <CurrentLocation />);
    await screen.findByRole('heading', { level: 1, name: 'Mes propositions' });
    gateway.account = null; // the API no longer knows the person: /me tells it too

    expect(await within(screen.getByRole('main')).findByText('Ta session a expiré.')).toBeInTheDocument();
    expectSignInAgain();
    await waitFor(() => expect(announcements()).toContain('Ta session a expiré. Tu peux te reconnecter.'));
    await settled();
    expect(location()).toBe('/mes-propositions');
    expect(contribution.myProposalsRequests).toBe(1);
  });

  it('should tell on the page that the session expired, without asking for the list, when it had already expired', async () => {
    const { contribution } = renderSite(
      '/mes-propositions',
      { memory: new FakeSessionMemory(true) },
      <CurrentLocation />,
    );

    expect(await within(screen.getByRole('main')).findByText('Ta session a expiré.')).toBeInTheDocument();
    expectSignInAgain();
    await waitFor(() => expect(announcements()).toContain('Ta session a expiré. Tu peux te reconnecter.'));
    await settled();
    expect(location()).toBe('/mes-propositions');
    expect(contribution.myProposalsRequests).toBe(0);
  });

  it('should come back to the proposals once signed in again from the page', async () => {
    const gateway = new FakeAuthGateway();
    const contribution = withProposals(aMyProposal());
    renderSite('/mes-propositions', { gateway, memory: new FakeSessionMemory(true), contribution }, <CurrentLocation />);
    const main = screen.getByRole('main');
    await userEvent.click(await within(main).findByRole('link', { name: 'Se connecter' }));

    await userEvent.type(await screen.findByLabelText('Adresse e-mail'), 'alice@example.org');
    await userEvent.type(screen.getByLabelText('Mot de passe', { exact: true }), 'Throne-Bird-2026');
    await userEvent.click(within(screen.getByRole('main')).getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByRole('article', { name: 'Throne' })).toBeInTheDocument();
    expect(location()).toBe('/mes-propositions');
    expect(screen.queryByText('Ta session a expiré.')).not.toBeInTheDocument();
  });

  // The session is read again without navigation (window focus, another tab): no loop, no dead page.
  it('should keep telling the session expired when it is read again, then present the list once signed in elsewhere', async () => {
    const gateway = signedIn();
    const contribution = new FakeContributionGateway();
    contribution.myProposals.set(fail({ kind: 'unauthenticated' }));
    const { queryClient } = renderSite('/mes-propositions', { gateway, contribution }, <CurrentLocation />);
    await within(await screen.findByRole('main')).findByText('Ta session a expiré.');
    gateway.account = null;

    const readSessionAgain = () =>
      act(async () => {
        await queryClient.invalidateQueries({ queryKey: ['session'] });
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    await readSessionAgain();
    expectSignInAgain();
    expect(contribution.myProposalsRequests).toBe(1);

    contribution.myProposals.set(ok([aMyProposal()]));
    gateway.account = { email: 'alice@example.org' };
    await readSessionAgain();
    expect(await screen.findByRole('article', { name: 'Throne' })).toBeInTheDocument();
    expect(screen.queryByText('Ta session a expiré.')).not.toBeInTheDocument();
    expect(location()).toBe('/mes-propositions');
  });

  // The proposals of a person do not stay on screen once they signed out (shared device).
  it('should lead to the catalog, without any proposal, when the person signs out', async () => {
    renderSite(
      '/mes-propositions',
      { gateway: signedIn(), contribution: withProposals(aMyProposal()) },
      <CurrentLocation />,
    );
    await screen.findByRole('article', { name: 'Throne' });

    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

    await waitFor(() => expect(location()).toBe('/'));
    expect(screen.queryByRole('article', { name: 'Throne' })).not.toBeInTheDocument();
  });

  it('should present the proposals of the person signed in now when another person signed in meanwhile', async () => {
    const gateway = signedIn();
    const contribution = withProposals(aMyProposal());
    const { queryClient } = renderSite('/mes-propositions', { gateway, contribution });
    await screen.findByRole('article', { name: 'Throne' });
    contribution.myProposals.set(ok([]));

    // Another person signed in in another tab: the session is read again.
    gateway.account = { email: 'chloe@example.org' };
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(await screen.findByText("Tu n'as encore proposé aucune pose.")).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Throne' })).not.toBeInTheDocument();
    expect(contribution.myProposalsRequests).toBe(2);
  });
});

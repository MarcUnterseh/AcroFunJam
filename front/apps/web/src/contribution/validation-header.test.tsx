import { fail, ok } from '@acrofunjam/core';
import type { QueryClient } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FakeAuthGateway, FakeValidationGateway, renderSite } from '../test/site-harness';

type Capabilities = Array<'propose' | 'validate-proposals' | 'manage-roles'>;

const signedIn = (capabilities: Capabilities, email = 'bruno@example.org') => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email, capabilities };
  return gateway;
};
const validator = () => signedIn(['propose', 'validate-proposals']);

const contribution = () => screen.findByRole('navigation', { name: 'Contribution' });
const validationLink = async () =>
  within(await contribution()).getByRole('link', { name: /^Propositions à valider/ });

/** The request of the count is over and its answer handed to the header (no timer to wait for). */
const countRead = (queryClient: QueryClient) =>
  queryClient.getQueryState(['contribution', 'pending-count'])?.status === 'success';

const pending = (count: number) => {
  const validation = new FakeValidationGateway();
  validation.count.set(ok(count));
  return validation;
};

describe('header link « Propositions à valider »', () => {
  it.each<[string, Capabilities]>([
    ['validator', ['propose', 'validate-proposals']],
    ['administrator', ['propose', 'validate-proposals', 'manage-roles']],
  ])('should invite a %s to consult the proposals to validate', async (_role, capabilities) => {
    renderSite('/', { gateway: signedIn(capabilities) });

    expect(await validationLink()).toHaveAttribute('href', '/propositions-a-valider');
  });

  it('should not invite a user, once the session is known', async () => {
    renderSite('/', { gateway: signedIn(['propose'], 'alice@example.org') });

    await within(screen.getByRole('navigation', { name: 'Compte' })).findByText('alice@example.org');
    expect(screen.queryByRole('navigation', { name: 'Contribution' })).not.toBeInTheDocument();
  });

  it('should not invite a visitor', async () => {
    renderSite('/');

    await screen.findByRole('link', { name: 'Se connecter' });
    expect(screen.queryByRole('navigation', { name: 'Contribution' })).not.toBeInTheDocument();
  });

  it('should come between the brand and the account area', async () => {
    renderSite('/', { gateway: validator() });

    const nav = await contribution();
    const account = screen.getByRole('navigation', { name: 'Compte' });
    expect(screen.getByRole('link', { name: 'AcroFunJam' }).compareDocumentPosition(nav)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(nav.compareDocumentPosition(account)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('should tell the number of pending proposals in its name, with a badge hidden from assistive technologies', async () => {
    renderSite('/', { gateway: validator(), validation: pending(3) });

    const link = await validationLink();
    await waitFor(() => expect(link).toHaveAccessibleName('Propositions à valider (3 en attente)'));
    expect(link).not.toHaveAttribute('aria-label');
    const badge = within(link).getByText('3');
    expect(badge).toHaveAttribute('aria-hidden', 'true');
  });

  it('should show a short visible label hidden from assistive technologies', async () => {
    renderSite('/', { gateway: validator(), validation: pending(3) });

    expect(within(await validationLink()).getByText('À valider')).toHaveAttribute('aria-hidden', 'true');
  });

  it('should show « 99+ » beyond 99 pending proposals', async () => {
    renderSite('/', { gateway: validator(), validation: pending(120) });

    const link = await validationLink();
    await waitFor(() => expect(link).toHaveAccessibleName('Propositions à valider (plus de 99 en attente)'));
    expect(within(link).getByText('99+')).toBeInTheDocument();
  });

  it('should show no number when none is pending', async () => {
    const { queryClient } = renderSite('/', { gateway: validator(), validation: pending(0) });

    const link = await validationLink();
    await waitFor(() => expect(countRead(queryClient)).toBe(true));
    expect(link).toHaveAccessibleName('Propositions à valider');
    expect(within(link).queryByText(/^\d+\+?$/)).toBeNull();
  });

  it('should show no number when it cannot be read', async () => {
    const validation = new FakeValidationGateway();
    validation.count.set(fail({ kind: 'unreachable' }));
    const { queryClient } = renderSite('/', { gateway: validator(), validation });

    const link = await validationLink();
    await waitFor(() => expect(countRead(queryClient)).toBe(true));
    expect(link).toHaveAccessibleName('Propositions à valider');
  });

  it('should read the number again after each navigation', async () => {
    const validation = pending(3);
    renderSite('/', { gateway: validator(), validation });
    const link = await validationLink();
    await waitFor(() => expect(link).toHaveAccessibleName('Propositions à valider (3 en attente)'));
    validation.count.set(ok(2));

    await userEvent.click(screen.getByRole('link', { name: 'AcroFunJam' }));
    await userEvent.click(link);

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /^Propositions à valider/ })).toHaveAccessibleName(
        'Propositions à valider (2 en attente)',
      ),
    );
  });

  it('should mark the link as the current page on the page « Propositions à valider »', async () => {
    renderSite('/propositions-a-valider', { gateway: validator() });

    await waitFor(async () => expect(await validationLink()).toHaveAttribute('aria-current', 'page'));
  });
});

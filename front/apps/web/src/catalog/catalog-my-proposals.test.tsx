import { fail, ok, type PoseSummary } from '@acrofunjam/core';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FakeAuthGateway, renderSite } from '../test/site-harness';

const throne: PoseSummary = {
  id: 'pose-throne',
  name: 'Throne',
  baseDifficulty: 'beginner',
  flyerDifficulty: 'discovery',
  canStartFlow: true,
  canEndFlow: true,
};

const signedIn = () => {
  const gateway = new FakeAuthGateway();
  gateway.account = { email: 'alice@example.org' };
  return gateway;
};

const myProposalsLink = () => screen.queryByRole('link', { name: 'Mes propositions' });

// Story 5 (Q23): no entry in the header; « Mes propositions » next to « Proposer une pose ».
describe('catalog, link « Mes propositions »', () => {
  it('should offer a signed-in person to see their proposals, after « Proposer une pose », as a secondary link', async () => {
    renderSite('/', { gateway: signedIn(), catalog: { listPublishedPoses: async () => ok([throne]) } });

    const link = await screen.findByRole('link', { name: 'Mes propositions' });
    expect(link).toHaveAttribute('href', '/mes-propositions');
    expect(link).toHaveClass('button--secondary');
    const header = link.closest('.page-header') as HTMLElement;
    expect(within(header).getAllByRole('link').map((each) => each.textContent)).toEqual([
      'Proposer une pose',
      'Mes propositions',
    ]);
  });

  it.each([
    ['the catalog is empty', ok([])],
    ['the catalog cannot be loaded', fail({ code: 'catalog.unreachable', message: '…' })],
  ])('should offer it alone in the header of the page when %s', async (_case, answer) => {
    renderSite('/', { gateway: signedIn(), catalog: { listPublishedPoses: async () => answer } });

    const link = await screen.findByRole('link', { name: 'Mes propositions' });
    const header = link.closest('.page-header') as HTMLElement;
    expect(within(header).getAllByRole('link')).toHaveLength(1);
  });

  it('should not offer a visitor to see proposals', async () => {
    renderSite('/', { catalog: { listPublishedPoses: async () => ok([throne]) } });

    await screen.findByRole('heading', { level: 2, name: 'Throne' });
    await screen.findByRole('link', { name: 'Se connecter' });
    expect(myProposalsLink()).not.toBeInTheDocument();
  });
});

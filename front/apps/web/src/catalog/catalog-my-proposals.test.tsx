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
  tags: [],
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
    expect(
      within(header)
        .getAllByRole('link')
        .map((each) => each.textContent),
    ).toEqual([
      'Générer un flow', // story 9: for everybody, first of the row
      'Proposer une pose',
      'Mes propositions',
      'Étiquettes', // story 8: for everybody, last of the row
    ]);
  });

  it.each([
    ['the catalog is empty', ok([])],
    ['the catalog cannot be loaded', fail({ code: 'catalog.unreachable', message: '…' })],
  ])(
    'should offer it without « Proposer une pose » in the header of the page when %s',
    async (_case, answer) => {
      renderSite('/', { gateway: signedIn(), catalog: { listPublishedPoses: async () => answer } });

      const link = await screen.findByRole('link', { name: 'Mes propositions' });
      const header = link.closest('.page-header') as HTMLElement;
      expect(
        within(header)
          .getAllByRole('link')
          .map((each) => each.textContent),
      ).toEqual(['Générer un flow', 'Mes propositions', 'Étiquettes']);
    },
  );

  it('should not offer a visitor to see proposals', async () => {
    renderSite('/', { catalog: { listPublishedPoses: async () => ok([throne]) } });

    await screen.findByRole('heading', { level: 2, name: 'Throne' });
    await screen.findByRole('link', { name: 'Se connecter' });
    expect(myProposalsLink()).not.toBeInTheDocument();
  });
});

// Story 8 (8-etiquettes.md, § 5): « Étiquettes » for everybody; for a visitor, after « Générer un flow » (story 9).
describe('catalog, link « Étiquettes »', () => {
  it('should offer a visitor the list of tags, after « Générer un flow » in the header of the page', async () => {
    renderSite('/', { catalog: { listPublishedPoses: async () => ok([throne]) } });

    const link = await screen.findByRole('link', { name: 'Étiquettes' });
    expect(link).toHaveAttribute('href', '/etiquettes');
    expect(link).toHaveClass('button--secondary');
    const header = link.closest('.page-header') as HTMLElement;
    expect(
      within(header)
        .getAllByRole('link')
        .map((each) => each.textContent),
    ).toEqual(['Générer un flow', 'Étiquettes']);
  });
});

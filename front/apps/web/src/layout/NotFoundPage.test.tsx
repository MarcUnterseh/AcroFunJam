import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderSite } from '../test/identity-harness';

describe('page not found', () => {
  it.each(['/proposer-une-pose', '/une/page/inconnue'])(
    'should say that the page %s does not exist and lead back to the catalog',
    async (path) => {
      renderSite(path);

      expect(await screen.findByRole('heading', { level: 1, name: 'Page introuvable' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Retour au catalogue' })).toHaveAttribute('href', '/');
      await waitFor(() => expect(document.title).toBe('Page introuvable – AcroFunJam'));
    },
  );

  it('should keep the header of the site', async () => {
    renderSite('/une/page/inconnue');

    expect(await screen.findByRole('navigation', { name: 'Compte' })).toBeInTheDocument();
  });
});

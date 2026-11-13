import type { PoseSummary } from '@acrofunjam/core';
import { render as renderInPage, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { PoseList } from './PoseList';

/** The cards lead to the page of their pose (story 7): they are rendered in a router. */
const render = (list: ReactNode) => renderInPage(<MemoryRouter>{list}</MemoryRouter>);

const poses: PoseSummary[] = [
  {
    id: 'p-1',
    name: 'Throne',
    baseDifficulty: 'beginner',
    flyerDifficulty: 'discovery',
    canStartFlow: true,
    canEndFlow: false,
  },
  {
    id: 'p-2',
    name: 'High Bird',
    baseDifficulty: 'intermediate',
    flyerDifficulty: 'advanced',
    canStartFlow: false,
    canEndFlow: true,
  },
];

/** Reads a card: its title, then each term of its description list with its value. */
const readCard = (card: HTMLElement) => {
  const terms = within(card)
    .getAllByRole('term')
    .map((term) => term.textContent);
  const values = within(card)
    .getAllByRole('definition')
    .map((value) => value.textContent);
  return {
    name: within(card).getByRole('heading', { level: 2 }).textContent,
    details: Object.fromEntries(terms.map((term, i) => [term, values[i]])),
  };
};

describe('PoseList', () => {
  it('should present each pose as a card with its difficulties and flow boundaries, in the given order', () => {
    render(<PoseList poses={poses} />);

    const list = screen.getByRole('list', { name: 'Poses du catalogue' });
    expect(within(list).getAllByRole('listitem').map(readCard)).toEqual([
      {
        name: 'Throne',
        details: {
          Base: 'Débutant',
          Flyer: 'Découverte',
          'Peut commencer un flow': 'Oui',
          'Peut terminer un flow': 'Non',
        },
      },
      {
        name: 'High Bird',
        details: {
          Base: 'Intermédiaire',
          Flyer: 'Avancé',
          'Peut commencer un flow': 'Non',
          'Peut terminer un flow': 'Oui',
        },
      },
    ]);
  });

  it('should hide the decorative dot scales and icons from assistive technologies', () => {
    const { container } = render(<PoseList poses={poses} />);

    const decorations = container.querySelectorAll('.difficulty-dots, svg');
    expect(decorations.length).toBeGreaterThan(0);
    decorations.forEach((decoration) => expect(decoration).toHaveAttribute('aria-hidden', 'true'));
  });

  it('should draw as many filled dots as the rank of the level', () => {
    const { container } = render(<PoseList poses={[poses[1]!]} />);

    const filled = [...container.querySelectorAll('.difficulty-dots')].map(
      (dots) => dots.querySelectorAll('.difficulty-dots__dot--filled').length,
    );
    expect(filled).toEqual([3, 4]);
  });

  it('should lead from the name of a card to the page of the pose, the only link of a visitor', () => {
    render(<PoseList poses={poses} />);

    const [card] = within(screen.getByRole('list', { name: 'Poses du catalogue' })).getAllByRole('listitem');
    const name = within(card!).getByRole('heading', { level: 2 });
    expect(within(name).getByRole('link', { name: 'Throne' })).toHaveAttribute('href', '/poses/p-1');
    expect(within(card!).getAllByRole('link')).toHaveLength(1);
  });

  it('should keep « Proposer une modification » apart from the link of the name', () => {
    render(<PoseList poses={poses} revisable />);

    const [card] = within(screen.getByRole('list', { name: 'Poses du catalogue' })).getAllByRole('listitem');
    expect(
      within(card!)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/poses/p-1', '/poses/p-1/proposer-une-modification']);
  });
});

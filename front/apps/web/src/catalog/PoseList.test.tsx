import type { PoseSummary } from '@acrofunjam/core';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PoseList } from './PoseList';

const poses: PoseSummary[] = [
  { id: 'p-1', name: 'Throne', baseDifficulty: 'beginner', flyerDifficulty: 'discovery' },
  { id: 'p-2', name: 'High Bird', baseDifficulty: 'intermediate', flyerDifficulty: 'intermediate' },
];

describe('PoseList', () => {
  it('should display each pose with its name, base difficulty and flyer difficulty when poses are given', () => {
    render(<PoseList poses={poses} />);

    const table = screen.getByRole('table', { name: 'Poses du catalogue' });
    const rows = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent));
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Nom',
      'Difficulté base',
      'Difficulté flyer',
    ]);
    expect(rows).toEqual([
      ['Throne', 'débutant', 'découverte'],
      ['High Bird', 'intermédiaire', 'intermédiaire'],
    ]);
  });
});

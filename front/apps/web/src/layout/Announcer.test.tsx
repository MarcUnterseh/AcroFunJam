import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AnnouncerProvider, useAnnounce } from './Announcer';

function Announce({ text }: { readonly text: string }) {
  const announce = useAnnounce();
  return (
    <button type="button" onClick={() => announce(text)}>
      Annoncer
    </button>
  );
}

describe('AnnouncerProvider', () => {
  it('should put a new text node in the live region when the same message is announced again', async () => {
    render(
      <AnnouncerProvider>
        <Announce text="Impossible de charger le catalogue." />
      </AnnouncerProvider>,
    );
    const button = screen.getByRole('button', { name: 'Annoncer' });

    await userEvent.click(button);
    const first = screen.getByRole('status').firstChild;
    await userEvent.click(button);

    expect(screen.getByRole('status')).toHaveTextContent('Impossible de charger le catalogue.');
    expect(screen.getByRole('status').firstChild).not.toBe(first);
  });
});

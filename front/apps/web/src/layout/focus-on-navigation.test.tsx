import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Link, Outlet, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { FocusOnNavigation } from './FocusOnNavigation';

// After a navigation, the focus goes to the title of the new page, unless the address names a part of the page that
// takes it (story 12: back on a transition after adding a video, UX-57).

function Layout() {
  return (
    <>
      <main>
        <Outlet />
      </main>
      <FocusOnNavigation />
    </>
  );
}

function Page({ title, children }: { readonly title: string; readonly children?: React.ReactNode }) {
  return (
    <>
      <h1 tabIndex={-1}>{title}</h1>
      <nav>
        <Link to="/throne">Throne</Link>
        <Link to="/throne#pop-to-bird">Pop to Bird</Link>
        <Link to="/throne#inconnue">Une transition retirée</Link>
        <Link to="/bird">Bird</Link>
      </nav>
      {children}
    </>
  );
}

const open = (path: string) => {
  const router = createMemoryRouter(
    [
      {
        element: <Layout />,
        children: [
          {
            path: '/throne',
            element: (
              <Page title="Throne">
                <h3 id="pop-to-bird" tabIndex={-1}>
                  Pop to Bird
                </h3>
              </Page>
            ),
          },
          { path: '/bird', element: <Page title="Bird" /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return userEvent.setup();
};

describe('FocusOnNavigation', () => {
  it('should leave the focus where it is on the first display', () => {
    open('/throne');

    expect(document.body).toHaveFocus();
  });

  it('should give the focus to the title of the new page after a navigation', async () => {
    const user = open('/bird');

    await user.click(screen.getByRole('link', { name: 'Throne' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Throne' })).toHaveFocus();
  });

  it('should leave the focus to the page when the address names one of its parts', async () => {
    const user = open('/bird');

    await user.click(screen.getByRole('link', { name: 'Pop to Bird' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Throne' })).not.toHaveFocus();
  });

  it('should give the focus to the title of the page when the anchor names nothing on it', async () => {
    const user = open('/bird');

    await user.click(screen.getByRole('link', { name: 'Une transition retirée' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Throne' })).toHaveFocus();
  });

  it('should not move the focus when only the anchor changes', async () => {
    const user = open('/throne');
    const link = screen.getByRole('link', { name: 'Pop to Bird' });

    await user.click(link);

    expect(screen.getByRole('heading', { level: 1, name: 'Throne' })).not.toHaveFocus();
    expect(link).toHaveFocus();
  });
});

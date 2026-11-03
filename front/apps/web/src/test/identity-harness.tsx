import {
  fail,
  ok,
  type AuthFailure,
  type AuthGateway,
  type Result,
  type SessionMemory,
} from '@acrofunjam/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { CatalogGatewayProvider } from '../catalog/CatalogGatewayContext';
import { IdentityProvider } from '../identity/IdentityContext';
import { routes } from '../routes';

export class FakeAuthGateway implements AuthGateway {
  calls: string[] = [];
  account: { email: string } | null = null;
  signInAnswer: Result<void, AuthFailure> = ok(undefined);
  registerAnswer: Result<void, AuthFailure> = ok(undefined);

  async signIn(credentials: { email: string }) {
    this.calls.push('signIn');
    if (this.signInAnswer.ok) this.account = { email: credentials.email };
    return this.signInAnswer;
  }
  async register() {
    this.calls.push('register');
    return this.registerAnswer;
  }
  async signOut() {
    this.calls.push('signOut');
    this.account = null;
    return ok(undefined);
  }
  async currentAccount() {
    return ok(this.account);
  }
  unreachable() {
    this.signInAnswer = fail('unreachable');
  }
}

export class FakeSessionMemory implements SessionMemory {
  hadSession: boolean;
  constructor(hadSession = false) {
    this.hadSession = hadSession;
  }
  wasSignedIn = () => this.hadSession;
  remember = () => {
    this.hadSession = true;
  };
  forget = () => {
    this.hadSession = false;
  };
  onChange = () => () => {};
}

/** Shows the current location, to check where a page navigates to. */
export function CurrentLocation() {
  const location = useLocation();
  return <div aria-label="Adresse courante">{location.pathname + location.search}</div>;
}

/** Renders the whole site (layout + routes) at the given path, with fake adapters. */
export const renderSite = (
  path: string,
  {
    gateway = new FakeAuthGateway(),
    memory = new FakeSessionMemory(),
  }: { gateway?: FakeAuthGateway; memory?: FakeSessionMemory } = {},
  extra?: ReactNode,
) => {
  const router = createMemoryRouter(routes(extra), { initialEntries: [path] });
  const view = render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CatalogGatewayProvider gateway={{ listPublishedPoses: async () => ok([]) }}>
        <IdentityProvider gateway={gateway} memory={memory}>
          <RouterProvider router={router} />
        </IdentityProvider>
      </CatalogGatewayProvider>
    </QueryClientProvider>,
  );
  return { ...view, gateway, memory, router };
};

import {
  createApiClient,
  createAuthGateway,
  createCatalogGateway,
  createContributionGateway,
} from '@acrofunjam/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import 'virtual:tokens.css';
import { CatalogGatewayProvider } from './catalog/CatalogGatewayContext';
import { ContributionProvider } from './contribution/ContributionContext';
import { createSessionProposalInputStore } from './contribution/session-proposal-input-store';
import { IdentityProvider } from './identity/IdentityContext';
import { createLocalSessionMemory } from './identity/local-session-memory';
import { routes } from './routes';
import './index.css';

// Composition root: the adapters of @acrofunjam/api-client are wired here and injected through React contexts.
// Same origin by default (Vite proxy in development): the session cookie is sent automatically (ADR 0011).
const apiClient = createApiClient({ baseUrl: import.meta.env.VITE_API_URL ?? window.location.origin });
const queryClient = new QueryClient();
const router = createBrowserRouter(routes());
// The input of « Proposer une pose » kept in the tab (ADR 0019), forgotten on sign-out (shared device).
const proposalInputStore = createSessionProposalInputStore(sessionStorage);

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <CatalogGatewayProvider gateway={createCatalogGateway(apiClient)}>
        <ContributionProvider gateway={createContributionGateway(apiClient)} store={proposalInputStore}>
          <IdentityProvider
            gateway={createAuthGateway(apiClient)}
            memory={createLocalSessionMemory(localStorage, window)}
            forgetOnSignOut={[proposalInputStore]}
          >
            <RouterProvider router={router} />
          </IdentityProvider>
        </ContributionProvider>
      </CatalogGatewayProvider>
    </QueryClientProvider>
  </StrictMode>,
);

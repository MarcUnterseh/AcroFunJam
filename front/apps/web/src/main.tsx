import {
  createApiClient,
  createAuthGateway,
  createCatalogGateway,
  createContributionGateway,
  createValidationGateway,
} from '@acrofunjam/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import 'virtual:tokens.css';
import { CatalogGatewayProvider } from './catalog/CatalogGatewayContext';
import { ContributionProvider } from './contribution/ContributionContext';
import { createSessionDecisionInputStore } from './contribution/session-decision-input-store';
import { createSessionProposalInputStore } from './contribution/session-proposal-input-store';
import { ValidationProvider } from './contribution/ValidationContext';
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
// The input of the decisions on proposals (story 4), kept and forgotten the same way.
const decisionInputStore = createSessionDecisionInputStore(sessionStorage);

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <CatalogGatewayProvider gateway={createCatalogGateway(apiClient)}>
        <ContributionProvider gateway={createContributionGateway(apiClient)} store={proposalInputStore}>
          <ValidationProvider gateway={createValidationGateway(apiClient)} store={decisionInputStore}>
            <IdentityProvider
              gateway={createAuthGateway(apiClient)}
              memory={createLocalSessionMemory(localStorage, window)}
              forgetOnSignOut={[proposalInputStore, decisionInputStore]}
            >
              <RouterProvider router={router} />
            </IdentityProvider>
          </ValidationProvider>
        </ContributionProvider>
      </CatalogGatewayProvider>
    </QueryClientProvider>
  </StrictMode>,
);

import {
  createApiClient,
  createAuthGateway,
  createCatalogGateway,
  createContributionGateway,
  createPosePageGateway,
  createTagListGateway,
  createTransitionTaggingGateway,
  createPoseRevisionGateway,
  createTransitionProposalGateway,
  createValidationGateway,
} from '@acrofunjam/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
// Self-hosted fonts (ADR 0031): no request to a third party. Figtree for the text, Unbounded for the titles.
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/600.css';
import '@fontsource/figtree/700.css';
import '@fontsource/unbounded/500.css';
import '@fontsource/unbounded/600.css';
import '@fontsource/unbounded/700.css';
import 'virtual:tokens.css';
import { CatalogGatewayProvider } from './catalog/CatalogGatewayContext';
import { PosePageProvider } from './catalog/PosePageContext';
import { TagListProvider } from './catalog/TagListContext';
import { TransitionTaggingProvider } from './catalog/TransitionTaggingContext';
import { ContributionProvider } from './contribution/ContributionContext';
import { createSessionDecisionInputStore } from './contribution/session-decision-input-store';
import { createSessionProposalInputStore } from './contribution/session-proposal-input-store';
import { createSessionRevisionInputStore } from './contribution/session-revision-input-store';
import { PoseRevisionProvider } from './contribution/PoseRevisionContext';
import { createSessionTransitionInputStore } from './contribution/session-transition-input-store';
import { TransitionProposalProvider } from './contribution/TransitionProposalContext';
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
// The input of « Proposer une modification » (story 6), kept by pose and forgotten the same way.
const revisionInputStore = createSessionRevisionInputStore(sessionStorage);
// The input of « Proposer une transition » (story 7), kept by pose of origin and forgotten the same way.
const transitionInputStore = createSessionTransitionInputStore(sessionStorage);

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <CatalogGatewayProvider gateway={createCatalogGateway(apiClient)}>
        <PosePageProvider gateway={createPosePageGateway(apiClient)}>
          <TagListProvider gateway={createTagListGateway(apiClient)}>
            <TransitionTaggingProvider gateway={createTransitionTaggingGateway(apiClient)}>
              <ContributionProvider gateway={createContributionGateway(apiClient)} store={proposalInputStore}>
                <ValidationProvider gateway={createValidationGateway(apiClient)} store={decisionInputStore}>
                  <PoseRevisionProvider
                    gateway={createPoseRevisionGateway(apiClient)}
                    store={revisionInputStore}
                  >
                    <TransitionProposalProvider
                      gateway={createTransitionProposalGateway(apiClient)}
                      store={transitionInputStore}
                    >
                      <IdentityProvider
                        gateway={createAuthGateway(apiClient)}
                        memory={createLocalSessionMemory(localStorage, window)}
                        forgetOnSignOut={[
                          proposalInputStore,
                          decisionInputStore,
                          { clear: revisionInputStore.clearAll },
                          { clear: transitionInputStore.clearAll },
                        ]}
                      >
                        <RouterProvider router={router} />
                      </IdentityProvider>
                    </TransitionProposalProvider>
                  </PoseRevisionProvider>
                </ValidationProvider>
              </ContributionProvider>
            </TransitionTaggingProvider>
          </TagListProvider>
        </PosePageProvider>
      </CatalogGatewayProvider>
    </QueryClientProvider>
  </StrictMode>,
);

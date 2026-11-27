import {
  createApiClient,
  createPosePhotosGateway,
  createTransitionVideosGateway,
  createAuthGateway,
  createCatalogGateway,
  createContributionGateway,
  createPosePageGateway,
  createTagListGateway,
  createPoseTaggingGateway,
  createTransitionTaggingGateway,
  createPoseRevisionGateway,
  createTransitionProposalGateway,
  createValidationGateway,
  createFlowGenerationGateway,
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
import { PoseTaggingProvider } from './catalog/PoseTaggingContext';
import { PosePhotosProvider } from './catalog/PosePhotosContext';
import { browserPhotoInspector, canvasPhotoReducer } from './catalog/browser-photo-adapters';
import { TransitionTaggingProvider } from './catalog/TransitionTaggingContext';
import { browserVideoInspector } from './catalog/browser-video-adapters';
import { TransitionVideosProvider } from './catalog/TransitionVideosContext';
import { ContributionProvider } from './contribution/ContributionContext';
import { createSessionDecisionInputStore } from './contribution/session-decision-input-store';
import { createSessionProposalInputStore } from './contribution/session-proposal-input-store';
import { createSessionRevisionInputStore } from './contribution/session-revision-input-store';
import { PoseRevisionProvider } from './contribution/PoseRevisionContext';
import { createSessionTransitionInputStore } from './contribution/session-transition-input-store';
import { TransitionProposalProvider } from './contribution/TransitionProposalContext';
import { ValidationProvider } from './contribution/ValidationContext';
import { FlowGenerationProvider } from './flow-generation/FlowGenerationContext';
import { IdentityProvider } from './identity/IdentityContext';
import { createLocalSessionMemory } from './identity/local-session-memory';
import { routes } from './routes';
import './index.css';

// Composition root: the adapters of @acrofunjam/api-client are wired here and injected through React contexts.
// Same origin by default (Vite proxy in development): the session cookie is sent automatically (ADR 0011).
const apiBaseUrl = import.meta.env.VITE_API_URL ?? window.location.origin;
const apiClient = createApiClient({ baseUrl: apiBaseUrl });
/** Story 10 (ADR 0039): the photos of the poses, sent with their progress (XMLHttpRequest). */
const posePhotos = {
  gateway: createPosePhotosGateway(apiClient, apiBaseUrl),
  inspector: browserPhotoInspector,
  reducer: canvasPhotoReducer,
};
const queryClient = new QueryClient();
/** Story 12 (ADR 0041): the videos of the transitions, sent with their progress (XMLHttpRequest). */
const transitionVideos = {
  gateway: createTransitionVideosGateway(apiClient, apiBaseUrl),
  inspector: browserVideoInspector,
};
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
              <PoseTaggingProvider gateway={createPoseTaggingGateway(apiClient)}>
                <PosePhotosProvider ports={posePhotos}>
                  <TransitionVideosProvider ports={transitionVideos}>
                    <ContributionProvider
                      gateway={createContributionGateway(apiClient)}
                      store={proposalInputStore}
                    >
                      <ValidationProvider
                        gateway={createValidationGateway(apiClient)}
                        store={decisionInputStore}
                      >
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
                              <FlowGenerationProvider gateway={createFlowGenerationGateway(apiClient)}>
                                <RouterProvider router={router} />
                              </FlowGenerationProvider>
                            </IdentityProvider>
                          </TransitionProposalProvider>
                        </PoseRevisionProvider>
                      </ValidationProvider>
                    </ContributionProvider>
                  </TransitionVideosProvider>
                </PosePhotosProvider>
              </PoseTaggingProvider>
            </TransitionTaggingProvider>
          </TagListProvider>
        </PosePageProvider>
      </CatalogGatewayProvider>
    </QueryClientProvider>
  </StrictMode>,
);

import { createApiClient, createAuthGateway, createCatalogGateway } from '@acrofunjam/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import 'virtual:tokens.css';
import { CatalogGatewayProvider } from './catalog/CatalogGatewayContext';
import { IdentityProvider } from './identity/IdentityContext';
import { createLocalSessionMemory } from './identity/local-session-memory';
import { routes } from './routes';
import './index.css';

// Composition root: the adapters of @acrofunjam/api-client are wired here and injected through React contexts.
// Same origin by default (Vite proxy in development): the session cookie is sent automatically (ADR 0011).
const apiClient = createApiClient({ baseUrl: import.meta.env.VITE_API_URL ?? window.location.origin });
const queryClient = new QueryClient();
const router = createBrowserRouter(routes());

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <CatalogGatewayProvider gateway={createCatalogGateway(apiClient)}>
        <IdentityProvider gateway={createAuthGateway(apiClient)} memory={createLocalSessionMemory(localStorage, window)}>
          <RouterProvider router={router} />
        </IdentityProvider>
      </CatalogGatewayProvider>
    </QueryClientProvider>
  </StrictMode>,
);

import { createApiClient, createCatalogGateway } from '@acrofunjam/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { CatalogGatewayProvider } from './catalog/CatalogGatewayContext';
import './index.css';

// Composition root: the adapters of @acrofunjam/api-client are wired here and injected through React contexts.
// Same origin by default (Vite proxy in development); VITE_API_URL points to another host if needed.
const apiClient = createApiClient({ baseUrl: import.meta.env.VITE_API_URL ?? window.location.origin });
const catalogGateway = createCatalogGateway(apiClient);
const queryClient = new QueryClient();

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <CatalogGatewayProvider gateway={catalogGateway}>
        <App />
      </CatalogGatewayProvider>
    </QueryClientProvider>
  </StrictMode>,
);

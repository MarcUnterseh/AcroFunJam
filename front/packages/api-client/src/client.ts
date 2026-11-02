import createClient from 'openapi-fetch';
import type { paths } from './generated/schema';

export type ApiClientOptions = {
  readonly baseUrl: string;
  readonly fetch?: (request: Request) => Promise<Response>;
};

/** Typed HTTP client of the AcroFunJam API. Only adapters of this package use it: it never leaks into core. */
export const createApiClient = ({ baseUrl, fetch }: ApiClientOptions) =>
  createClient<paths>(fetch ? { baseUrl, fetch } : { baseUrl });

export type ApiClient = ReturnType<typeof createApiClient>;

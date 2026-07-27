/**
 * React Query configuration for Turvo
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Create a new QueryClient instance with auth-aware configuration
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time: 5 minutes - data stays fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Retry failed requests once
        retry: 1,
        // Throw errors to be caught by error boundaries
        throwOnError: false,
        // Refetch on window focus (optional - can be disabled for auth pages)
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
        // Throw errors to be caught by mutation handlers
        throwOnError: false,
      },
    },
  });
}

/**
 * Browser singleton - ensures only one QueryClient instance
 */
let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always create a new instance
    return makeQueryClient();
  } else {
    // Browser: create or reuse existing instance
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}

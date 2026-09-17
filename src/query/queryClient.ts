import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Match registration is idempotent (keyed by matchId), so automatic
      // retries on timeout/5xx are safe and never create duplicates.
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    },
  },
});

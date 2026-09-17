import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App';
import { queryClient } from './query/queryClient';
import { worker } from './mocks/browser';
import { soundManager } from './audio/soundManager';

async function bootstrap() {
  // The challenge requires the ranking/history mocks to keep working in the
  // published build too, so this runs unconditionally (not just in dev).
  await worker.start({ onUnhandledRequest: 'bypass' });

  // Fire-and-forget: decodes every clip up front so the first click/shot
  // isn't the one that pays for the fetch+decode latency. play() no-ops
  // gracefully if a sound is requested before this settles.
  void soundManager.preload();

  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Root element not found');
  }

  createRoot(container).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
}

void bootstrap();

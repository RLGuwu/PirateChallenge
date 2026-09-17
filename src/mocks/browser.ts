import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * Shared between the dev server, the production build (the challenge requires
 * mocks to keep working after deploy) and, indirectly, Playwright - the same
 * worker + handlers run inside whatever real browser drives the app.
 */
export const worker = setupWorker(...handlers);

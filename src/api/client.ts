import axios from 'axios';

/**
 * All ranking/history traffic goes through this instance so MSW can intercept it
 * uniformly and so every call gets the same timeout (needed for the "timeout"
 * network scenario to actually surface as a client-side error).
 */
export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 8000,
});

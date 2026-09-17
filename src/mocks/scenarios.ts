export type NetworkScenario =
  | 'success'
  | 'empty'
  | 'slow'
  | 'variable-latency'
  | 'timeout'
  | 'connection-error'
  | 'error-4xx'
  | 'error-5xx'
  | 'ranking-failure'
  | 'history-failure'
  | 'register-timeout'
  | 'match-end-unavailable';

export const DEFAULT_SCENARIO: NetworkScenario = 'success';

const SCENARIO_KEY = 'pirate-battle:network-scenario';

export interface NetworkScenarioOption {
  value: NetworkScenario;
  label: string;
  description: string;
}

export const NETWORK_SCENARIOS: NetworkScenarioOption[] = [
  { value: 'success', label: 'Success', description: 'Normal responses with realistic latency.' },
  { value: 'empty', label: 'Empty lists', description: 'Ranking and history return zero items.' },
  { value: 'slow', label: 'Slow network', description: 'Every request takes about 2.5s.' },
  {
    value: 'variable-latency',
    label: 'Variable latency',
    description: 'Randomized 0.2-2.2s latency; responses may resolve out of order.',
  },
  { value: 'timeout', label: 'Timeout', description: 'Requests hang until the client gives up (8s).' },
  { value: 'connection-error', label: 'Connection error', description: 'Every request fails as a network error.' },
  { value: 'error-4xx', label: 'HTTP 400', description: 'Every request fails with 400 Bad Request.' },
  { value: 'error-5xx', label: 'HTTP 500', description: 'Every request fails with 500 Internal Server Error.' },
  { value: 'ranking-failure', label: 'Ranking fails', description: 'Only GET /ranking returns a 500.' },
  { value: 'history-failure', label: 'History fails', description: 'Only GET /history returns a 500.' },
  {
    value: 'register-timeout',
    label: 'Register: timeout once',
    description: 'Registering a match hangs on the first attempt, then succeeds on retry (no duplicate).',
  },
  {
    value: 'match-end-unavailable',
    label: 'Register: unavailable once',
    description: 'Registering a match returns 503 once, then succeeds on retry (no duplicate).',
  },
];

export function getScenario(): NetworkScenario {
  try {
    const stored = localStorage.getItem(SCENARIO_KEY);
    return (NETWORK_SCENARIOS.find((option) => option.value === stored)?.value ?? DEFAULT_SCENARIO);
  } catch {
    return DEFAULT_SCENARIO;
  }
}

export function setScenario(scenario: NetworkScenario): void {
  localStorage.setItem(SCENARIO_KEY, scenario);
}

export function resetScenario(): void {
  localStorage.removeItem(SCENARIO_KEY);
}

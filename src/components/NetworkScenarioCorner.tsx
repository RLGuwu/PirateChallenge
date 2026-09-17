import { useState, type ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getScenario, setScenario, resetScenario, NETWORK_SCENARIOS, type NetworkScenario } from '../mocks/scenarios';
import { resetMockData } from '../mocks/db';

/**
 * Tucked into the corner on purpose: this is a QA/dev affordance for the
 * ranking & history mocks, not a player-facing setting. Kept out of Options
 * per request, but the challenge still requires a way to pick a scenario and
 * reset back to the initial state.
 */
export function NetworkScenarioCorner() {
  const [scenario, setScenarioState] = useState<NetworkScenario>(() => getScenario());
  const queryClient = useQueryClient();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as NetworkScenario;
    setScenario(value);
    setScenarioState(value);
  };

  const handleReset = () => {
    resetScenario();
    resetMockData();
    setScenarioState(getScenario());
    void queryClient.invalidateQueries({ queryKey: ['ranking'] });
    void queryClient.invalidateQueries({ queryKey: ['history'] });
  };

  return (
    <div className="network-scenario-corner" title="Network scenario (ranking &amp; history mocks)">
      <select
        className="network-scenario-corner-select"
        value={scenario}
        onChange={handleChange}
        aria-label="Network scenario"
      >
        {NETWORK_SCENARIOS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="network-scenario-corner-reset"
        onClick={handleReset}
        aria-label="Reset network scenario and mock data"
        title="Reset to initial state"
      >
        ↺
      </button>
    </div>
  );
}

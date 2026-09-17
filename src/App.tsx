import { useEffect, useState } from 'react';
import './App.css';
import { MainMenu } from './screens/MainMenu';
import { OptionsScreen } from './screens/OptionsScreen';
import { RankingScreen } from './screens/RankingScreen';
import { GameScreen } from './screens/GameScreen';
import { IslandEditorScreen } from './screens/IslandEditorScreen';
import { cloneGameplayConfig } from './game/config';
import type { GameplayConfig } from './game/types';
import { loadGameplayOptions, saveGameplayOptions } from './game/options';
import { loadIslandLayout } from './game/islandLayout';
import { loadPendingMatch, clearPendingMatch } from './api/pendingMatch';
import { useRegisterMatchMutation } from './query/useRegisterMatchMutation';
import { NetworkScenarioCorner } from './components/NetworkScenarioCorner';

type Screen = 'menu' | 'options' | 'ranking' | 'history' | 'game' | 'islands';

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [sessionSeconds, setSessionSecondsState] = useState(() => loadGameplayOptions().sessionSeconds);
  const [spawnSeconds, setSpawnSecondsState] = useState(() => loadGameplayOptions().spawnSeconds);
  const [activeMatchConfig, setActiveMatchConfig] = useState<GameplayConfig | null>(null);
  const recoverPendingMatch = useRegisterMatchMutation();

  const setSessionSeconds = (value: number) => {
    setSessionSecondsState(value);
    saveGameplayOptions({ sessionSeconds: value, spawnSeconds });
  };

  const setSpawnSeconds = (value: number) => {
    setSpawnSecondsState(value);
    saveGameplayOptions({ sessionSeconds, spawnSeconds: value });
  };

  // A match result already saved to disk (see api/pendingMatch) but never
  // confirmed by the server - e.g. the tab was closed mid-timeout - gets one
  // more attempt on the next app load. Registration is idempotent by
  // matchId, so this can never create a duplicate.
  useEffect(() => {
    const pending = loadPendingMatch();
    if (!pending) return;
    recoverPendingMatch.mutate(pending, {
      onSuccess: () => clearPendingMatch(pending.matchId),
    });
    // Only ever run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startMatch = () => {
    // Snapshot the current options into a fresh config object: changes made
    // afterwards in Options must not affect a match already in progress.
    setActiveMatchConfig(
      cloneGameplayConfig({
        matchDurationSeconds: sessionSeconds,
        enemySpawnIntervalSeconds: spawnSeconds,
        islands: loadIslandLayout(),
      }),
    );
    setScreen('game');
  };

  let screenContent;
  if (screen === 'game' && activeMatchConfig) {
    screenContent = <GameScreen config={activeMatchConfig} onExit={() => setScreen('menu')} />;
  } else if (screen === 'options') {
    screenContent = (
      <OptionsScreen
        sessionSeconds={sessionSeconds}
        spawnSeconds={spawnSeconds}
        onSessionSecondsChange={setSessionSeconds}
        onSpawnSecondsChange={setSpawnSeconds}
        onBack={() => setScreen('menu')}
      />
    );
  } else if (screen === 'ranking' || screen === 'history') {
    screenContent = (
      <RankingScreen
        initialTab={screen}
        config={{ matchDurationSeconds: sessionSeconds, enemySpawnIntervalSeconds: spawnSeconds }}
        onBack={() => setScreen('menu')}
      />
    );
  } else if (screen === 'islands') {
    screenContent = <IslandEditorScreen onBack={() => setScreen('menu')} />;
  } else {
    screenContent = (
      <MainMenu
        onPlay={startMatch}
        onOptions={() => setScreen('options')}
        onRanking={() => setScreen('ranking')}
        onMatchHistory={() => setScreen('history')}
        onIslandEditor={() => setScreen('islands')}
      />
    );
  }

  return (
    <>
      {screenContent}
      <NetworkScenarioCorner />
    </>
  );
}

export default App;

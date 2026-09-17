import { PanelScreen } from '../components/PanelScreen';
import { PrimaryButton } from '../components/PrimaryButton';
import { RoundButton } from '../components/RoundButton';
import icon_minus from '../assets/png/default/ui/controls/icon_minus.png';
import icon_plus from '../assets/png/default/ui/controls/icon_plus.png';
import {
  SESSION_SECONDS_MIN,
  SESSION_SECONDS_MAX,
  SESSION_SECONDS_STEP,
  SPAWN_SECONDS_MIN,
  SPAWN_SECONDS_MAX,
  SPAWN_SECONDS_STEP,
} from '../game/config';

interface OptionsScreenProps {
  sessionSeconds: number;
  spawnSeconds: number;
  onSessionSecondsChange: (value: number) => void;
  onSpawnSecondsChange: (value: number) => void;
  onBack: () => void;
}

export function OptionsScreen({
  sessionSeconds,
  spawnSeconds,
  onSessionSecondsChange,
  onSpawnSecondsChange,
  onBack,
}: OptionsScreenProps) {
  const decreaseSessionSeconds = () => {
    onSessionSecondsChange(Math.max(SESSION_SECONDS_MIN, sessionSeconds - SESSION_SECONDS_STEP));
  };

  const increaseSessionSeconds = () => {
    onSessionSecondsChange(Math.min(SESSION_SECONDS_MAX, sessionSeconds + SESSION_SECONDS_STEP));
  };

  const decreaseSpawnSeconds = () => {
    onSpawnSecondsChange(Math.max(SPAWN_SECONDS_MIN, spawnSeconds - SPAWN_SECONDS_STEP));
  };

  const increaseSpawnSeconds = () => {
    onSpawnSecondsChange(Math.min(SPAWN_SECONDS_MAX, spawnSeconds + SPAWN_SECONDS_STEP));
  };

  return (
    <PanelScreen>
      <h1 className="options-title">OPTIONS</h1>
      <p className="options-description">Game session time</p>
      <div className="stepper">
        <RoundButton
          icon={icon_minus}
          alt="Decrease session time"
          onClick={decreaseSessionSeconds}
          disabled={sessionSeconds <= SESSION_SECONDS_MIN}
        />
        <span className="stepper-value">{sessionSeconds} s</span>
        <RoundButton
          icon={icon_plus}
          alt="Increase session time"
          onClick={increaseSessionSeconds}
          disabled={sessionSeconds >= SESSION_SECONDS_MAX}
        />
      </div>
      <p className="options-description">Enemy spawn time</p>
      <div className="stepper">
        <RoundButton
          icon={icon_minus}
          alt="Decrease enemy spawn time"
          onClick={decreaseSpawnSeconds}
          disabled={spawnSeconds <= SPAWN_SECONDS_MIN}
        />
        <span className="stepper-value">{spawnSeconds} s</span>
        <RoundButton
          icon={icon_plus}
          alt="Increase enemy spawn time"
          onClick={increaseSpawnSeconds}
          disabled={spawnSeconds >= SPAWN_SECONDS_MAX}
        />
      </div>

      <PrimaryButton label="MAIN MENU" onClick={onBack} sound="uiBack" />
    </PanelScreen>
  );
}

import { PanelScreen } from '../components/PanelScreen';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import title_pirate_battle from '../assets/images/title_pirate_battle.png';

interface MainMenuProps {
  onPlay: () => void;
  onOptions: () => void;
  onRanking: () => void;
  onMatchHistory: () => void;
  onIslandEditor: () => void;
}

export function MainMenu({ onPlay, onOptions, onRanking, onMatchHistory, onIslandEditor }: MainMenuProps) {
  return (
    <PanelScreen>
      <img src={title_pirate_battle} alt="Pirate Battle" />
      <p className="menu-tagline">Set sail. Take command.</p>
      <div className="button-column">
        <PrimaryButton label="PLAY" onClick={onPlay} />
        <PrimaryButton label="OPTIONS" onClick={onOptions} sound="uiOpen" />
      </div>
      <p className="options-description">Navigate the islands. Survive the battle.</p>
      <div className="button-row">
        <SecondaryButton label="RANKING" onClick={onRanking} sound="uiOpen" />
        <SecondaryButton label="MATCH HISTORY" onClick={onMatchHistory} sound="uiOpen" />
        <SecondaryButton label="ISLAND EDITOR" onClick={onIslandEditor} sound="uiOpen" />
      </div>
    </PanelScreen>
  );
}

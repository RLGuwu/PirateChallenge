import { useState } from 'react';
import button_secondary_normal from '../assets/images/button_secondary_normal.png';
import button_secondary_pressed from '../assets/images/button_secondary_pressed.png';
import { soundManager } from '../audio/soundManager';
import type { SoundKey } from '../audio/sounds';

interface SecondaryButtonProps {
  label: string;
  onClick?: () => void;
  /** Click sound to play; pass `null` to suppress it (e.g. when the action already plays its own, more specific sound). Defaults to 'uiClick'. */
  sound?: SoundKey | null;
}

export function SecondaryButton({ label, onClick, sound = 'uiClick' }: SecondaryButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const image = isPressed ? button_secondary_pressed : button_secondary_normal;

  return (
    <button
      type="button"
      className="button-wrapper secondary-button-wrapper"
      onClick={() => {
        if (sound) soundManager.play(sound);
        onClick?.();
      }}
      onMouseEnter={() => soundManager.play('uiHover')}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      <img src={image} alt="" />
      <span className="button-text secondary-button-text">{label}</span>
    </button>
  );
}

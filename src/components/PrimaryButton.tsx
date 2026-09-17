import { useState } from 'react';
import button_normal from '../assets/images/button_primary_normal.png';
import button_hover from '../assets/images/button_primary_hover.png';
import button_pressed from '../assets/images/button_primary_pressed.png';
import { soundManager } from '../audio/soundManager';
import type { SoundKey } from '../audio/sounds';

interface PrimaryButtonProps {
  label: string;
  onClick?: () => void;
  /** Click sound to play; pass `null` to suppress it (e.g. when the action already plays its own, more specific sound). Defaults to 'uiClick'. */
  sound?: SoundKey | null;
}

export function PrimaryButton({ label, onClick, sound = 'uiClick' }: PrimaryButtonProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const image = isPressed ? button_pressed : isHovering ? button_hover : button_normal;

  return (
    <button
      type="button"
      className="button-wrapper"
      onClick={() => {
        if (sound) soundManager.play(sound);
        onClick?.();
      }}
      onMouseEnter={() => {
        setIsHovering(true);
        soundManager.play('uiHover');
      }}
      onMouseLeave={() => {
        setIsHovering(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
    >
      <img src={image} alt="" />
      <span className="button-text primary-button-text">{label}</span>
    </button>
  );
}

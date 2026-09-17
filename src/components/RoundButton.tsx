import { useState } from 'react';
import button_round_normal from '../assets/png/default/ui/controls/button_round_normal.png';
import button_round_hover from '../assets/png/default/ui/controls/button_round_hover.png';
import button_round_pressed from '../assets/png/default/ui/controls/button_round_pressed.png';
import { soundManager } from '../audio/soundManager';

interface RoundButtonProps {
  icon: string;
  alt: string;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'default' | 'small';
}

export function RoundButton({ icon, alt, onClick, disabled = false, size = 'default' }: RoundButtonProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const image = isPressed ? button_round_pressed : isHovering ? button_round_hover : button_round_normal;

  return (
    <button
      type="button"
      className={size === 'small' ? 'round-button round-button-small' : 'round-button'}
      disabled={disabled}
      onClick={() => {
        soundManager.play('uiClick');
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
      <img className="round-button-bg" src={image} alt="" />
      <img className="round-button-icon" src={icon} alt={alt} />
    </button>
  );
}

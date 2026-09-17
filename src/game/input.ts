import type { InputState } from './types';

type ActionKey = keyof InputState;

const KEY_BINDINGS: Record<string, ActionKey> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'fireFront',
  KeyQ: 'fireLeft',
  KeyE: 'fireRight',
};

/**
 * Tracks the currently held movement/attack actions from keyboard and touch
 * sources. Keyboard listeners are only attached while `attach()` has been
 * called (i.e. while the gameplay screen is mounted) and are fully removed
 * by `detach()`, so game keys never leak into menus.
 */
export class InputController {
  private state: InputState = {
    forward: false,
    left: false,
    right: false,
    fireFront: false,
    fireLeft: false,
    fireRight: false,
  };

  private onPauseToggle: (() => void) | null = null;

  private handleKeyDown = (event: KeyboardEvent): void => {
    const action = KEY_BINDINGS[event.code];
    if (action) {
      event.preventDefault();
      this.state[action] = true;
      return;
    }
    if (event.code === 'Escape' || event.code === 'KeyP') {
      event.preventDefault();
      this.onPauseToggle?.();
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    const action = KEY_BINDINGS[event.code];
    if (action) {
      event.preventDefault();
      this.state[action] = false;
    }
  };

  private handleBlur = (): void => {
    this.resetHeldActions();
  };

  attach(onPauseToggle: () => void): void {
    this.onPauseToggle = onPauseToggle;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  detach(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    this.onPauseToggle = null;
    this.resetHeldActions();
  }

  /** Used by on-screen touch controls to set a single action's held state. */
  setAction(action: ActionKey, isActive: boolean): void {
    this.state[action] = isActive;
  }

  resetHeldActions(): void {
    this.state = {
      forward: false,
      left: false,
      right: false,
      fireFront: false,
      fireLeft: false,
      fireRight: false,
    };
  }

  snapshot(): InputState {
    return { ...this.state };
  }
}

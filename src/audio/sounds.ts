import cannonBroadsideUrl from '../assets/sounds/cannon_broadside.wav';
import cannonFire1Url from '../assets/sounds/cannon_fire_1.wav';
import cannonFire2Url from '../assets/sounds/cannon_fire_2.wav';
import cannonFire3Url from '../assets/sounds/cannon_fire_3.wav';
import cannonballWater1Url from '../assets/sounds/cannonball_water_hit_1.wav';
import cannonballWater2Url from '../assets/sounds/cannonball_water_hit_2.wav';
import gameCompleteUrl from '../assets/sounds/game_complete.wav';
import gameOverUrl from '../assets/sounds/game_over.wav';
import gamePauseUrl from '../assets/sounds/game_pause.wav';
import gameResumeUrl from '../assets/sounds/game_resume.wav';
import gameStartUrl from '../assets/sounds/game_start.wav';
import healthLowUrl from '../assets/sounds/health_low.wav';
import oceanAmbienceLoopUrl from '../assets/sounds/ocean_ambience_loop.wav';
import scorePointUrl from '../assets/sounds/score_point.wav';
import shipCollisionUrl from '../assets/sounds/ship_collision.wav';
import shipExplosion1Url from '../assets/sounds/ship_explosion_1.wav';
import shipExplosion2Url from '../assets/sounds/ship_explosion_2.wav';
import uiBackUrl from '../assets/sounds/ui_back.wav';
import uiClickUrl from '../assets/sounds/ui_click.wav';
import uiCloseUrl from '../assets/sounds/ui_close.wav';
import uiHoverUrl from '../assets/sounds/ui_hover.wav';
import uiOpenUrl from '../assets/sounds/ui_open.wav';

export const SOUND_URLS = {
  cannonBroadside: cannonBroadsideUrl,
  cannonFire1: cannonFire1Url,
  cannonFire2: cannonFire2Url,
  cannonFire3: cannonFire3Url,
  cannonballWater1: cannonballWater1Url,
  cannonballWater2: cannonballWater2Url,
  gameComplete: gameCompleteUrl,
  gameOver: gameOverUrl,
  gamePause: gamePauseUrl,
  gameResume: gameResumeUrl,
  gameStart: gameStartUrl,
  healthLow: healthLowUrl,
  oceanAmbienceLoop: oceanAmbienceLoopUrl,
  scorePoint: scorePointUrl,
  shipCollision: shipCollisionUrl,
  shipExplosion1: shipExplosion1Url,
  shipExplosion2: shipExplosion2Url,
  uiBack: uiBackUrl,
  uiClick: uiClickUrl,
  uiClose: uiCloseUrl,
  uiHover: uiHoverUrl,
  uiOpen: uiOpenUrl,
} as const;

export type SoundKey = keyof typeof SOUND_URLS;

/** Sounds that pick the next clip round-robin instead of always playing the same one. */
export const CANNON_FIRE_CYCLE: SoundKey[] = ['cannonFire1', 'cannonFire2', 'cannonFire3'];
export const CANNONBALL_WATER_CYCLE: SoundKey[] = ['cannonballWater1', 'cannonballWater2'];
export const SHIP_EXPLOSION_CYCLE: SoundKey[] = ['shipExplosion1', 'shipExplosion2'];

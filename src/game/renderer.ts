import { Application, Assets, Container, Graphics, Sprite, Texture, TilingSprite } from 'pixi.js';
import type { GameplayConfig, MatchState, Ship, ShipKind, Vector2 } from './types';
import { HEALTH_RATIO_GREEN_THRESHOLD, HEALTH_RATIO_AMBER_THRESHOLD } from './config';

import hullLarge1Url from '../assets/png/default/ship_parts/hull_large_1.png';
import hullLarge2Url from '../assets/png/default/ship_parts/hull_large_2.png';
import hullLarge3Url from '../assets/png/default/ship_parts/hull_large_3.png';
import hullLarge4Url from '../assets/png/default/ship_parts/hull_large_4.png';
import sailPlayerPlainUrl from '../assets/png/default/ship_parts/sail_large_1.png';
import sailPlayerWornUrl from '../assets/png/default/ship_parts/sail_large_19.png';
import sailChaserHealthyUrl from '../assets/png/default/ship_parts/sail_large_10.png';
import sailChaserDamagedUrl from '../assets/png/default/ship_parts/sail_large_4.png';
import sailChaserCriticalUrl from '../assets/png/default/ship_parts/sail_large_22.png';
import sailChaserWreckUrl from '../assets/png/default/ship_parts/sail_large_16.png';
import sailShooterHealthyUrl from '../assets/png/default/ship_parts/sail_large_11.png';
import sailShooterDamagedUrl from '../assets/png/default/ship_parts/sail_large_5.png';
import sailShooterCriticalUrl from '../assets/png/default/ship_parts/sail_large_23.png';
import sailShooterWreckUrl from '../assets/png/default/ship_parts/sail_large_17.png';
import sailChargerHealthyUrl from '../assets/png/default/ship_parts/sail_large_12.png';
import sailChargerDamagedUrl from '../assets/png/default/ship_parts/sail_large_6.png';
import sailChargerCriticalUrl from '../assets/png/default/ship_parts/sail_large_24.png';
import projectileUrl from '../assets/png/default/ship_parts/cannon_ball.png';
import explosion1Url from '../assets/png/default/effects/explosion_1.png';
import explosion2Url from '../assets/png/default/effects/explosion_2.png';
import explosion3Url from '../assets/png/default/effects/explosion_3.png';
import fire1Url from '../assets/png/default/effects/fire_1.png';
import fire2Url from '../assets/png/default/effects/fire_2.png';
import crew1Url from '../assets/png/default/ship_parts/crew_1.png';
import crew2Url from '../assets/png/default/ship_parts/crew_2.png';
import crew3Url from '../assets/png/default/ship_parts/crew_3.png';
import crew4Url from '../assets/png/default/ship_parts/crew_4.png';
import crew5Url from '../assets/png/default/ship_parts/crew_5.png';
import crew6Url from '../assets/png/default/ship_parts/crew_6.png';
import debrisWood1Url from '../assets/png/default/ship_parts/wood_1.png';
import debrisWood2Url from '../assets/png/default/ship_parts/wood_2.png';
import debrisWood3Url from '../assets/png/default/ship_parts/wood_3.png';
import debrisWood4Url from '../assets/png/default/ship_parts/wood_4.png';
import nestUrl from '../assets/png/default/ship_parts/nest.png';
import flagPlayerUrl from '../assets/png/default/ship_parts/flag_1.png';
import flagChaserUrl from '../assets/png/default/ship_parts/flag_4.png';
import flagShooterUrl from '../assets/png/default/ship_parts/flag_5.png';
import flagChargerUrl from '../assets/png/default/ship_parts/flag_6.png';
import bowSailChaserUrl from '../assets/png/default/ship_parts/sail_small_8.png';
import bowSailShooterUrl from '../assets/png/default/ship_parts/sail_small_9.png';
import bowSailChargerUrl from '../assets/png/default/ship_parts/sail_small_10.png';
import waterTileUrl from '../assets/png/retina/tiles/tile_73.png';
import { ISLAND_TILE_URLS, buildIslandContainer } from './islandTiles';
import enemyHealthFrameUrl from '../assets/png/default/ui/hud/enemy_health_frame.png';
import enemyHealthFillGreenUrl from '../assets/png/default/ui/hud/enemy_health_fill_green.png';
import enemyHealthFillRedUrl from '../assets/png/default/ui/hud/enemy_health_fill_red.png';
import healthFillAmberUrl from '../assets/png/default/ui/hud/health_fill_amber.png';

const TEXTURE_URLS = {
  hullLarge1: hullLarge1Url,
  hullLarge2: hullLarge2Url,
  hullLarge3: hullLarge3Url,
  hullLarge4: hullLarge4Url,
  sailPlayerPlain: sailPlayerPlainUrl,
  sailPlayerWorn: sailPlayerWornUrl,
  sailChaserHealthy: sailChaserHealthyUrl,
  sailChaserDamaged: sailChaserDamagedUrl,
  sailChaserCritical: sailChaserCriticalUrl,
  sailChaserWreck: sailChaserWreckUrl,
  sailShooterHealthy: sailShooterHealthyUrl,
  sailShooterDamaged: sailShooterDamagedUrl,
  sailShooterCritical: sailShooterCriticalUrl,
  sailShooterWreck: sailShooterWreckUrl,
  sailChargerHealthy: sailChargerHealthyUrl,
  sailChargerDamaged: sailChargerDamagedUrl,
  sailChargerCritical: sailChargerCriticalUrl,
  projectile: projectileUrl,
  explosion1: explosion1Url,
  explosion2: explosion2Url,
  explosion3: explosion3Url,
  fire1: fire1Url,
  fire2: fire2Url,
  crew1: crew1Url,
  crew2: crew2Url,
  crew3: crew3Url,
  crew4: crew4Url,
  crew5: crew5Url,
  crew6: crew6Url,
  debrisWood1: debrisWood1Url,
  debrisWood2: debrisWood2Url,
  debrisWood3: debrisWood3Url,
  debrisWood4: debrisWood4Url,
  nest: nestUrl,
  flagPlayer: flagPlayerUrl,
  flagChaser: flagChaserUrl,
  flagShooter: flagShooterUrl,
  flagCharger: flagChargerUrl,
  bowSailChaser: bowSailChaserUrl,
  bowSailShooter: bowSailShooterUrl,
  bowSailCharger: bowSailChargerUrl,
  waterTile: waterTileUrl,
  ...ISLAND_TILE_URLS,
  enemyHealthFrame: enemyHealthFrameUrl,
  enemyHealthFillGreen: enemyHealthFillGreenUrl,
  enemyHealthFillRed: enemyHealthFillRedUrl,
  healthFillAmber: healthFillAmberUrl,
} as const;

type TextureKey = keyof typeof TEXTURE_URLS;

/** A ship is built from a separate hull + sail sprite so both can be swapped independently as it takes damage. */
type HealthTier = 'healthy' | 'damaged' | 'critical' | 'wreck';

function healthTierFor(ratio: number, alive: boolean): HealthTier {
  if (!alive) return 'wreck';
  if (ratio > HEALTH_RATIO_GREEN_THRESHOLD) return 'healthy';
  if (ratio > HEALTH_RATIO_AMBER_THRESHOLD) return 'damaged';
  return 'critical';
}

const HULL_TEXTURE_BY_TIER: Record<HealthTier, TextureKey> = {
  healthy: 'hullLarge1',
  damaged: 'hullLarge2',
  critical: 'hullLarge3',
  wreck: 'hullLarge4',
};

/**
 * Each ship kind keeps its own sail colour/emblem (blank for the player,
 * crossed swords for the chaser, a horse head for the shooter) across every
 * tier; only the player reuses one "worn" sail for both damaged and
 * critical since the pack only ships one faded variant of a blank sail.
 */
const SAIL_TEXTURE_BY_KIND_TIER: Record<ShipKind, Record<HealthTier, TextureKey>> = {
  player: {
    healthy: 'sailPlayerPlain',
    damaged: 'sailPlayerWorn',
    critical: 'sailPlayerWorn',
    wreck: 'sailPlayerWorn',
  },
  chaser: {
    healthy: 'sailChaserHealthy',
    damaged: 'sailChaserDamaged',
    critical: 'sailChaserCritical',
    wreck: 'sailChaserWreck',
  },
  shooter: {
    healthy: 'sailShooterHealthy',
    damaged: 'sailShooterDamaged',
    critical: 'sailShooterCritical',
    wreck: 'sailShooterWreck',
  },
  charger: {
    healthy: 'sailChargerHealthy',
    damaged: 'sailChargerDamaged',
    critical: 'sailChargerCritical',
    // No dedicated wreck sail was provided for this kind - reuse the same
    // faded look as its critical tier, same precedent as the player's sail.
    wreck: 'sailChargerCritical',
  },
};

/** The flag flying from each ship kind's crow's nest, matching its sail colour. */
const FLAG_TEXTURE_BY_KIND: Record<ShipKind, TextureKey> = {
  player: 'flagPlayer',
  chaser: 'flagChaser',
  shooter: 'flagShooter',
  charger: 'flagCharger',
};

/** A small bow sail, just above the porthole near the tip - one per enemy faction colour. The player doesn't get one. */
const BOW_SAIL_TEXTURE_BY_KIND: Partial<Record<ShipKind, TextureKey>> = {
  chaser: 'bowSailChaser',
  shooter: 'bowSailShooter',
  charger: 'bowSailCharger',
};

interface ShipVisual {
  container: Container;
  /** Rotates with the ship's heading; holds the hull, sail and fire sprites. */
  hullGroup: Container;
  hullSprite: Sprite;
  sailSprite: Sprite;
  /** Only set for enemies: the player's health lives in the HUD instead. */
  enemyHealthFrame?: Sprite;
  enemyHealthFill?: Sprite;
  enemyHealthFillMask?: Graphics;
  fireSprite: Sprite;
  fireAnimationAge: number;
  tier: HealthTier;
}

interface TransientEffect {
  sprite: Graphics | Sprite;
  age: number;
  durationSeconds: number;
  velocity?: Vector2;
  onTick: (effect: TransientEffect) => void;
}

/** Fixed zoom level: the camera follows the player instead of fitting the whole (now much larger) arena on screen. */
const CAMERA_SCALE = 0.85;
const HEALTH_BAR_OFFSET_Y = -46;
const ENEMY_HEALTH_BAR_WIDTH = 60;
const EXPLOSION_FRAME_DURATION = 0.15;
const FLASH_DURATION = 0.12;
const HIT_IMPACT_DURATION = 0.25;
const FIRE_FRAME_DURATION = 0.25;
const FIRE_HEALTH_RATIO_THRESHOLD = 0.5;
const CREW_BURST_DURATION = 0.9;
const CREW_BURST_COUNT = 3;
const DEBRIS_DURATION = 3.2;
/** The nest/flag art is tiny (20x18 / 6x22px) next to the hull - scaled up a bit past the hull's own pixel density so it actually reads. */
const NEST_FLAG_SCALE_MULTIPLIER = 1.8;
/** Fraction of the hull's height, from centre, toward the bow - positions the small bow sail just above the porthole near the tip. */
const BOW_SAIL_POSITION_RATIO = 0.28;

export class PixiRenderer {
  private app = new Application();
  private textures: Partial<Record<TextureKey, Texture>> = {};
  private explosionFrames: Texture[] = [];
  private crewTextures: Texture[] = [];
  private debrisTextures: Texture[] = [];
  private worldLayer = new Container();
  private shipLayer = new Container();
  private projectileLayer = new Container();
  private effectLayer = new Container();
  private shipVisuals = new Map<number, ShipVisual>();
  private projectileSprites = new Map<number, Sprite>();
  private explodedShipIds = new Set<number>();
  private effects: TransientEffect[] = [];
  private config: GameplayConfig | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private ready = false;
  private destroyRequested = false;
  private lastPlayerPosition: Vector2 = { x: 0, y: 0 };

  get isReady(): boolean {
    return this.ready;
  }

  async init(
    container: HTMLDivElement,
    config: GameplayConfig,
    onProgress?: (fraction: number) => void,
  ): Promise<void> {
    this.config = config;
    this.lastPlayerPosition = { x: config.arenaWidth / 2, y: config.arenaHeight / 2 };

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 540;

    await this.app.init({
      width,
      height,
      background: '#1c4f72',
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });

    // React StrictMode mounts, unmounts and remounts effects in development;
    // if destroy() was requested while app.init() was still in flight above,
    // finish tearing down now instead of continuing to build a scene nobody
    // will see (and instead of calling app.destroy() mid-init, which throws).
    if (this.destroyRequested) {
      this.app.destroy({ removeView: true }, { children: true });
      return;
    }

    container.appendChild(this.app.canvas);

    const loaded = (await Assets.load(
      Object.entries(TEXTURE_URLS).map(([alias, src]) => ({ alias, src })),
      onProgress,
    )) as Record<TextureKey, Texture>;

    if (this.destroyRequested) {
      this.app.destroy({ removeView: true }, { children: true });
      return;
    }

    this.textures = loaded;
    this.explosionFrames = [loaded.explosion1, loaded.explosion2, loaded.explosion3];
    this.crewTextures = [
      loaded.crew1,
      loaded.crew2,
      loaded.crew3,
      loaded.crew4,
      loaded.crew5,
      loaded.crew6,
    ];
    this.debrisTextures = [loaded.debrisWood1, loaded.debrisWood2, loaded.debrisWood3, loaded.debrisWood4];

    this.drawWater(config);
    this.drawIslands(config);
    this.worldLayer.addChild(this.shipLayer, this.projectileLayer, this.effectLayer);
    this.app.stage.addChild(this.worldLayer);

    this.resize(width, height);
    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      this.resize(entry.contentRect.width, entry.contentRect.height);
    });
    this.resizeObserver.observe(container);

    this.ready = true;
  }

  private static readonly TILE_WORLD_SIZE = 64;

  private drawWater(config: GameplayConfig): void {
    const texture = this.textures.waterTile;
    if (!texture) return;
    const water = new TilingSprite({ texture, width: config.arenaWidth, height: config.arenaHeight });
    const tileScale = PixiRenderer.TILE_WORLD_SIZE / texture.width;
    water.tileScale.set(tileScale);
    this.worldLayer.addChild(water);
  }

  private drawIslands(config: GameplayConfig): void {
    config.islands.forEach((island, index) => {
      this.worldLayer.addChild(buildIslandContainer(island.x, island.y, island.halfSize, this.textures, index));
    });
  }

  private resize(width: number, height: number): void {
    if (!this.config || width <= 0 || height <= 0) return;
    this.app.renderer.resize(width, height);
    this.worldLayer.scale.set(CAMERA_SCALE);
    // The world just got a different amount of screen to show; re-centre on
    // wherever the player currently is instead of waiting for the next tick.
    this.updateCamera(this.lastPlayerPosition);
  }

  /** Keeps `position` centred on screen - called every frame with the player's ship position. */
  private updateCamera(position: Vector2): void {
    this.lastPlayerPosition = position;
    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;
    this.worldLayer.position.set(
      screenWidth / 2 - position.x * CAMERA_SCALE,
      screenHeight / 2 - position.y * CAMERA_SCALE,
    );
  }

  private ensureShipVisual(ship: Ship): ShipVisual {
    const existing = this.shipVisuals.get(ship.id);
    if (existing) return existing;

    const hullGroup = new Container();

    // All hull_large/sail_large art shares the same pixel dimensions across
    // every tier, so the scale and the sail's position relative to the hull
    // only need computing once here - swapping tiers later is just a
    // texture change, no re-layout.
    const hullTexture = this.textures.hullLarge1;
    const desiredSize = (this.config?.shipRadius ?? 30) * 2.4;
    const scale = hullTexture ? desiredSize / hullTexture.width : 1;

    const hullSprite = new Sprite(hullTexture);
    hullSprite.anchor.set(0.5);
    hullSprite.scale.set(scale);
    hullGroup.addChild(hullSprite);

    const sailKey = SAIL_TEXTURE_BY_KIND_TIER[ship.kind].healthy;
    const sailTexture = this.textures[sailKey];
    const sailSprite = new Sprite(sailTexture);
    sailSprite.anchor.set(0.5);
    sailSprite.scale.set(scale);
    if (hullTexture && sailTexture) {
      // The sail hangs from the crossbeam near the hull's stern (the top of
      // the source art, ~35% down from the hull's own centre).
      sailSprite.position.set(0, scale * (hullTexture.height * -0.35 + sailTexture.height / 2));
    }
    hullGroup.addChild(sailSprite);

    // On top of the sail so it reads as "the sail is on fire", not the hull.
    const fireSprite = new Sprite(this.textures.fire1);
    fireSprite.anchor.set(0.5, 0.5);
    fireSprite.position.copyFrom(sailSprite.position);
    if (sailTexture) {
      fireSprite.scale.set((sailTexture.width * 0.4) / fireSprite.texture.width);
    }
    fireSprite.visible = false;
    hullGroup.addChild(fireSprite);

    // Crow's nest above the sail (further out along the mast, past the
    // sail's own top edge), with the ship's faction colour flying out of it
    // - nest sprite first (bottom), flag sprite after (on top), both centred
    // on the same spot so the flag reads as flying out of the nest.
    const nestTexture = this.textures.nest;
    const flagTexture = this.textures[FLAG_TEXTURE_BY_KIND[ship.kind]];
    if (sailTexture && nestTexture) {
      const nestScale = scale * NEST_FLAG_SCALE_MULTIPLIER;
      const nestCenterY = sailSprite.position.y - scale * (sailTexture.height / 2) - nestTexture.height * nestScale * 0.5;

      const nestSprite = new Sprite(nestTexture);
      nestSprite.anchor.set(0.5);
      nestSprite.scale.set(nestScale);
      nestSprite.position.set(0, nestCenterY);
      hullGroup.addChild(nestSprite);

      if (flagTexture) {
        const flagSprite = new Sprite(flagTexture);
        flagSprite.anchor.set(0.5);
        flagSprite.scale.set(nestScale);
        flagSprite.position.set(0, nestCenterY-26);
        hullGroup.addChild(flagSprite);
      }
    }

    // A small second sail at the bow, just above the porthole near the tip -
    // one per enemy faction colour; the player doesn't get one.
    const bowSailKey = BOW_SAIL_TEXTURE_BY_KIND[ship.kind];
    const bowSailTexture = bowSailKey ? this.textures[bowSailKey] : undefined;
    if (hullTexture && bowSailTexture) {
      const bowSailSprite = new Sprite(bowSailTexture);
      bowSailSprite.anchor.set(0.5);
      bowSailSprite.scale.set(scale);
      bowSailSprite.position.set(0, hullTexture.height * BOW_SAIL_POSITION_RATIO * scale);
      hullGroup.addChild(bowSailSprite);
    }

    const container = new Container();
    container.addChild(hullGroup);

    const visual: ShipVisual = {
      container,
      hullGroup,
      hullSprite,
      sailSprite,
      fireSprite,
      fireAnimationAge: 0,
      tier: 'healthy',
    };

    // Only enemies get a health bar above their hull; the player's health
    // is shown exclusively in the top-left HUD panel.
    if (ship.kind !== 'player') {
      const frameTexture = this.textures.enemyHealthFrame;
      const barScale = frameTexture ? ENEMY_HEALTH_BAR_WIDTH / frameTexture.width : 1;

      const enemyHealthFrame = new Sprite(frameTexture);
      enemyHealthFrame.anchor.set(0.5, 0);
      enemyHealthFrame.scale.set(barScale);
      enemyHealthFrame.position.set(0, HEALTH_BAR_OFFSET_Y);

      const enemyHealthFill = new Sprite(this.textures.enemyHealthFillGreen);
      enemyHealthFill.anchor.set(0.5, 0);
      enemyHealthFill.scale.set(barScale);
      enemyHealthFill.position.set(0, HEALTH_BAR_OFFSET_Y);

      const enemyHealthFillMask = new Graphics();
      enemyHealthFill.addChild(enemyHealthFillMask);
      enemyHealthFill.mask = enemyHealthFillMask;

      container.addChild(enemyHealthFrame, enemyHealthFill);
      visual.enemyHealthFrame = enemyHealthFrame;
      visual.enemyHealthFill = enemyHealthFill;
      visual.enemyHealthFillMask = enemyHealthFillMask;
    }

    this.shipLayer.addChild(container);
    this.shipVisuals.set(ship.id, visual);
    return visual;
  }

  private setHealthBarVisible(visual: ShipVisual, isVisible: boolean): void {
    if (visual.enemyHealthFrame) visual.enemyHealthFrame.visible = isVisible;
    if (visual.enemyHealthFill) visual.enemyHealthFill.visible = isVisible;
  }

  private updateHealthBar(visual: ShipVisual, ratio: number): void {
    if (visual.enemyHealthFill && visual.enemyHealthFillMask) {
      const fillTexture =
        ratio > HEALTH_RATIO_GREEN_THRESHOLD
          ? this.textures.enemyHealthFillGreen
          : ratio >= HEALTH_RATIO_AMBER_THRESHOLD
            ? this.textures.healthFillAmber
            : this.textures.enemyHealthFillRed;
      const fullWidth = fillTexture?.width ?? ENEMY_HEALTH_BAR_WIDTH;
      const fullHeight = fillTexture?.height ?? 1;
      if (fillTexture) {
        visual.enemyHealthFill.texture = fillTexture;
        // The amber fallback (shared with the player bar) isn't sized like the
        // enemy-specific sprites, so keep the on-screen width constant.
        visual.enemyHealthFill.scale.set(ENEMY_HEALTH_BAR_WIDTH / fullWidth);
      }
      visual.enemyHealthFillMask
        .clear()
        .rect(-fullWidth / 2, 0, Math.max(0, fullWidth * ratio), fullHeight)
        .fill(0xffffff);
    }
  }

  private spawnExplosion(position: Vector2): void {
    const sprite = new Sprite(this.explosionFrames[0]);
    sprite.anchor.set(0.5);
    const desiredSize = (this.config?.shipRadius ?? 30) * 3.2;
    sprite.scale.set(desiredSize / sprite.texture.width);
    sprite.position.set(position.x, position.y);
    this.effectLayer.addChild(sprite);

    const totalDuration = EXPLOSION_FRAME_DURATION * this.explosionFrames.length;
    this.effects.push({
      sprite,
      age: 0,
      durationSeconds: totalDuration,
      onTick: (effect) => {
        const frameIndex = Math.min(
          this.explosionFrames.length - 1,
          Math.floor(effect.age / EXPLOSION_FRAME_DURATION),
        );
        const frame = this.explosionFrames[frameIndex];
        if (frame) (effect.sprite as Sprite).texture = frame;
      },
    });
  }

  private spawnMuzzleFlash(position: Vector2): void {
    const gfx = new Graphics().circle(0, 0, 9).fill({ color: 0xfff4c2, alpha: 0.9 });
    gfx.position.set(position.x, position.y);
    this.effectLayer.addChild(gfx);

    this.effects.push({
      sprite: gfx,
      age: 0,
      durationSeconds: FLASH_DURATION,
      onTick: (effect) => {
        const t = effect.age / effect.durationSeconds;
        effect.sprite.alpha = Math.max(0, 1 - t);
        effect.sprite.scale.set(1 + t * 1.5);
      },
    });
  }

  /** One-off impact burst played on every hit, independent of the ship-death animation. */
  private spawnHitImpact(position: Vector2): void {
    if (this.explosionFrames.length === 0) return;
    const frame = this.explosionFrames[Math.floor(Math.random() * this.explosionFrames.length)];
    const sprite = new Sprite(frame);
    sprite.anchor.set(0.5);
    const desiredSize = (this.config?.shipRadius ?? 30) * 1.6;
    sprite.scale.set(frame ? desiredSize / frame.width : 1);
    sprite.position.set(position.x, position.y);
    this.effectLayer.addChild(sprite);

    this.effects.push({
      sprite,
      age: 0,
      durationSeconds: HIT_IMPACT_DURATION,
      onTick: (effect) => {
        const t = effect.age / effect.durationSeconds;
        effect.sprite.alpha = Math.max(0, 1 - t);
      },
    });
  }

  /**
   * A loose plank/hull fragment knocked off and left drifting behind on
   * every hit that lands - distinct from `spawnCrewBurst`, which only plays
   * once, when the ship actually sinks.
   */
  private spawnDebris(position: Vector2): void {
    if (this.debrisTextures.length === 0) return;
    const texture = this.debrisTextures[Math.floor(Math.random() * this.debrisTextures.length)];
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    const desiredSize = (this.config?.shipRadius ?? 30) * (0.5 + Math.random() * 0.35);
    sprite.scale.set(texture ? desiredSize / texture.width : 1);
    sprite.rotation = Math.random() * Math.PI * 2;
    sprite.position.set(position.x, position.y);
    this.effectLayer.addChild(sprite);

    const angle = Math.random() * Math.PI * 2;
    const speed = 12 + Math.random() * 24;

    this.effects.push({
      sprite,
      age: 0,
      durationSeconds: DEBRIS_DURATION,
      velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      onTick: (effect) => {
        const t = effect.age / effect.durationSeconds;
        // Sits in the water for most of its life, then fades out over the last third.
        effect.sprite.alpha = Math.max(0, Math.min(1, (1 - t) * 3));
      },
    });
  }

  /** A handful of crew members thrown clear of the ship when it goes down. */
  private spawnCrewBurst(position: Vector2): void {
    if (this.crewTextures.length === 0) return;
    for (let i = 0; i < CREW_BURST_COUNT; i += 1) {
      const texture = this.crewTextures[Math.floor(Math.random() * this.crewTextures.length)];
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      const desiredSize = (this.config?.shipRadius ?? 30) * 0.9;
      sprite.scale.set(texture ? desiredSize / texture.width : 1);
      sprite.position.set(position.x, position.y);
      this.effectLayer.addChild(sprite);

      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 60;

      this.effects.push({
        sprite,
        age: 0,
        durationSeconds: CREW_BURST_DURATION,
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        onTick: (effect) => {
          const t = effect.age / effect.durationSeconds;
          effect.sprite.alpha = Math.max(0, 1 - t);
        },
      });
    }
  }

  /** Mirrors simulation state onto the Pixi scene graph. Call once per animation frame. */
  sync(state: MatchState, dtSeconds: number): void {
    if (!this.ready) return;

    const player = state.ships.find((ship) => ship.kind === 'player');
    if (player) this.updateCamera(player.position);

    for (const hit of state.hitEvents) {
      this.spawnHitImpact(hit);
      this.spawnDebris(hit);
    }

    const seenShipIds = new Set<number>();
    for (const ship of state.ships) {
      seenShipIds.add(ship.id);
      const visual = this.ensureShipVisual(ship);
      visual.container.position.set(ship.position.x, ship.position.y);
      visual.hullGroup.rotation = ship.rotation + Math.PI;

      const ratio = ship.maxHealth > 0 ? ship.health / ship.maxHealth : 0;
      const tier = healthTierFor(ratio, ship.alive);
      if (tier !== visual.tier) {
        visual.tier = tier;
        const hullTexture = this.textures[HULL_TEXTURE_BY_TIER[tier]];
        if (hullTexture) visual.hullSprite.texture = hullTexture;
        const sailTexture = this.textures[SAIL_TEXTURE_BY_KIND_TIER[ship.kind][tier]];
        if (sailTexture) visual.sailSprite.texture = sailTexture;
      }

      if (ship.alive) {
        this.setHealthBarVisible(visual, true);
        this.updateHealthBar(visual, ratio);

        if (ratio < FIRE_HEALTH_RATIO_THRESHOLD) {
          visual.fireSprite.visible = true;
          visual.fireAnimationAge += dtSeconds;
          const frameIndex = Math.floor(visual.fireAnimationAge / FIRE_FRAME_DURATION) % 2;
          visual.fireSprite.texture = frameIndex === 0 ? (this.textures.fire1 ?? Texture.EMPTY) : (this.textures.fire2 ?? Texture.EMPTY);
        } else {
          visual.fireSprite.visible = false;
          visual.fireAnimationAge = 0;
        }
      } else {
        // Keep the wreck (hull_large_4 + faded sail) visible for the sinking
        // ship's remaining deathTimer instead of hiding it immediately -
        // it's cleaned up naturally below once the ship leaves state.ships.
        this.setHealthBarVisible(visual, false);
        visual.fireSprite.visible = false;
        if (!this.explodedShipIds.has(ship.id)) {
          this.explodedShipIds.add(ship.id);
          this.spawnExplosion(ship.position);
          this.spawnCrewBurst(ship.position);
        }
      }
    }

    for (const [id, visual] of this.shipVisuals) {
      if (!seenShipIds.has(id)) {
        visual.container.destroy({ children: true });
        this.shipVisuals.delete(id);
        this.explodedShipIds.delete(id);
      }
    }

    const seenProjectileIds = new Set<number>();
    for (const projectile of state.projectiles) {
      seenProjectileIds.add(projectile.id);
      let sprite = this.projectileSprites.get(projectile.id);
      if (!sprite) {
        sprite = new Sprite(this.textures.projectile);
        sprite.anchor.set(0.5);
        const desiredSize = (this.config?.projectileRadius ?? 6) * 2;
        sprite.scale.set(desiredSize / sprite.texture.width);
        this.projectileLayer.addChild(sprite);
        this.projectileSprites.set(projectile.id, sprite);
        this.spawnMuzzleFlash(projectile.position);
      }
      sprite.position.set(projectile.position.x, projectile.position.y);
      sprite.rotation = Math.atan2(projectile.velocity.y, projectile.velocity.x);
    }

    for (const [id, sprite] of this.projectileSprites) {
      if (!seenProjectileIds.has(id)) {
        sprite.destroy();
        this.projectileSprites.delete(id);
      }
    }

    this.effects = this.effects.filter((effect) => {
      effect.age += dtSeconds;
      if (effect.velocity) {
        effect.sprite.position.x += effect.velocity.x * dtSeconds;
        effect.sprite.position.y += effect.velocity.y * dtSeconds;
      }
      effect.onTick(effect);
      if (effect.age >= effect.durationSeconds) {
        effect.sprite.destroy();
        return false;
      }
      return true;
    });
  }

  /** Registers a per-frame callback driven by Pixi's own ticker (real elapsed seconds). */
  onTick(callback: (dtSeconds: number) => void): void {
    this.app.ticker.add((ticker) => callback(ticker.deltaMS / 1000));
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (!this.ready) {
      // init() is still running (e.g. React StrictMode's discarded first
      // mount); let it notice `destroyRequested` and tear itself down once
      // the in-flight `app.init()`/`Assets.load()` calls actually settle.
      this.destroyRequested = true;
      return;
    }

    this.app.destroy({ removeView: true }, { children: true });
  }
}

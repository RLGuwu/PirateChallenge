import { Application, Assets, Container, Graphics, Rectangle, TilingSprite, type FederatedPointerEvent, type Texture } from 'pixi.js';
import type { IslandConfig } from './types';
import { ISLAND_TILE_URLS, buildIslandContainer, type IslandTextures } from './islandTiles';
import waterTileUrl from '../assets/png/retina/tiles/tile_73.png';

export interface EditableIsland extends IslandConfig {
  id: string;
}

export interface IslandEditorCallbacks {
  onSelect: (id: string | null) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

interface IslandVisual {
  container: Container;
  halfSize: number;
}

const TILE_WORLD_SIZE = 64;
const VIEW_PADDING = 40;

/**
 * A lightweight, editor-only Pixi renderer: just water + islands (built from
 * the exact same tiles as the real in-match arena, via islandTiles.ts) drawn
 * at a fixed fit-to-arena scale, with drag-to-move interaction. No ships, no
 * simulation - this never touches GameEngine.
 */
export class IslandEditorRenderer {
  private app = new Application();
  private textures: IslandTextures & { waterTile?: Texture } = {};
  private worldLayer = new Container();
  private selectionGraphic = new Graphics();
  private islandVisuals = new Map<string, IslandVisual>();
  private resizeObserver: ResizeObserver | null = null;
  private ready = false;
  private destroyRequested = false;
  private arenaWidth = 0;
  private arenaHeight = 0;
  private callbacks: IslandEditorCallbacks = { onSelect: () => {}, onDragEnd: () => {} };
  private draggingId: string | null = null;
  private dragOffset = { x: 0, y: 0 };

  get isReady(): boolean {
    return this.ready;
  }

  async init(
    container: HTMLDivElement,
    arenaWidth: number,
    arenaHeight: number,
    callbacks: IslandEditorCallbacks,
  ): Promise<void> {
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;
    this.callbacks = callbacks;

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

    if (this.destroyRequested) {
      this.app.destroy({ removeView: true }, { children: true });
      return;
    }

    container.appendChild(this.app.canvas);

    const loaded = (await Assets.load(
      Object.entries({ waterTile: waterTileUrl, ...ISLAND_TILE_URLS }).map(([alias, src]) => ({ alias, src })),
    )) as IslandTextures & { waterTile: Texture };

    if (this.destroyRequested) {
      this.app.destroy({ removeView: true }, { children: true });
      return;
    }

    this.textures = loaded;

    const water = new TilingSprite({ texture: loaded.waterTile, width: arenaWidth, height: arenaHeight });
    water.tileScale.set(TILE_WORLD_SIZE / loaded.waterTile.width);
    this.worldLayer.addChild(water);

    const border = new Graphics()
      .rect(0, 0, arenaWidth, arenaHeight)
      .stroke({ width: 6, color: 0xffd77a, alpha: 0.55 });
    this.worldLayer.addChild(border, this.selectionGraphic);

    this.app.stage.addChild(this.worldLayer);
    this.app.stage.eventMode = 'static';
    this.app.stage.on('pointerdown', () => this.callbacks.onSelect(null));
    this.app.stage.on('pointermove', (event) => this.handlePointerMove(event));
    this.app.stage.on('pointerup', () => this.endDrag());
    this.app.stage.on('pointerupoutside', () => this.endDrag());

    this.resize(width, height);
    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      this.resize(entry.contentRect.width, entry.contentRect.height);
    });
    this.resizeObserver.observe(container);

    this.ready = true;
  }

  private resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    this.app.renderer.resize(width, height);
    const scale = Math.min((width - VIEW_PADDING) / this.arenaWidth, (height - VIEW_PADDING) / this.arenaHeight);
    this.worldLayer.scale.set(scale);
    this.worldLayer.position.set(
      (width - this.arenaWidth * scale) / 2,
      (height - this.arenaHeight * scale) / 2,
    );
    this.app.stage.hitArea = this.app.screen;
  }

  private createIslandVisual(island: EditableIsland, seed: number): IslandVisual {
    const container = buildIslandContainer(island.x, island.y, island.halfSize, this.textures, seed);
    container.eventMode = 'static';
    container.cursor = 'grab';
    container.hitArea = new Rectangle(0, 0, island.halfSize * 2, island.halfSize * 2);
    container.on('pointerdown', (event: FederatedPointerEvent) => {
      event.stopPropagation();
      this.callbacks.onSelect(island.id);
      this.draggingId = island.id;
      const local = this.worldLayer.toLocal(event.global);
      this.dragOffset = { x: local.x - container.position.x, y: local.y - container.position.y };
    });
    this.worldLayer.addChild(container);
    this.worldLayer.setChildIndex(this.selectionGraphic, this.worldLayer.children.length - 1);
    return { container, halfSize: island.halfSize };
  }

  private handlePointerMove(event: FederatedPointerEvent): void {
    if (!this.draggingId) return;
    const visual = this.islandVisuals.get(this.draggingId);
    if (!visual) return;
    const local = this.worldLayer.toLocal(event.global);
    visual.container.position.set(local.x - this.dragOffset.x, local.y - this.dragOffset.y);
    this.updateSelectionGraphic(this.draggingId);
  }

  private endDrag(): void {
    if (!this.draggingId) return;
    const id = this.draggingId;
    const visual = this.islandVisuals.get(id);
    this.draggingId = null;
    if (!visual) return;
    this.callbacks.onDragEnd(id, visual.container.position.x + visual.halfSize, visual.container.position.y + visual.halfSize);
  }

  private updateSelectionGraphic(selectedId: string | null): void {
    this.selectionGraphic.clear();
    if (!selectedId) return;
    const visual = this.islandVisuals.get(selectedId);
    if (!visual) return;
    const size = visual.halfSize * 2;
    this.selectionGraphic
      .rect(visual.container.position.x - 6, visual.container.position.y - 6, size + 12, size + 12)
      .stroke({ width: 4, color: 0xffffff, alpha: 0.9 });
  }

  /** Mirrors the editable island list onto the Pixi scene. Call after every state change. */
  sync(islands: EditableIsland[], selectedId: string | null): void {
    if (!this.ready) return;

    const seen = new Set<string>();
    islands.forEach((island, index) => {
      seen.add(island.id);
      const existing = this.islandVisuals.get(island.id);
      if (!existing) {
        this.islandVisuals.set(island.id, this.createIslandVisual(island, index));
        return;
      }
      if (existing.halfSize !== island.halfSize) {
        existing.container.destroy({ children: true });
        this.islandVisuals.set(island.id, this.createIslandVisual(island, index));
      } else if (this.draggingId !== island.id) {
        existing.container.position.set(island.x - island.halfSize, island.y - island.halfSize);
      }
    });

    for (const [id, visual] of this.islandVisuals) {
      if (!seen.has(id)) {
        visual.container.destroy({ children: true });
        this.islandVisuals.delete(id);
      }
    }

    this.updateSelectionGraphic(selectedId);
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (!this.ready) {
      this.destroyRequested = true;
      return;
    }

    this.app.destroy({ removeView: true }, { children: true });
  }
}

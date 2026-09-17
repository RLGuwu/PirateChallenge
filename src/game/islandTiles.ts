import { Container, Sprite, type Texture } from 'pixi.js';

// The verified-good 5x5 island composition: a hand-matched inner ring (sand
// meeting grass) wrapped by an outer ring (a soft, mostly-transparent
// "shallow water" glow). These specific pieces were picked because they're
// the one combination from the tileset that was confirmed to actually line
// up seam-free - most of the other tiles in this pack are one-off painted
// shapes meant for a single fixed spot, not a general-purpose autotile set
// (adjacent copies of the same "edge" tile don't tile with each other).
import grassTileUrl from '../assets/png/retina/tiles/tile_23.png';
import islandCornerTlUrl from '../assets/png/retina/tiles/tile_6.png';
import islandEdgeTopUrl from '../assets/png/retina/tiles/tile_7.png';
import islandCornerTrUrl from '../assets/png/retina/tiles/tile_9.png';
import islandEdgeLeftUrl from '../assets/png/retina/tiles/tile_22.png';
import islandEdgeRightUrl from '../assets/png/retina/tiles/tile_25.png';
import islandCornerBlUrl from '../assets/png/retina/tiles/tile_54.png';
import islandEdgeBottomUrl from '../assets/png/retina/tiles/tile_56.png';
import islandCornerBrUrl from '../assets/png/retina/tiles/tile_57.png';
import islandOuterCornerTlUrl from '../assets/png/retina/tiles/tile_10.png';
import islandOuterEdgeTopUrl from '../assets/png/retina/tiles/tile_11.png';
import islandOuterCornerTrUrl from '../assets/png/retina/tiles/tile_12.png';
import islandOuterEdgeLeftUrl from '../assets/png/retina/tiles/tile_26.png';
import islandOuterEdgeRightUrl from '../assets/png/retina/tiles/tile_28.png';
import islandOuterCornerBlUrl from '../assets/png/retina/tiles/tile_42.png';
import islandOuterEdgeBottomUrl from '../assets/png/retina/tiles/tile_43.png';
import islandOuterCornerBrUrl from '../assets/png/retina/tiles/tile_44.png';

// Drop-in alternatives for the single grass centre cell only: each of these
// is its own edge-to-edge-opaque, fully-green tile (no blob/transparency
// games), so swapping between them can't introduce a seam. (tile_52/53 were
// tried too - a sand clearing ringed by grass - but they read as a beige
// "hole" punched in the middle rather than a coastline feature, so they're
// deliberately not in this list: the centre should always look like grass.)
import grassFillSpeckledUrl from '../assets/png/retina/tiles/tile_24.png';
import grassFillTuftsAUrl from '../assets/png/retina/tiles/tile_39.png';
import grassFillTuftsBUrl from '../assets/png/retina/tiles/tile_40.png';

// Loose props scattered on top of the sand ring for extra variety: plain
// rocks, mossy rocks, leaf tufts. These are independent sprites layered on
// top, not part of the tile grid, so they carry zero seam risk.
import rockUrl1 from '../assets/png/retina/tiles/tile_49.png';
import rockUrl2 from '../assets/png/retina/tiles/tile_50.png';
import rockUrl3 from '../assets/png/retina/tiles/tile_51.png';
import mossyRockUrl1 from '../assets/png/retina/tiles/tile_65.png';
import mossyRockUrl2 from '../assets/png/retina/tiles/tile_66.png';
import mossyRockUrl3 from '../assets/png/retina/tiles/tile_67.png';
import leafClusterUrl1 from '../assets/png/retina/tiles/tile_70.png';
import leafClusterUrl2 from '../assets/png/retina/tiles/tile_71.png';
import leafClusterUrl3 from '../assets/png/retina/tiles/tile_72.png';
import leafSprigUrl1 from '../assets/png/retina/tiles/tile_87.png';
import leafSprigUrl2 from '../assets/png/retina/tiles/tile_88.png';

export const ISLAND_TILE_URLS = {
  grassTile: grassTileUrl,
  islandCornerTl: islandCornerTlUrl,
  islandEdgeTop: islandEdgeTopUrl,
  islandCornerTr: islandCornerTrUrl,
  islandEdgeLeft: islandEdgeLeftUrl,
  islandEdgeRight: islandEdgeRightUrl,
  islandCornerBl: islandCornerBlUrl,
  islandEdgeBottom: islandEdgeBottomUrl,
  islandCornerBr: islandCornerBrUrl,
  islandOuterCornerTl: islandOuterCornerTlUrl,
  islandOuterEdgeTop: islandOuterEdgeTopUrl,
  islandOuterCornerTr: islandOuterCornerTrUrl,
  islandOuterEdgeLeft: islandOuterEdgeLeftUrl,
  islandOuterEdgeRight: islandOuterEdgeRightUrl,
  islandOuterCornerBl: islandOuterCornerBlUrl,
  islandOuterEdgeBottom: islandOuterEdgeBottomUrl,
  islandOuterCornerBr: islandOuterCornerBrUrl,
  grassFillSpeckled: grassFillSpeckledUrl,
  grassFillTuftsA: grassFillTuftsAUrl,
  grassFillTuftsB: grassFillTuftsBUrl,
  rock1: rockUrl1,
  rock2: rockUrl2,
  rock3: rockUrl3,
  mossyRock1: mossyRockUrl1,
  mossyRock2: mossyRockUrl2,
  mossyRock3: mossyRockUrl3,
  leafCluster1: leafClusterUrl1,
  leafCluster2: leafClusterUrl2,
  leafCluster3: leafClusterUrl3,
  leafSprig1: leafSprigUrl1,
  leafSprig2: leafSprigUrl2,
} as const;

export type IslandTileKey = keyof typeof ISLAND_TILE_URLS;
export type IslandTextures = Partial<Record<IslandTileKey, Texture>>;

/** Deterministic, seedable RNG (mulberry32) so an island's look is stable across re-renders. */
function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, options: T[]): T | undefined {
  if (options.length === 0) return undefined;
  return options[Math.floor(rng() * options.length)];
}

/** The fixed, verified-good 5x5 layout - outer glow ring wrapping the sand/grass core. */
function getIslandGrid(t: IslandTextures, centerTexture: Texture | undefined): (Texture | undefined)[][] {
  return [
    [t.islandOuterCornerTl, t.islandOuterEdgeTop, t.islandOuterEdgeTop, t.islandOuterEdgeTop, t.islandOuterCornerTr],
    [t.islandOuterEdgeLeft, t.islandCornerTl, t.islandEdgeTop, t.islandCornerTr, t.islandOuterEdgeRight],
    [t.islandOuterEdgeLeft, t.islandEdgeLeft, centerTexture, t.islandEdgeRight, t.islandOuterEdgeRight],
    [t.islandOuterEdgeLeft, t.islandCornerBl, t.islandEdgeBottom, t.islandCornerBr, t.islandOuterEdgeRight],
    [t.islandOuterCornerBl, t.islandOuterEdgeBottom, t.islandOuterEdgeBottom, t.islandOuterEdgeBottom, t.islandOuterCornerBr],
  ];
}

const DECORATION_SLOTS: Array<{ row: number; col: number }> = [
  { row: 0, col: 0 },
  { row: 0, col: 4 },
  { row: 4, col: 0 },
  { row: 4, col: 4 },
  { row: 1, col: 0 },
  { row: 3, col: 4 },
];

/**
 * Builds one island as a freshly positioned Container (caller adds it to the
 * scene). The 5x5 layout itself is fixed (see getIslandGrid) - it's the one
 * proven-seamless composition in this tileset - but every island still ends
 * up looking different via: a random center-fill variant (always green -
 * plain, speckled, or tufted grass), a random horizontal/vertical mirror of
 * the whole shape, and a few scattered rock/plant props. `seed` should be a
 * stable value (e.g. the island's index in its list) so the same island
 * always renders the same way.
 */
export function buildIslandContainer(
  x: number,
  y: number,
  halfSize: number,
  textures: IslandTextures,
  seed = 0,
): Container {
  const rng = createRng(seed);
  const gridSize = 5;
  const cellSize = (halfSize * 2) / gridSize;
  const flipH = rng() < 0.5;
  const flipV = rng() < 0.5;

  const centerOptions = [
    textures.grassTile,
    textures.grassTile, // weighted toward plain grass so decorated variants stay a rare accent
    textures.grassFillSpeckled,
    textures.grassFillTuftsA,
    textures.grassFillTuftsB,
  ].filter((texture): texture is Texture => !!texture);
  const centerTexture = pick(rng, centerOptions) ?? textures.grassTile;

  const grid = getIslandGrid(textures, centerTexture);

  const island = new Container();
  island.position.set(x - halfSize, y - halfSize);

  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const texture = grid[row]?.[col];
      if (!texture) continue;
      const drawCol = flipH ? gridSize - 1 - col : col;
      const drawRow = flipV ? gridSize - 1 - row : row;
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.width = cellSize;
      sprite.height = cellSize;
      sprite.scale.x *= flipH ? -1 : 1;
      sprite.scale.y *= flipV ? -1 : 1;
      sprite.position.set(drawCol * cellSize + cellSize / 2, drawRow * cellSize + cellSize / 2);
      island.addChild(sprite);
    }
  }

  const decorationTextures = [
    textures.rock1,
    textures.rock2,
    textures.rock3,
    textures.mossyRock1,
    textures.mossyRock2,
    textures.mossyRock3,
    textures.leafCluster1,
    textures.leafCluster2,
    textures.leafCluster3,
    textures.leafSprig1,
    textures.leafSprig2,
  ].filter((texture): texture is Texture => !!texture);

  if (decorationTextures.length > 0) {
    const decorationCount = 1 + Math.floor(rng() * 3); // 1-3 per island
    const slots = [...DECORATION_SLOTS];
    for (let i = 0; i < decorationCount && slots.length > 0; i += 1) {
      const slotIndex = Math.floor(rng() * slots.length);
      const slot = slots.splice(slotIndex, 1)[0];
      if (!slot) break;
      const drawCol = flipH ? gridSize - 1 - slot.col : slot.col;
      const drawRow = flipV ? gridSize - 1 - slot.row : slot.row;
      const texture = pick(rng, decorationTextures);
      if (!texture) continue;

      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      const scale = cellSize * (0.55 + rng() * 0.25);
      sprite.width = scale;
      sprite.height = scale * (texture.height / texture.width);
      sprite.rotation = rng() * Math.PI * 2;
      sprite.position.set(
        drawCol * cellSize + cellSize / 2 + (rng() - 0.5) * cellSize * 0.3,
        drawRow * cellSize + cellSize / 2 + (rng() - 0.5) * cellSize * 0.3,
      );
      island.addChild(sprite);
    }
  }

  return island;
}

import { useEffect, useRef, useState } from 'react';
import { IslandEditorRenderer, type EditableIsland } from '../game/islandEditorRenderer';
import { loadIslandLayout, saveIslandLayout, resetIslandLayout, clampIsland } from '../game/islandLayout';
import { ARENA_WIDTH, ARENA_HEIGHT, ISLAND_HALFSIZE_DEFAULT, ISLAND_HALFSIZE_STEP, ISLAND_HALFSIZE_MIN, ISLAND_HALFSIZE_MAX, MAX_ISLANDS } from '../game/config';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { RoundButton } from '../components/RoundButton';
import icon_minus from '../assets/png/default/ui/controls/icon_minus.png';
import icon_plus from '../assets/png/default/ui/controls/icon_plus.png';

interface IslandEditorScreenProps {
  onBack: () => void;
}

function withIds(islands: ReturnType<typeof loadIslandLayout>): EditableIsland[] {
  return islands.map((island) => ({ ...island, id: crypto.randomUUID() }));
}

function persist(islands: EditableIsland[]): void {
  saveIslandLayout(islands.map(({ id: _id, ...island }) => island));
}

export function IslandEditorScreen({ onBack }: IslandEditorScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<IslandEditorRenderer | null>(null);
  const [ready, setReady] = useState(false);
  const [islands, setIslands] = useState<EditableIsland[]>(() => withIds(loadIslandLayout()));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const renderer = new IslandEditorRenderer();
    rendererRef.current = renderer;

    renderer
      .init(container, ARENA_WIDTH, ARENA_HEIGHT, {
        onSelect: (id) => {
          if (!cancelled) setSelectedId(id);
        },
        onDragEnd: (id, x, y) => {
          if (cancelled) return;
          setIslands((current) => {
            const next = current.map((island) =>
              island.id === id ? { id, ...clampIsland({ x, y, halfSize: island.halfSize }) } : island,
            );
            persist(next);
            return next;
          });
        },
      })
      .then(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
      renderer.destroy();
      if (rendererRef.current === renderer) rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (ready) rendererRef.current?.sync(islands, selectedId);
  }, [islands, selectedId, ready]);

  const selectedIsland = islands.find((island) => island.id === selectedId) ?? null;

  const handleAdd = () => {
    if (islands.length >= MAX_ISLANDS) return;
    const offset = islands.length * 40;
    const island: EditableIsland = {
      id: crypto.randomUUID(),
      ...clampIsland({ x: ARENA_WIDTH / 2 + offset, y: ARENA_HEIGHT / 2 + offset, halfSize: ISLAND_HALFSIZE_DEFAULT }),
    };
    const next = [...islands, island];
    setIslands(next);
    setSelectedId(island.id);
    persist(next);
  };

  const handleResize = (delta: number) => {
    if (!selectedIsland) return;
    const next = islands.map((island) =>
      island.id === selectedIsland.id
        ? { id: island.id, ...clampIsland({ x: island.x, y: island.y, halfSize: island.halfSize + delta }) }
        : island,
    );
    setIslands(next);
    persist(next);
  };

  const handleDelete = () => {
    if (!selectedIsland) return;
    const next = islands.filter((island) => island.id !== selectedIsland.id);
    setIslands(next);
    setSelectedId(null);
    persist(next);
  };

  const handleReset = () => {
    resetIslandLayout();
    setIslands(withIds(loadIslandLayout()));
    setSelectedId(null);
  };

  return (
    <div className="editor-screen">
      <div className="editor-canvas" ref={containerRef} />

      {!ready && (
        <div className="game-overlay">
          <p className="game-overlay-title">Loading islands…</p>
        </div>
      )}

      {ready && (
        <>
          <div className="editor-toolbar">
            <PrimaryButton label="MAIN MENU" onClick={onBack} sound="uiBack" />
            <h1 className="options-title editor-toolbar-title">ISLAND EDITOR</h1>
            <div className="button-row">
              <SecondaryButton label="ADD ISLAND" onClick={handleAdd} />
              <SecondaryButton label="RESET" onClick={handleReset} />
            </div>
          </div>

          <p className="editor-hint">
            Drag an island to move it · {islands.length}/{MAX_ISLANDS} islands
          </p>

          {selectedIsland && (
            <div className="editor-inspector">
              <span className="options-description editor-inspector-label">Size</span>
              <div className="stepper editor-inspector-stepper">
                <RoundButton
                  icon={icon_minus}
                  alt="Decrease island size"
                  size="small"
                  onClick={() => handleResize(-ISLAND_HALFSIZE_STEP)}
                  disabled={selectedIsland.halfSize <= ISLAND_HALFSIZE_MIN}
                />
                <span className="stepper-value editor-inspector-value">{selectedIsland.halfSize}</span>
                <RoundButton
                  icon={icon_plus}
                  alt="Increase island size"
                  size="small"
                  onClick={() => handleResize(ISLAND_HALFSIZE_STEP)}
                  disabled={selectedIsland.halfSize >= ISLAND_HALFSIZE_MAX}
                />
              </div>
              <SecondaryButton label="DELETE ISLAND" onClick={handleDelete} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

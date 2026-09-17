import type { ReactNode } from 'react';
import panel_menu from '../assets/images/panel_menu.png';
import scene_background from '../assets/images/ui_scene_background.png';
import logo_jungle_gaming from '../assets/logo_jungle_gaming.svg';
import { useVerticalDragScroll } from '../hooks/useVerticalDragScroll';

interface PanelScreenProps {
  children: ReactNode;
  panelSize?: 'default' | 'wide';
}

export function PanelScreen({ children, panelSize = 'default' }: PanelScreenProps) {
  const panelClassName = panelSize === 'wide' ? 'panel panel-wide' : 'panel panel-default';
  const { ref: panelScrollRef, isDragging, handlers: panelScrollHandlers } = useVerticalDragScroll<HTMLDivElement>();

  return (
    <div className="App">
      <div className="app-background" style={{ backgroundImage: `url(${scene_background})` }} />
      <div
        className={isDragging ? `${panelClassName} dragging` : panelClassName}
        style={{ backgroundImage: `url(${panel_menu})` }}
        ref={panelScrollRef}
        {...panelScrollHandlers}
      >
        {children}
      </div>
      <img className="brand-logo" src={logo_jungle_gaming} alt="Jungle Gaming" />
    </div>
  );
}

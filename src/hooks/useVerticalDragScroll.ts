import { useRef, useState, type MouseEvent } from 'react';

const INTERACTIVE_SELECTOR = 'button, a, select, input, textarea';

/** Click-and-drag vertical scrolling for a panel that also contains buttons/links. */
export function useVerticalDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ y: 0, scrollTop: 0 });

  const onMouseDown = (event: MouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    // Don't hijack clicks on buttons/links inside the panel.
    if (event.target instanceof Element && event.target.closest(INTERACTIVE_SELECTOR)) return;
    setIsDragging(true);
    dragStart.current = { y: event.pageY, scrollTop: el.scrollTop };
  };

  const onMouseMove = (event: MouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el || !isDragging) return;
    el.scrollTop = dragStart.current.scrollTop - (event.pageY - dragStart.current.y);
  };

  const stopDragging = () => setIsDragging(false);

  return {
    ref,
    isDragging,
    handlers: {
      onMouseDown,
      onMouseMove,
      onMouseUp: stopDragging,
      onMouseLeave: stopDragging,
    },
  };
}

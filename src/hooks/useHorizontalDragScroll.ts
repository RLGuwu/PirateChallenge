import { useRef, useState, type MouseEvent, type WheelEvent } from 'react';

export function useHorizontalDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

  const onMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    setIsDragging(true);
    dragStart.current = { x: event.pageX, scrollLeft: el.scrollLeft };
  };

  const onMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !isDragging) return;
    el.scrollLeft = dragStart.current.scrollLeft - (event.pageX - dragStart.current.x);
  };

  const stopDragging = () => setIsDragging(false);

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    if (el.scrollWidth <= el.clientWidth) return;
    if (!event.shiftKey) return;
    event.preventDefault();
    el.scrollLeft += event.deltaY;
  };

  return {
    ref,
    isDragging,
    handlers: {
      onMouseDown,
      onMouseMove,
      onMouseUp: stopDragging,
      onMouseLeave: stopDragging,
      onWheel,
    },
  };
}

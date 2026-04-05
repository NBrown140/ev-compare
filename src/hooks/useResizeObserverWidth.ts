import { useEffect, useRef, useState } from "react";

export function useResizeObserverWidth(initialWidth: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(initialWidth);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    observer.observe(node);
    setWidth(node.clientWidth);

    return () => observer.disconnect();
  }, []);

  return { containerRef, width };
}

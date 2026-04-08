import { useState, useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";

interface MenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
}

interface OverflowMenuProps {
  items: MenuItem[];
  align?: "left" | "right";
}

export default function OverflowMenu({ items, align = "right" }: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, close]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-outline hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute top-full mt-1 z-50 w-max rounded-lg bg-surface border border-outline-variant py-1 shadow-[0_4px_24px_rgba(49,51,47,0.06)] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              onClick={() => {
                item.onClick();
                close();
              }}
              className="w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

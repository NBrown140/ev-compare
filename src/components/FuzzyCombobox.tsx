import { useEffect, useRef, useState } from "react";

/** Simple fuzzy match: checks if all characters of the query appear in order in the target. */
function fuzzyMatch(target: string, query: string): boolean {
  const t = target.toLowerCase();
  const q = query.toLowerCase();
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const idx = t.indexOf(q[qi], ti);
    if (idx === -1) return false;
    ti = idx + 1;
  }
  return true;
}

interface FuzzyComboboxProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function FuzzyCombobox({
  options,
  value,
  onChange,
  placeholder = "All",
}: FuzzyComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = query
    ? options.filter((o) => fuzzyMatch(o, query))
    : options;

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [filtered.length, query]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (open && listRef.current) {
      const item = listRef.current.children[
        value ? highlightIndex + 1 : highlightIndex
      ] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex, open, value]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function select(val: string) {
    onChange(val);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }

    const totalItems = filtered.length + (value ? 1 : 0); // +1 for "All" option when a value is selected

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, totalItems - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (value && highlightIndex === 0) {
          select("");
        } else {
          const idx = value ? highlightIndex - 1 : highlightIndex;
          if (filtered[idx]) select(filtered[idx]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setQuery("");
        break;
    }
  }

  const displayValue = open ? query : value || "";

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 text-sm w-48"
      />
      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg text-sm"
        >
          {value && (
            <li
              onMouseDown={() => select("")}
              onMouseEnter={() => setHighlightIndex(0)}
              className={`px-3 py-2 cursor-pointer text-gray-500 dark:text-gray-400 ${
                highlightIndex === 0
                  ? "bg-blue-50 dark:bg-blue-900/30"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {placeholder}
            </li>
          )}
          {filtered.map((option, i) => {
            const idx = value ? i + 1 : i;
            return (
              <li
                key={option}
                onMouseDown={() => select(option)}
                onMouseEnter={() => setHighlightIndex(idx)}
                className={`px-3 py-2 cursor-pointer ${
                  idx === highlightIndex
                    ? "bg-blue-50 dark:bg-blue-900/30"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                } ${option === value ? "font-semibold text-blue-600 dark:text-blue-400" : "dark:text-gray-100"}`}
              >
                {option}
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-gray-400 dark:text-gray-500">
              No matches
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

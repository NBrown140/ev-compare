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
  multiple?: boolean;
  value?: string;
  values?: string[];
  onChange?: (value: string) => void;
  onChangeMulti?: (values: string[]) => void;
  placeholder?: string;
}

export default function FuzzyCombobox({
  options,
  multiple: isMulti = false,
  value = "",
  values = [],
  onChange,
  onChangeMulti,
  placeholder = "All",
}: FuzzyComboboxProps) {

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Derive selected set for multi mode
  const selectedSet = isMulti ? new Set(values) : new Set<string>();
  const hasSelection = isMulti ? values.length > 0 : !!value;

  const filtered = query
    ? options.filter((o) => fuzzyMatch(o, query))
    : isMulti
      ? [...options].sort((a, b) => {
          const aSel = selectedSet.has(a) ? 0 : 1;
          const bSel = selectedSet.has(b) ? 0 : 1;
          return aSel - bSel;
        })
      : options;

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [filtered.length, query]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (open && listRef.current) {
      const item = listRef.current.children[
        hasSelection ? highlightIndex + 1 : highlightIndex
      ] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex, open, hasSelection]);

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

  function selectSingle(val: string) {
    onChange?.(val);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function toggleMulti(val: string) {
    const next = selectedSet.has(val)
      ? values.filter((v: string) => v !== val)
      : [...values, val];
    onChangeMulti?.(next);
  }

  function clearAll() {
    if (isMulti) {
      onChangeMulti?.([]);
    } else {
      onChange?.("");
    }
    setQuery("");
  }

  function handleSelect(option: string) {
    if (isMulti) {
      toggleMulti(option);
    } else {
      selectSingle(option);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }

    const totalItems = filtered.length + (hasSelection ? 1 : 0);

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
        if (hasSelection && highlightIndex === 0) {
          clearAll();
          if (!isMulti) setOpen(false);
        } else {
          const idx = hasSelection ? highlightIndex - 1 : highlightIndex;
          if (filtered[idx]) handleSelect(filtered[idx]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setQuery("");
        break;
    }
  }

  // Display value in the input
  let displayValue: string;
  if (open) {
    displayValue = query;
  } else if (isMulti) {
    displayValue = values.length > 0
      ? `${values.length} selected`
      : "";
  } else {
    displayValue = value || "";
  }

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
          {hasSelection && (
            <li
              onMouseDown={() => {
                clearAll();
                if (!isMulti) setOpen(false);
              }}
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
            const idx = hasSelection ? i + 1 : i;
            const isSelected = isMulti
              ? selectedSet.has(option)
              : option === value;
            return (
              <li
                key={option}
                onMouseDown={() => handleSelect(option)}
                onMouseEnter={() => setHighlightIndex(idx)}
                className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
                  idx === highlightIndex
                    ? "bg-blue-50 dark:bg-blue-900/30"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                } ${isSelected ? "font-semibold text-blue-600 dark:text-blue-400" : "dark:text-gray-100"}`}
              >
                {isMulti && (
                  <span className="flex-shrink-0 w-4 text-center">
                    {isSelected ? "\u2713" : ""}
                  </span>
                )}
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

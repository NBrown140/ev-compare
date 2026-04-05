import {
  createElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";
export type EffectiveTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  effectiveTheme: EffectiveTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): EffectiveTheme {
  if (window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
  return "dark"; // fallback to dark when no preference
}

function getStoredTheme(): Theme {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark" || stored === "system")
    return stored;
  return "system";
}

function applyTheme(effective: EffectiveTheme) {
  document.documentElement.classList.toggle("dark", effective === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>(() => {
    const t = getStoredTheme();
    return t === "system" ? getSystemTheme() : t;
  });

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem("theme", t);
    setThemeState(t);
    const effective = t === "system" ? getSystemTheme() : t;
    setEffectiveTheme(effective);
    applyTheme(effective);
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const eff = e.matches ? "dark" : "light";
      setEffectiveTheme(eff);
      applyTheme(eff);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  // Sync on mount
  useEffect(() => {
    applyTheme(effectiveTheme);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== "theme") return;
      const nextTheme = getStoredTheme();
      setThemeState(nextTheme);
      const nextEffective =
        nextTheme === "system" ? getSystemTheme() : nextTheme;
      setEffectiveTheme(nextEffective);
      applyTheme(nextEffective);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return createElement(
    ThemeContext.Provider,
    { value: { theme, effectiveTheme, setTheme } },
    children
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

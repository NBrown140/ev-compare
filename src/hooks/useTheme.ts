import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark" | "system";
type EffectiveTheme = "light" | "dark";

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

export function useTheme() {
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

  return { theme, effectiveTheme, setTheme };
}

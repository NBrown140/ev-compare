import { useMemo } from "react";
import { useTheme } from "./useTheme";

export function useChartColors() {
  const { effectiveTheme } = useTheme();

  return useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    const get = (name: string) => style.getPropertyValue(`--ds-${name}`).trim();

    return {
      gridStroke: get("surface-container"),
      tickFill: get("outline"),
      violinFill: get("surface-container"),
      violinStroke: get("outline-variant"),
      dotStroke: get("background"),
      otherDotFill: get("outline-variant"),
      siblingDotFill: get("secondary"),
      currentDotFill: get("primary"),
      tooltipBg: get("surface"),
      tooltipBorder: get("outline-variant"),
    };
  }, [effectiveTheme]);
}

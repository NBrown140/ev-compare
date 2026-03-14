export function removeOutliersIQR<T>(
  data: T[],
  keys: (keyof T)[],
): T[] {
  if (data.length < 4) return data;

  return keys.reduce((filtered, key) => {
    const values = filtered
      .map((d) => d[key] as number)
      .filter((v) => v != null)
      .sort((a, b) => a - b);

    if (values.length < 4) return filtered;

    const q1 = values[Math.floor(values.length * 0.25)];
    const q3 = values[Math.floor(values.length * 0.75)];
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;

    return filtered.filter((d) => {
      const v = d[key] as number;
      return v == null || (v >= lower && v <= upper);
    });
  }, data);
}

export function linearRegression(
  points: { x: number; y: number }[],
  keys: { x: string; y: string } = { x: "x", y: "y" },
): { slope: number; intercept: number; line: [Record<string, number>, Record<string, number>] } | null {
  if (points.length < 2) return null;

  const n = points.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;

  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const xs = points.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  return {
    slope,
    intercept,
    line: [
      { [keys.x]: minX, [keys.y]: slope * minX + intercept },
      { [keys.x]: maxX, [keys.y]: slope * maxX + intercept },
    ],
  };
}

/** Gaussian kernel density estimation. Returns sorted {value, density} pairs. */
export function gaussianKDE(
  values: number[],
  steps = 50,
): { value: number; density: number }[] {
  if (values.length === 0) return [];
  if (values.length === 1)
    return [{ value: values[0], density: 1 }];

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min || 1;

  // Silverman's rule of thumb for bandwidth
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const stddev = Math.sqrt(
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / n,
  );
  const bandwidth = 1.06 * (stddev || range / 4) * n ** -0.2;

  const pad = range * 0.1;
  const lo = min - pad;
  const hi = max + pad;
  const step = (hi - lo) / (steps - 1);

  const result: { value: number; density: number }[] = [];
  for (let i = 0; i < steps; i++) {
    const x = lo + i * step;
    let density = 0;
    for (const v of values) {
      const z = (x - v) / bandwidth;
      density += Math.exp(-0.5 * z * z);
    }
    density /= n * bandwidth * Math.sqrt(2 * Math.PI);
    result.push({ value: x, density });
  }
  return result;
}

export function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const frac = pos - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

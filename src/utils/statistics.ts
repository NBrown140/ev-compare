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

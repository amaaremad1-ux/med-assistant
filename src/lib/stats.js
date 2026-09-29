/** Small deterministic statistics helpers used by the demo engine. */

export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function sd(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

export function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

/** Least-squares fit over points [{x, y}] → { slope, intercept, r2 }. */
export function linreg(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0, r2: 0 };
  const mx = mean(points.map((p) => p.x));
  const my = mean(points.map((p) => p.y));
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  const slope = den ? num / den : 0;
  const intercept = my - slope * mx;
  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    ssTot += (p.y - my) ** 2;
    ssRes += (p.y - (intercept + slope * p.x)) ** 2;
  }
  return { slope, intercept, r2: ssTot ? 1 - ssRes / ssTot : 0 };
}

export const mae = (as, bs) => mean(as.map((a, i) => Math.abs(a - bs[i])));

export function rmse(as, bs) {
  return Math.sqrt(mean(as.map((a, i) => (a - bs[i]) ** 2)));
}

/** Autocorrelation of xs at a given lag. */
export function autocorr(xs, lag) {
  const n = xs.length - lag;
  if (n < 2) return 0;
  return pearson(xs.slice(0, n), xs.slice(lag));
}

export const r1 = (v) => Math.round(v * 10) / 10;
export const r2 = (v) => Math.round(v * 100) / 100;

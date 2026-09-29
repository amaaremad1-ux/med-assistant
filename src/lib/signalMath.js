/**
 * Shared numeric primitives for the Human Bio-Signal Intelligence Engine.
 *
 * Two rules shaped this file:
 *
 *  1. A missing sample is `NaN`, never zero. Every function here therefore
 *     skips non-finite values and reports how many samples it actually used,
 *     so no downstream number can silently absorb a fabricated value.
 *
 *  2. When there are not enough samples for a statistic to mean anything, the
 *     function returns `null` rather than a plausible-looking number. Callers
 *     must render that as "not computable from the available data".
 *
 * These are general-purpose research statistics, not clinical algorithms, and
 * nothing here should be read as a diagnostic threshold.
 */

export const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Drop NaN / non-finite entries, remembering their original indices. */
export function finitePairs(values) {
  const idx = [];
  const xs = [];
  for (let i = 0; i < values.length; i += 1) {
    if (isNum(values[i])) {
      idx.push(i);
      xs.push(values[i]);
    }
  }
  return { idx, xs };
}

export function finite(values) {
  return finitePairs(values).xs;
}

export function countMissing(values) {
  let n = 0;
  for (let i = 0; i < values.length; i += 1) if (!isNum(values[i])) n += 1;
  return n;
}

export function sum(xs) {
  let s = 0;
  for (let i = 0; i < xs.length; i += 1) s += xs[i];
  return s;
}

export function mean(xs) {
  return xs.length ? sum(xs) / xs.length : null;
}

export function sortedCopy(xs) {
  return xs.slice().sort((a, b) => a - b);
}

/** Linear-interpolated percentile on a sorted copy. p in [0, 100]. */
export function percentile(xs, p) {
  const clean = finite(xs);
  if (!clean.length) return null;
  const s = sortedCopy(clean);
  if (s.length === 1) return s[0];
  const rank = (p / 100) * (s.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (rank - lo);
}

export function median(xs) {
  return percentile(xs, 50);
}

export function variance(xs) {
  const clean = finite(xs);
  if (clean.length < 2) return null;
  const m = mean(clean);
  return sum(clean.map((v) => (v - m) ** 2)) / (clean.length - 1);
}

export function sd(xs) {
  const v = variance(xs);
  return v === null ? null : Math.sqrt(v);
}

export function rms(xs) {
  const clean = finite(xs);
  if (!clean.length) return null;
  return Math.sqrt(sum(clean.map((v) => v * v)) / clean.length);
}

/** Median absolute deviation (unscaled). Robust spread measure. */
export function mad(xs) {
  const clean = finite(xs);
  if (clean.length < 2) return null;
  const med = median(clean);
  return median(clean.map((v) => Math.abs(v - med)));
}

/** MAD rescaled to be comparable to a standard deviation for normal data. */
export function madScaled(xs) {
  const m = mad(xs);
  return m === null ? null : m * 1.4826;
}

/** Coefficient of variation. null when the mean is ~0 (ratio undefined). */
export function cv(xs) {
  const clean = finite(xs);
  const m = mean(clean);
  const s = sd(clean);
  if (m === null || s === null || Math.abs(m) < 1e-12) return null;
  return s / Math.abs(m);
}

export function iqr(xs) {
  const p25 = percentile(xs, 25);
  const p75 = percentile(xs, 75);
  return p25 === null || p75 === null ? null : p75 - p25;
}

export function skewness(xs) {
  const clean = finite(xs);
  if (clean.length < 3) return null;
  const m = mean(clean);
  const s = sd(clean);
  if (!s) return null;
  return sum(clean.map((v) => ((v - m) / s) ** 3)) / clean.length;
}

export function minMax(xs) {
  const clean = finite(xs);
  if (!clean.length) return { min: null, max: null };
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of clean) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return { min: lo, max: hi };
}

/** First differences of a series, skipping non-finite samples. */
export function diffs(values) {
  const { idx, xs } = finitePairs(values);
  const out = [];
  for (let k = 1; k < xs.length; k += 1) {
    if (idx[k] - idx[k - 1] === 1) out.push(xs[k] - xs[k - 1]);
  }
  return out;
}

/** Root mean square of successive differences (only across adjacent samples). */
export function rmssd(values) {
  const d = diffs(values);
  return d.length ? Math.sqrt(sum(d.map((v) => v * v)) / d.length) : null;
}

/**
 * Moving median with a centred window. Used for baseline estimation because a
 * median does not smear sharp transients (QRS complexes) across the baseline.
 * Non-finite samples are excluded from each window.
 */
export function movingMedian(values, windowSize) {
  const w = Math.max(1, Math.floor(windowSize) | 0);
  const half = Math.floor(w / 2);
  const out = new Array(values.length).fill(NaN);
  for (let i = 0; i < values.length; i += 1) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(values.length - 1, i + half);
    const buf = [];
    for (let j = lo; j <= hi; j += 1) if (isNum(values[j])) buf.push(values[j]);
    out[i] = buf.length ? median(buf) : NaN;
  }
  return out;
}

export function movingAverage(values, windowSize) {
  const w = Math.max(1, Math.floor(windowSize) | 0);
  const half = Math.floor(w / 2);
  const out = new Array(values.length).fill(NaN);
  let run = 0;
  let cnt = 0;
  for (let i = 0; i < values.length; i += 1) {
    const add = i + half;
    const rem = i - half - 1;
    if (add < values.length && isNum(values[add])) {
      run += values[add];
      cnt += 1;
    }
    if (rem >= 0 && isNum(values[rem])) {
      run -= values[rem];
      cnt -= 1;
    }
    out[i] = cnt ? run / cnt : NaN;
  }
  return out;
}

/** Longest run of consecutive non-finite samples. */
export function longestMissingRun(values) {
  let best = 0;
  let bestStart = -1;
  let cur = 0;
  let curStart = -1;
  for (let i = 0; i < values.length; i += 1) {
    if (!isNum(values[i])) {
      if (cur === 0) curStart = i;
      cur += 1;
      if (cur > best) {
        best = cur;
        bestStart = curStart;
      }
    } else {
      cur = 0;
    }
  }
  return { length: best, startIndex: bestStart };
}

/** All runs of consecutive non-finite samples. */
export function missingRuns(values) {
  const runs = [];
  let cur = null;
  for (let i = 0; i < values.length; i += 1) {
    if (!isNum(values[i])) {
      if (!cur) cur = { startIndex: i, length: 0 };
      cur.length += 1;
    } else if (cur) {
      runs.push(cur);
      cur = null;
    }
  }
  if (cur) runs.push(cur);
  return runs;
}

/**
 * Longest run of (near-)constant values. A flatline is a sensor fault, not a
 * physiological finding, so this is reported as a quality artifact.
 */
export function longestConstantRun(values, tolerance = 1e-9) {
  let best = 0;
  let bestStart = -1;
  let cur = 0;
  let curStart = -1;
  let anchor = null;
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    if (!isNum(v)) {
      cur = 0;
      anchor = null;
      continue;
    }
    if (anchor !== null && Math.abs(v - anchor) <= tolerance) {
      cur += 1;
    } else {
      cur = 1;
      curStart = i;
      anchor = v;
    }
    if (cur > best) {
      best = cur;
      bestStart = curStart;
    }
  }
  return { length: best, startIndex: bestStart };
}

/**
 * Robust outlier count using the median and scaled MAD. `k` is in robust
 * "sigma" units. Returns indices so callers can point at the actual samples.
 */
export function outlierIndices(values, k = 5) {
  const { idx, xs } = finitePairs(values);
  const med = median(xs);
  const m = madScaled(xs);
  if (med === null || m === null || m <= 0) return { indices: [], center: med, scale: m };
  const out = [];
  for (let i = 0; i < xs.length; i += 1) {
    if (Math.abs(xs[i] - med) / m > k) out.push(idx[i]);
  }
  return { indices: out, center: med, scale: m };
}

/**
 * Outliers that are ISOLATED in time.
 *
 * A plain robust-z test flags every sample of a genuine sustained excursion —
 * an activity burst in a heart-rate series, a desaturation episode in SpO2, a
 * night of zero step counts — as an "outlier". That mislabels real physiology
 * as corrupt data. A sample is only counted here when its neighbourhood is
 * quiet, so the deviation is a spike rather than a regime. Sustained excursions
 * are the business of change-point and burst detection, not outlier screening.
 */
export function isolatedOutlierIndices(values, opts = {}) {
  const k = opts.k ?? 5;
  const { idx, xs } = finitePairs(values);
  const med = median(xs);
  const scale = madScaled(xs);
  if (med === null || scale === null || scale <= 0) {
    return { indices: [], center: med, scale, extremeCount: 0 };
  }
  const z = new Map();
  for (let i = 0; i < xs.length; i += 1) z.set(idx[i], Math.abs(xs[i] - med) / scale);
  const extreme = idx.filter((i) => z.get(i) > k);
  const halfWidth = Math.max(2, Math.round((opts.neighbourhoodFraction ?? 0.02) * values.length));
  const maxBusyFraction = opts.maxBusyFraction ?? 0.3;
  const indices = [];
  for (const i of extreme) {
    let busy = 0;
    let total = 0;
    for (let j = i - halfWidth; j <= i + halfWidth; j += 1) {
      if (j === i || j < 0 || j >= values.length) continue;
      const v = z.get(j);
      if (v === undefined) continue;
      total += 1;
      if (v > k * 0.5) busy += 1;
    }
    if (!total || busy / total < maxBusyFraction) indices.push(i);
  }
  return { indices, center: med, scale, extremeCount: extreme.length };
}

/** Lag-1 autocorrelation — used to decide whether a cadence can carry noise. */
export function lag1Autocorr(values) {
  return autocorr(values, 1);
}


/** Pearson correlation over pairwise-complete samples. */
export function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  const a = [];
  const b = [];
  for (let i = 0; i < n; i += 1) {
    if (isNum(xs[i]) && isNum(ys[i])) {
      a.push(xs[i]);
      b.push(ys[i]);
    }
  }
  if (a.length < 3) return { r: null, n: a.length };
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  if (!da || !db) return { r: null, n: a.length };
  return { r: num / Math.sqrt(da * db), n: a.length };
}

/** Least-squares fit over [{x, y}] points. */
export function linreg(points) {
  const pts = points.filter((p) => isNum(p.x) && isNum(p.y));
  if (pts.length < 3) return null;
  const mx = mean(pts.map((p) => p.x));
  const my = mean(pts.map((p) => p.y));
  let num = 0;
  let den = 0;
  for (const p of pts) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  if (!den) return null;
  const slope = num / den;
  const intercept = my - slope * mx;
  let ssTot = 0;
  let ssRes = 0;
  for (const p of pts) {
    ssTot += (p.y - my) ** 2;
    ssRes += (p.y - (intercept + slope * p.x)) ** 2;
  }
  const r2 = ssTot ? 1 - ssRes / ssTot : 0;
  // Standard error of the slope → a real confidence interval rather than a guess.
  const dof = pts.length - 2;
  const se = dof > 0 && ssTot > 0 ? Math.sqrt(ssRes / dof / den) : null;
  return { slope, intercept, r2, n: pts.length, se, t: se ? slope / se : null };
}

/**
 * Welch's two-sample t statistic with its degrees of freedom. Returned as a
 * statistic only — converting it to a p-value needs a t-distribution CDF, and
 * this codebase does not fabricate one. See src/lib/researchStats.js.
 */
export function welchT(a, b) {
  const xa = finite(a);
  const xb = finite(b);
  if (xa.length < 2 || xb.length < 2) return null;
  const ma = mean(xa);
  const mb = mean(xb);
  const va = variance(xa);
  const vb = variance(xb);
  const denom = va / xa.length + vb / xb.length;
  if (!denom) return null;
  const t = (ma - mb) / Math.sqrt(denom);
  const df = denom ** 2 / ((va / xa.length) ** 2 / (xa.length - 1) + (vb / xb.length) ** 2 / (xb.length - 1));
  return { t, df: Math.max(1, df), n1: xa.length, n2: xb.length, mean1: ma, mean2: mb };
}

/** Cohen's d using the pooled standard deviation. */
export function cohensD(a, b) {
  const xa = finite(a);
  const xb = finite(b);
  if (xa.length < 2 || xb.length < 2) return null;
  const va = variance(xa);
  const vb = variance(xb);
  const pooled = Math.sqrt(((xa.length - 1) * va + (xb.length - 1) * vb) / (xa.length + xb.length - 2));
  if (!pooled) return null;
  return (mean(xa) - mean(xb)) / pooled;
}

/** Autocorrelation at an integer lag, over pairwise-complete samples. */
export function autocorr(values, lag) {
  const n = values.length - lag;
  if (n < 4) return null;
  const a = values.slice(0, n);
  const b = values.slice(lag);
  return pearson(a, b).r;
}

/** Normalise to zero mean / unit variance (used before comparing shapes). */
export function zScore(xs) {
  const clean = finite(xs);
  const m = mean(clean);
  const s = sd(clean);
  if (m === null || !s) return xs.map((v) => (isNum(v) ? 0 : NaN));
  return xs.map((v) => (isNum(v) ? (v - m) / s : NaN));
}

/** Linear interpolation of `values` onto arbitrary target times. */
export function interpolateOnto(times, values, targetTimes) {
  const { idx, xs } = finitePairs(values);
  if (idx.length < 2) return new Array(targetTimes.length).fill(NaN);
  const srcT = idx.map((i) => times[i]);
  const out = new Array(targetTimes.length);
  let j = 0;
  for (let k = 0; k < targetTimes.length; k += 1) {
    const t = targetTimes[k];
    if (t <= srcT[0]) {
      out[k] = xs[0];
      continue;
    }
    if (t >= srcT[srcT.length - 1]) {
      out[k] = xs[xs.length - 1];
      continue;
    }
    while (j < srcT.length - 2 && srcT[j + 1] < t) j += 1;
    const span = srcT[j + 1] - srcT[j];
    out[k] = span ? xs[j] + ((t - srcT[j]) / span) * (xs[j + 1] - xs[j]) : xs[j];
  }
  return out;
}

/**
 * Averaged periodogram using a Hann window and 50 % overlapping segments.
 *
 * Segment averaging is what makes the estimate usable at all: a single raw DFT
 * of a noisy physiological window has a variance as large as its own mean.
 * The frequency resolution actually achieved is returned so the UI can state
 * it instead of implying infinite precision.
 */
export function periodogram(values, fs, opts = {}) {
  const clean = finitePairs(values);
  const segmentSize = Math.min(opts.segmentSize ?? 256, Math.max(32, clean.xs.length));
  if (clean.xs.length < segmentSize || !fs || fs <= 0) return null;

  const hop = Math.max(1, Math.floor(segmentSize / 2));
  const maxSegments = opts.maxSegments ?? 24;
  const half = Math.floor(segmentSize / 2);
  // Physiological interest rarely extends past ~60 Hz; capping the bins keeps
  // the direct DFT affordable without pretending to a resolution it lacks.
  const nyquist = fs / 2;
  const fMax = Math.min(opts.maxFrequency ?? nyquist, nyquist);
  const nFreq = Math.max(1, Math.min(half, Math.round((fMax * segmentSize) / fs)));
  const power = new Array(nFreq).fill(0);
  let segments = 0;

  // Remove the segment mean (DC) and apply the Hann window.
  const window = new Array(segmentSize);
  for (let i = 0; i < segmentSize; i += 1) {
    window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (segmentSize - 1));
  }

  for (let start = 0; start + segmentSize <= clean.xs.length && segments < maxSegments; start += hop) {
    const seg = clean.xs.slice(start, start + segmentSize);
    const m = mean(seg);
    const buf = seg.map((v, i) => (v - m) * window[i]);
    // Hann amplitude correction.
    const wSum = sum(window);
    for (let k = 1; k <= nFreq; k += 1) {
      const f = (k * fs) / segmentSize;
      let re = 0;
      let im = 0;
      for (let i = 0; i < segmentSize; i += 1) {
        const ang = (2 * Math.PI * f * i) / fs;
        re += buf[i] * Math.cos(ang);
        im -= buf[i] * Math.sin(ang);
      }
      power[k - 1] += (re * re + im * im) / (wSum * wSum);
    }
    segments += 1;
  }

  if (!segments) return null;
  for (let k = 0; k < nFreq; k += 1) power[k] /= segments;

  const freqs = new Array(nFreq);
  for (let k = 0; k < nFreq; k += 1) freqs[k] = ((k + 1) * fs) / segmentSize;

  let peakI = 0;
  for (let k = 1; k < nFreq; k += 1) if (power[k] > power[peakI]) peakI = k;

  return {
    freqs,
    power,
    segments,
    segmentSize,
    resolution: fs / segmentSize,
    nyquist,
    maxFrequency: fMax,
    dominantFrequency: freqs[peakI],
    dominantPower: power[peakI],
    method: `Welch-style averaged periodogram, Hann window, ${segmentSize}-sample segments, 50 % overlap, ${segments} segment${segments === 1 ? '' : 's'}`,
  };
}

/** Mean power inside [lo, hi) Hz from a periodogram result. */
export function bandPower(psd, lo, hi) {
  if (!psd) return null;
  let acc = 0;
  let n = 0;
  for (let i = 0; i < psd.freqs.length; i += 1) {
    if (psd.freqs[i] >= lo && psd.freqs[i] < hi) {
      acc += psd.power[i];
      n += 1;
    }
  }
  return n ? { mean: acc / n, bins: n, lo, hi } : null;
}

/** Fraction of total power inside a band — the "spectral concentration". */
export function bandFraction(psd, lo, hi) {
  const b = bandPower(psd, lo, hi);
  const total = psd ? sum(psd.power) : 0;
  if (!b || !total) return null;
  return (b.mean * b.bins) / total;
}

export const round = (v, digits = 3) => {
  if (!isNum(v)) return null;
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

export function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}

/**
 * Deterministic PRNG (same algorithm as the data seeds) for any routine that
 * needs an initial guess — e.g. k-means. Results must not depend on call order.
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Euclidean distance between two equal-length feature vectors. */
export function euclidean(a, b) {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i += 1) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

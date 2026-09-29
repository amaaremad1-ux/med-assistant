/**
 * Analytics for the UCI Heart Disease research dataset.
 *
 * Every function here computes DESCRIPTIVE statistics directly from the
 * de-identified dataset rows in src/data/heartDisease.js. Nothing is
 * simulated, estimated, or fabricated — and none of these numbers is a
 * prediction or a diagnosis.
 */
import {
  HEART_CASES,
  HEART_FEATURE_DEFS,
  formatHeartValue,
  heartFeature,
} from '../data/heartDisease.js';

// ---------- Generic numeric helpers ----------

/** Summary of a numeric array (nulls excluded). Returns nulls when empty. */
export function summaryStats(values) {
  const v = values.filter((x) => x !== null && x !== undefined).sort((a, b) => a - b);
  const n = v.length;
  if (n === 0) return { n: 0, missing: values.length, mean: null, median: null, sd: null, min: null, max: null };
  const mean = v.reduce((s, x) => s + x, 0) / n;
  const median = n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
  const sd = n > 1 ? Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)) : 0;
  return { n, missing: values.length - n, mean, median, sd, min: v[0], max: v[n - 1] };
}

/**
 * Histogram over explicit bins.
 * bins: [{ label, min, max }] — min inclusive, max exclusive (last bin inclusive).
 */
export function histogram(cases, key, bins) {
  const values = cases.map((c) => c[key]).filter((x) => x !== null && x !== undefined);
  return bins.map((b, i) => ({
    label: b.label,
    count: values.filter((x) =>
      i === bins.length - 1 ? x >= b.min && x <= b.max : x >= b.min && x < b.max
    ).length,
  }));
}

/** Pearson correlation on pairwise-complete observations. Null when undefined. */
export function pearson(cases, keyA, keyB) {
  const pairs = cases
    .map((c) => [c[keyA], c[keyB]])
    .filter(([a, b]) => a !== null && b !== null && a !== undefined && b !== undefined);
  const n = pairs.length;
  if (n < 3) return null;
  const ma = pairs.reduce((s, [a]) => s + a, 0) / n;
  const mb = pairs.reduce((s, [, b]) => s + b, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (const [a, b] of pairs) {
    num += (a - ma) * (b - mb);
    da += (a - ma) ** 2;
    db += (b - mb) ** 2;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? null : num / den;
}

/**
 * Correlation matrix over feature ids (pairwise-complete).
 * Returns { ids, labels, rows, n } where rows[i][j] is r(ids[i], ids[j]).
 */
export function correlationMatrix(cases, ids) {
  const labels = ids.map((id) => (heartFeature(id)?.label ?? id));
  const rows = ids.map((a) => ids.map((b) => (a === b ? 1 : pearson(cases, a, b))));
  return { ids, labels, rows };
}

/**
 * Outcome rate per category of a categorical feature.
 * Returns [{ value, label, n, disease, rate }] sorted by dataset code.
 */
export function outcomeByCategory(cases, key) {
  const def = heartFeature(key);
  const groups = new Map();
  for (const c of cases) {
    const v = c[key];
    if (v === null || v === undefined) continue;
    if (!groups.has(v)) groups.set(v, { n: 0, disease: 0 });
    const g = groups.get(v);
    g.n += 1;
    g.disease += c.outcome;
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([value, g]) => ({
      value,
      label: def?.values ? def.values[value] ?? String(value) : String(value),
      n: g.n,
      disease: g.disease,
      rate: g.disease / g.n,
    }));
}

/** Percentile rank (0–100) of a value within a cohort of values. */
export function percentileRank(cohortValues, value) {
  const v = cohortValues.filter((x) => x !== null && x !== undefined).sort((a, b) => a - b);
  if (v.length === 0 || value === null || value === undefined) return null;
  const below = v.filter((x) => x < value).length;
  const equal = v.filter((x) => x === value).length;
  return ((below + equal / 2) / v.length) * 100;
}

// ---------- Library filtering ----------

export const HEART_AGE_BANDS = [
  { id: 'all', label: 'All ages', min: 0, max: 200 },
  { id: 'u40', label: 'Under 40', min: 0, max: 40 },
  { id: '40-49', label: '40–49', min: 40, max: 50 },
  { id: '50-59', label: '50–59', min: 50, max: 60 },
  { id: '60-69', label: '60–69', min: 60, max: 70 },
  { id: '70p', label: '70 and over', min: 70, max: 200 },
];

/** Search + filter the case library. Query matches the case number. */
export function filterHeartCases(cases, { query = '', outcome = 'all', sex = 'all', ageBand = 'all' } = {}) {
  const band = HEART_AGE_BANDS.find((b) => b.id === ageBand) ?? HEART_AGE_BANDS[0];
  // Strip leading zeros so "042" matches case 42; strip a leading "#".
  const q = query.trim().toLowerCase().replace(/^#/, '').replace(/^0+(?=\d)/, '');
  return cases.filter((c) => {
    if (outcome !== 'all' && c.outcome !== Number(outcome)) return false;
    if (sex !== 'all' && c.sex !== Number(sex)) return false;
    if (c.age < band.min || c.age > band.max) return false;
    if (q) {
      const num = String(c.id);
      const label = `research case #${num}`;
      const padded = `research case #${String(c.id).padStart(3, '0')}`;
      if (!num.includes(q) && !label.includes(q) && !padded.includes(q)) return false;
    }
    return true;
  });
}

// ---------- Cohort-level summaries (computed from the real rows) ----------

export const HEART_COHORT = {
  total: HEART_CASES.length,
  disease: HEART_CASES.filter((c) => c.outcome === 1).length,
  noDisease: HEART_CASES.filter((c) => c.outcome === 0).length,
  withMissing: HEART_CASES.filter((c) => c.ca === null || c.thal === null).length,
};

export function heartCohortValues(key) {
  return HEART_CASES.map((c) => c[key]);
}

/** Formatted value helper re-exported for page convenience. */
export { formatHeartValue, HEART_FEATURE_DEFS };

// ---------- Age-band histogram bins ----------

export const AGE_BINS = [
  { label: '25–34', min: 25, max: 35 },
  { label: '35–44', min: 35, max: 45 },
  { label: '45–54', min: 45, max: 55 },
  { label: '55–64', min: 55, max: 65 },
  { label: '65–74', min: 65, max: 75 },
  { label: '75–84', min: 75, max: 85 },
];

export const CHOL_BINS = [
  { label: '< 200', min: 0, max: 200 },
  { label: '200–239', min: 200, max: 240 },
  { label: '240–279', min: 240, max: 280 },
  { label: '280–319', min: 280, max: 320 },
  { label: '320–359', min: 320, max: 360 },
  { label: '360+', min: 360, max: 1000 },
];

export const TRESTBPS_BINS = [
  { label: '< 120', min: 0, max: 120 },
  { label: '120–129', min: 120, max: 130 },
  { label: '130–139', min: 130, max: 140 },
  { label: '140–159', min: 140, max: 160 },
  { label: '160–179', min: 160, max: 180 },
  { label: '180+', min: 180, max: 300 },
];

export const THALACH_BINS = [
  { label: '< 100', min: 0, max: 100 },
  { label: '100–119', min: 100, max: 120 },
  { label: '120–139', min: 120, max: 140 },
  { label: '140–159', min: 140, max: 160 },
  { label: '160–179', min: 160, max: 180 },
  { label: '180+', min: 180, max: 250 },
];

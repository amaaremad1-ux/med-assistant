/**
 * Research statistics (PART 21).
 *
 * Every function here returns a self-describing result object rather than a
 * bare number, because a statistic without its method, its sample size and its
 * assumptions is not reproducible:
 *
 *   { id, kind, label, status, n, params, values, method, assumptions,
 *     limitations, reason }
 *
 * `status` is one of:
 *   'computed'          — the statistic was calculated from the supplied data
 *   'insufficient-data' — the data cannot support it; nothing was estimated
 *   'not-applicable'    — the analysis does not apply to this input shape
 *
 * POLICY ON SIGNIFICANCE. No p-values and no "statistically significant"
 * labels are produced anywhere in this module. A p-value needs the cumulative
 * distribution of the test statistic, and this codebase does not implement one;
 * inventing a number, or reading one off a table that only holds critical
 * values, would be a fabricated result. What IS reported is the test statistic
 * itself, its degrees of freedom, the 95 % confidence interval built from a
 * tabulated critical value, and the effect size — so a reader can judge the
 * magnitude and the precision of an observation without being handed a verdict.
 *
 * Normality is never assumed silently. Where a parametric interval is given,
 * the assumption is written into `assumptions` and the fact that no normality
 * test was run is written into `limitations`.
 */

import * as M from './signalMath.js';
import { tCritical95, effectSizeLabel } from './signalProcessing.js';

export { tCritical95, effectSizeLabel };

/** Fixed wording reused by every refusal so the UI never implies a result. */
export const NO_P_VALUE_POLICY =
  'No p-value or significance label is reported. This module computes test statistics, degrees of freedom, 95 % confidence intervals and effect sizes only — a p-value would require a distribution function this codebase does not implement, and one will not be approximated.';

export const STAT_ANALYSES = [
  {
    id: 'descriptive',
    label: 'Descriptive statistics',
    blurb: 'Location, spread, percentiles and a t-based 95 % CI for the mean.',
    minN: 2,
  },
  {
    id: 'time-series',
    label: 'Time-series statistics',
    blurb: 'Autocorrelation, linear drift with CI, and first/second-half shift.',
    minN: 8,
  },
  {
    id: 'correlation',
    label: 'Correlation',
    blurb: 'Pearson r and Spearman ρ over pairwise-complete samples, with a Fisher-z CI.',
    minN: 4,
  },
  {
    id: 'group-comparison',
    label: 'Group comparison',
    blurb: 'Welch t, mean difference with 95 % CI, and Cohen d.',
    minN: 4,
  },
  {
    id: 'correlation-matrix',
    label: 'Correlation matrix',
    blurb: 'Every supplied series against every other, pair by pair.',
    minN: 4,
  },
];

export function statAnalysisLabel(id) {
  return STAT_ANALYSES.find((a) => a.id === id)?.label ?? id;
}

// ---------------------------------------------------------------------------
// Result constructors
// ---------------------------------------------------------------------------

function computed(kind, label, body) {
  return {
    id: `${kind}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    label,
    status: 'computed',
    n: body.n ?? null,
    params: body.params ?? {},
    values: body.values ?? {},
    method: body.method,
    assumptions: body.assumptions ?? [],
    limitations: [...(body.limitations ?? []), NO_P_VALUE_POLICY],
    reason: null,
  };
}

function insufficient(kind, label, reason, n = 0) {
  return {
    id: `${kind}-refused`,
    kind,
    label,
    status: 'insufficient-data',
    n,
    params: {},
    values: {},
    method: null,
    assumptions: [],
    limitations: ['No statistic was calculated, so nothing may be quoted from this row.'],
    reason,
  };
}

function notApplicable(kind, label, reason) {
  return {
    id: `${kind}-not-applicable`,
    kind,
    label,
    status: 'not-applicable',
    n: 0,
    params: {},
    values: {},
    method: null,
    assumptions: [],
    limitations: ['This analysis does not apply to the supplied input; no substitute was computed.'],
    reason,
  };
}

// ---------------------------------------------------------------------------
// Rank helpers (Spearman)
// ---------------------------------------------------------------------------

/** Tie-averaged ranks of a numeric array. */
export function ranks(xs) {
  const order = xs.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const out = new Array(xs.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1].v === order[i].v) j += 1;
    const avg = (i + j) / 2 + 1; // ranks are 1-based
    for (let k = i; k <= j; k += 1) out[order[k].i] = avg;
    i = j + 1;
  }
  return out;
}

/**
 * Pearson r with its pairwise-complete sample size.
 * Returns null when the correlation is undefined (a constant series, or fewer
 * than two overlapping samples) rather than reporting 0, which would wrongly
 * read as "measured and found to be no relationship".
 *
 * Note that signalMath.pearson returns { r, n }; this wrapper also hands back
 * the aligned pairs, because Spearman needs the same rows in the same order.
 */
export function pearsonComplete(xs, ys) {
  const pairs = [];
  const n = Math.min(xs?.length ?? 0, ys?.length ?? 0);
  for (let i = 0; i < n; i += 1) {
    if (M.isNum(xs[i]) && M.isNum(ys[i])) pairs.push([xs[i], ys[i]]);
  }
  if (pairs.length < 2) return { r: null, n: pairs.length };
  const a = pairs.map((p) => p[0]);
  const b = pairs.map((p) => p[1]);
  if (M.sd(a) === 0 || M.sd(b) === 0) return { r: null, n: pairs.length, constant: true };
  return { r: M.pearson(a, b).r, n: pairs.length, a, b };
}

// ---------------------------------------------------------------------------
// PART 21 — descriptive statistics
// ---------------------------------------------------------------------------

/**
 * Descriptive statistics for one numeric series.
 *
 * @param {number[]} values  may contain NaN for missing samples
 * @param {object} opts      { label, unit, missingNote }
 */
export function descriptiveStats(values, opts = {}) {
  const label = opts.label ?? 'Series';
  const arr = Array.isArray(values) ? values : [];
  const clean = M.finite(arr);
  const missing = arr.length - clean.length;

  if (clean.length < 2) {
    return insufficient(
      'descriptive',
      label,
      `Fewer than two numeric observations were supplied (${clean.length}). Mean, spread and percentiles are not reported for a single value.`,
      clean.length,
    );
  }

  const m = M.mean(clean);
  const s = M.sd(clean);
  const sem = s === null ? null : s / Math.sqrt(clean.length);
  const tcrit = tCritical95(clean.length - 1);
  const ci = sem !== null && tcrit !== null ? { low: m - tcrit * sem, high: m + tcrit * sem, tCritical: tcrit } : null;
  const { min, max } = M.minMax(clean);

  return computed('descriptive', label, {
    n: clean.length,
    params: { unit: opts.unit ?? null, missingExcluded: missing },
    values: {
      n: clean.length,
      mean: M.round(m, 4),
      median: M.round(M.median(clean), 4),
      sd: M.round(s, 4),
      variance: M.round(M.variance(clean), 5),
      sem: sem === null ? null : M.round(sem, 4),
      ci95Mean: ci ? [M.round(ci.low, 4), M.round(ci.high, 4)] : null,
      ci95Basis: ci ? `t(${clean.length - 1}) critical value ${M.round(ci.tCritical, 3)}` : null,
      mad: M.round(M.mad(clean), 4),
      cv: M.round(M.cv(clean), 4),
      skewness: M.round(M.skewness(clean), 4),
      min: M.round(min, 4),
      max: M.round(max, 4),
      range: M.round(max - min, 4),
      p5: M.round(M.percentile(clean, 5), 4),
      p25: M.round(M.percentile(clean, 25), 4),
      p75: M.round(M.percentile(clean, 75), 4),
      p95: M.round(M.percentile(clean, 95), 4),
      iqr: M.round(M.iqr(clean), 4),
      unit: opts.unit ?? null,
    },
    method:
      'Sample mean; unbiased (n−1) SD; SEM = SD/√n; linear-interpolated percentiles; MAD = median absolute deviation; skewness = third standardized moment. The 95 % CI for the mean is mean ± t(0.975, n−1)·SEM with the critical value read from a tabulated t distribution.',
    assumptions: [
      'The observations are treated as an independent sample for the CI of the mean. Autocorrelated samples make that interval narrower than it should be — see the time-series analysis for a lag-1 check.',
    ],
    limitations: [
      missing ? `${missing} value(s) were missing (NaN or non-numeric) and were excluded rather than imputed. No value was filled in.` : null,
      clean.length < 8 ? `Only ${clean.length} observations — percentiles and the CI are unstable at this sample size.` : null,
      'No normality test was run, so the t-based interval is approximate if the underlying distribution is strongly skewed.',
      'Descriptive statistics summarise the supplied sample. They are not a reference range and not a clinical threshold.',
    ].filter(Boolean),
  });
}

// ---------------------------------------------------------------------------
// PART 21 — time-series statistics
// ---------------------------------------------------------------------------

/**
 * Statistics that only make sense for an ordered series.
 *
 * @param {number[]} values
 * @param {number[]} times  seconds; when absent, index order is used and the
 *                          result says so instead of pretending a time base
 */
export function timeSeriesStats(values, times, opts = {}) {
  const label = opts.label ?? 'Series';
  const arr = Array.isArray(values) ? values : [];
  const clean = M.finite(arr);
  if (clean.length < 8) {
    return insufficient(
      'time-series',
      label,
      `Fewer than eight usable samples (${clean.length}). Autocorrelation and drift estimates need a longer series than that.`,
      clean.length,
    );
  }

  const timed = Array.isArray(times) && times.length === arr.length;
  const pts = [];
  for (let i = 0; i < arr.length; i += 1) {
    if (M.isNum(arr[i])) pts.push({ x: timed && M.isNum(times[i]) ? times[i] : i, y: arr[i] });
  }

  const fit = M.linreg(pts);
  // Standard error of the slope from the residuals of the same fit.
  const resid = pts.map((p) => p.y - (fit.intercept + fit.slope * p.x));
  const dof = Math.max(1, pts.length - 2);
  const sse = M.sum(resid.map((r) => r * r));
  const sxx = M.sum(pts.map((p) => (p.x - M.mean(pts.map((q) => q.x))) ** 2));
  const slopeSe = sxx > 0 ? Math.sqrt(sse / dof / sxx) : null;
  const tcrit = tCritical95(dof);
  const slopeCi = slopeSe !== null && tcrit !== null ? [fit.slope - tcrit * slopeSe, fit.slope + tcrit * slopeSe] : null;
  const tStat = slopeSe ? fit.slope / slopeSe : null;

  const half = Math.floor(clean.length / 2);
  const firstHalf = clean.slice(0, half);
  const secondHalf = clean.slice(half);
  const r1 = M.autocorr(clean, 1);
  const lag5 = clean.length > 12 ? M.autocorr(clean, 5) : null;

  const intervals = [];
  if (timed) {
    for (let i = 1; i < pts.length; i += 1) intervals.push(pts[i].x - pts[i - 1].x);
  }
  const medianInterval = intervals.length ? M.median(intervals) : null;
  const missRun = M.longestMissingRun(arr).length;

  return computed('time-series', label, {
    n: clean.length,
    params: {
      unit: opts.unit ?? null,
      timeBase: timed ? 'declared timestamps (seconds)' : 'sample index — no time base was declared',
      medianIntervalSec: medianInterval === null ? null : M.round(medianInterval, 4),
      spanSec: timed ? M.round(pts[pts.length - 1].x - pts[0].x, 3) : null,
    },
    values: {
      autocorrLag1: r1 === null ? null : M.round(r1, 4),
      autocorrLag5: lag5 === null ? null : M.round(lag5, 4),
      slopePerSample: M.round(fit.slope, 8),
      slopePerHour: timed ? M.round(fit.slope * 3600, 5) : null,
      slopeStdError: slopeSe === null ? null : M.round(slopeSe, 8),
      slopeCi95: slopeCi ? [M.round(slopeCi[0], 8), M.round(slopeCi[1], 8)] : null,
      tStatistic: tStat === null ? null : M.round(tStat, 3),
      degreesOfFreedom: dof,
      r2: M.round(fit.r2, 4),
      firstHalfMean: M.round(M.mean(firstHalf), 4),
      secondHalfMean: M.round(M.mean(secondHalf), 4),
      meanShift: M.round(M.mean(secondHalf) - M.mean(firstHalf), 4),
      firstHalfSd: M.round(M.sd(firstHalf), 4),
      secondHalfSd: M.round(M.sd(secondHalf), 4),
      rmssd: M.round(M.rmssd(arr), 4),
      longestMissingRunSamples: missRun,
    },
    method:
      'Ordinary least squares on (time or index, value) pairs; slope SE from the residual sum of squares with n−2 degrees of freedom; CI = slope ± t(0.975, df)·SE. Autocorrelation is the Pearson correlation of the series with itself at the stated lag. The half-split compares the mean and SD of the first and second halves of the window.',
    assumptions: [
      'The linear fit assumes a single straight-line drift over the whole window. A series that rises then falls can produce a near-zero slope with a large r² deficit — the half-split is included so that case is visible.',
    ],
    limitations: [
      timed ? null : 'No timestamps were supplied, so the slope is per sample, not per unit time, and no rate is reported.',
      medianInterval !== null && M.sd(intervals) > 0.25 * Math.abs(medianInterval || 1)
        ? 'Sampling intervals are irregular (SD exceeds 25 % of the median interval), so autocorrelation at a given lag mixes different real time spans.'
        : null,
      missRun > 0
        ? `The series contains a missing run of ${missRun} sample(s). Gaps were skipped, not interpolated, for these statistics.`
        : null,
      'The half-split is a descriptive check. It is not a stationarity test and does not establish that a change point exists.',
    ].filter(Boolean),
  });
}

// ---------------------------------------------------------------------------
// PART 21 — correlation
// ---------------------------------------------------------------------------

/**
 * Pearson r and Spearman ρ between two series.
 *
 * `opts.alignment` must state how the two series were brought together. If the
 * caller did not align them on time, the result is labelled index-paired: the
 * correlation describes the order the samples happen to be stored in, which is
 * a much weaker claim than a temporal association.
 */
export function correlationAnalysis(xs, ys, opts = {}) {
  const labelA = opts.labelA ?? 'Series A';
  const labelB = opts.labelB ?? 'Series B';
  const label = `${labelA} × ${labelB}`;

  const pc = pearsonComplete(xs, ys);
  if (pc.constant) {
    return notApplicable(
      'correlation',
      label,
      `At least one of the two series is constant across the overlapping samples, so a correlation coefficient is undefined. Nothing was reported rather than reporting 0.`,
    );
  }
  if (pc.n < 4) {
    return insufficient(
      'correlation',
      label,
      `Only ${pc.n} pairwise-complete sample(s) were found. At least four are needed before a correlation is reported, and a Fisher-z interval needs more than that.`,
      pc.n,
    );
  }

  const r = pc.r;
  const rho = M.pearson(ranks(pc.a), ranks(pc.b)).r;
  if (r === null) {
    return insufficient(
      'correlation',
      label,
      'The correlation coefficient is undefined for the overlapping samples (one series has no variance once paired). Nothing was reported in its place.',
      pc.n,
    );
  }
  const z = Math.atanh(M.clamp(r, -0.999999, 0.999999));
  const se = 1 / Math.sqrt(Math.max(1, pc.n - 3));
  const ci = pc.n > 4 ? [Math.tanh(z - 1.96 * se), Math.tanh(z + 1.96 * se)] : null;
  const alignment = opts.alignment ?? 'index-paired';

  return computed('correlation', label, {
    n: pc.n,
    params: {
      labelA,
      labelB,
      alignment,
      unitA: opts.unitA ?? null,
      unitB: opts.unitB ?? null,
    },
    values: {
      pearsonR: M.round(r, 4),
      pearsonR2: M.round(r * r, 4),
      spearmanRho: M.round(rho, 4),
      ci95Pearson: ci ? [M.round(ci[0], 4), M.round(ci[1], 4)] : null,
      ci95Basis: ci ? 'Fisher z transform, normal approximation, ±1.96 SE' : null,
      pairwiseCompleteN: pc.n,
      suppliedLengthA: xs?.length ?? 0,
      suppliedLengthB: ys?.length ?? 0,
      strength: strengthLabel(r),
    },
    method:
      'Pearson r over pairwise-complete samples; Spearman ρ as the Pearson correlation of tie-averaged ranks; 95 % CI for r by Fisher z = atanh(r) with SE = 1/√(n−3).',
    assumptions: [
      'Pearson r measures linear association only and is sensitive to outliers; Spearman ρ is reported alongside it because a large gap between the two means the relationship is monotonic but not linear.',
    ],
    limitations: [
      alignment === 'index-paired'
        ? 'The two series were paired by storage order, not aligned on a shared time base. This is a correlation between two lists, not a temporal association between two physiological signals.'
        : null,
      'Correlation is not causation and not a diagnosis. It says the two quantities moved together in this sample, nothing about why.',
      pc.n < 12 ? `n = ${pc.n} is small; the interval is wide and the coefficient is unstable.` : null,
      'No multiple-comparison correction was applied. When many pairs are tested, some will look strong by chance alone.',
    ].filter(Boolean),
  });
}

/** Words, not thresholds dressed as significance. */
export function strengthLabel(r) {
  if (r === null || !Number.isFinite(r)) return 'undefined';
  const a = Math.abs(r);
  if (a < 0.1) return 'negligible';
  if (a < 0.3) return 'weak';
  if (a < 0.5) return 'moderate';
  if (a < 0.7) return 'strong';
  return 'very strong';
}

/**
 * Pairwise correlation matrix over named series.
 *
 * @param {{label:string, values:number[], unit?:string}[]} seriesList
 * Pairs that cannot be computed are kept in the output with their refusal
 * reason, so the matrix never shows a blank cell that looks like r = 0.
 */
export function correlationMatrix(seriesList, opts = {}) {
  const list = (Array.isArray(seriesList) ? seriesList : []).filter((s) => s && Array.isArray(s.values));
  if (list.length < 2) {
    return insufficient(
      'correlation-matrix',
      'Correlation matrix',
      `A matrix needs at least two series; ${list.length} were supplied. No series were invented to fill the grid.`,
      0,
    );
  }
  const cells = [];
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const res = correlationAnalysis(list[i].values, list[j].values, {
        labelA: list[i].label,
        labelB: list[j].label,
        unitA: list[i].unit,
        unitB: list[j].unit,
        alignment: opts.alignment,
      });
      cells.push({
        a: list[i].label,
        b: list[j].label,
        status: res.status,
        r: res.values?.pearsonR ?? null,
        rho: res.values?.spearmanRho ?? null,
        n: res.n,
        reason: res.reason,
      });
    }
  }
  const computedCells = cells.filter((c) => c.status === 'computed');
  return computed('correlation-matrix', 'Correlation matrix', {
    n: list.length,
    params: { series: list.map((s) => s.label), pairs: cells.length, alignment: opts.alignment ?? 'index-paired' },
    values: {
      cells,
      computedPairs: computedCells.length,
      refusedPairs: cells.length - computedCells.length,
      strongest: computedCells.length
        ? computedCells.reduce((best, c) => (Math.abs(c.r ?? 0) > Math.abs(best.r ?? 0) ? c : best), computedCells[0])
        : null,
    },
    method: 'Pearson r and Spearman ρ for every unordered pair, each computed by correlationAnalysis over pairwise-complete samples.',
    assumptions: ['Each pair is tested independently; no joint model is fitted.'],
    limitations: [
      `${cells.length - computedCells.length} pair(s) could not be computed and are listed with their reason instead of being shown as zero.`,
      'With many pairs, the strongest coefficient is partly a selection effect. It is a lead for further analysis, not a finding on its own.',
    ],
  });
}

// ---------------------------------------------------------------------------
// PART 21 — group comparison
// ---------------------------------------------------------------------------

/**
 * Two-group comparison. Welch's t (unequal variances) plus Cohen d.
 *
 * Groups must be supplied by the caller. Nothing is split, clustered or
 * inferred here — a group that does not exist in the data cannot be compared.
 */
export function compareGroups(a, b, opts = {}) {
  const labelA = opts.labelA ?? 'Group 1';
  const labelB = opts.labelB ?? 'Group 2';
  const label = `${labelA} vs ${labelB}`;
  const xa = M.finite(Array.isArray(a) ? a : []);
  const xb = M.finite(Array.isArray(b) ? b : []);

  if (!xa.length || !xb.length) {
    return notApplicable(
      'group-comparison',
      label,
      `Both groups need at least one measurement (${xa.length} and ${xb.length} were supplied). No group was inferred and no value was imputed.`,
    );
  }
  if (xa.length < 2 || xb.length < 2) {
    return insufficient(
      'group-comparison',
      label,
      `A spread-based comparison needs at least two measurements per group; the smaller group has ${Math.min(xa.length, xb.length)}.`,
      xa.length + xb.length,
    );
  }
  if (M.sd(xa) === 0 && M.sd(xb) === 0) {
    return notApplicable(
      'group-comparison',
      label,
      'Both groups are constant, so the pooled standard error is zero and neither the t statistic nor Cohen d is defined.',
    );
  }

  const w = M.welchT(a, b);
  const d = M.cohensD(a, b);
  const diff = w.mean1 - w.mean2;
  const se = Math.sqrt(M.variance(xa) / xa.length + M.variance(xb) / xb.length);
  const tcrit = tCritical95(w.df);
  const ci = tcrit !== null ? [diff - tcrit * se, diff + tcrit * se] : null;
  // Hedges' g: small-sample correction of d, reported alongside rather than
  // instead of d so the reader can see which convention is in use.
  const J = 1 - 3 / (4 * (xa.length + xb.length) - 9);
  const g = d === null ? null : d * J;

  const unitA = opts.unitA ?? opts.unit ?? null;
  const unitB = opts.unitB ?? opts.unit ?? null;
  const unitMismatch = Boolean(unitA && unitB && unitA !== unitB);

  return computed('group-comparison', label, {
    n: xa.length + xb.length,
    params: {
      group1: labelA,
      group2: labelB,
      n1: xa.length,
      n2: xb.length,
      unit: opts.unit ?? null,
      unit1: unitA,
      unit2: unitB,
    },
    values: {
      mean1: M.round(w.mean1, 4),
      mean2: M.round(w.mean2, 4),
      sd1: M.round(M.sd(xa), 4),
      sd2: M.round(M.sd(xb), 4),
      median1: M.round(M.median(xa), 4),
      median2: M.round(M.median(xb), 4),
      meanDifference: M.round(diff, 4),
      stdError: M.round(se, 4),
      ci95Difference: ci ? [M.round(ci[0], 4), M.round(ci[1], 4)] : null,
      welchT: w.t === null ? null : M.round(w.t, 4),
      degreesOfFreedom: M.round(w.df, 2),
      tCritical95: tcrit,
      cohensD: d === null ? null : M.round(d, 4),
      hedgesG: g === null ? null : M.round(g, 4),
      effectSize: d === null ? 'undefined' : effectSizeLabel(d),
      unit: opts.unit ?? null,
    },
    method:
      "Welch's t for unequal variances with Satterthwaite degrees of freedom; CI = difference ± t(0.975, df)·SE; Cohen d from the pooled SD; Hedges' g applies the small-sample correction J = 1 − 3/(4(n₁+n₂) − 9).",
    assumptions: [
      'Welch t does not require equal variances, but it does treat the two samples as independent and approximately normal in their means.',
      'Cohen d is a standardized mean difference. It is not a measure of clinical importance.',
    ],
    limitations: [
      unitMismatch
        ? `The two groups are measured in different units (${unitA} vs ${unitB}). The mean difference and Cohen d are arithmetically defined but have no physiological interpretation — they compare two different quantities, not two populations measured the same way.`
        : null,
      'No normality test was run on either group, so the interval is approximate for small or strongly skewed samples.',
      'No p-value is reported; compare |t| with the tabulated critical value shown, and read the effect size alongside the interval.',
      xa.length < 8 || xb.length < 8 ? 'One or both groups have fewer than eight measurements, so the SE and d are unstable.' : null,
      'A difference between two groups in this dataset is an observation about these groups. It is not evidence about a population and not a diagnosis.',
    ].filter(Boolean),
  });
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Run a list of analyses over a series bundle and return every result,
 * including refusals, in the order requested.
 *
 * @param {object} input { primary: {label, values, times, unit},
 *                         secondary: {label, values, unit},
 *                         groupA, groupB, seriesList, analyses: [ids] }
 */
export function runStatisticalAnalyses(input = {}) {
  const requested = input.analyses?.length ? input.analyses : ['descriptive'];
  const primary = input.primary ?? null;
  const out = [];

  for (const id of requested) {
    switch (id) {
      case 'descriptive':
        out.push(
          primary
            ? descriptiveStats(primary.values, { label: primary.label, unit: primary.unit })
            : notApplicable('descriptive', 'Descriptive statistics', 'No series was selected.'),
        );
        break;
      case 'time-series':
        out.push(
          primary
            ? timeSeriesStats(primary.values, primary.times, { label: primary.label, unit: primary.unit })
            : notApplicable('time-series', 'Time-series statistics', 'No series was selected.'),
        );
        break;
      case 'correlation':
        out.push(
          primary && input.secondary
            ? correlationAnalysis(primary.values, input.secondary.values, {
                labelA: primary.label,
                labelB: input.secondary.label,
                unitA: primary.unit,
                unitB: input.secondary.unit,
                alignment: input.alignment,
              })
            : notApplicable(
                'correlation',
                'Correlation',
                'Correlation needs two selected series. Only the supplied series were used; no partner series was invented.',
              ),
        );
        break;
      case 'group-comparison':
        out.push(
          compareGroups(input.groupA?.values, input.groupB?.values, {
            labelA: input.groupA?.label,
            labelB: input.groupB?.label,
            unit: input.groupA?.unit ?? input.groupB?.unit,
            unitA: input.groupA?.unit,
            unitB: input.groupB?.unit,
          }),
        );
        break;
      case 'correlation-matrix':
        out.push(correlationMatrix(input.seriesList, { alignment: input.alignment }));
        break;
      default:
        out.push(notApplicable(id, statAnalysisLabel(id), `"${id}" is not a statistical analysis implemented by this module. Nothing was substituted for it.`));
    }
  }
  return out;
}

/**
 * Honest one-line summary used by report generators and the AI snapshot.
 * Never mentions significance.
 */
export function summarizeStatResult(res) {
  if (!res) return null;
  if (res.status !== 'computed') return `${res.label}: ${res.reason}`;
  switch (res.kind) {
    case 'descriptive':
      return `${res.label}: n=${res.n}, mean ${res.values.mean}${res.values.unit ? ` ${res.values.unit}` : ''}, SD ${res.values.sd}, median ${res.values.median}.`;
    case 'correlation':
      return `${res.label}: r=${res.values.pearsonR} (ρ=${res.values.spearmanRho}, n=${res.n}, ${res.values.strength}).`;
    case 'group-comparison':
      return `${res.label}: Δ=${res.values.meanDifference}, Welch t=${res.values.welchT}, df=${res.values.degreesOfFreedom}, Cohen d=${res.values.cohensD} (${res.values.effectSize}).`;
    case 'time-series':
      return `${res.label}: lag-1 r=${res.values.autocorrLag1}, slope/sample=${res.values.slopePerSample}, r²=${res.values.r2}.`;
    case 'correlation-matrix':
      return `Correlation matrix: ${res.values.computedPairs} computed pair(s), ${res.values.refusedPairs} refused.`;
    default:
      return `${res.label}: computed on n=${res.n}.`;
  }
}

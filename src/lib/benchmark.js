/**
 * Research benchmarking (PART 22).
 *
 * A benchmark metric is only meaningful against labelled reference data. This
 * module therefore refuses by default: if no ground truth is supplied it
 * returns BENCHMARK_UNAVAILABLE and computes nothing. There is no path through
 * this file that produces a precision, recall or latency figure from
 * unlabelled data, from a self-comparison, or from a synthetic stand-in.
 *
 * Two different benchmarking questions are kept separate, because conflating
 * them is how fake numbers appear:
 *
 *   1. classificationMetrics — per-sample binary labels (was this epoch
 *      flagged?). Requires { predicted, truth } pairs.
 *   2. detectionLatency — event times (was the detected event near a real
 *      one, and by how much?). Requires two lists of times in seconds plus a
 *      declared matching tolerance.
 *
 * `rocAuc` is available only when continuous detection scores AND labels are
 * supplied. It is a rank statistic (Mann-Whitney U), so it needs no threshold
 * and makes no distributional assumption.
 *
 * Nothing here reports a p-value or a significance level; see
 * src/lib/researchStats.js for the policy that applies across the platform.
 */

import * as M from './signalMath.js';

export const BENCHMARK_UNAVAILABLE = 'Benchmark unavailable — labeled reference data required.';

export const METRIC_LABELS = {
  precision: 'Precision (positive predictive value)',
  recall: 'Recall (sensitivity, true positive rate)',
  specificity: 'Specificity (true negative rate)',
  f1: 'F1 score',
  fpr: 'False positive rate',
  fnr: 'False negative rate',
  accuracy: 'Accuracy',
  balancedAccuracy: 'Balanced accuracy',
  npv: 'Negative predictive value',
  auc: 'ROC AUC (rank-based)',
};

export const METRIC_NOTES = {
  precision: 'Of the samples the method flagged, the fraction that were truly flagged in the reference labels.',
  recall: 'Of the samples the reference labels mark as true, the fraction the method found.',
  specificity: 'Of the samples the reference labels mark as false, the fraction the method left unflagged.',
  f1: 'Harmonic mean of precision and recall. Useful when the classes are unbalanced; it hides which of the two is weak.',
  fpr: 'Fraction of true negatives that were wrongly flagged.',
  fnr: 'Fraction of true positives that were missed. Equals 1 − recall when recall is defined.',
  accuracy: 'Fraction of all samples labelled correctly. Misleading on imbalanced data — read it with balanced accuracy.',
  balancedAccuracy: 'Mean of recall and specificity; less sensitive to class imbalance than accuracy.',
  npv: 'Of the samples the method left unflagged, the fraction that were truly negative.',
  auc: 'Probability that a randomly chosen positive scores above a randomly chosen negative. Threshold-free.',
};

function ratio(num, den) {
  return den > 0 ? num / den : null;
}

/** Number(null) is 0 — a tolerance must never default to zero by accident. */
function toFiniteNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function round3(v) {
  return v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 1000) / 1000;
}

function refused(kind, label, reason, extra = {}) {
  return {
    kind,
    label,
    status: 'not-computed',
    available: false,
    reason,
    message: BENCHMARK_UNAVAILABLE,
    metrics: {},
    limitations: ['No metric was estimated, substituted or carried over from another dataset.'],
    ...extra,
  };
}

/**
 * Does this application state hold usable ground truth?
 * Used by the UI to decide whether to show the benchmark panel at all.
 */
export function benchmarkAvailability(groundTruthLabels) {
  const rows = Array.isArray(groundTruthLabels) ? groundTruthLabels : [];
  const usable = rows.filter((r) => r && typeof r.truth === 'boolean');
  const timed = rows.filter((r) => r && Number.isFinite(Number(r.truthTimeSec)));
  return {
    available: usable.length > 0 || timed.length > 0,
    totalRows: rows.length,
    binaryLabelRows: usable.length,
    timedTruthRows: timed.length,
    message: usable.length || timed.length ? null : BENCHMARK_UNAVAILABLE,
  };
}

/**
 * Binary classification metrics from { predicted, truth } rows.
 *
 * Rows whose `predicted` or `truth` is not a boolean are excluded and counted,
 * because guessing a missing label would silently change every rate below.
 */
export function classificationMetrics(rows, opts = {}) {
  const label = opts.label ?? 'Detection benchmark';
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) {
    return refused('classification', label, `${BENCHMARK_UNAVAILABLE} No labeled reference rows were supplied for this dataset.`);
  }

  const usable = list.filter((r) => r && typeof r.truth === 'boolean' && typeof r.predicted === 'boolean');
  const skipped = list.length - usable.length;
  if (!usable.length) {
    return refused(
      'classification',
      label,
      `${BENCHMARK_UNAVAILABLE} ${list.length} row(s) were supplied but none carried both a boolean prediction and a boolean reference label.`,
      { rowsSupplied: list.length },
    );
  }

  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  for (const r of usable) {
    if (r.predicted && r.truth) tp += 1;
    else if (r.predicted && !r.truth) fp += 1;
    else if (!r.predicted && r.truth) fn += 1;
    else tn += 1;
  }

  const precision = ratio(tp, tp + fp);
  const recall = ratio(tp, tp + fn);
  const specificity = ratio(tn, tn + fp);
  const fpr = ratio(fp, fp + tn);
  const fnr = ratio(fn, fn + tp);
  const npv = ratio(tn, tn + fn);
  const accuracy = ratio(tp + tn, usable.length);
  const f1 = precision !== null && recall !== null && precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : null;
  const balanced = recall !== null && specificity !== null ? (recall + specificity) / 2 : null;

  const undefinedMetrics = Object.entries({ precision, recall, specificity, fpr, fnr, npv, f1, balancedAccuracy: balanced })
    .filter(([, v]) => v === null)
    .map(([k]) => METRIC_LABELS[k] ?? k);

  return {
    kind: 'classification',
    label,
    status: 'computed',
    available: true,
    reason: null,
    message: null,
    confusion: { tp, fp, fn, tn },
    n: usable.length,
    positivesInTruth: tp + fn,
    negativesInTruth: tn + fp,
    metrics: {
      precision: round3(precision),
      recall: round3(recall),
      specificity: round3(specificity),
      f1: round3(f1),
      fpr: round3(fpr),
      fnr: round3(fnr),
      npv: round3(npv),
      accuracy: round3(accuracy),
      balancedAccuracy: round3(balanced),
    },
    method:
      'Confusion matrix over rows carrying both a boolean prediction and a boolean reference label; every rate is the corresponding cell ratio. A rate whose denominator is zero is reported as undefined rather than as 0.',
    limitations: [
      skipped ? `${skipped} supplied row(s) were excluded because a prediction or a reference label was missing. They were not imputed.` : null,
      undefinedMetrics.length
        ? `Undefined for this sample: ${undefinedMetrics.join(', ')} — the reference labels contain no instances of the required class.`
        : null,
      tp + fn === 0 ? 'The reference labels contain no positive cases, so nothing here measures detection ability.' : null,
      tn + fp === 0 ? 'The reference labels contain no negative cases, so false-alarm behaviour is unmeasured.' : null,
      usable.length < 20 ? `Only ${usable.length} labelled sample(s). Every rate above has a wide sampling error; no interval is quoted because none was computed.` : null,
      'Reference labels are research annotations supplied by the dataset or the researcher. They are not a clinical gold standard unless the source declares them to be one.',
      'Metrics describe this labelled sample only. They are not a validation of the method on new data and not a clinical performance claim.',
    ].filter(Boolean),
  };
}

/**
 * ROC AUC by the Mann-Whitney U statistic, with ties scored as 0.5.
 *
 * @param {{score:number, truth:boolean}[]} scored
 */
export function rocAuc(scored, opts = {}) {
  const label = opts.label ?? 'Score-based benchmark';
  const list = (Array.isArray(scored) ? scored : []).filter(
    (r) => r && Number.isFinite(Number(r.score)) && typeof r.truth === 'boolean',
  );
  if (!list.length) {
    return refused('auc', label, `${BENCHMARK_UNAVAILABLE} No rows with both a numeric detection score and a boolean reference label were supplied.`);
  }
  const pos = list.filter((r) => r.truth).length;
  const neg = list.length - pos;
  if (!pos || !neg) {
    return refused(
      'auc',
      label,
      `AUC needs both classes in the reference labels; this sample has ${pos} positive and ${neg} negative row(s).`,
      { n: list.length },
    );
  }

  const sorted = list.map((r) => ({ s: Number(r.score), t: r.truth })).sort((a, b) => a.s - b.s);
  let sumRanksPos = 0;
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1].s === sorted[i].s) j += 1;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k += 1) if (sorted[k].t) sumRanksPos += avgRank;
    i = j + 1;
  }
  const u = sumRanksPos - (pos * (pos + 1)) / 2;
  const auc = u / (pos * neg);

  return {
    kind: 'auc',
    label,
    status: 'computed',
    available: true,
    reason: null,
    message: null,
    n: list.length,
    positivesInTruth: pos,
    negativesInTruth: neg,
    metrics: { auc: round3(auc) },
    method:
      'Mann-Whitney U over tie-averaged ranks of the detection score; AUC = U / (n₊·n₋). Tied scores contribute 0.5 through the averaged rank.',
    limitations: [
      list.length < 20 ? `Only ${list.length} scored sample(s); the AUC is unstable and no interval is quoted.` : null,
      'AUC summarises ranking across every possible threshold. It does not describe performance at the threshold actually used by the detector.',
      'AUC is computed against the supplied reference labels only. It is not a clinical validation result.',
    ].filter(Boolean),
  };
}

/**
 * Event-time benchmark: matching tolerance, latency, misses and false alarms.
 *
 * Matching is greedy on the nearest unmatched pair and each detection and each
 * reference event is used at most once, so one detection cannot claim credit
 * for several true events. The tolerance is a declared parameter of the
 * benchmark, never an inferred one.
 *
 * @param {object} input { predictedTimes: number[], truthTimes: number[],
 *                         toleranceSec, label, unit }
 */
export function detectionLatency(input = {}) {
  const label = input.label ?? 'Event timing benchmark';
  const pred = (Array.isArray(input.predictedTimes) ? input.predictedTimes : [])
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const truth = (Array.isArray(input.truthTimes) ? input.truthTimes : [])
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (!truth.length) {
    return refused(
      'latency',
      label,
      `${BENCHMARK_UNAVAILABLE} No reference event times were supplied, so there is nothing to measure latency against.`,
      { predictedCount: pred.length },
    );
  }
  if (!pred.length) {
    return {
      kind: 'latency',
      label,
      status: 'computed',
      available: true,
      reason: null,
      message: null,
      toleranceSec: input.toleranceSec ?? null,
      matches: [],
      counts: { matched: 0, missed: truth.length, falseAlarms: 0, predicted: 0, truth: truth.length },
      metrics: {
        detectionRecall: 0,
        detectionPrecision: null,
        detectionF1: 0,
        meanLatencySec: null,
        medianLatencySec: null,
        meanAbsoluteLatencySec: null,
        maxAbsoluteLatencySec: null,
      },
      method: 'No detections were produced, so every reference event is a miss. Precision is undefined because the detector made no positive predictions.',
      limitations: [
        'A detector that produces nothing scores recall 0 and undefined precision. It does not score "perfect specificity" — that would be a different benchmark.',
        'Reference event times are research annotations, not a clinical gold standard unless declared as one.',
      ],
    };
  }

  // Number(null) is 0, which would silently become a zero-second tolerance and
  // turn every detection into a miss. Absent means absent.
  const tolerance = toFiniteNumber(input.toleranceSec);
  if (tolerance === null) {
    return refused(
      'latency',
      label,
      'No matching tolerance was declared. Without one, "detected the right event" has no definition, so no latency or detection rate is reported.',
      { predictedCount: pred.length, truthCount: truth.length },
    );
  }

  const usedPred = new Set();
  const matches = [];
  const misses = [];
  for (const t of truth) {
    let bestIdx = -1;
    let bestDelta = Infinity;
    for (let i = 0; i < pred.length; i += 1) {
      if (usedPred.has(i)) continue;
      const delta = pred[i] - t;
      if (Math.abs(delta) < Math.abs(bestDelta) - 1e-12) {
        bestDelta = delta;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0 && Math.abs(bestDelta) <= tolerance) {
      usedPred.add(bestIdx);
      matches.push({ truthSec: t, predictedSec: pred[bestIdx], latencySec: M.round(bestDelta, 3) });
    } else {
      misses.push(t);
    }
  }
  const falseAlarms = pred.filter((_, i) => !usedPred.has(i));

  const latencies = matches.map((m) => m.latencySec);
  const detectionRecall = ratio(matches.length, truth.length);
  const detectionPrecision = ratio(matches.length, pred.length);
  const detectionF1 =
    detectionRecall !== null && detectionPrecision !== null && detectionRecall + detectionPrecision > 0
      ? (2 * detectionRecall * detectionPrecision) / (detectionRecall + detectionPrecision)
      : null;

  return {
    kind: 'latency',
    label,
    status: 'computed',
    available: true,
    reason: null,
    message: null,
    toleranceSec: tolerance,
    unit: input.unit ?? 's',
    matches,
    missed: misses,
    falseAlarmTimes: falseAlarms,
    counts: {
      matched: matches.length,
      missed: misses.length,
      falseAlarms: falseAlarms.length,
      predicted: pred.length,
      truth: truth.length,
    },
    metrics: {
      detectionRecall: round3(detectionRecall),
      detectionPrecision: round3(detectionPrecision),
      detectionF1: round3(detectionF1),
      meanLatencySec: latencies.length ? round3(M.mean(latencies)) : null,
      medianLatencySec: latencies.length ? round3(M.median(latencies)) : null,
      meanAbsoluteLatencySec: latencies.length ? round3(M.mean(latencies.map(Math.abs))) : null,
      maxAbsoluteLatencySec: latencies.length ? round3(Math.max(...latencies.map(Math.abs))) : null,
      latencySdSec: latencies.length > 1 ? round3(M.sd(latencies)) : null,
    },
    method: `Greedy nearest-neighbour matching within ±${tolerance} s. Each reference event is paired with at most one detection and each detection is used once. Latency = predicted time − reference time, so a negative value means the detector fired early.`,
    limitations: [
      'The tolerance is a declared benchmark parameter. A wider tolerance raises the detection rate without any change to the detector.',
      'Greedy matching is not globally optimal; on dense event trains it can pair events differently from an optimal assignment.',
      misses.length
        ? `${misses.length} reference event(s) were missed. They are listed rather than excluded, because excluding them would inflate the detection rate.`
        : null,
      falseAlarms.length
        ? `${falseAlarms.length} detection(s) matched no reference event within tolerance and are counted as false alarms.`
        : null,
      'Latency is measured against the reference annotation times, which carry their own annotation uncertainty that is not modelled here.',
      'These are benchmark figures for this labelled sample. They are not a clinical performance claim and not a validation on unseen data.',
    ].filter(Boolean),
  };
}

/**
 * Turn detected events plus reference labels for the SAME recording into the
 * per-sample rows classificationMetrics expects.
 *
 * Events are matched to reference times by tolerance; epochs with no reference
 * annotation are excluded, not assumed negative. That distinction is what keeps
 * a sparsely annotated recording from scoring a fake 99 % specificity.
 */
export function rowsFromEvents({ detections, truthTimes, toleranceSec, annotatedSpanSec = null }) {
  const dets = (Array.isArray(detections) ? detections : [])
    .map((d) => (typeof d === 'number' ? d : Number(d?.offsetSec)))
    .filter(Number.isFinite);
  const truth = (Array.isArray(truthTimes) ? truthTimes : []).map(Number).filter(Number.isFinite);
  const tol = toFiniteNumber(toleranceSec);
  if (!truth.length || tol === null) {
    return { rows: [], excluded: dets.length, reason: BENCHMARK_UNAVAILABLE };
  }
  const span = toFiniteNumber(annotatedSpanSec);
  const rows = [];
  let excluded = 0;
  for (const t of truth) {
    const hit = dets.some((d) => Math.abs(d - t) <= tol);
    rows.push({ predicted: hit, truth: true, atSec: t });
  }
  // Detections with no reference event inside the annotated span are false
  // positives; outside it they are unverifiable and are excluded.
  for (const d of dets) {
    const near = truth.some((t) => Math.abs(d - t) <= tol);
    if (!near) {
      if (span === null || (d >= 0 && d <= span)) {
        rows.push({ predicted: true, truth: false, atSec: d });
      } else {
        excluded += 1;
      }
    }
  }
  return { rows, excluded, reason: null };
}

/**
 * One-call bundle used by the Research Lab page and by report generation.
 * Every sub-result keeps its own status, so a partial benchmark shows exactly
 * which part was computable and which was not.
 */
export function runBenchmark({ labels = null, detections = null, truthTimes = null, toleranceSec = null, label = 'Benchmark' } = {}) {
  const availability = benchmarkAvailability(labels);
  const rows = Array.isArray(labels) ? labels.filter((r) => r && typeof r.truth === 'boolean' && typeof r.predicted === 'boolean') : [];
  const classification = rows.length
    ? classificationMetrics(rows, { label: `${label} — per-sample labels` })
    : refused('classification', `${label} — per-sample labels`, `${BENCHMARK_UNAVAILABLE} The dataset carries no per-sample reference labels.`);

  const latency = detectionLatency({
    predictedTimes: (Array.isArray(detections) ? detections : []).map((d) => (typeof d === 'number' ? d : Number(d?.offsetSec))),
    truthTimes: Array.isArray(truthTimes)
      ? truthTimes
      : rows.filter((r) => Number.isFinite(Number(r.truthTimeSec)) && r.truth).map((r) => Number(r.truthTimeSec)),
    toleranceSec,
    label: `${label} — event timing`,
  });

  const scored = (Array.isArray(labels) ? labels : []).filter((r) => r && Number.isFinite(Number(r.score)) && typeof r.truth === 'boolean');
  const auc = scored.length
    ? rocAuc(scored.map((r) => ({ score: Number(r.score), truth: r.truth })), { label: `${label} — score ranking` })
    : refused('auc', `${label} — score ranking`, `${BENCHMARK_UNAVAILABLE} No continuous detection scores were supplied alongside reference labels.`);

  const anyComputed = [classification, latency, auc].some((r) => r.status === 'computed');
  return {
    label,
    available: anyComputed,
    availability,
    results: { classification, latency, auc },
    message: anyComputed ? null : BENCHMARK_UNAVAILABLE,
    note: anyComputed
      ? 'Only the panels below that show a computed status were measured. The others report why they could not be.'
      : BENCHMARK_UNAVAILABLE,
  };
}

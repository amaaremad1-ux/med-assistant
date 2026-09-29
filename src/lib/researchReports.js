/**
 * Research statistics, discovery reports, and benchmarking.
 * Precision/recall are computed ONLY when labelled ground-truth exists.
 */

import { mean, sd, pearson } from './stats.js';
import { finite } from './signalMath.js';
import { resolveSignalValues } from './signalModel.js';
import { CAUSATION_DISCLAIMER } from './crossDomain.js';

export function descriptiveReport(values, label) {
  const xs = finite(Array.isArray(values) ? values : []);
  if (xs.length < 2) {
    return {
      label,
      status: 'insufficient-data',
      reason: 'Fewer than 2 numeric observations — descriptive statistics are not reported.',
    };
  }
  const sorted = xs.slice().sort((a, b) => a - b);
  const q = (p) => {
    const rank = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(rank);
    const hi = Math.ceil(rank);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo);
  };
  return {
    label,
    status: 'computed',
    n: xs.length,
    mean: round(mean(xs)),
    sd: round(sd(xs)),
    min: round(sorted[0]),
    q25: round(q(25)),
    median: round(q(50)),
    q75: round(q(75)),
    max: round(sorted[sorted.length - 1]),
    method: 'Sample mean, unbiased SD, and linear-interpolated percentiles.',
  };
}

export function statsForSignals(signals) {
  return signals.map((s) => {
    const win = resolveSignalValues(s, { maxPoints: 2000 });
    return descriptiveReport(win.values, s.typeLabel || s.type);
  });
}

export function generateDiscoveryReport({
  subjectId,
  hubCounts,
  qualitySummary,
  fusion,
  crossDomain,
  baseline,
  fingerprint,
  run,
}) {
  const sections = [];
  sections.push({
    title: 'Scope',
    body: subjectId
      ? `Research observations for opaque subject code ${subjectId}.`
      : 'Research observations across currently loaded records. No subject filter applied.',
  });
  sections.push({
    title: 'Data inventory',
    body: hubCounts
      ? `Hub items: ${hubCounts.total}. Processed: ${hubCounts.byStatus?.Processed ?? 0}. Error: ${hubCounts.byStatus?.Error ?? 0}. Insufficient data: ${hubCounts.byStatus?.['Insufficient data'] ?? 0}.`
      : 'No hub inventory was supplied.',
  });
  if (qualitySummary) {
    sections.push({
      title: 'Signal quality',
      body: `GOOD ${qualitySummary.GOOD ?? 0} · FAIR ${qualitySummary.FAIR ?? 0} · POOR ${qualitySummary.POOR ?? 0} · INSUFFICIENT DATA ${qualitySummary['INSUFFICIENT DATA'] ?? 0}.`,
    });
  }
  if (baseline) {
    sections.push({
      title: 'Personal baseline',
      body:
        baseline.status === 'computed'
          ? `Current mean ${baseline.currentMean} vs personal baseline ${baseline.baselineMean} (z ${baseline.zScore ?? 'not defined'}).`
          : baseline.reason,
    });
  }
  if (fingerprint) {
    sections.push({
      title: 'Bio-signal fingerprint',
      body:
        fingerprint.status === 'computed'
          ? `${fingerprint.dimensions.length} dimensions. ${fingerprint.label}.`
          : fingerprint.reason,
    });
  }
  if (fusion) {
    sections.push({
      title: 'Multi-signal fusion',
      body:
        fusion.status === 'computed'
          ? `${fusion.pairs.length} pairwise correlations from existing signals only.`
          : fusion.reason,
    });
  }
  if (crossDomain) {
    const computed = (crossDomain.pairs || []).filter((p) => p.status === 'computed').length;
    sections.push({
      title: 'Cross-domain correlation',
      body: `${computed} computed pair(s). ${CAUSATION_DISCLAIMER}`,
    });
  }
  if (run) {
    sections.push({
      title: 'Linked research run',
      body: `${run.id} · ${run.algorithm}. ${run.language}`,
    });
  }
  sections.push({
    title: 'Medical safety',
    body: 'Research observation. Requires professional interpretation. Not a diagnosis and not a medical device output.',
  });
  return {
    generatedAt: new Date().toISOString(),
    title: 'Research Discovery Report',
    sections,
    disclaimer: 'Prototype / Research System — informational estimates only.',
  };
}

/**
 * @param {{ labels: { predicted: boolean, truth: boolean }[] }} input
 */
export function benchmarkFromLabels(labelled) {
  if (!labelled?.length) {
    return {
      status: 'not-computed',
      reason:
        'Precision and recall are not calculated — no labeled ground-truth data is attached to this dataset.',
      precision: null,
      recall: null,
      f1: null,
    };
  }
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  for (const row of labelled) {
    if (row.predicted && row.truth) tp += 1;
    else if (row.predicted && !row.truth) fp += 1;
    else if (!row.predicted && row.truth) fn += 1;
    else tn += 1;
  }
  const precision = tp + fp ? tp / (tp + fp) : null;
  const recall = tp + fn ? tp / (tp + fn) : null;
  const f1 = precision != null && recall != null && precision + recall ? (2 * precision * recall) / (precision + recall) : null;
  return {
    status: 'computed',
    tp,
    fp,
    fn,
    tn,
    n: labelled.length,
    precision: round(precision),
    recall: round(recall),
    f1: round(f1),
    method: 'Binary precision/recall against user-supplied ground-truth labels only.',
    limitations: ['Labels are research annotations, not clinical gold standards unless so declared by the dataset.'],
  };
}

function round(v) {
  if (v == null || !Number.isFinite(v)) return null;
  return Math.round(v * 1000) / 1000;
}

export function pearsonSafe(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 3) return { r: null, n, status: 'insufficient-data' };
  return { r: Math.round(pearson(a.slice(0, n), b.slice(0, n)) * 1000) / 1000, n, status: 'computed' };
}

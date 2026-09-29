/**
 * Personal bio-signal baseline, fingerprint, and multi-signal fusion.
 *
 * Baselines compare a recording only against historical recordings of the
 * SAME subject and SAME signal type. Fingerprints are labelled as a
 * research representation, not an identity or diagnosis. Fusion uses only
 * signals that actually exist for the subject.
 */

import { resolveSignalValues, describeSignal } from './signalModel.js';
import { finite, mean, sd, median } from './signalMath.js';
import { assessSignalQuality } from './signalQuality.js';
import { pearson } from './stats.js';

export function recordingsFor(signals, subjectId, type) {
  return signals.filter((s) => s.subjectId === subjectId && s.type === type);
}

export function personalBaseline(signals, record) {
  if (!record?.subjectId) {
    return {
      status: 'insufficient-data',
      reason: 'No subject identifier is attached — a personal baseline cannot be formed.',
    };
  }
  const hist = recordingsFor(signals, record.subjectId, record.type).filter((s) => s.id !== record.id);
  if (!hist.length) {
    return {
      status: 'insufficient-data',
      reason: 'No historical personal recordings of this signal type exist for this subject.',
      subjectId: record.subjectId,
      type: record.type,
    };
  }

  const currentWin = resolveSignalValues(record, { maxPoints: 1500 });
  const currentXs = finite(currentWin.values);
  if (currentXs.length < 8) {
    return {
      status: 'insufficient-data',
      reason: currentWin.error || 'Current recording has too few usable samples for a baseline comparison.',
    };
  }

  const histMeans = [];
  const used = [];
  for (const h of hist) {
    const w = resolveSignalValues(h, { maxPoints: 1500 });
    const xs = finite(w.values);
    if (xs.length < 8) continue;
    histMeans.push(mean(xs));
    used.push(h.id);
  }
  if (!histMeans.length) {
    return {
      status: 'insufficient-data',
      reason: 'Historical recordings exist but none contain enough usable samples.',
    };
  }

  const baseMean = mean(histMeans);
  const baseSd = sd(histMeans);
  const curMean = mean(currentXs);
  const delta = curMean - baseMean;
  const z = baseSd ? delta / baseSd : null;

  return {
    status: 'computed',
    subjectId: record.subjectId,
    type: record.type,
    typeLabel: record.typeLabel,
    historicalRecordings: used.length,
    historicalIds: used,
    baselineMean: round(baseMean),
    baselineSd: round(baseSd),
    currentMean: round(curMean),
    delta: round(delta),
    zScore: z === null ? null : round(z),
    unit: record.unit,
    method: 'Mean of per-recording means from prior personal recordings of the same type; current recording compared by z = (current − baseline) / SD.',
    limitations: [
      'Comparison is descriptive only and is not a clinical change score.',
      'Research observation. Requires professional interpretation.',
      'Between-recording differences may reflect device, context or quality, not physiology.',
    ],
    label: 'Personal bio-signal baseline (research)',
  };
}

/**
 * Compact numeric vector describing available derived/raw summaries for a subject.
 * Explicitly not an identity biometric.
 */
export function bioSignalFingerprint(signals, subjectId) {
  const mine = signals.filter((s) => s.subjectId === subjectId);
  if (!mine.length) {
    return {
      status: 'insufficient-data',
      reason: 'No bio-signal records exist for this subject.',
      label: 'Research representation — not an identity fingerprint',
    };
  }

  const dimensions = [];
  for (const rec of mine) {
    const win = resolveSignalValues(rec, { maxPoints: 800 });
    const xs = finite(win.values);
    if (xs.length < 5) continue;
    dimensions.push({
      signalId: rec.id,
      type: rec.type,
      typeLabel: rec.typeLabel,
      kind: rec.kind,
      mean: round(mean(xs)),
      median: round(median(xs)),
      sd: round(sd(xs)),
      n: xs.length,
      quality: assessSignalQuality(rec, win).grade,
    });
  }

  if (!dimensions.length) {
    return {
      status: 'insufficient-data',
      reason: 'Signals exist but none yielded usable numeric summaries.',
      label: 'Research representation — not an identity fingerprint',
    };
  }

  return {
    status: 'computed',
    subjectId,
    label: 'Research representation — not an identity fingerprint and not a diagnosis',
    dimensions,
    method: 'Per-signal location and spread of windowed samples that actually exist.',
    limitations: [
      'This vector is a research representation of available recordings only.',
      'It must not be treated as a biometric identity, disease signature, or clinical phenotype.',
    ],
  };
}

export function fuseSignals(signals, subjectId) {
  const mine = signals.filter((s) => s.subjectId === subjectId);
  if (mine.length < 2) {
    return {
      status: 'insufficient-data',
      reason: 'Multi-signal fusion requires at least two existing records for the same subject.',
      used: mine.map((s) => s.id),
    };
  }

  const numeric = [];
  for (const rec of mine) {
    const win = resolveSignalValues(rec, { maxPoints: 600 });
    const xs = finite(win.values);
    if (xs.length < 8) continue;
    numeric.push({ rec, xs: xs.slice(0, 400), mean: mean(xs) });
  }

  if (numeric.length < 2) {
    return {
      status: 'insufficient-data',
      reason: 'Fewer than two signals had usable samples. Missing channels were not imputed.',
      present: mine.map((s) => describeSignal(s)),
    };
  }

  const pairs = [];
  for (let i = 0; i < numeric.length; i += 1) {
    for (let j = i + 1; j < numeric.length; j += 1) {
      const n = Math.min(numeric[i].xs.length, numeric[j].xs.length);
      if (n < 8) continue;
      const r = pearson(numeric[i].xs.slice(0, n), numeric[j].xs.slice(0, n));
      pairs.push({
        a: numeric[i].rec.id,
        b: numeric[j].rec.id,
        aLabel: numeric[i].rec.typeLabel,
        bLabel: numeric[j].rec.typeLabel,
        n,
        r: round(r),
        note: 'Pearson correlation on overlapping sample indices — not evidence of causation.',
      });
    }
  }

  return {
    status: 'computed',
    subjectId,
    used: numeric.map((n) => n.rec.id),
    omitted: mine.filter((s) => !numeric.some((n) => n.rec.id === s.id)).map((s) => s.id),
    pairs,
    method: 'Pairwise Pearson correlation on existing windowed samples only. Missing signals are omitted, never filled in.',
    limitations: [
      'Index-aligned samples are not necessarily time-synchronised across devices.',
      'Correlation is not causation.',
      'Research observation. Requires professional interpretation.',
    ],
  };
}

function round(v) {
  if (v == null || !Number.isFinite(v)) return null;
  return Math.round(v * 1000) / 1000;
}

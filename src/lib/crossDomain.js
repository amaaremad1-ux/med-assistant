/**
 * Cross-domain research correlation and unknown-pattern discovery.
 * Correlation is never described as causation.
 */

import { seriesFor, distinctAnalytes } from './appDataSelectors.js';
import { resolveSignalValues, windowTimes } from './signalModel.js';
import { finite } from './signalMath.js';
import { pearson } from './stats.js';
import { patternClustering, detectEvents, featureVector } from './signalProcessing.js';

export const CAUSATION_DISCLAIMER =
  'Reported associations are correlations or co-occurrence statistics only. They are not causal claims and are not diagnoses.';

function numericSeries(values) {
  return values.filter((v) => Number.isFinite(v));
}

export function crossDomainMatrix({ bloodTests, geneticRecords, signals, subjectId }) {
  const domains = [];

  for (const name of distinctAnalytes(bloodTests)) {
    const s = seriesFor(bloodTests, name).map((e) => e.value).filter((v) => Number.isFinite(v));
    if (s.length >= 3) domains.push({ id: `lab:${name}`, domain: 'lab', label: name, values: s });
  }

  if (geneticRecords.length) {
    const het = geneticRecords.filter((g) => /hetero/i.test(g.zygosity)).length;
    domains.push({
      id: 'genetic:het-count',
      domain: 'genetic',
      label: 'Heterozygous variant count (research tally)',
      values: [het],
    });
  }

  const mine = subjectId ? signals.filter((s) => s.subjectId === subjectId) : signals;
  for (const rec of mine) {
    if (rec.category !== 'sleep' && rec.category !== 'movement' && rec.category !== 'metabolic' && rec.category !== 'cardiac')
      continue;
    const win = resolveSignalValues(rec, { maxPoints: 400 });
    const xs = finite(win.values);
    if (xs.length < 8) continue;
    domains.push({
      id: `sig:${rec.id}`,
      domain: rec.category,
      label: rec.typeLabel,
      values: xs,
    });
  }

  const pairs = [];
  for (let i = 0; i < domains.length; i += 1) {
    for (let j = i + 1; j < domains.length; j += 1) {
      const a = domains[i];
      const b = domains[j];
      const n = Math.min(a.values.length, b.values.length);
      if (n < 3) {
        pairs.push({
          a: a.id,
          b: b.id,
          aLabel: a.label,
          bLabel: b.label,
          status: 'insufficient-data',
          reason: 'Fewer than 3 paired observations — correlation is not computed.',
        });
        continue;
      }
      if (a.values.length === 1 || b.values.length === 1) {
        pairs.push({
          a: a.id,
          b: b.id,
          aLabel: a.label,
          bLabel: b.label,
          status: 'insufficient-data',
          reason: 'A domain has only a single number, so a correlation is not defined.',
        });
        continue;
      }
      const r = pearson(a.values.slice(0, n), b.values.slice(0, n));
      pairs.push({
        a: a.id,
        b: b.id,
        aLabel: a.label,
        bLabel: b.label,
        domains: `${a.domain} × ${b.domain}`,
        n,
        r: Math.round(r * 1000) / 1000,
        status: 'computed',
        interpretation: 'Correlation only. Not causation.',
      });
    }
  }

  return {
    domains: domains.map((d) => ({ id: d.id, domain: d.domain, label: d.label, n: d.values.length })),
    pairs,
    disclaimer: CAUSATION_DISCLAIMER,
    method: 'Pearson correlation on the first n overlapping numeric observations per pair. Series are not time-aligned unless they already share length.',
  };
}

export function unknownPatternDiscovery(signals, subjectId) {
  const mine = (subjectId ? signals.filter((s) => s.subjectId === subjectId) : signals).slice(0, 12);
  const seriesList = [];
  for (const rec of mine) {
    const win = resolveSignalValues(rec, { maxPoints: 256 });
    const xs = finite(win.values);
    if (xs.length < 16) continue;
    const times = windowTimes(win);
    const features = featureVector(win.values, times, win.dt);
    if (!features) continue;
    seriesList.push({ id: rec.id, label: rec.typeLabel, values: xs, features });
  }
  if (seriesList.length < 4) {
    return {
      status: 'insufficient-data',
      reason: 'Unknown pattern discovery needs at least four numeric series with computable feature vectors.',
      findings: [],
    };
  }
  const clustered = patternClustering(seriesList, { k: 2 });
  return {
    status: clustered?.status === 'insufficient-data' ? 'insufficient-data' : 'computed',
    algorithm: 'Feature-vector clustering of windowed series (mean, SD, RMS, slope, RMSSD, skewness).',
    findings: clustered,
    limitations: [
      'Clusters are unsupervised groupings of available recordings, not named diseases.',
      CAUSATION_DISCLAIMER,
      'Research observation. Requires professional interpretation.',
    ],
  };
}

export function signalEventBundle(record) {
  if (!record) return { events: [], reason: 'No signal record selected.', limitations: ['Insufficient evidence'] };
  const result = detectEvents(record, { maxPoints: 2000 });
  return {
    ...result,
    language: 'Research event candidates. Not clinical events and not diagnoses.',
  };
}

export function domainCoverage({ bloodTests, geneticRecords, signals }) {
  return {
    genetics: geneticRecords.length > 0,
    labs: bloodTests.length > 0,
    signals: signals.length > 0,
    sleep: signals.some((s) => s.category === 'sleep'),
    activity: signals.some((s) => s.category === 'movement'),
  };
}

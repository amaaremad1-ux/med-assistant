/**
 * Research Experiment Center store (#20).
 * Simulated experiment metrics + local persistence of saved runs.
 * All metrics are deterministic placeholders derived from the experiment
 * parameters — they are simulated demonstration values, NOT validation results.
 */

import { MODEL_CATALOG } from '../data/syntheticData.js';

const KEY = 'sha_experiments_v1';
const rand = mulberry32Local(4242);

function mulberry32Local(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashCode(str) {
  let h = 0;
  for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * Deterministic simulated metrics for a set of experiment parameters.
 * Longer horizons and cross-sectional datasets modestly reduce demo AUC;
 * longitudinal panels and richer biomarker sets modestly increase it.
 */
export function simulateMetrics({ dataset, biomarkers, model, horizon }) {
  const key = [dataset, [...biomarkers].sort().join('|'), model, horizon].join('::');
  const rng = mulberry32Local(hashCode(key));

  const horizonPenalty = { h6: 0, h12: 0.01, h24: 0.025, h60: 0.045 }[horizon] || 0.02;
  const datasetBonus = dataset === 'ds-p' ? 0.03 : dataset === 'ds-b' ? 0.01 : 0;
  const featureBonus = Math.min(0.03, biomarkers.length * 0.004);
  const modelBonus = { lr: -0.02, rf: 0.01, xgb: 0.02, nn: 0 }[model] || 0;

  const base = 0.7 + rng() * 0.06;
  const auc = Math.round(clamp01(base + datasetBonus + featureBonus + modelBonus - horizonPenalty) * 100) / 100;
  const sensitivity = Math.round(clamp01(0.62 + rng() * 0.14 + featureBonus - horizonPenalty) * 100) / 100;
  const specificity = Math.round(clamp01(0.64 + rng() * 0.13 + featureBonus) * 100) / 100;
  const brier = Math.round((0.12 + rng() * 0.06 + horizonPenalty) * 100) / 100;

  const calibration = Array.from({ length: 10 }, (_, i) => ({
    decile: i + 1,
    predicted: Math.round((i + 0.5) * 10),
    observed: Math.round(clamp01((i + 0.5) / 10 + (rng() - 0.5) * 0.12) * 100),
  }));

  return {
    key,
    auc,
    sensitivity,
    specificity,
    brier,
    calibration,
    simulated: true,
  };
}

/** Runs all demo models on the same configuration for comparison charts. */
export function compareModels(params) {
  return MODEL_CATALOG.map((m) => ({
    model: m.name,
    id: m.id,
    ...simulateMetrics({ ...params, model: m.id }),
  }));
}

const clamp01 = (v) => Math.min(Math.max(v, 0.01), 0.99);

// ---------- Saved experiment persistence ----------

export function listExperiments() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveExperiment(entry) {
  const all = listExperiments();
  const record = {
    id: 'exp-' + Date.now(),
    savedAt: new Date().toISOString(),
    ...entry,
  };
  all.unshift(record);
  try { localStorage.setItem(KEY, JSON.stringify(all.slice(0, 25))); } catch { /* storage unavailable */ }
  return record;
}

export function deleteExperiment(id) {
  const all = listExperiments().filter((e) => e.id !== id);
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage unavailable */ }
  return all;
}

export function clearExperiments() {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

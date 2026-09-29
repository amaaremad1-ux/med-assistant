/**
 * Demo analytics engine for the Smart Health AI research prototype.
 *
 * Everything here is a TRANSPARENT, UNVALIDATED demonstration scorer built
 * for UI prototyping. The "risk" it produces is a statistical estimate from
 * synthetic data — it is not a medical diagnosis and has no clinical validity.
 * The architecture (feature defs → scorer → uncertainty → explanations) is
 * deliberately shaped so a validated model could be swapped in later.
 */

import {
  MONTHLY, WEEKLY_DEVICE, POPULATION, VALIDATION_PAIRS, MODEL_CATALOG,
  DEMO_NOW, MODEL_VERSION,
} from '../data/syntheticData.js';
import { mean, sd, linreg, pearson, mae, rmse, autocorr, clamp, r1, r2 } from './stats.js';

export const MODEL = { version: MODEL_VERSION, computedAt: DEMO_NOW };

// ============================================================
// 1. Demo risk scorer (explainable weighted logistic)
// ============================================================

export const FEATURE_DEFS = [
  { id: 'hba1c', label: 'HbA1c', unit: '%', ref: 5.7, spread: 1.0, weight: 0.26 },
  { id: 'glucose', label: 'Fasting glucose', unit: 'mg/dL', ref: 95, spread: 25, weight: 0.2 },
  { id: 'bmi', label: 'Body composition (BMI)', unit: 'kg/m²', ref: 23.5, spread: 6, weight: 0.17 },
  { id: 'activity', label: 'Physical activity', unit: 'min/wk', ref: 160, spread: 90, weight: 0.13, protective: true },
  { id: 'triglycerides', label: 'Lipid burden (TG)', unit: 'mg/dL', ref: 120, spread: 70, weight: 0.1 },
  { id: 'sleep', label: 'Sleep duration', unit: 'h', ref: 7.5, spread: 1.5, weight: 0.06, protective: true },
  { id: 'familyHistory', label: 'Family history (T2D)', unit: '', fixed: true, weight: 0.08 },
];

const K = 2.0;
const C = -2.1;

function normalizedValue(def, value) {
  if (def.fixed) return value ? 1 : 0;
  const raw = (value - def.ref) / def.spread;
  return def.protective ? -raw : raw;
}

/** Demo scorer: returns { score, z, contributions } for a values object. */
export function demoRisk(values) {
  let z = 0;
  const contributions = [];
  for (const def of FEATURE_DEFS) {
    const value = def.fixed ? (values.familyHistory ?? true) : values[def.id];
    const x = normalizedValue(def, value);
    const contribution = def.weight * x;
    z += contribution;
    contributions.push({
      id: def.id,
      label: def.label,
      unit: def.unit,
      value,
      weight: def.weight,
      x: r2(x),
      contribution: r2(contribution),
      dirLabel: x > 0.05 ? 'Increases estimate' : x < -0.05 ? 'Decreases estimate' : 'Neutral',
    });
  }
  const score = clamp((100 / (1 + Math.exp(-(K * z + C)))) , 1, 99);
  return { score, z, contributions };
}

export const latestPoint = MONTHLY[MONTHLY.length - 1];
export const currentRisk = demoRisk(latestPoint);
export const currentContributions = currentRisk.contributions;

// ============================================================
// 2. Risk trajectory + uncertainty engine (#10, #16)
// ============================================================

function measurementsUpTo(i) {
  let n = 0;
  for (let m = 0; m <= i; m++) n += MONTHLY[m].missingActivity ? 6 : 7;
  return n;
}

function completenessAt(i) {
  const missing = MONTHLY.slice(0, i + 1).filter((p) => p.missingActivity).length;
  return r2(1 - missing / ((i + 1) * 7));
}

export const riskTrajectory = MONTHLY.map((p) => {
  const { score } = demoRisk(p);
  const n = measurementsUpTo(p.i);
  const completeness = completenessAt(p.i);
  const halfWidth = Math.round(5 + 14 * (1 - Math.min(1, n / 90)) + 10 * (1 - completeness));
  return {
    i: p.i,
    label: p.label,
    risk: Math.round(score),
    lo: Math.max(1, Math.round(score - halfWidth)),
    hi: Math.min(99, Math.round(score + halfWidth)),
    n,
    completeness,
  };
});

export const latestRisk = {
  ...riskTrajectory[riskTrajectory.length - 1],
  modelVersion: MODEL.version,
  computedAt: MODEL.computedAt,
  populationAverage: 16,
  horizon: '5-year',
  disclaimer:
    'Research estimate from an unvalidated demo model on synthetic data. Not a diagnosis and not usable for clinical decisions.',
};

// ============================================================
// 3. Personal baseline (first 6 months, trend-aware) (#2)
// ============================================================

const BASELINE_KEYS = ['glucose', 'hba1c', 'bmi', 'activity', 'sleep', 'triglycerides', 'ldl', 'systolic'];

export const BIOMARKER_LABELS = {
  glucose: 'Fasting glucose', hba1c: 'HbA1c', bmi: 'BMI', activity: 'Activity',
  sleep: 'Sleep duration', triglycerides: 'Triglycerides', ldl: 'LDL', systolic: 'Systolic BP',
};

function baselineFor(key) {
  const pts = MONTHLY.slice(0, 6).map((p, i) => ({ x: i, y: p[key] }));
  const { slope, intercept, r2: fit } = linreg(pts);
  const resid = pts.map((p) => p.y - (intercept + slope * p.x));
  return {
    slope: r2(slope),
    intercept,
    residSd: r1(sd(resid) || 1),
    mean: r1(mean(pts.map((p) => p.y))),
    fit: r2(fit),
    window: 'Apr – Sep 2025 (6 monthly points)',
  };
}

export const BASELINE = Object.fromEntries(BASELINE_KEYS.map((k) => [k, baselineFor(k)]));

/** Predicted value at month i from the personal baseline trend. */
export const predictedAt = (key, i) => BASELINE[key].intercept + BASELINE[key].slope * i;

// Weekly noise floor per biomarker — realistic day-to-day variation scale.
const WEEKLY_FLOOR = { glucose: 4, hba1c: 0.15, bmi: 0.5, triglycerides: 12, systolic: 5 };

// ============================================================
// 4. Weekly deviation + anomaly detection (#4, #14)
// ============================================================

const WEEKLY_TRACKED = ['glucose', 'hba1c', 'bmi', 'triglycerides'];

export const weeklyDeviation = WEEKLY_DEVICE.map((p) => {
  const z = {};
  for (const key of WEEKLY_TRACKED) {
    const pred = predictedAt(key, 17);
    const floor = Math.max(BASELINE[key].residSd, WEEKLY_FLOOR[key] || 1);
    z[key] = r2((p[key] - pred) / floor);
  }
  const composite = r1(mean(WEEKLY_TRACKED.map((k) => Math.abs(z[k]))));
  const maxAbs = Math.max(...WEEKLY_TRACKED.map((k) => Math.abs(z[k])));
  return { w: p.w, label: p.label, z, composite, maxAbs: r1(maxAbs) };
});

export const deviationReport = (() => {
  const latest = weeklyDeviation[weeklyDeviation.length - 1];
  const rows = WEEKLY_TRACKED.map((k) => ({
    id: k,
    label: BIOMARKER_LABELS[k],
    value: WEEKLY_DEVICE[WEEKLY_DEVICE.length - 1][k],
    predicted: r1(predictedAt(k, 17)),
    z: latest.z[k],
    status: Math.abs(latest.z[k]) > 2 ? 'bad' : Math.abs(latest.z[k]) > 1 ? 'warn' : 'good',
  }));
  const score = latest.composite;
  return {
    rows,
    score,
    level: score > 1.5 ? 'bad' : score > 0.8 ? 'warn' : 'good',
    summary: `Composite deviation score ${score} — mean absolute z-deviation from the personal baseline trend across ${WEEKLY_TRACKED.length} biomarkers.`,
  };
})();

export const anomalyReport = (() => {
  const events = [];
  const normalVariations = [];
  for (const week of weeklyDeviation) {
    const flagged = WEEKLY_TRACKED.filter((k) => Math.abs(week.z[k]) >= 1.5);
    const strong = WEEKLY_TRACKED.filter((k) => Math.abs(week.z[k]) >= 2);
    if (strong.length >= 1 || flagged.length >= 2) {
      events.push({
        w: week.w,
        label: week.label,
        kind: flagged.length >= 2 ? 'multi' : 'single',
        biomarkers: flagged.map((k) => ({ id: k, label: BIOMARKER_LABELS[k], z: week.z[k] })),
        score: week.maxAbs,
        note:
          flagged.length >= 2
            ? `Pattern deviation — ${flagged.map((k) => BIOMARKER_LABELS[k]).join(' & ')} co-elevated beyond 1.5σ.`
            : `Single-biomarker excursion beyond 2σ in ${BIOMARKER_LABELS[flagged[0]]}.`,
      });
    } else if (week.maxAbs >= 0.5) {
      normalVariations.push(week);
    }
  }
  return {
    events,
    normalVariations,
    status: events.length ? 'bad' : 'good',
    statusLabel: events.length
      ? `${events.length} deviation${events.length > 1 ? 's' : ''} flagged in the last 12 weeks`
      : 'No deviations flagged',
    method:
      'Weekly values are compared against the personal baseline trend (not the population). Flags require |z| ≥ 2 in one biomarker, or ≥ 1.5σ in two biomarkers simultaneously (pattern-level). Isolated 0.5–1.5σ movements are classified as expected variation.',
  };
})();

// ============================================================
// 5. Sensor drift detection + calibration monitor (#22, #23)
// ============================================================

export const driftReport = (() => {
  const resid = WEEKLY_DEVICE.map((p) => ({ x: p.w, y: p.glucose - p.glucoseReference }));
  const { slope } = linreg(resid);
  const recent = resid.slice(-4);
  const recentMean = r1(mean(recent.map((p) => p.y)));
  const detected = slope > 0.15;
  return {
    slope: r2(slope),
    recentMean,
    detected,
    status: detected ? 'warn' : 'good',
    statusLabel: detected ? 'Drift detected' : 'No drift detected',
    summary: detected
      ? `Device glucose reads +${r2(slope)} mg/dL per week above the paired reference since ~week 6 — consistent with gradual calibration drift.`
      : 'Device and reference streams agree within expected noise.',
    weekly: resid.map((p) => ({ x: p.w, y: r2(p.y) })),
  };
})();

export const calibrationReport = {
  needed: driftReport.recentMean > 3,
  status: driftReport.recentMean > 3 ? 'warn' : 'good',
  statusLabel: driftReport.recentMean > 3 ? 'Calibration recommended' : 'Calibration OK',
  reason: driftReport.summary,
  lastCalibration: 'Aug 02, 2026',
  cadence: 'Every 8 weeks (prototype policy)',
  nextDue: 'Sep 27, 2026',
};

// ============================================================
// 6. Data quality engine (#21)
// ============================================================

export const dataQualityReport = (() => {
  const weekly = WEEKLY_DEVICE.map((p) => {
    let score = 97;
    const issues = [];
    if (p.sleepMissing) { score -= 18; issues.push('Sleep field missing'); }
    if (p.inconsistent) { score -= 14; issues.push('Duplicate CV 9.2% (limit 5%)'); }
    if (p.w === 7) { score -= 8; issues.push('Implausible rate-of-change flag'); }
    if (p.w > 5) { score -= 3; issues.push('Minor drift under review'); }
    return { w: p.w, label: p.label, score: Math.max(40, score), issues };
  });

  const breakdown = [
    { label: 'Completeness', value: 90.5, tone: 'warn', detail: '1 of 12 weekly batches missing the sleep field' },
    { label: 'Consistency', value: 82, tone: 'warn', detail: 'Duplicate-measure CV exceeded the 5% limit once (week 9)' },
    { label: 'Freshness', value: 100, tone: 'good', detail: 'Last sync 1 h ago — within the 15-min-to-24-h acceptable window' },
    { label: 'Plausibility', value: 90, tone: 'warn', detail: 'One rate-of-change flag (week 8 glucose excursion)' },
  ];

  const score = Math.round(
    0.3 * 90.5 + 0.3 * 82 + 0.2 * 100 + 0.2 * 90,
  );

  return {
    score,
    level: score >= 90 ? 'good' : score >= 75 ? 'warn' : 'bad',
    breakdown,
    weekly,
    method: 'Weighted composite: completeness 30% · consistency 30% · freshness 20% · plausibility 20%. Applied to every incoming batch.',
  };
})();

// ============================================================
// 7. Temporal pattern detection (#24)
// ============================================================

export const temporalReport = (() => {
  const tgSeries = WEEKLY_DEVICE.map((p) => p.triglycerides);
  let bestLag = 6;
  let bestR = -1;
  for (let lag = 3; lag <= 8; lag++) {
    const r = autocorr(tgSeries, lag);
    if (r > bestR) { bestR = r; bestLag = lag; }
  }
  return {
    trends: [
      { label: 'Fasting glucose', direction: 'Rising', detail: `+${r2(BASELINE.glucose.slope)} mg/dL per month sustained across the 18-month panel`, tone: 'warn' },
      { label: 'HbA1c', direction: 'Rising', detail: `+0.035 % per month — prediabetic range entered around month 10`, tone: 'warn' },
      { label: 'Physical activity', direction: 'Declining', detail: `−${r2(Math.abs(BASELINE.activity.slope))} min/week per month on trend`, tone: 'warn' },
      { label: 'Sleep duration', direction: 'Slow decline', detail: '−0.03 h per month — now below the 7 h reference', tone: 'info' },
    ],
    sudden: [
      { label: 'Glucose excursion', when: 'Week of Aug 16, 2026', detail: '+16 mg/dL single-week jump — flagged as implausible rate of change, not repeated', tone: 'bad' },
    ],
    seasonal: [
      { label: 'Physical activity', detail: 'Recurring summer peak (Jun–Aug, ≈ +16 min/wk amplitude) and winter dip (Dec–Feb) across both observed years', tone: 'info' },
    ],
    repeated: [
      { label: 'Triglycerides', detail: `Recurring oscillation — autocorrelation peaks at lag ≈ ${bestLag} weeks (r = ${r2(bestR)})`, tone: 'info' },
    ],
  };
})();

// ============================================================
// 8. Population vs personal comparison (#25)
// ============================================================

export const populationComparison = BASELINE_KEYS.map((k) => {
  const latest = latestPoint[k];
  const s = POPULATION.stats[k];
  const personalZ = r2((latest - predictedAt(k, 17)) / Math.max(BASELINE[k].residSd, 0.001));
  const popZ = r2((latest - s.mean) / s.sd);
  return {
    id: k,
    label: BIOMARKER_LABELS[k],
    value: latest,
    personalZ,
    popZ,
    popMean: s.mean,
    popSd: s.sd,
  };
});

// ============================================================
// 9. Why did my risk change? (#12)
// ============================================================

export function whyChanged(i1, i2) {
  const p1 = MONTHLY[i1];
  const p2 = MONTHLY[i2];
  const r1v = demoRisk(p1);
  const r2v = demoRisk(p2);
  const byId1 = Object.fromEntries(r1v.contributions.map((c) => [c.id, c]));
  const byId2 = Object.fromEntries(r2v.contributions.map((c) => [c.id, c]));
  const factors = FEATURE_DEFS.map((def) => {
    const a = byId1[def.id];
    const b = byId2[def.id];
    const delta = r2(b.contribution - a.contribution);
    return {
      id: def.id,
      label: def.label,
      valueFrom: a.value,
      valueTo: b.value,
      unit: def.unit,
      from: a.contribution,
      to: b.contribution,
      delta,
      dirLabel: delta > 0.01 ? 'Pushed estimate up' : delta < -0.01 ? 'Pushed estimate down' : 'No change',
    };
  });
  const moved = factors.filter((f) => Math.abs(f.delta) > 0.01).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return {
    from: { i: i1, label: MONTHLY[i1].label, date: p1.date, risk: Math.round(r1v.score) },
    to: { i: i2, label: MONTHLY[i2].label, date: p2.date, risk: Math.round(r2v.score) },
    delta: Math.round(r2v.score - r1v.score),
    factors,
    notes: moved.slice(0, 3).map(
      (f) =>
        `${f.label} moved from ${f.valueFrom}${f.unit ? ' ' + f.unit : ''} to ${f.valueTo}${f.unit ? ' ' + f.unit : ''}, ${f.dirLabel.toLowerCase()} the estimate by ${Math.abs(Math.round(f.delta * 100)) / 100 < 0.01 ? '<0.01' : Math.abs(f.delta)} weight units.`,
    ),
  };
}

// ============================================================
// 10. Multi-model comparison (#6, #27)
// ============================================================

const MODEL_TRANSFORM = {
  lr: { scale: 1.0, bias: 0, spread: 5 },
  rf: { scale: 1.07, bias: 2.5, spread: 7 },
  xgb: { scale: 0.94, bias: -1.5, spread: 6 },
  nn: { scale: 1.05, bias: 3, spread: 9 },
};

export function multiModelScores(values) {
  const core = demoRisk(values).score;
  return MODEL_CATALOG.map((m) => {
    const t = MODEL_TRANSFORM[m.id];
    const score = clamp(Math.round(core * t.scale + t.bias), 1, 99);
    return {
      ...m,
      score,
      lo: Math.max(1, score - t.spread),
      hi: Math.min(99, score + t.spread),
      spread: t.spread,
    };
  });
}

// ============================================================
// 11. Sensor vs reference validation (#7)
// ============================================================

export const validationReport = VALIDATION_PAIRS.map((v) => {
  const ds = v.pairs.map((p) => p.device);
  const rs = v.pairs.map((p) => p.reference);
  const diffs = v.pairs.map((p) => p.device - p.reference);
  const bias = mean(diffs);
  const sdD = sd(diffs);
  return {
    id: v.id,
    label: v.label,
    unit: v.unit,
    n: v.pairs.length,
    mae: r2(mae(ds, rs)),
    rmse: r2(rmse(ds, rs)),
    r: r2(pearson(ds, rs)),
    bias: r2(bias),
    loLa: r2(bias - 1.96 * sdD),
    hiLa: r2(bias + 1.96 * sdD),
    pairs: v.pairs,
  };
});

// ============================================================
// 12. Device reading generator (used by the Device page sync)
// ============================================================

export function generateDeviceReading() {
  const n = (a) => (Math.random() - 0.5) * 2 * a;
  return {
    ts: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    glucose: +(112 + n(2.2)).toFixed(1),
    hba1c: +(6.1 + n(0.07)).toFixed(2),
    bmi: +(29.7 + n(0.14)).toFixed(1),
    triglycerides: Math.round(165 + n(4)),
    systolic: Math.round(128 + n(2)),
    quality: Math.round(88 + Math.random() * 8),
  };
}

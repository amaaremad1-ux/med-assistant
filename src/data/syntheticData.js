/**
 * Synthetic data foundation for the clinical console research prototype.
 *
 * EVERYTHING in this file is generated demo data produced by a seeded
 * pseudo-random generator. There is no real patient, no real device, and no
 * real reference laboratory. Values were chosen to look physiologically
 * plausible for demonstration purposes only.
 */

// ---------- Seeded RNG (deterministic across reloads) ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260920);
const noise = (amp) => (rand() - 0.5) * 2 * amp;

export const DEMO_NOW = 'Sep 20, 2026 · 09:42';
export const MODEL_VERSION = 'demo-ensemble-v0.3';

// ---------- Monthly longitudinal panel (18 points, Apr 2025 → Sep 2026) ----------
// The synthetic patient starts near the synthetic population average and
// drifts onto an adverse trajectory over 18 months.
export const MONTHLY = Array.from({ length: 18 }, (_, i) => {
  const d = new Date(2025, 3 + i, 15);
  const seasonal = 16 * Math.cos((d.getMonth() - 6) * (Math.PI / 6)); // activity peaks in summer
  return {
    i,
    label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    glucose: +(98 + 0.82 * i + noise(1.9)).toFixed(1),
    hba1c: +(5.5 + 0.035 * i + noise(0.04)).toFixed(2),
    bmi: +(27.4 + 0.135 * i + noise(0.1)).toFixed(1),
    activity: Math.round(165 - 4.1 * i + seasonal + noise(5)),
    sleep: +(6.45 - 0.032 * i + noise(0.13)).toFixed(1),
    triglycerides: Math.round(148 + 1.0 * i + noise(4)),
    ldl: Math.round(128 + 0.58 * i + noise(2.5)),
    systolic: Math.round(122 + 0.34 * i + noise(1.8)),
    // Data-quality artifacts: activity sensor missing in 3 months
    missingActivity: [4, 9, 13].includes(i),
  };
});

// ---------- Weekly device stream (12 weeks, Jun 28 → Sep 19 2026) ----------
// Contains deliberately injected artifacts used by the demo analytics:
//  - calibration drift on device glucose after week 5 (+0.8 mg/dL per week)
//  - a single-week glucose excursion in week 8 (index 7)
//  - a multi-biomarker pattern deviation in week 10 (index 9)
//  - a missing sleep field in week 5 and an inconsistent duplicate in week 9
export const WEEKLY_DEVICE = Array.from({ length: 12 }, (_, w) => {
  const d = new Date(2026, 5, 28);
  d.setDate(d.getDate() + w * 7);
  const drift = w > 5 ? 0.8 * (w - 5) : 0;
  const spike = w === 7 ? 16 : 0;
  const tgExtra = w === 9 ? 20 : 0;
  const bmiExtra = w === 9 ? 0.9 : 0;
  return {
    w,
    label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    glucose: +(112 + drift + spike + noise(2.2)).toFixed(1),
    glucoseReference: +(112 + noise(1.0)).toFixed(1), // weekly paired reference-lab draw
    hba1c: +(6.1 + noise(0.07)).toFixed(2),
    bmi: +(29.7 + bmiExtra + noise(0.14)).toFixed(1),
    triglycerides: Math.round(165 + 6 * Math.sin((w * Math.PI) / 3) + tgExtra + noise(3)),
    systolic: Math.round(128 + noise(2)),
    sleepMissing: w === 4,
    inconsistent: w === 8,
  };
});

// ---------- Synthetic reference population (NOT medically representative) ----------
export const POPULATION = {
  n: 5000,
  note: 'Synthetic reference cohort generated for demonstration. It is NOT a medically representative population and must never be used for real comparison.',
  stats: {
    glucose: { mean: 98, sd: 11 },
    hba1c: { mean: 5.4, sd: 0.38 },
    bmi: { mean: 26.8, sd: 4.4 },
    activity: { mean: 150, sd: 65 },
    sleep: { mean: 7.0, sd: 0.9 },
    triglycerides: { mean: 125, sd: 55 },
    ldl: { mean: 118, sd: 28 },
    systolic: { mean: 118, sd: 12 },
  },
};

// ---------- Sensor vs reference validation pairs (synthetic, n = 40 each) ----------
const randV = mulberry32(777);
const noiseV = (amp) => (randV() - 0.5) * 2 * amp;

function makePairs({ base, spread, bias, sigmaD, sigmaR }) {
  return Array.from({ length: 40 }, () => {
    const truth = base + noiseV(spread);
    return {
      device: +(truth + bias + noiseV(sigmaD)).toFixed(1),
      reference: +(truth + noiseV(sigmaR)).toFixed(1),
    };
  });
}

export const VALIDATION_PAIRS = [
  { id: 'glucose', label: 'Fasting Glucose', unit: 'mg/dL', pairs: makePairs({ base: 105, spread: 24, bias: 2.5, sigmaD: 3.6, sigmaR: 1.4 }) },
  { id: 'hba1c', label: 'HbA1c', unit: '%', pairs: makePairs({ base: 5.6, spread: 0.85, bias: 0.06, sigmaD: 0.14, sigmaR: 0.05 }) },
  { id: 'bmi', label: 'BMI', unit: 'kg/m²', pairs: makePairs({ base: 27.5, spread: 5.5, bias: 0.25, sigmaD: 0.5, sigmaR: 0.2 }) },
  { id: 'triglycerides', label: 'Triglycerides', unit: 'mg/dL', pairs: makePairs({ base: 140, spread: 60, bias: 4, sigmaD: 11, sigmaR: 5 }) },
  { id: 'systolic', label: 'Systolic BP', unit: 'mmHg', pairs: makePairs({ base: 124, spread: 14, bias: 1.2, sigmaD: 3.8, sigmaR: 2.2 }) },
];

// ---------- Model catalog (placeholder demo models — NOT validated) ----------
export const MODEL_CATALOG = [
  { id: 'lr', name: 'Logistic Regression', version: 'demo-lr-v0.3', type: 'Linear', params: '12 coefficients', trained: 'Aug 2026 (synthetic cohort)', demoAuc: 0.72, note: 'Transparent baseline, L2-regularized.' },
  { id: 'rf', name: 'Random Forest', version: 'demo-rf-v0.2', type: 'Bagged trees', params: '400 trees', trained: 'Aug 2026 (synthetic cohort)', demoAuc: 0.76, note: 'Built-in permutation importance.' },
  { id: 'xgb', name: 'XGBoost', version: 'demo-xgb-v0.2', type: 'Boosted trees', params: '600 rounds', trained: 'Sep 2026 (synthetic cohort)', demoAuc: 0.78, note: 'SHAP-style contributions available.' },
  { id: 'nn', name: 'Neural Network', version: 'demo-nn-v0.1', type: 'MLP', params: '3 × 64 layers', trained: 'Sep 2026 (synthetic cohort)', demoAuc: 0.75, note: 'Gradient-based attributions.' },
];

export const MODEL_DISCLAIMER =
  'None of these models has been scientifically validated. All outputs shown anywhere in this app are placeholder demonstrations computed from synthetic data.';

// ---------- Model version history (demo changelog) ----------
export const MODEL_HISTORY = [
  { version: 'demo-ensemble-v0.3', date: 'Sep 10, 2026', change: 'Added uncertainty intervals and per-feature direction flags.' },
  { version: 'demo-ensemble-v0.2', date: 'Aug 28, 2026', change: 'Personal baseline replaced population z-scores as primary comparator.' },
  { version: 'demo-ensemble-v0.1', date: 'Aug 02, 2026', change: 'Initial transparent weighted-logistic demo scorer.' },
];

// ---------- Fairness research data (methodology demonstration only) ----------
export const FAIRNESS = {
  note: 'Methodology demonstration only. Every group metric below is a synthetic artifact — no real validation was performed, and gaps shown here do not reflect any real population.',
  dimensions: [
    {
      id: 'age', label: 'Age band',
      groups: [
        { label: '30–49', auc: 0.74, sensitivity: 0.69, specificity: 0.71 },
        { label: '50–64', auc: 0.78, sensitivity: 0.74, specificity: 0.74 },
        { label: '65+', auc: 0.70, sensitivity: 0.63, specificity: 0.68 },
      ],
    },
    {
      id: 'sex', label: 'Sex',
      groups: [
        { label: 'Female', auc: 0.77, sensitivity: 0.73, specificity: 0.75 },
        { label: 'Male', auc: 0.75, sensitivity: 0.71, specificity: 0.72 },
      ],
    },
    {
      id: 'cohort', label: 'Synthetic cohort (non-demographic)',
      groups: [
        { label: 'Cohort A', auc: 0.76, sensitivity: 0.72, specificity: 0.73 },
        { label: 'Cohort B', auc: 0.79, sensitivity: 0.76, specificity: 0.76 },
        { label: 'Cohort C', auc: 0.71, sensitivity: 0.66, specificity: 0.69 },
      ],
    },
  ],
};

// ---------- Federated learning research extension (simulated only) ----------
export const FEDERATED = {
  disclaimer: 'Simulated architecture — no real federated learning is implemented anywhere in this prototype. The numbers below are illustrative placeholders.',
  nodes: [
    { id: 'n1', name: 'Northgate Clinic Node', patients: 420, region: 'Node A', uptime: '97.2%', status: 'Simulated' },
    { id: 'n2', name: 'Riverside Hospital Node', patients: 1180, region: 'Node B', uptime: '98.1%', status: 'Simulated' },
    { id: 'n3', name: 'University Research Node', patients: 640, region: 'Node C', uptime: '95.8%', status: 'Simulated' },
    { id: 'n4', name: 'Mobile Cohort Node', patients: 260, region: 'Node D', uptime: '92.4%', status: 'Simulated' },
  ],
  rounds: Array.from({ length: 10 }, (_, r) => ({
    round: r + 1,
    nodes: r === 0 ? 3 : 4,
    avgLoss: +(0.69 - r * 0.016 + (r % 3) * 0.004).toFixed(3),
    note: r === 0 ? 'Warm-up round' : r === 9 ? 'Converged (demo)' : 'Steady decrease (demo)',
  })),
  techniques: [
    { title: 'Secure aggregation', detail: 'Concept: node updates are summed server-side without exposing any individual gradient.', status: 'Concept only' },
    { title: 'Differential privacy', detail: 'Concept: calibrated noise added to updates; noise budget ε = 8.0 (placeholder value).', status: 'Placeholder' },
    { title: 'No raw-data transfer', detail: 'Architectural intent: only model updates would ever leave a node.', status: 'Design intent' },
    { title: 'Heterogeneous nodes', detail: 'Nodes differ in cohort size and uptime — aggregation weights would account for this.', status: 'Design intent' },
  ],
};

// ---------- Disease modules (disease-agnostic architecture) ----------
export const DISEASE_MODULES = [
  {
    id: 't2d', name: 'Type 2 Diabetes', status: 'Active', icon: 'droplet',
    version: 'demo-ensemble-v0.3',
    description: 'Early-deviation and trajectory modeling over fasting glucose, HbA1c, lipids, activity, sleep and family history.',
    features: ['Risk trajectory', 'Explainable contributions', 'Counterfactual simulation', 'Deviation detection'],
    coverage: '18-month synthetic panel · 123 measurements',
  },
  {
    id: 'htn', name: 'Hypertension', status: 'Planned', icon: 'heart',
    description: 'Systolic/diastolic trajectories with circadian-pattern detection.',
    eta: 'Research queue · 2027',
  },
  {
    id: 'ckd', name: 'Chronic Kidney Disease', status: 'Planned', icon: 'flask',
    description: 'Creatinine / eGFR slope analysis and albuminuria staging input.',
    eta: 'Research queue · 2027',
  },
  {
    id: 'afib', name: 'Atrial Fibrillation', status: 'Exploratory', icon: 'activity',
    description: 'Requires rhythmic waveform data — awaiting a compatible device profile.',
    eta: 'Exploratory · unscheduled',
  },
];

// ---------- Privacy by design (prototype placeholders) ----------
export const PRIVACY = [
  { title: 'Synthetic & de-identified data', status: 'Active', tone: 'good', detail: 'Every record in this prototype is generated data. No real patient data is processed anywhere in the system.' },
  { title: 'Encryption concept', status: 'Concept', tone: 'proto', detail: 'Planned: TLS 1.3 in transit, AES-256 at rest, key custody with the patient. Described for design review only — not implemented.' },
  { title: 'Minimum-data principle', status: 'Design rule', tone: 'proto', detail: 'Only biomarkers required by the active disease module are collected; everything else stays on-device.' },
  { title: 'Identity separation', status: 'Modeled', tone: 'proto', detail: 'Identity store and research store are architecturally separate; a rotating pseudonym token links them and never ships with research payloads.' },
  { title: 'Consent & ethics', status: 'Placeholder', tone: 'warn', detail: 'Consent workflows, ethics review and data withdrawal are stubbed as concepts. Not obtained — and not required — for synthetic data.' },
];

// ---------- Biomarker relationship map (author-assigned synthetic associations) ----------
export const BIOMARKER_NETWORK = {
  nodes: [
    { id: 'glucose', label: 'Glucose' },
    { id: 'hba1c', label: 'HbA1c' },
    { id: 'tg', label: 'Lipids (TG)' },
    { id: 'bmi', label: 'BMI' },
    { id: 'activity', label: 'Activity' },
    { id: 'sleep', label: 'Sleep' },
    { id: 'family', label: 'Family history' },
  ],
  edges: [
    { a: 'glucose', b: 'hba1c', r: 0.82 },
    { a: 'glucose', b: 'tg', r: 0.44 },
    { a: 'glucose', b: 'activity', r: -0.41 },
    { a: 'glucose', b: 'family', r: 0.29 },
    { a: 'glucose', b: 'sleep', r: -0.19 },
    { a: 'hba1c', b: 'bmi', r: 0.51 },
    { a: 'hba1c', b: 'family', r: 0.33 },
    { a: 'tg', b: 'bmi', r: 0.46 },
    { a: 'tg', b: 'activity', r: -0.33 },
    { a: 'tg', b: 'sleep', r: -0.24 },
    { a: 'bmi', b: 'activity', r: -0.48 },
    { a: 'bmi', b: 'sleep', r: -0.21 },
    { a: 'activity', b: 'sleep', r: 0.28 },
  ],
  note: 'Edge weights are author-assigned synthetic associations for layout demonstration — they are not measured correlations from any cohort.',
};

// ---------- Research experiment options ----------
export const EXPERIMENT_DATASETS = [
  { id: 'ds-a', label: 'Synthetic Cohort A', n: 500, kind: 'Cross-sectional', note: 'Single time point per subject.' },
  { id: 'ds-b', label: 'Synthetic Cohort B', n: 1200, kind: 'Cross-sectional', note: 'Broader synthetic demographic sampling.' },
  { id: 'ds-p', label: 'Synthetic Longitudinal Panel', n: 340, kind: 'Longitudinal', note: 'Up to 18 monthly time points per subject.' },
];

export const HORIZONS = [
  { id: 'h6', label: '6 months' },
  { id: 'h12', label: '12 months' },
  { id: 'h24', label: '24 months' },
  { id: 'h60', label: '60 months' },
];

export const EXPERIMENT_BIOMARKERS = [
  'Fasting glucose', 'HbA1c', 'Triglycerides', 'LDL', 'BMI', 'Activity', 'Sleep duration', 'Systolic BP',
];

// ---------- Device profile (low-resource design metrics) ----------
export const DEVICE_PROFILE = {
  name: 'SH-1 Multi-Biomarker Patch (simulated)',
  firmware: 'v0.4.2-proto',
  sensors: ['Electrochemical glucose', 'Spectrophotometric HbA1c proxy', 'Bioimpedance (BMI estimate)', 'Photoplethysmography (BP proxy)', 'Accelerometer (activity)'],
  avgPowerMw: 84,
  peakPowerMw: 210,
  bomCostUsd: 38,
  targetPriceUsd: 59,
  offlineCapablePct: 100,
  offlineBufferPct: 64,
  syncInterval: '15 min (when connected)',
  resource: [
    { label: 'CPU load', value: 22, detail: 'MCU @ 48 MHz, duty-cycled' },
    { label: 'Memory', value: 41, detail: '164 KB of 256 KB SRAM' },
    { label: 'Storage', value: 58, detail: '30-day rolling buffer at 12 KB/day' },
  ],
};

/**
 * Synthetic demo bio-signal dataset for the Human Bio-Signal Intelligence
 * Engine.
 *
 * EVERY VALUE IN THIS FILE IS GENERATED. There is no real subject, no real
 * wearable, no real ECG machine and no clinical meaning. Every record carries
 * `dataClass: 'synthetic-demo'` and the source label below so the UI can never
 * present it as real user data or as a research dataset.
 *
 * Design notes:
 *
 *  1. Raw sample arrays are NOT stored in this module. A 250 Hz ECG for even
 *     one minute is 15,000 floats, and holding many of those in memory (let
 *     alone in localStorage) would freeze the interface. Instead each record
 *     stores metadata plus a deterministic seed, and `generateSignalValues()`
 *     materialises only the window the UI asks for. This is the
 *     import → validate → process → features → metadata → window architecture
 *     the specification asks for.
 *
 *  2. Quality defects are deliberately injected and DECLARED on each record
 *     (`defects`), so the quality engine has genuine artifacts to find rather
 *     than a clean signal it would have to pretend was noisy.
 *
 *  3. Derived metrics (heart rate, HRV, SpO2, sleep duration) are stored as
 *     their own records with `kind: 'derived'` — never labelled raw signals.
 */

import { getSignalType } from './signalTaxonomy.js';

export const DEMO_SIGNAL_SOURCE = 'Synthetic demo generator';
export const DEMO_DATA_CLASS = 'synthetic-demo';
export const DEMO_DATA_LABEL = 'Synthetic / Demo Data';

/** Seeded PRNG (same algorithm as src/data/syntheticData.js). */
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

function hashSeed(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Demo subjects. Identifiers are opaque codes; no name, no date of birth and
 * no contact detail is stored anywhere, and none may be added to a URL.
 * Relationships are declared as research metadata only — they do NOT imply
 * genetic inheritance or any disease.
 */
export const DEMO_SUBJECTS = [
  { id: 'SUBJ-001', label: 'Subject 001', cohort: 'demo-cohort-A', relationship: 'proband', note: 'Index subject of the synthetic demo cohort' },
  { id: 'SUBJ-002', label: 'Subject 002', cohort: 'demo-cohort-A', relationship: 'first-degree relative (declared)', note: 'Declared relationship only — inheritance is not inferred' },
  { id: 'SUBJ-003', label: 'Subject 003', cohort: 'demo-cohort-A', relationship: 'first-degree relative (declared)', note: 'Declared relationship only — inheritance is not inferred' },
  { id: 'SUBJ-004', label: 'Subject 004', cohort: 'demo-cohort-B', relationship: 'unrelated', note: 'Separate synthetic cohort' },
];

const DEMO_DEVICES = {
  wearable: 'DEMO-WRISTBAND (simulated)',
  ecg: 'DEMO-ECG-PATCH (simulated)',
  eeg: 'DEMO-EEG-HEADSET (simulated)',
  cgm: 'DEMO-CGM (simulated)',
  manual: 'Manual demo entry',
};

/**
 * Signal record template list. `defects` are the artifacts the quality engine
 * is expected to detect; they are part of the data, not invented later.
 */
const TEMPLATES = [
  // ---- SUBJ-001: richest record set, used for baseline + replay demos ----
  { subjectId: 'SUBJ-001', type: 'ecg', device: 'ecg', durationSec: 60, defects: { noise: 0.02 } },
  { subjectId: 'SUBJ-001', type: 'heart-rate', device: 'wearable', durationSec: 3600, defects: {} },
  { subjectId: 'SUBJ-001', type: 'hrv-rmssd', device: 'wearable', durationSec: 21600, defects: { gaps: [{ at: 7200, len: 1500 }] } },
  { subjectId: 'SUBJ-001', type: 'ppg', device: 'wearable', durationSec: 60, defects: { dropout: { at: 30, len: 6 } } },
  { subjectId: 'SUBJ-001', type: 'respiration-waveform', device: 'wearable', durationSec: 120, defects: {} },
  { subjectId: 'SUBJ-001', type: 'respiratory-rate', device: 'wearable', durationSec: 3600, defects: {} },
  { subjectId: 'SUBJ-001', type: 'spo2', device: 'wearable', durationSec: 3600, defects: { gaps: [{ at: 2400, len: 180 }] } },
  { subjectId: 'SUBJ-001', type: 'eda-gsr', device: 'wearable', durationSec: 600, defects: {} },
  { subjectId: 'SUBJ-001', type: 'skin-temperature', device: 'wearable', durationSec: 3600, defects: {} },
  { subjectId: 'SUBJ-001', type: 'accel-x', device: 'wearable', durationSec: 300, defects: {} },
  { subjectId: 'SUBJ-001', type: 'accel-y', device: 'wearable', durationSec: 300, defects: {} },
  { subjectId: 'SUBJ-001', type: 'accel-z', device: 'wearable', durationSec: 300, defects: {} },
  { subjectId: 'SUBJ-001', type: 'posture', device: 'wearable', durationSec: 86400, defects: {} },
  { subjectId: 'SUBJ-001', type: 'movement-events', device: 'wearable', durationSec: 86400, defects: {} },
  { subjectId: 'SUBJ-001', type: 'steps', device: 'wearable', durationSec: 86400, defects: {} },
  { subjectId: 'SUBJ-001', type: 'cgm', device: 'cgm', durationSec: 86400, defects: { dropout: { at: 43200, len: 900 } } },
  { subjectId: 'SUBJ-001', type: 'sleep-stages', device: 'wearable', durationSec: 28800, defects: {} },
  { subjectId: 'SUBJ-001', type: 'sleep-duration', device: 'wearable', durationSec: 2592000, defects: {} },
  { subjectId: 'SUBJ-001', type: 'sleep-regularity', device: 'wearable', durationSec: 2592000, defects: {} },
  { subjectId: 'SUBJ-001', type: 'eeg', device: 'eeg', durationSec: 60, defects: { flatline: { at: 40, len: 4 } } },
  { subjectId: 'SUBJ-001', type: 'eeg-delta', device: 'eeg', durationSec: 3600, defects: {} },
  { subjectId: 'SUBJ-001', type: 'eeg-theta', device: 'eeg', durationSec: 3600, defects: {} },
  { subjectId: 'SUBJ-001', type: 'eeg-alpha', device: 'eeg', durationSec: 3600, defects: {} },
  { subjectId: 'SUBJ-001', type: 'eeg-beta', device: 'eeg', durationSec: 3600, defects: {} },
  { subjectId: 'SUBJ-001', type: 'eeg-gamma', device: 'eeg', durationSec: 3600, defects: {} },
  { subjectId: 'SUBJ-001', type: 'body-temperature', device: 'manual', durationSec: 604800, discrete: 14, defects: {} },
  { subjectId: 'SUBJ-001', type: 'glucose', device: 'manual', durationSec: 2592000, discrete: 24, defects: {} },

  // ---- SUBJ-002: deliberately poor quality, exercises POOR/INSUFFICIENT ----
  { subjectId: 'SUBJ-002', type: 'ecg', device: 'ecg', durationSec: 60, defects: { noise: 0.22, flatline: { at: 20, len: 12 } } },
  { subjectId: 'SUBJ-002', type: 'heart-rate', device: 'wearable', durationSec: 3600, defects: { gaps: [{ at: 600, len: 900 }] } },
  { subjectId: 'SUBJ-002', type: 'respiration-waveform', device: 'wearable', durationSec: 120, defects: { noise: 0.4 } },
  { subjectId: 'SUBJ-002', type: 'eda-gsr', device: 'wearable', durationSec: 600, defects: { dropout: { at: 120, len: 200 } } },
  { subjectId: 'SUBJ-002', type: 'respiratory-rate', device: 'wearable', durationSec: 3600, defects: { noise: 0.4 } },
  { subjectId: 'SUBJ-002', type: 'cough-features', device: 'wearable', durationSec: 3600, defects: { gaps: [{ at: 1800, len: 600 }] } },
  { subjectId: 'SUBJ-002', type: 'sleep-stages', device: 'wearable', durationSec: 28800, defects: { gaps: [{ at: 3600, len: 7200 }] } },

  // ---- SUBJ-003: sparse — exercises "Insufficient data" honestly ----
  { subjectId: 'SUBJ-003', type: 'heart-rate', device: 'wearable', durationSec: 300, defects: {} },
  { subjectId: 'SUBJ-003', type: 'steps', device: 'wearable', durationSec: 86400, defects: { gaps: [{ at: 0, len: 60000 }] } },

  // ---- SUBJ-004: different cohort, clean but short ----
  { subjectId: 'SUBJ-004', type: 'ecg', device: 'ecg', durationSec: 30, defects: {} },
  { subjectId: 'SUBJ-004', type: 'heart-rate', device: 'wearable', durationSec: 1800, defects: {} },
  { subjectId: 'SUBJ-004', type: 'cgm', device: 'cgm', durationSec: 43200, defects: {} },
  { subjectId: 'SUBJ-004', type: 'respiration-waveform', device: 'wearable', durationSec: 60, defects: {} },
];

const EPOCH = Date.UTC(2026, 8, 1, 8, 0, 0); // 2026-09-01T08:00:00Z

/**
 * Materialise the demo signal records. Values are generated on demand, so this
 * array is metadata only and is safe to keep in memory and to persist.
 */
export const DEMO_SIGNALS = TEMPLATES.map((t, i) => {
  const type = getSignalType(t.type);
  const id = `sig-${String(i + 1).padStart(3, '0')}`;
  const startOffset = (i * 173) % 86400; // spread recordings across the day
  const samplingRate =
    type.samplingRate ??
    (type.kind === 'categorical' ? 1 / 30 : type.kind === 'discrete' ? null : 1);

  return {
    id,
    subjectId: t.subjectId,
    type: type.id,
    category: type.category,
    kind: type.kind,
    source: DEMO_SIGNAL_SOURCE,
    dataClass: DEMO_DATA_CLASS,
    device: DEMO_DEVICES[t.device] ?? 'Unknown device',
    timestamp: new Date(EPOCH + startOffset * 1000).toISOString(),
    durationSec: t.durationSec,
    samplingRate,
    unit: type.unit,
    channel: type.channel,
    profile: type.profile,
    defects: t.defects ?? {},
    discreteCount: t.discrete ?? null,
    metadata: {
      generator: 'mulberry32 seeded per-record',
      seed: hashSeed(id + t.type + t.subjectId),
      clinicalMeaning: 'none — simulated waveform',
    },
  };
});

export function demoSignalsForSubject(subjectId) {
  return DEMO_SIGNALS.filter((s) => s.subjectId === subjectId);
}

export function demoSignalById(id) {
  return DEMO_SIGNALS.find((s) => s.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Windowed value generation
// ---------------------------------------------------------------------------

/**
 * Generate values for a window of a demo signal.
 *
 * Returns { t0, dt, n, values, labels } where `values` holds numbers (NaN marks
 * a missing sample) and `labels` is populated instead of values for
 * categorical types. Only the requested window is produced.
 *
 * @param {object} signal  a record from DEMO_SIGNALS (or an imported signal
 *                         carrying the same shape)
 * @param {object} opts    { startSec = 0, lengthSec = null, maxPoints = 2000 }
 */
export function generateSignalValues(signal, opts = {}) {
  const type = getSignalType(signal.type);
  if (!type) {
    return { t0: 0, dt: null, n: 0, values: [], labels: [], error: `Unknown signal type "${signal.type}".` };
  }

  const startSec = Math.max(0, opts.startSec ?? 0);
  const duration = signal.durationSec ?? 0;
  const lengthSec = Math.min(opts.lengthSec ?? duration, Math.max(0, duration - startSec));

  if (type.kind === 'discrete') {
    return generateDiscrete(signal, type, startSec, lengthSec);
  }
  if (type.kind === 'categorical') {
    return generateCategorical(signal, type, startSec, lengthSec);
  }
  if (!signal.samplingRate || signal.samplingRate <= 0) {
    return { t0: startSec, dt: null, n: 0, values: [], labels: [], error: 'Sampling rate unavailable — cannot reconstruct samples.' };
  }

  // Choose dt: native rate, but never more points than maxPoints.
  const maxPoints = opts.maxPoints ?? 2000;
  const maxNativePoints = opts.maxNativePoints ?? 60000;
  const nativeDt = 1 / signal.samplingRate;
  const nativeN = Math.max(1, Math.round(lengthSec / nativeDt));
  const seedOffset = (signal.metadata?.seed ?? 1) + Math.round(startSec);

  if (nativeN <= maxPoints) {
    const rng = mulberry32(seedOffset);
    const values = new Array(nativeN);
    for (let i = 0; i < nativeN; i += 1) {
      values[i] = synthesize(type.id, startSec + i * nativeDt, rng, signal);
    }
    applyDefects(values, signal.defects, startSec, nativeDt, rng);
    return { t0: startSec, dt: nativeDt, n: nativeN, values, labels: null, decimated: false, error: null };
  }

  // Decimation path. Naive point-sampling would alias badly: a 10 ms QRS
  // complex sampled every 30 ms is caught or missed essentially at random, and
  // a spectrum computed from the result describes the decimation rather than
  // the signal. So the window is generated at the highest affordable native
  // resolution, defects are applied there (at the real sample scale), and the
  // result is mean-aggregated into display buckets — a boxcar low-pass.
  const genDt = Math.max(nativeDt, lengthSec / maxNativePoints);
  const genN = Math.max(1, Math.round(lengthSec / genDt));
  const rng = mulberry32(seedOffset);
  const raw = new Array(genN);
  for (let i = 0; i < genN; i += 1) {
    raw[i] = synthesize(type.id, startSec + i * genDt, rng, signal);
  }
  applyDefects(raw, signal.defects, startSec, genDt, rng);

  const n = Math.min(maxPoints, genN);
  const dt = lengthSec / n;
  const bucket = genN / n;
  const values = new Array(n);
  for (let b = 0; b < n; b += 1) {
    const from = Math.floor(b * bucket);
    const to = Math.min(genN, Math.max(from + 1, Math.round((b + 1) * bucket)));
    let acc = 0;
    let cnt = 0;
    for (let i = from; i < to; i += 1) {
      if (Number.isFinite(raw[i])) {
        acc += raw[i];
        cnt += 1;
      }
    }
    // A bucket is missing only when every native sample in it is missing.
    values[b] = cnt ? acc / cnt : NaN;
  }

  return {
    t0: startSec,
    dt,
    n,
    values,
    labels: null,
    decimated: true,
    decimationMethod: `mean of ~${Math.round(bucket)} native samples per bucket (boxcar anti-alias), native interval ${genDt} s`,
    nativeDt: genDt,
    error: null,
  };
}

function generateDiscrete(signal, type, startSec, lengthSec) {
  const count = signal.discreteCount ?? Math.max(1, Math.round(lengthSec / 86400));
  const rng = mulberry32(signal.metadata?.seed ?? 7);
  const values = [];
  const times = [];
  for (let i = 0; i < count; i += 1) {
    times.push(startSec + (i * Math.max(lengthSec, 1)) / count);
    values.push(synthesize(type.id, i * 3600, rng, signal));
  }
  return { t0: startSec, dt: null, n: count, values, times, labels: null, error: null };
}

function generateCategorical(signal, type, startSec, lengthSec) {
  const epochSec = type.id === 'sleep-stages' ? 30 : 60;
  const n = Math.max(1, Math.round(lengthSec / epochSec));
  const rng = mulberry32(signal.metadata?.seed ?? 11);

  const labels = [];
  for (let i = 0; i < n; i += 1) {
    labels.push(categoricalLabel(type.id, startSec + i * epochSec, rng));
  }

  // Declared defects remove epochs. Tracked in an explicit `missing` array
  // rather than by poisoning the numeric channel, because a categorical epoch
  // has no numeric value to begin with.
  const missing = new Array(n).fill(false);
  const idxAt = (sec) => Math.round((sec - startSec) / epochSec);
  const mark = (fromSec, toSec) => {
    for (let i = idxAt(fromSec); i < idxAt(toSec); i += 1) {
      if (i >= 0 && i < n) missing[i] = true;
    }
  };
  for (const gap of signal.defects?.gaps ?? []) mark(gap.at, gap.at + gap.len);
  if (signal.defects?.dropout) mark(signal.defects.dropout.at, signal.defects.dropout.at + signal.defects.dropout.len);
  for (let i = 0; i < n; i += 1) {
    if (missing[i]) labels[i] = null;
  }

  return {
    t0: startSec,
    dt: epochSec,
    n,
    values: new Array(n).fill(NaN),
    labels,
    missing,
    epochSec,
    error: null,
  };
}

const SLEEP_STAGES = ['Wake', 'N1', 'N2', 'N3', 'REM'];
const POSTURE_LABELS = ['Sitting', 'Standing', 'Lying', 'Walking'];
const NIGHT_SEC = 28800;

/**
 * Epoch label generator for categorical signal types. Driven by ABSOLUTE time
 * so that a short window shows the part of the night it actually falls in,
 * rather than compressing a whole night's architecture into every window.
 */
export function categoricalLabel(typeId, absSec, rng) {
  if (typeId === 'posture') {
    const r = rng();
    const phase = (absSec % 1800) / 1800;
    if (phase < 0.3) return r < 0.7 ? 'Sitting' : 'Standing';
    if (phase < 0.6) return r < 0.6 ? 'Walking' : 'Standing';
    return r < 0.8 ? 'Lying' : 'Sitting';
  }
  return sleepStageLabel(absSec, rng);
}

export { POSTURE_LABELS };

function sleepStageLabel(absSec, rng) {
  const phase = (absSec % NIGHT_SEC) / NIGHT_SEC;
  // A plausible (but synthetic) night architecture: more deep sleep early.
  const r = rng();
  if (phase < 0.05) return 'Wake';
  if (phase < 0.45) return r < 0.45 ? 'N3' : r < 0.8 ? 'N2' : 'REM';
  if (phase < 0.8) return r < 0.55 ? 'N2' : r < 0.8 ? 'REM' : 'N1';
  return r < 0.5 ? 'REM' : r < 0.8 ? 'N2' : 'Wake';
}

export { SLEEP_STAGES };

/** Per-type waveform synthesis. Deliberately simple and non-clinical. */
function synthesize(typeId, t, rng, signal) {
  const noise = (amp) => (rng() - 0.5) * 2 * amp;
  const subjBias = (hashSeed(signal.subjectId) % 100) / 100; // stable per subject

  switch (typeId) {
    case 'ecg': {
      // QRS complex train at ~72 bpm with slight rate variation.
      const bpm = 68 + subjBias * 12;
      const period = 60 / bpm;
      const ph = (t % period) / period;
      const qrs = Math.exp(-Math.pow((ph - 0.22) / 0.012, 2)) * 1.1
        - Math.exp(-Math.pow((ph - 0.19) / 0.01, 2)) * 0.18
        + Math.exp(-Math.pow((ph - 0.42) / 0.05, 2)) * 0.28;
      return +(qrs + noise(0.02)).toFixed(4);
    }
    case 'ppg': {
      const bpm = 70 + subjBias * 10;
      const period = 60 / bpm;
      const ph = (t % period) / period;
      const pulse = Math.exp(-Math.pow((ph - 0.25) / 0.09, 2))
        + 0.4 * Math.exp(-Math.pow((ph - 0.5) / 0.12, 2));
      return +(0.5 + pulse + noise(0.03)).toFixed(4);
    }
    case 'pulse-waveform': {
      const ph = (t % 0.85) / 0.85;
      return +(Math.exp(-Math.pow((ph - 0.2) / 0.1, 2)) + 0.3 * Math.exp(-Math.pow((ph - 0.55) / 0.14, 2)) + noise(0.02)).toFixed(4);
    }
    case 'heart-rate': {
      const base = 66 + subjBias * 14;
      const circadian = 6 * Math.sin((2 * Math.PI * t) / 86400);
      const burst = t > 1500 && t < 1900 ? 14 : 0; // activity episode
      return +(base + circadian + burst + noise(2.2)).toFixed(1);
    }
    case 'hrv-rmssd': {
      const base = 34 + subjBias * 18;
      // Slow autonomic oscillation plus measurement scatter. The slow term is
      // what makes a noise estimate meaningful at a 5-minute cadence.
      return +Math.max(4, base - 6 * Math.sin((2 * Math.PI * t) / 3600) + noise(2.5)).toFixed(1);
    }
    case 'hrv-sdnn': {
      const base = 46 + subjBias * 20;
      return +Math.max(6, base + 7 * Math.sin((2 * Math.PI * t) / 7200) + noise(3)).toFixed(1);
    }
    case 'respiration-waveform': {
      const rr = 13 + subjBias * 5;
      return +(Math.sin((2 * Math.PI * t * rr) / 60) * 0.8 + noise(0.04)).toFixed(4);
    }
    case 'respiratory-rate': {
      return +(14 + subjBias * 4 + 1.4 * Math.sin((2 * Math.PI * t) / 1800) + noise(0.7)).toFixed(1);
    }
    case 'respiratory-variability': {
      return +(18 + subjBias * 6 + noise(2.5)).toFixed(1);
    }
    case 'spo2': {
      const dip = t > 2600 && t < 2750 ? -3.5 : 0; // desaturation episode
      return +Math.min(100, 97 - subjBias * 1.5 + dip + noise(0.4)).toFixed(1);
    }
    case 'eda-gsr': {
      const tonic = 2.4 + subjBias * 1.6 + 0.0006 * t;
      const phasic = Math.exp(-Math.pow(((t % 90) - 45) / 6, 2)) * 0.5;
      return +(tonic + phasic + noise(0.05)).toFixed(3);
    }
    case 'skin-temperature': {
      return +(32.4 + subjBias * 1.2 - 0.5 * Math.sin((2 * Math.PI * t) / 86400) + noise(0.06)).toFixed(2);
    }
    case 'body-temperature':
    case 'peripheral-temperature': {
      return +(36.7 + subjBias * 0.5 + noise(0.18)).toFixed(2);
    }
    case 'accel-x':
      return +(movementBurst(t) * 0.6 + noise(0.05)).toFixed(4);
    case 'accel-y':
      return +(movementBurst(t) * 0.4 + noise(0.05)).toFixed(4);
    case 'accel-z':
      return +(1 + movementBurst(t) * 0.3 + noise(0.05)).toFixed(4); // gravity on Z
    case 'gyro-x':
    case 'gyro-y':
    case 'gyro-z':
      return +(movementBurst(t) * 40 + noise(3)).toFixed(2);
    case 'mag-x':
      return +(28 + noise(1.5)).toFixed(2);
    case 'mag-y':
      return +(-8 + noise(1.5)).toFixed(2);
    case 'mag-z':
      return +(41 + noise(1.5)).toFixed(2);
    case 'activity':
      return +Math.max(0, 2.4 + movementBurst(t) * 3 + noise(0.4)).toFixed(2);
    case 'steps': {
      const hour = Math.floor(t / 3600) % 24;
      const awake = hour >= 7 && hour <= 22 ? 1 : 0;
      return Math.round(awake * (180 + subjBias * 260 + noise(60)));
    }
    case 'sleep-duration':
      return Math.round(360 + subjBias * 90 + noise(35));
    case 'sleep-regularity':
      return +(62 + subjBias * 18 + noise(4)).toFixed(1);
    case 'sleep-movement':
      return Math.round(18 + subjBias * 14 + noise(5));
    case 'sleep-wake-transitions':
      return Math.round(12 + subjBias * 8 + noise(3));
    case 'cgm': {
      const hour = (t / 3600) % 24;
      const meal =
        42 * Math.exp(-Math.pow((hour - 8.5) / 1.1, 2)) +
        34 * Math.exp(-Math.pow((hour - 13) / 1.2, 2)) +
        30 * Math.exp(-Math.pow((hour - 19.5) / 1.4, 2));
      return +(94 + subjBias * 22 + meal + noise(3.5)).toFixed(1);
    }
    case 'glucose':
      return +(96 + subjBias * 24 + noise(6)).toFixed(1);
    case 'eeg': {
      const alpha = 1.6 * Math.sin(2 * Math.PI * 10 * t);
      const pink = noise(0.9) * (1 + 0.4 * Math.sin(2 * Math.PI * 0.3 * t));
      return +(alpha + pink).toFixed(3);
    }
    case 'eeg-delta':
      return +(24 + subjBias * 8 + noise(3)).toFixed(2);
    case 'eeg-theta':
      return +(14 + subjBias * 5 + noise(2)).toFixed(2);
    case 'eeg-alpha':
      return +(31 + subjBias * 9 + 3 * Math.sin((2 * Math.PI * t) / 1800) + noise(3)).toFixed(2);
    case 'eeg-beta':
      return +(11 + subjBias * 4 + noise(2)).toFixed(2);
    case 'eeg-gamma':
      return +(5 + subjBias * 2 + noise(1.2)).toFixed(2);
    case 'heart-sounds': {
      const ph = (t % 0.83) / 0.83;
      return +(Math.exp(-Math.pow((ph - 0.12) / 0.02, 2)) + 0.6 * Math.exp(-Math.pow((ph - 0.42) / 0.025, 2)) + noise(0.05)).toFixed(4);
    }
    case 'respiratory-sounds': {
      const rr = 14;
      const env = Math.max(0, Math.sin((2 * Math.PI * t * rr) / 60));
      return +(env * noise(0.5)).toFixed(4);
    }
    case 'cough-features': {
      return +(t % 300 < 2 ? 1 : 0) + +(noise(0.05)).toFixed(3);
    }
    case 'movement-events':
      return movementBurst(t) > 0.5 ? 1 : 0;
    case 'posture':
      return NaN; // categorical
    default:
      return NaN;
  }
}

/** Shared movement burst used by the inertial channels. */
function movementBurst(t) {
  const inWindow = (t % 300) > 180 && (t % 300) < 230;
  return inWindow ? 0.8 + 0.5 * Math.abs(Math.sin(t * 6)) : 0.05;
}

/**
 * Apply the DECLARED defects to a generated window. Missing samples are NaN so
 * downstream code must handle them explicitly instead of treating a gap as a
 * zero value.
 *
 * Order matters and mirrors what a faulty channel actually looks like: gaps and
 * dropout remove samples, noise is added to the samples that survive, and the
 * flatline is applied LAST because a stuck converter holds one value exactly —
 * it does not keep accumulating noise on top of it.
 */
function applyDefects(values, defects, startSec, dt, rng) {
  if (!defects || !dt) return;
  const idxAt = (sec) => Math.round((sec - startSec) / dt);

  for (const gap of defects.gaps ?? []) {
    const a = idxAt(gap.at);
    const b = idxAt(gap.at + gap.len);
    for (let i = Math.max(0, a); i < Math.min(values.length, b); i += 1) values[i] = NaN;
  }

  if (defects.dropout) {
    const a = idxAt(defects.dropout.at);
    const b = idxAt(defects.dropout.at + defects.dropout.len);
    for (let i = Math.max(0, a); i < Math.min(values.length, b); i += 1) values[i] = NaN;
  }

  if (defects.noise) {
    for (let i = 0; i < values.length; i += 1) {
      if (!Number.isNaN(values[i])) values[i] += (rng() - 0.5) * 2 * defects.noise * (Math.abs(values[i]) + 1);
    }
  }

  if (defects.outliers) {
    for (let k = 0; k < defects.outliers; k += 1) {
      const i = Math.floor(rng() * values.length);
      if (!Number.isNaN(values[i])) values[i] *= 4 + rng() * 3;
    }
  }

  if (defects.flatline) {
    const a = idxAt(defects.flatline.at);
    const b = idxAt(defects.flatline.at + defects.flatline.len);
    const clamped = Math.max(0, Math.min(values.length - 1, a));
    const stuck = Number.isFinite(values[clamped]) ? values[clamped] : 0;
    for (let i = Math.max(0, a); i < Math.min(values.length, b); i += 1) values[i] = stuck;
  }
}

/**
 * Downsample a window for display using min/max buckets so peaks survive.
 * Keeps the UI from rendering tens of thousands of SVG points.
 */
export function downsampleForDisplay(values, maxPoints = 600) {
  const clean = values.filter((v) => !Number.isNaN(v));
  if (clean.length <= maxPoints) return values;
  const bucket = Math.ceil(values.length / maxPoints);
  const out = [];
  for (let i = 0; i < values.length; i += bucket) {
    const slice = values.slice(i, i + bucket);
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of slice) {
      if (Number.isNaN(v)) continue;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    out.push(Number.isFinite(lo) ? (lo + hi) / 2 : NaN);
  }
  return out;
}

export const DEMO_SIGNAL_COUNTS = {
  records: DEMO_SIGNALS.length,
  subjects: DEMO_SUBJECTS.length,
  types: new Set(DEMO_SIGNALS.map((s) => s.type)).size,
  categories: new Set(DEMO_SIGNALS.map((s) => s.category)).size,
};

/**
 * Signal processing (PART 8) and signal event detection (PART 14).
 *
 * The central rule here is the one the specification states explicitly:
 * "Do NOT apply identical algorithms to every signal. Use signal-specific
 * processing." Every algorithm therefore declares which processing profiles it
 * is legitimate for, and `runProcessing()` refuses — with a written reason —
 * any algorithm that is not appropriate for the record it was handed. A peak
 * detector is never pointed at a sleep-stage label series, and a spectral
 * analysis is never re-applied to a quantity that is already a band power.
 *
 * Every result carries the method that produced it, the number of samples it
 * actually used, and its limitations. Where a statistic cannot be computed the
 * status is `insufficient-data` or `not-applicable` — never a substitute value.
 *
 * Confidence values in detected events are computed from a named statistic and
 * the basis is always stated. They are research heuristics, not probabilities of
 * a clinical event, and nothing in this file diagnoses anything.
 */

import { PROCESSING_PROFILES, getSignalType } from '../data/signalTaxonomy.js';
import * as M from './signalMath.js';
import {
  resolveSignalValues,
  windowTimes,
  timestampAtOffset,
  formatDuration,
  formatRate,
} from './signalModel.js';
import { assessSignalQuality, canSupportStrongConclusions } from './signalQuality.js';

// ---------------------------------------------------------------------------
// Algorithm catalogue — labels match src/data/signalTaxonomy.js exactly
// ---------------------------------------------------------------------------

export const ALGORITHMS = [
  { id: 'baseline', label: 'Baseline estimation', profiles: ['waveform-raw', 'inertial-raw'], note: 'Moving median, so sharp transients do not smear into the baseline.' },
  { id: 'peak', label: 'Peak detection', profiles: ['waveform-raw'], note: 'Only defined for signal types with an established event definition and refractory period.' },
  { id: 'spectral', label: 'Frequency / spectral analysis', profiles: ['waveform-raw'], note: 'Requires a stable sampling rate.' },
  { id: 'noise', label: 'Noise detection', profiles: ['waveform-raw', 'inertial-raw'], note: 'MAD of successive differences relative to signal spread.' },
  { id: 'time-domain', label: 'Time-domain statistics', profiles: ['waveform-raw', 'rate-metric', 'band-power'], note: 'Descriptive statistics of the samples in the window.' },
  { id: 'changepoint', label: 'Change-point detection', profiles: ['waveform-raw', 'rate-metric'], note: 'Sliding-window mean-shift test.' },
  { id: 'vector-magnitude', label: 'Vector magnitude', profiles: ['inertial-raw'], note: 'Requires all three axes from the same device and time base.' },
  { id: 'movement-events', label: 'Movement event detection', profiles: ['inertial-raw'], note: 'Sustained excursions above the local baseline.' },
  { id: 'variability', label: 'Variability analysis', profiles: ['inertial-raw', 'rate-metric'], note: 'Spread, successive-difference and percentile measures.' },
  { id: 'trend', label: 'Trend detection', profiles: ['rate-metric', 'band-power', 'discrete-spot'], note: 'Ordinary least squares plus a robust median-of-slopes check.' },
  { id: 'band-power', label: 'Relative band power', profiles: ['band-power'], note: 'Requires every band from the same recording.' },
  { id: 'cross-correlation', label: 'Cross-signal correlation', profiles: ['band-power'], note: 'Pearson correlation over pairwise-complete samples.' },
  { id: 'descriptive', label: 'Descriptive statistics', profiles: ['discrete-spot'], note: 'Location, spread and percentiles of spot measurements.' },
  { id: 'outliers', label: 'Outlier detection', profiles: ['discrete-spot'], note: 'Robust median/MAD test.' },
  { id: 'group-comparison', label: 'Group comparison', profiles: ['discrete-spot'], note: 'Welch t statistic and Cohen d — requires two labelled groups.' },
  { id: 'stage-distribution', label: 'Stage distribution', profiles: ['categorical-epoch'], note: 'Epoch counts and proportions per label.' },
  { id: 'transitions', label: 'Transition counting', profiles: ['categorical-epoch'], note: 'Label-to-label changes and the most frequent transitions.' },
  { id: 'regularity', label: 'Regularity index', profiles: ['categorical-epoch'], note: 'State continuity and label entropy.' },
  { id: 'similarity', label: 'Similarity analysis', profiles: ['categorical-epoch'], note: 'Observed agreement and Cohen kappa between two label series.' },
  { id: 'event-counting', label: 'Event counting', profiles: ['event-series'], note: 'Non-zero event count and rate over the observed span.' },
  { id: 'inter-event', label: 'Inter-event interval', profiles: ['event-series'], note: 'Interval distribution between consecutive events.' },
  { id: 'burst', label: 'Burst detection', profiles: ['event-series'], note: 'Events clustered closer than the median interval.' },
  { id: 'repeated-pattern', label: 'Repeated pattern detection', profiles: ['event-series'], note: 'Autocorrelation of the event indicator series.' },
];

const BY_ALG_ID = new Map(ALGORITHMS.map((a) => [a.id, a]));

export function algorithmLabel(id) {
  return BY_ALG_ID.get(id)?.label ?? id;
}

/** Implemented algorithms for a profile. */
export function algorithmsForProfile(profile) {
  return ALGORITHMS.filter((a) => a.profiles.includes(profile));
}

/** What the taxonomy declares for a profile (used to show the UI is faithful). */
export function declaredAlgorithmsForProfile(profile) {
  return PROCESSING_PROFILES[profile]?.algorithms ?? [];
}

export function profileInfo(profile) {
  return PROCESSING_PROFILES[profile] ?? null;
}

// ---------------------------------------------------------------------------
// Peak detection configuration — physiology-specific, not universal
// ---------------------------------------------------------------------------

const PEAK_CONFIG = {
  ecg: { refractorySec: 0.25, eventLabel: 'QRS complex', rateUnit: 'beats/min' },
  ppg: { refractorySec: 0.3, eventLabel: 'pulse wave', rateUnit: 'beats/min' },
  'pulse-waveform': { refractorySec: 0.3, eventLabel: 'pulse wave', rateUnit: 'beats/min' },
  'respiration-waveform': { refractorySec: 1.2, eventLabel: 'breath cycle', rateUnit: 'breaths/min' },
  'eda-gsr': { refractorySec: 4, eventLabel: 'phasic response', rateUnit: 'responses/min' },
  'heart-sounds': { refractorySec: 0.25, eventLabel: 'sound event candidate', rateUnit: 'events/min' },
  'respiratory-sounds': { refractorySec: 1.0, eventLabel: 'respiratory cycle', rateUnit: 'cycles/min' },
};

/** Descriptive frequency bands, trimmed to what the sampling rate can support. */
const SPECTRAL_BANDS = [
  { label: '0.05–0.5 Hz', lo: 0.05, hi: 0.5 },
  { label: '0.5–4 Hz', lo: 0.5, hi: 4 },
  { label: '4–8 Hz', lo: 4, hi: 8 },
  { label: '8–13 Hz', lo: 8, hi: 13 },
  { label: '13–30 Hz', lo: 13, hi: 30 },
  { label: '30–60 Hz', lo: 30, hi: 60 },
];

export const EVENT_TYPES = {
  'sudden-change': 'Sudden change',
  'gradual-drift': 'Gradual drift',
  peak: 'Peak',
  drop: 'Drop',
  burst: 'Burst',
  'repeated-pattern': 'Repeated pattern',
  oscillation: 'Oscillation',
  'change-point': 'Change point',
  synchronization: 'Synchronization',
  desynchronization: 'Desynchronization',
  'signal-quality': 'Signal-quality event',
};

// ---------------------------------------------------------------------------
// Result plumbing
// ---------------------------------------------------------------------------

function mk(id, status, extra = {}) {
  const alg = BY_ALG_ID.get(id);
  return {
    algorithm: id,
    label: alg?.label ?? id,
    status,
    note: alg?.note ?? '',
    ...extra,
  };
}

const notApplicable = (id, reason) => mk(id, 'not-applicable', { reason, values: null, limitations: [reason] });
const insufficient = (id, reason, n = 0) => mk(id, 'insufficient-data', { reason, n, values: null, limitations: [reason] });

function commonLimitations(record, quality) {
  const out = [`Analysed window: ${formatDuration(quality?.metrics?.windowSec ?? record?.durationSec ?? NaN)} of a ${formatDuration(record?.durationSec ?? NaN)} recording.`];
  if (record?.dataClass === 'synthetic-demo') {
    out.push('This is synthetic demo data generated by the application; the numbers describe the generator, not a person.');
  }
  if (quality && !canSupportStrongConclusions(quality)) {
    out.push(`Signal quality is ${quality.grade}. ${quality.conclusionLevel}`);
  }
  out.push('Research observation only — not a diagnosis and not a clinical measurement.');
  return out;
}

// ---------------------------------------------------------------------------
// Individual algorithms
// ---------------------------------------------------------------------------

export function baselineEstimation(values, dt, opts = {}) {
  const clean = M.finite(values);
  if (clean.length < 8) return null;
  const targetSec = opts.windowSec ?? 1;
  const raw = dt ? Math.round(targetSec / dt) : 9;
  // Force an odd window so the median is centred on a real sample.
  let winSamples = Math.max(9, Math.min(201, raw));
  if (winSamples % 2 === 0) winSamples += 1;
  winSamples = Math.min(winSamples, clean.length);
  const baseline = M.movingMedian(values, winSamples);
  const finiteBase = M.finite(baseline);
  const drift = finiteBase.length > 1 ? finiteBase[finiteBase.length - 1] - finiteBase[0] : null;
  const spread = M.sd(finiteBase);
  return {
    baseline,
    windowSamples: winSamples,
    windowSec: dt ? M.round(winSamples * dt, 3) : null,
    drift: M.round(drift, 5),
    baselineSd: M.round(spread, 5),
    n: clean.length,
    method: `Moving median over ${winSamples} samples${dt ? ` (${formatDuration(winSamples * dt)})` : ''}.`,
  };
}

export function peakDetection(record, values, times, dt) {
  const cfg = PEAK_CONFIG[record.type];
  if (!cfg) {
    return notApplicable(
      'peak',
      `Peak detection is not defined for "${record.typeLabel ?? record.type}". No event definition and refractory period has been established for this signal type, so any "peak" would be an arbitrary threshold crossing.`,
    );
  }
  if (!dt) return notApplicable('peak', 'No sampling interval is declared, so a refractory period cannot be applied.');

  const clean = M.finite(values);
  if (clean.length < 16) return insufficient('peak', 'Fewer than 16 usable samples — peaks cannot be located reliably.', clean.length);

  const baseWin = Math.max(9, Math.round(0.6 / dt));
  const baseline = M.movingMedian(values, baseWin);
  const detrended = values.map((v, i) => (M.isNum(v) && M.isNum(baseline[i]) ? v - baseline[i] : NaN));
  const absD = detrended.map((v) => (M.isNum(v) ? Math.abs(v) : NaN));
  const med = M.median(absD);
  const scale = M.madScaled(absD) ?? M.sd(M.finite(absD));
  if (med === null || !scale) return insufficient('peak', 'The window has no measurable amplitude variation.', clean.length);

  const threshold = med + 3 * scale;
  const refractorySamples = Math.max(1, Math.round(cfg.refractorySec / dt));
  const peaks = [];
  let last = -Infinity;
  for (let i = 1; i < values.length - 1; i += 1) {
    if (!M.isNum(detrended[i])) continue;
    if (detrended[i] < threshold) continue;
    if (detrended[i] < detrended[i - 1] || detrended[i] < detrended[i + 1]) continue;
    if (i - last < refractorySamples) {
      // Keep the larger of two peaks inside the refractory period.
      const prev = peaks[peaks.length - 1];
      if (prev && detrended[i] > prev.amplitude) {
        peaks[peaks.length - 1] = { index: i, timeSec: times[i], amplitude: detrended[i] };
        last = i;
      }
      continue;
    }
    peaks.push({ index: i, timeSec: times[i], amplitude: detrended[i] });
    last = i;
  }

  const intervals = [];
  for (let i = 1; i < peaks.length; i += 1) intervals.push(peaks[i].timeSec - peaks[i - 1].timeSec);
  const meanInterval = M.mean(intervals);
  const intervalSd = M.sd(intervals);
  const spanSec = times.length ? times[times.length - 1] - times[0] : 0;

  return mk('peak', 'computed', {
    n: clean.length,
    params: {
      eventLabel: cfg.eventLabel,
      threshold: M.round(threshold, 5),
      refractorySec: cfg.refractorySec,
      baselineWindowSec: M.round(baseWin * dt, 3),
    },
    values: {
      peaks: peaks.map((p) => ({ timeSec: M.round(p.timeSec, 3), amplitude: M.round(p.amplitude, 5) })),
      count: peaks.length,
      countPerMinute: spanSec > 0 ? M.round((peaks.length / spanSec) * 60, 2) : null,
      rateUnit: cfg.rateUnit,
      meanIntervalSec: M.round(meanInterval, 4),
      intervalSdSec: M.round(intervalSd, 4),
      intervalCv: meanInterval && intervalSd !== null ? M.round(intervalSd / meanInterval, 4) : null,
      meanAmplitude: M.round(M.mean(peaks.map((p) => p.amplitude)), 5),
      observedSpanSec: M.round(spanSec, 2),
    },
    method: `Median baseline removed with a ${formatDuration(baseWin * dt)} moving median; ${cfg.eventLabel}s accepted above median|detrended| + 3·MADσ with a ${cfg.refractorySec} s refractory period.`,
    limitations: [
      `Count is ${cfg.eventLabel}s detected by this threshold rule, not a verified physiological count.`,
      `Observed span is ${formatDuration(spanSec)}; rates extrapolated from short windows are unstable.`,
      'Research observation only — not a diagnosis.',
    ],
  });
}

export function spectralAnalysis(record, values, dt, opts = {}) {
  if (!dt) return notApplicable('spectral', 'No sampling interval is declared, so frequency cannot be computed.');
  const fs = 1 / dt;
  const clean = M.finite(values);
  if (clean.length < 64) return insufficient('spectral', 'Fewer than 64 usable samples — a spectrum would have no meaningful resolution.', clean.length);

  const segmentSize = Math.min(opts.segmentSize ?? 1024, clean.length);
  const psd = M.periodogram(values, fs, { segmentSize, maxSegments: opts.maxSegments ?? 8, maxFrequency: opts.maxFrequency ?? 60 });
  if (!psd) return insufficient('spectral', 'The window is shorter than one analysis segment.', clean.length);

  const total = M.sum(psd.power);
  const bands = SPECTRAL_BANDS.filter((b) => b.lo < psd.nyquist).map((b) => {
    const bp = M.bandPower(psd, b.lo, Math.min(b.hi, psd.nyquist));
    const frac = M.bandFraction(psd, b.lo, Math.min(b.hi, psd.nyquist));
    return { band: b.label, meanPower: bp ? M.round(bp.mean, 6) : null, bins: bp?.bins ?? 0, fraction: frac === null ? null : M.round(frac, 4) };
  }).filter((b) => b.bins > 0);

  return mk('spectral', 'computed', {
    n: clean.length,
    params: { samplingRate: fs, segmentSize: psd.segmentSize, segments: psd.segments, maxFrequency: psd.maxFrequency },
    values: {
      dominantFrequencyHz: M.round(psd.dominantFrequency, 4),
      dominantCyclesPerMinute: M.round(psd.dominantFrequency * 60, 2),
      dominantPower: M.round(psd.dominantPower, 6),
      totalPower: M.round(total, 6),
      resolutionHz: M.round(psd.resolution, 4),
      nyquistHz: M.round(psd.nyquist, 3),
      bands,
      spectrum: psd.freqs.map((f, i) => ({ f: M.round(f, 4), p: M.round(psd.power[i], 7) })),
    },
    method: psd.method,
    limitations: [
      `Frequency resolution is ±${M.round(psd.resolution / 2, 4)} Hz; the dominant frequency cannot be stated more precisely than that.`,
      psd.segments < 4 ? `Only ${psd.segments} segment(s) were available for averaging, so the spectral estimate has high variance.` : null,
      'Band boundaries are descriptive research divisions, not clinical frequency definitions.',
      'Frequencies above the decimated Nyquist limit are not represented in this window.',
    ].filter(Boolean),
  });
}

export function timeDomainStats(values, dt) {
  const clean = M.finite(values);
  if (clean.length < 3) return insufficient('time-domain', 'Fewer than three usable samples.', clean.length);
  const { min, max } = M.minMax(clean);
  return mk('time-domain', 'computed', {
    n: clean.length,
    values: {
      mean: M.round(M.mean(clean), 4),
      median: M.round(M.median(clean), 4),
      sd: M.round(M.sd(clean), 4),
      variance: M.round(M.variance(clean), 6),
      min: M.round(min, 4),
      max: M.round(max, 4),
      range: M.round(max - min, 4),
      rms: M.round(M.rms(clean), 4),
      p5: M.round(M.percentile(clean, 5), 4),
      p25: M.round(M.percentile(clean, 25), 4),
      p75: M.round(M.percentile(clean, 75), 4),
      p95: M.round(M.percentile(clean, 95), 4),
      iqr: M.round(M.iqr(clean), 4),
      skewness: M.round(M.skewness(clean), 4),
      cv: M.round(M.cv(clean), 4),
      windowSec: dt ? M.round(clean.length * dt, 2) : null,
    },
    method: 'Standard descriptive statistics over the finite samples in the window; missing samples excluded, not imputed.',
    limitations: [clean.length < 30 ? `Only ${clean.length} samples — distribution statistics are unstable at this size.` : null].filter(Boolean),
  });
}

export function variabilityAnalysis(values, dt) {
  const clean = M.finite(values);
  if (clean.length < 5) return insufficient('variability', 'Fewer than five usable samples — variability cannot be described.', clean.length);
  const d = M.diffs(values);
  return mk('variability', 'computed', {
    n: clean.length,
    values: {
      sd: M.round(M.sd(clean), 4),
      cv: M.round(M.cv(clean), 4),
      rmssd: M.round(M.rmssd(values), 4),
      iqr: M.round(M.iqr(clean), 4),
      range: M.round(M.minMax(clean).max - M.minMax(clean).min, 4),
      meanAbsDiff: M.round(M.mean(d.map(Math.abs)), 4),
      p5: M.round(M.percentile(clean, 5), 4),
      p95: M.round(M.percentile(clean, 95), 4),
      adjacentPairs: d.length,
    },
    method: 'SD, coefficient of variation, IQR, range and RMSSD over adjacent finite samples.',
    limitations: [
      'RMSSD is only comparable across windows that share the same sampling interval.',
      dt ? null : 'No sampling interval is declared, so this is variability across measurements, not across time.',
      'Variability is a descriptive property of the recording, not a clinical score.',
    ].filter(Boolean),
  });
}

export function noiseDetection(values, dt, profile) {
  const thresholds = { 'waveform-raw': { elevated: 0.25, excessive: 0.5 }, 'inertial-raw': { elevated: 0.35, excessive: 0.7 } }[profile];
  if (!thresholds) return notApplicable('noise', `A high-frequency noise estimate is not defined for the "${profile}" processing profile.`);
  const clean = M.finite(values);
  if (clean.length < 16) return insufficient('noise', 'Fewer than 16 usable samples to estimate noise.', clean.length);
  const d = M.diffs(values);
  const noiseSd = d.length >= 4 ? (M.madScaled(d) ?? 0) / Math.SQRT2 : null;
  const signalSd = M.sd(clean);
  const ratio = noiseSd !== null && signalSd ? noiseSd / signalSd : null;
  const level = ratio === null ? 'unknown' : ratio > thresholds.excessive ? 'excessive' : ratio > thresholds.elevated ? 'elevated' : 'within tolerance';
  return mk('noise', 'computed', {
    n: clean.length,
    params: thresholds,
    values: {
      noiseSd: M.round(noiseSd, 5),
      signalSd: M.round(signalSd, 5),
      ratio: M.round(ratio, 4),
      level,
      excessive: level === 'excessive',
      elevated: level === 'elevated',
    },
    method: 'Noise SD estimated as MAD(successive differences)/√2 — valid when adjacent samples of the underlying signal are similar. Divided by the SD of the window.',
    limitations: [
      'This estimator attributes any genuine fast transient to noise, so a signal with sharp physiological spikes will read as noisier than it is.',
      level === 'excessive' ? 'Noise is excessive: amplitude-derived features from this window are not trustworthy.' : null,
    ].filter(Boolean),
  });
}

export function changePointDetection(values, times, dt, opts = {}) {
  const clean = M.finitePairs(values);
  if (clean.xs.length < 24) return insufficient('changepoint', 'Fewer than 24 usable samples — a mean-shift test would have no power.', clean.xs.length);

  const n = values.length;
  const w = M.clamp(Math.round(n / 20), 8, 200);
  if (clean.xs.length < 4 * w) return insufficient('changepoint', `The window is too short for a ${w}-sample comparison window.`, clean.xs.length);

  const pooledSd = M.sd(clean.xs) || M.madScaled(clean.xs);
  if (!pooledSd) return insufficient('changepoint', 'The series has no measurable variation, so no change point can be distinguished.', clean.xs.length);

  const zThreshold = opts.zThreshold ?? 4;
  const candidates = [];
  const denom = pooledSd * Math.sqrt(2 / w);
  for (let i = w; i <= n - w; i += 1) {
    const left = values.slice(i - w, i);
    const right = values.slice(i, i + w);
    const lf = M.finite(left);
    const rf = M.finite(right);
    if (lf.length < w * 0.6 || rf.length < w * 0.6) continue;
    const z = (M.mean(rf) - M.mean(lf)) / denom;
    candidates.push({ index: i, timeSec: times[i], z, magnitude: M.mean(rf) - M.mean(lf) });
  }

  const minSep = opts.minSeparationSamples ?? w;
  candidates.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  const chosen = [];
  for (const c of candidates) {
    if (Math.abs(c.z) < zThreshold) break;
    if (chosen.some((s) => Math.abs(s.index - c.index) < minSep)) continue;
    chosen.push(c);
    if (chosen.length >= (opts.maxPoints ?? 6)) break;
  }
  chosen.sort((a, b) => a.index - b.index);

  return mk('changepoint', 'computed', {
    n: clean.xs.length,
    params: { windowSamples: w, zThreshold, pooledSd: M.round(pooledSd, 5), maxPoints: opts.maxPoints ?? 6 },
    values: {
      count: chosen.length,
      points: chosen.map((c) => ({
        timeSec: M.round(c.timeSec, 3),
        index: c.index,
        z: M.round(c.z, 3),
        magnitude: M.round(c.magnitude, 5),
        direction: c.magnitude > 0 ? 'increase' : 'decrease',
        localizationUncertaintySec: dt ? M.round((w / 2) * dt, 3) : null,
      })),
    },
    method: `Sliding-window mean-shift test: two ${w}-sample windows either side of each candidate, difference divided by pooled SD·√(2/w); |z| > ${zThreshold} retained with a ${w}-sample minimum separation.`,
    limitations: [
      `Each change point is localized only to ±${dt ? formatDuration((w / 2) * dt) : 'half the comparison window'}.`,
      'The test assumes an approximately constant variance; a variance change alone can also produce a detection.',
      chosen.length ? 'A detected change point is a statistical observation about this recording, not an explanation of it.' : 'No change point reached the threshold — that is not evidence that none exists.',
    ],
  });
}

export function trendDetection(values, times, unit) {
  const pts = [];
  for (let i = 0; i < values.length; i += 1) {
    if (M.isNum(values[i]) && Number.isFinite(times[i])) pts.push({ x: times[i], y: values[i] });
  }
  if (pts.length < 4) return insufficient('trend', 'Fewer than four timed measurements — no trend can be estimated.', pts.length);

  const fit = M.linreg(pts);
  if (!fit) return insufficient('trend', 'The measurement times have no spread, so a slope is undefined.', pts.length);

  // Robust check: median of pairwise slopes on a capped subsample.
  const step = Math.max(1, Math.floor(pts.length / 120));
  const sub = pts.filter((_, i) => i % step === 0);
  const slopes = [];
  for (let i = 0; i < sub.length; i += 1) {
    for (let j = i + 1; j < sub.length; j += 1) {
      const dx = sub[j].x - sub[i].x;
      if (dx > 0) slopes.push((sub[j].y - sub[i].y) / dx);
    }
  }
  const robustSlope = slopes.length ? M.median(slopes) : null;
  const spanSec = pts[pts.length - 1].x - pts[0].x;
  const ySd = M.sd(pts.map((p) => p.y));
  const perHour = fit.slope * 3600;
  const effect = ySd ? Math.abs(perHour * (spanSec / 3600)) / ySd : null;
  const direction = fit.r2 < 0.05 || effect === null || effect < 0.2 ? 'no clear trend' : perHour > 0 ? 'increasing' : 'decreasing';

  return mk('trend', 'computed', {
    n: fit.n,
    params: { unit: unit ?? null, spanSec: M.round(spanSec, 1) },
    values: {
      slopePerSec: M.round(fit.slope, 8),
      slopePerHour: M.round(perHour, 4),
      intercept: M.round(fit.intercept, 4),
      r2: M.round(fit.r2, 4),
      slopeStdError: fit.se === null ? null : M.round(fit.se, 8),
      tStatistic: fit.t === null ? null : M.round(fit.t, 3),
      degreesOfFreedom: fit.n - 2,
      robustSlopePerSec: robustSlope === null ? null : M.round(robustSlope, 8),
      robustAgrees: robustSlope === null ? null : Math.sign(robustSlope) === Math.sign(fit.slope),
      totalChangeOverWindow: M.round(fit.slope * spanSec, 4),
      direction,
      spanSec: M.round(spanSec, 1),
    },
    method: 'Ordinary least squares on (time, value), cross-checked against the median of pairwise slopes (Theil–Sen style).',
    limitations: [
      `A linear fit over ${formatDuration(spanSec)} describes this window only; it is not a long-term trajectory.`,
      fit.r2 < 0.2 ? `Only ${M.round(fit.r2 * 100, 1)} % of the variance is explained by the linear fit, so the trend is weak.` : null,
      robustSlope !== null && Math.sign(robustSlope) !== Math.sign(fit.slope) ? 'The robust slope disagrees in sign with the least-squares slope — the trend is driven by a few points.' : null,
      'The t statistic is reported without a p-value: no reference distribution is computed here, and none is invented.',
      'A trend is a statistical relationship in this recording, not a cause and not a prognosis.',
    ].filter(Boolean),
  });
}

export function vectorMagnitude(windows) {
  const usable = (windows ?? []).filter((w) => w && !w.error && w.values?.length);
  if (usable.length < 3) {
    return notApplicable(
      'vector-magnitude',
      `Vector magnitude requires the X, Y and Z axes recorded on the same device and time base. ${usable.length} usable axis window(s) were supplied, so no magnitude was computed.`,
    );
  }
  const n = Math.min(...usable.map((w) => w.values.length));
  if (n < 4) return insufficient('vector-magnitude', 'The overlapping portion of the three axes is too short.', n);
  const values = new Array(n);
  for (let i = 0; i < n; i += 1) {
    const a = usable[0].values[i];
    const b = usable[1].values[i];
    const c = usable[2].values[i];
    values[i] = M.isNum(a) && M.isNum(b) && M.isNum(c) ? Math.sqrt(a * a + b * b + c * c) : NaN;
  }
  const clean = M.finite(values);
  return mk('vector-magnitude', 'computed', {
    n: clean.length,
    params: { axes: usable.length, samplesCompared: n },
    values: {
      series: values.map((v) => M.round(v, 5)),
      mean: M.round(M.mean(clean), 4),
      sd: M.round(M.sd(clean), 4),
      min: M.round(M.minMax(clean).min, 4),
      max: M.round(M.minMax(clean).max, 4),
      rms: M.round(M.rms(clean), 4),
      missingSamples: n - clean.length,
    },
    method: '√(x² + y² + z²) computed sample-by-sample; samples where any axis is missing are left missing.',
    limitations: [
      'The magnitude includes the gravity component, so a stationary wrist reads ≈1 g rather than 0.',
      'Axes were assumed to share a time base; if they were recorded separately this comparison is not valid.',
    ],
  });
}

export function movementEventDetection(values, times, dt, opts = {}) {
  const clean = M.finite(values);
  if (clean.length < 16) return insufficient('movement-events', 'Fewer than 16 usable samples.', clean.length);
  if (!dt) return notApplicable('movement-events', 'No sampling interval is declared, so event duration cannot be measured.');

  const med = M.median(clean);
  const scale = M.madScaled(clean) ?? M.sd(clean);
  if (!scale) return insufficient('movement-events', 'The series has no measurable variation.', clean.length);
  const threshold = med + (opts.z ?? 2.5) * scale;
  const minDurationSec = opts.minDurationSec ?? 0.4;
  const minSamples = Math.max(1, Math.round(minDurationSec / dt));

  const events = [];
  let start = -1;
  for (let i = 0; i <= values.length; i += 1) {
    const active = i < values.length && M.isNum(values[i]) && Math.abs(values[i] - med) > (opts.z ?? 2.5) * scale;
    if (active && start < 0) start = i;
    if (!active && start >= 0) {
      if (i - start >= minSamples) {
        const seg = values.slice(start, i);
        events.push({
          startTimeSec: M.round(times[start], 3),
          endTimeSec: M.round(times[i - 1], 3),
          durationSec: M.round((i - start) * dt, 3),
          peakDeviation: M.round(M.minMax(M.finite(seg).map((v) => Math.abs(v - med))).max, 4),
        });
      }
      start = -1;
    }
  }
  const totalSec = events.reduce((a, e) => a + e.durationSec, 0);
  return mk('movement-events', 'computed', {
    n: clean.length,
    params: { z: opts.z ?? 2.5, minDurationSec, threshold: M.round(threshold, 4), baseline: M.round(med, 4) },
    values: {
      count: events.length,
      events: events.slice(0, 40),
      truncated: events.length > 40,
      totalActiveSec: M.round(totalSec, 2),
      activeFraction: times.length ? M.round(totalSec / (times[times.length - 1] - times[0] || 1), 4) : null,
    },
    method: `Samples deviating more than ${opts.z ?? 2.5} robust σ from the median, grouped into episodes of at least ${formatDuration(minDurationSec)}.`,
    limitations: [
      'These are movement episodes in an inertial channel, not physiological beats or clinical events.',
      events.length > 40 ? 'Only the first 40 episodes are listed; the count reflects all of them.' : null,
    ].filter(Boolean),
  });
}

export function descriptiveStatistics(values, unit) {
  const clean = M.finite(values);
  if (!clean.length) return insufficient('descriptive', 'No measurements with a value were found.', 0);
  const { min, max } = M.minMax(clean);
  return mk('descriptive', 'computed', {
    n: clean.length,
    params: { unit: unit ?? null },
    values: {
      mean: M.round(M.mean(clean), 3),
      median: M.round(M.median(clean), 3),
      sd: clean.length >= 2 ? M.round(M.sd(clean), 3) : null,
      variance: clean.length >= 2 ? M.round(M.variance(clean), 4) : null,
      cv: M.round(M.cv(clean), 4),
      min: M.round(min, 3),
      max: M.round(max, 3),
      range: M.round(max - min, 3),
      p5: M.round(M.percentile(clean, 5), 3),
      p25: M.round(M.percentile(clean, 25), 3),
      p75: M.round(M.percentile(clean, 75), 3),
      p95: M.round(M.percentile(clean, 95), 3),
      iqr: M.round(M.iqr(clean), 3),
      measurementCount: clean.length,
    },
    method: 'Descriptive statistics over the supplied spot measurements; values without a number were excluded.',
    limitations: [
      clean.length < 5 ? `Only ${clean.length} measurement(s) — the spread and percentiles are not stable.` : null,
      'No reference range is applied here; ranges come only from the laboratory or dataset that supplied them.',
    ].filter(Boolean),
  });
}

/**
 * Outlier detection.
 *
 * `opts.isolated` must agree with OUTLIER_RULES in src/lib/signalQuality.js.
 * The isolated variant only flags a sample whose neighbourhood is quiet, so a
 * genuine sustained excursion — an activity burst, a desaturation episode, a
 * night of zero step counts — is described as a regime change by change-point
 * and burst detection instead of being counted as corrupt data. For spot
 * measurements there is no neighbourhood in time, so the plain test is used.
 */
export function outlierDetection(values, times, unit, opts = {}) {
  const clean = M.finite(values);
  if (clean.length < 4) return insufficient('outliers', 'Fewer than four measurements — a robust outlier test would flag noise as findings.', clean.length);
  const isolated = Boolean(opts.isolated);
  const res = isolated ? M.isolatedOutlierIndices(values, { k: 5 }) : M.outlierIndices(values, 5);
  return mk('outliers', 'computed', {
    n: clean.length,
    params: {
      k: 5,
      isolated,
      unit: unit ?? null,
      center: M.round(res.center, 3),
      robustSigma: M.round(res.scale, 3),
    },
    values: {
      count: res.indices.length,
      pct: M.round((res.indices.length / values.length) * 100, 2),
      extremeCount: isolated ? res.extremeCount : res.indices.length,
      outliers: res.indices.slice(0, 20).map((i) => ({
        index: i,
        value: M.round(values[i], 3),
        timeSec: times?.[i] === undefined ? null : M.round(times[i], 1),
        robustZ: M.round((values[i] - res.center) / res.scale, 2),
      })),
    },
    method: isolated
      ? 'Robust z = (value − median) / (1.4826·MAD); flagged when |z| > 5 AND the surrounding samples are not themselves deviant, so only isolated spikes are counted.'
      : 'Robust z = (value − median) / (1.4826·MAD); flagged when |z| > 5.',
    limitations: [
      'An outlier is a value far from the others in this sample. It is not an abnormal result and not a clinical finding.',
      isolated && res.extremeCount > res.indices.length
        ? `${res.extremeCount - res.indices.length} further deviant sample(s) were excluded because they sit inside a sustained excursion, which is a change of state rather than an isolated spike.`
        : null,
      res.indices.length > 20 ? 'Only the first 20 are listed.' : null,
    ].filter(Boolean),
  });
}

export function groupComparison(a, b, labels) {
  const xa = M.finite(a ?? []);
  const xb = M.finite(b ?? []);
  if (!xa.length || !xb.length) {
    return notApplicable(
      'group-comparison',
      'Group comparison requires two labelled groups with at least one measurement each. Only the supplied groups were used; no group was inferred.',
    );
  }
  if (xa.length < 2 || xb.length < 2) {
    return insufficient('group-comparison', 'Each group needs at least two measurements for a spread-based comparison.', Math.min(xa.length, xb.length));
  }
  const welch = M.welchT(a, b);
  const d = M.cohensD(a, b);
  const diff = welch ? welch.mean1 - welch.mean2 : null;
  const se = welch ? Math.sqrt(M.variance(xa) / xa.length + M.variance(xb) / xb.length) : null;
  const tcrit = welch ? tCritical95(welch.df) : null;
  return mk('group-comparison', 'computed', {
    n: xa.length + xb.length,
    params: { group1: labels?.[0] ?? 'Group 1', group2: labels?.[1] ?? 'Group 2', n1: xa.length, n2: xb.length },
    values: {
      mean1: welch ? M.round(welch.mean1, 3) : null,
      mean2: welch ? M.round(welch.mean2, 3) : null,
      sd1: M.round(M.sd(xa), 3),
      sd2: M.round(M.sd(xb), 3),
      meanDifference: M.round(diff, 3),
      standardError: se === null ? null : M.round(se, 4),
      ci95: diff !== null && se && tcrit !== null ? [M.round(diff - tcrit * se, 3), M.round(diff + tcrit * se, 3)] : null,
      welchT: welch ? M.round(welch.t, 3) : null,
      degreesOfFreedom: welch ? M.round(welch.df, 1) : null,
      cohensD: d === null ? null : M.round(d, 3),
      effectSizeLabel: effectSizeLabel(d),
      tcrit95: tcrit === null ? null : M.round(tcrit, 3),
      exceedsTcrit: welch && tcrit !== null ? Math.abs(welch.t) > tcrit : null,
    },
    method: `Welch two-sample t (unequal variances) with ${welch ? M.round(welch.df, 1) : '—'} degrees of freedom; Cohen d from the pooled SD; 95 % CI from the t critical value.`,
    limitations: [
      'No p-value is reported: the exact t-distribution CDF is not implemented here, and a p-value would have to be invented.',
      `The 95 % CI uses a tabulated t critical value for df ≈ ${welch ? Math.round(welch.df) : '—'}; it is an approximation.`,
      'A difference between two groups in this dataset is a statistical relationship. It is not causation and not a diagnosis.',
      Math.min(xa.length, xb.length) < 8 ? 'One group has fewer than eight measurements, so the comparison is underpowered.' : null,
    ].filter(Boolean),
  });
}

/**
 * Two-sided 95 % t critical value. Small-df values are tabulated; beyond that
 * the normal approximation with a first-order correction is used. The table is
 * the reason a confidence interval can be shown at all without inventing a CDF.
 */
export function tCritical95(df) {
  if (!Number.isFinite(df) || df < 1) return null;
  const table = {
    1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365, 8: 2.306,
    9: 2.262, 10: 2.228, 11: 2.201, 12: 2.179, 13: 2.16, 14: 2.145, 15: 2.131, 16: 2.12,
    17: 2.11, 18: 2.101, 19: 2.093, 20: 2.086, 25: 2.06, 30: 2.042, 40: 2.021, 60: 2.0,
    120: 1.98,
  };
  const d = Math.round(df);
  if (table[d]) return table[d];
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < keys.length - 1; i += 1) {
    if (d > keys[i] && d < keys[i + 1]) {
      const lo = keys[i];
      const hi = keys[i + 1];
      return table[lo] + ((table[hi] - table[lo]) * (d - lo)) / (hi - lo);
    }
  }
  return d > 120 ? 1.96 + 1 / Math.max(1, d) : 1.98;
}

export function effectSizeLabel(d) {
  if (d === null || !Number.isFinite(d)) return 'not computable';
  const a = Math.abs(d);
  if (a < 0.2) return 'negligible';
  if (a < 0.5) return 'small';
  if (a < 0.8) return 'medium';
  return 'large';
}

// ---------------------------------------------------------------------------
// Band power (band-power profile)
// ---------------------------------------------------------------------------

export function relativeBandPower(bandRecords, windows) {
  const usable = (bandRecords ?? [])
    .map((r, i) => ({ record: r, win: windows?.[i] ?? resolveSignalValues(r, {}) }))
    .filter((x) => x.record && !x.win.error && M.finite(x.win.values).length > 0);

  if (usable.length < 2) {
    return notApplicable(
      'band-power',
      `Relative band power requires several bands from the same recording. ${usable.length} band(s) with usable values were supplied, so no relative figure was computed — a single band has nothing to be relative to.`,
    );
  }

  const rows = usable.map(({ record, win }) => ({
    type: record.type,
    label: record.typeLabel ?? record.type,
    channel: record.channel ?? null,
    mean: M.round(M.mean(M.finite(win.values)), 4),
    sd: M.round(M.sd(M.finite(win.values)), 4),
    n: M.finite(win.values).length,
    unit: record.unit ?? null,
  }));
  const total = M.sum(rows.map((r) => Math.max(0, r.mean ?? 0)));
  for (const r of rows) r.fraction = total ? M.round(Math.max(0, r.mean ?? 0) / total, 4) : null;
  const dominant = rows.slice().sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0))[0];

  return mk('band-power', 'computed', {
    n: M.sum(rows.map((r) => r.n)),
    params: { bands: rows.length },
    values: { rows, totalMean: M.round(total, 4), dominantBand: dominant?.label ?? null, dominantFraction: dominant?.fraction ?? null },
    method: 'Mean of each supplied band series, expressed as a fraction of the summed band means.',
    limitations: [
      'Bands are compared by their mean power in the analysed window only; different window lengths per band would bias this.',
      'This is not a full spectral decomposition — the values are those stored per band, whatever produced them.',
      dominant ? `Highest mean band: ${dominant.label}. A dominant band is a description of this recording, not a brain-state classification.` : null,
    ].filter(Boolean),
  });
}

// ---------------------------------------------------------------------------
// Categorical epochs
// ---------------------------------------------------------------------------

export function stageDistribution(labels) {
  const present = (labels ?? []).filter((l) => l !== null && l !== undefined);
  if (!present.length) return insufficient('stage-distribution', 'No labelled epochs were found in this window.', 0);
  const counts = new Map();
  for (const l of present) counts.set(l, (counts.get(l) ?? 0) + 1);
  const total = (labels ?? []).length;
  const rows = [...counts.entries()]
    .map(([label, count]) => ({ label, count, pctOfLabelled: M.round((count / present.length) * 100, 2), pctOfWindow: M.round((count / total) * 100, 2) }))
    .sort((a, b) => b.count - a.count);
  return mk('stage-distribution', 'computed', {
    n: present.length,
    values: { rows, labelled: present.length, totalEpochs: total, unlabelled: total - present.length, distinctLabels: counts.size },
    method: 'Direct count of epoch labels; unlabelled epochs are reported separately and never assigned to a stage.',
    limitations: [
      total - present.length > 0 ? `${total - present.length} epoch(s) carry no label and are excluded from the percentages of labelled epochs.` : null,
      'Labels are taken as supplied. This engine does not re-derive stages from raw signals and cannot verify them.',
    ].filter(Boolean),
  });
}

export function transitionCounting(labels) {
  const seq = (labels ?? []).filter((l) => l !== null && l !== undefined);
  if (seq.length < 2) return insufficient('transitions', 'Fewer than two consecutive labelled epochs.', seq.length);
  const pairs = new Map();
  let changes = 0;
  for (let i = 1; i < seq.length; i += 1) {
    if (seq[i] !== seq[i - 1]) {
      changes += 1;
      const key = `${seq[i - 1]} → ${seq[i]}`;
      pairs.set(key, (pairs.get(key) ?? 0) + 1);
    }
  }
  const rows = [...pairs.entries()].map(([transition, count]) => ({ transition, count })).sort((a, b) => b.count - a.count);
  return mk('transitions', 'computed', {
    n: seq.length,
    values: {
      transitions: changes,
      transitionsPerEpoch: M.round(changes / (seq.length - 1), 4),
      distinctTransitions: rows.length,
      topTransitions: rows.slice(0, 8),
    },
    method: 'Counted label changes between consecutive labelled epochs; unlabelled epochs break the chain and are not bridged.',
    limitations: ['Transitions across an unlabelled stretch are not counted, so the total understates changes when coverage is incomplete.'],
  });
}

export function regularityIndex(labels, epochSec) {
  const seq = (labels ?? []).filter((l) => l !== null && l !== undefined);
  if (seq.length < 10) return insufficient('regularity', 'Fewer than ten labelled epochs — a regularity index would be meaningless.', seq.length);
  const counts = new Map();
  for (const l of seq) counts.set(l, (counts.get(l) ?? 0) + 1);
  const p = [...counts.values()].map((c) => c / seq.length);
  const entropy = -M.sum(p.map((v) => (v > 0 ? v * Math.log2(v) : 0)));
  const maxEntropy = Math.log2(counts.size);
  let changes = 0;
  for (let i = 1; i < seq.length; i += 1) if (seq[i] !== seq[i - 1]) changes += 1;
  const continuity = 1 - changes / (seq.length - 1);
  const meanRun = (seq.length - 1) / Math.max(1, changes);
  return mk('regularity', 'computed', {
    n: seq.length,
    params: { epochSec: epochSec ?? null },
    values: {
      stateContinuity: M.round(continuity, 4),
      normalizedEntropy: maxEntropy ? M.round(entropy / maxEntropy, 4) : null,
      entropyBits: M.round(entropy, 4),
      distinctLabels: counts.size,
      meanRunLengthEpochs: M.round(meanRun, 2),
      meanRunLengthSec: epochSec ? M.round(meanRun * epochSec, 1) : null,
      index: M.round(continuity * 100, 1),
    },
    method: 'State continuity = 1 − (label changes / labelled epochs); label entropy normalised by log2(number of distinct labels).',
    limitations: [
      'This index is a description of label sequencing. It is not a sleep-quality score and has no clinical threshold.',
      'Continuity rewards long unbroken runs, so a recording with few labels can look artificially regular.',
    ],
  });
}

export function labelAgreement(labelsA, labelsB) {
  const n = Math.min(labelsA?.length ?? 0, labelsB?.length ?? 0);
  const a = [];
  const b = [];
  for (let i = 0; i < n; i += 1) {
    if (labelsA[i] != null && labelsB[i] != null) {
      a.push(labelsA[i]);
      b.push(labelsB[i]);
    }
  }
  if (a.length < 5) {
    return insufficient('similarity', `Only ${a.length} epoch(s) are labelled in both series; at least five are needed to compare them.`, a.length);
  }
  const labels = [...new Set([...a, ...b])];
  let agree = 0;
  for (let i = 0; i < a.length; i += 1) if (a[i] === b[i]) agree += 1;
  const po = agree / a.length;
  const pa = labels.map((l) => a.filter((x) => x === l).length / a.length);
  const pb = labels.map((l) => b.filter((x) => x === l).length / b.length);
  const pe = M.sum(pa.map((v, i) => v * pb[i]));
  const kappa = Math.abs(1 - pe) < 1e-9 ? null : (po - pe) / (1 - pe);
  return mk('similarity', 'computed', {
    n: a.length,
    values: {
      observedAgreement: M.round(po, 4),
      expectedAgreement: M.round(pe, 4),
      cohensKappa: kappa === null ? null : M.round(kappa, 4),
      kappaInterpretation: kappaInterpretation(kappa),
      comparedLabels: labels.length,
    },
    method: 'Observed agreement and Cohen kappa over epochs labelled in both series.',
    limitations: [
      'Agreement describes two label series in this window. It does not establish that one is correct, and it is not evidence of a shared cause.',
      kappa === null ? 'Expected agreement is ≈1 (nearly a single label), so kappa is undefined.' : null,
    ].filter(Boolean),
  });
}

function kappaInterpretation(k) {
  if (k === null) return 'not computable';
  if (k < 0) return 'below chance agreement';
  if (k < 0.2) return 'slight';
  if (k < 0.4) return 'fair';
  if (k < 0.6) return 'moderate';
  if (k < 0.8) return 'substantial';
  return 'almost perfect';
}

// ---------------------------------------------------------------------------
// Event series
// ---------------------------------------------------------------------------

function eventTimesFromValues(values, times) {
  const out = [];
  for (let i = 0; i < values.length; i += 1) {
    if (M.isNum(values[i]) && values[i] > 0.5) out.push(times[i]);
  }
  return out;
}

export function eventCounting(values, times) {
  const ev = eventTimesFromValues(values, times);
  const span = times.length >= 2 ? times[times.length - 1] - times[0] : null;
  if (!ev.length) {
    return mk('event-counting', 'computed', {
      n: M.finite(values).length,
      values: { count: 0, ratePerHour: 0, observedSpanSec: span === null ? null : M.round(span, 1) },
      method: 'Count of samples whose value exceeds 0.5 in the event indicator series.',
      limitations: ['No events were found in this window. That is an observation about this window, not evidence that none occurred.'],
    });
  }
  return mk('event-counting', 'computed', {
    n: M.finite(values).length,
    values: {
      count: ev.length,
      firstEventSec: M.round(ev[0], 1),
      lastEventSec: M.round(ev[ev.length - 1], 1),
      observedSpanSec: span === null ? null : M.round(span, 1),
      ratePerHour: span ? M.round((ev.length / span) * 3600, 3) : null,
    },
    method: 'Count of samples whose value exceeds 0.5 in the event indicator series; rate uses the observed span, not the nominal recording length.',
    limitations: [span ? null : 'Timestamps are unavailable, so no rate could be computed.', 'Event counts depend on how the source defined an event; this engine does not re-detect them.'].filter(Boolean),
  });
}

export function interEventInterval(values, times) {
  const ev = eventTimesFromValues(values, times);
  if (ev.length < 2) return insufficient('inter-event', 'Fewer than two events — no interval can be measured.', ev.length);
  const intervals = [];
  for (let i = 1; i < ev.length; i += 1) intervals.push(ev[i] - ev[i - 1]);
  return mk('inter-event', 'computed', {
    n: intervals.length,
    values: {
      meanSec: M.round(M.mean(intervals), 3),
      medianSec: M.round(M.median(intervals), 3),
      sdSec: M.round(M.sd(intervals), 3),
      cv: M.round(M.cv(intervals), 4),
      minSec: M.round(M.minMax(intervals).min, 3),
      maxSec: M.round(M.minMax(intervals).max, 3),
      intervals: intervals.slice(0, 40).map((v) => M.round(v, 3)),
    },
    method: 'Differences between consecutive event timestamps.',
    limitations: ['Intervals that span a recording gap are included as-is; a dropout can look like a long interval.'],
  });
}

export function burstDetection(values, times, opts = {}) {
  const ev = eventTimesFromValues(values, times);
  if (ev.length < 3) return insufficient('burst', 'Fewer than three events — a burst cannot be distinguished from chance clustering.', ev.length);
  const intervals = [];
  for (let i = 1; i < ev.length; i += 1) intervals.push(ev[i] - ev[i - 1]);
  const med = M.median(intervals);
  if (!med) return insufficient('burst', 'All events share the same timestamp, so intervals cannot be measured.', ev.length);
  const factor = opts.factor ?? 0.4;
  const threshold = med * factor;
  const bursts = [];
  let cur = [ev[0]];
  for (let i = 1; i < ev.length; i += 1) {
    if (ev[i] - ev[i - 1] <= threshold) cur.push(ev[i]);
    else {
      if (cur.length >= (opts.minEvents ?? 3)) bursts.push(cur);
      cur = [ev[i]];
    }
  }
  if (cur.length >= (opts.minEvents ?? 3)) bursts.push(cur);
  return mk('burst', 'computed', {
    n: ev.length,
    params: { intervalThresholdSec: M.round(threshold, 2), minEvents: opts.minEvents ?? 3, medianIntervalSec: M.round(med, 2) },
    values: {
      count: bursts.length,
      bursts: bursts.slice(0, 20).map((b) => ({
        startSec: M.round(b[0], 2),
        endSec: M.round(b[b.length - 1], 2),
        events: b.length,
        durationSec: M.round(b[b.length - 1] - b[0], 2),
      })),
    },
    method: `Consecutive events separated by less than ${M.round(factor * 100, 0)} % of the median inter-event interval, requiring at least ${opts.minEvents ?? 3} events.`,
    limitations: [
      'The threshold is derived from this series\' own median interval, so it is relative — it is not an established burst definition.',
      bursts.length ? 'A burst is a clustering observation. No cause is implied.' : 'No burst was found; short recordings make bursts easy to miss.',
    ],
  });
}

export function repeatedPatternDetection(values, times, dt) {
  const clean = M.finite(values);
  if (clean.length < 32) return insufficient('repeated-pattern', 'Fewer than 32 samples — autocorrelation would not resolve a period.', clean.length);
  const maxLag = Math.floor(clean.length / 3);
  const ac = [];
  for (let lag = 1; lag <= maxLag; lag += 1) {
    const r = M.autocorr(values, lag);
    if (r !== null) ac.push({ lag, r });
  }
  if (ac.length < 4) return insufficient('repeated-pattern', 'Not enough lags could be evaluated.', clean.length);
  let best = ac[0];
  for (const a of ac) if (a.r > best.r) best = a;
  const periodSec = dt ? best.lag * dt : null;
  const strength = best.r;
  return mk('repeated-pattern', 'computed', {
    n: clean.length,
    params: { maxLagSamples: maxLag },
    values: {
      bestLagSamples: best.lag,
      periodSec: periodSec === null ? null : M.round(periodSec, 3),
      periodPerMinute: periodSec ? M.round(60 / periodSec, 2) : null,
      autocorrelation: M.round(strength, 4),
      repeating: strength > 0.5,
      curve: ac.slice(0, 120).map((a) => ({ lag: a.lag, r: M.round(a.r, 4) })),
    },
    method: 'Autocorrelation evaluated at every lag up to one third of the window; the strongest positive peak is reported.',
    limitations: [
      `Autocorrelation of ${M.round(strength, 2)} at lag ${best.lag}${periodSec ? ` (${formatDuration(periodSec)})` : ''}.`,
      strength > 0.5 ? 'A repeating structure is present in this window.' : 'No strong repetition was found within the evaluated lag range.',
      'Repetition is not periodicity in a clinical sense and implies no mechanism.',
    ],
  });
}

// ---------------------------------------------------------------------------
// Cross-signal analysis
// ---------------------------------------------------------------------------

function commonGrid(winA, winB, timesA, timesB, maxPoints = 1500) {
  const lo = Math.max(timesA[0] ?? 0, timesB[0] ?? 0);
  const hi = Math.min(timesA[timesA.length - 1] ?? 0, timesB[timesB.length - 1] ?? 0);
  if (!(hi > lo)) return null;
  const n = Math.min(maxPoints, Math.max(8, Math.round((hi - lo) / Math.min(winA.dt || 1, winB.dt || 1))));
  const step = (hi - lo) / (n - 1);
  const grid = new Array(n);
  for (let i = 0; i < n; i += 1) grid[i] = lo + i * step;
  return {
    times: grid,
    a: M.interpolateOnto(timesA, winA.values, grid),
    b: M.interpolateOnto(timesB, winB.values, grid),
    dt: step,
  };
}

export function crossSignalCorrelation(recordA, recordB, winA, winB, opts = {}) {
  const a = winA ?? resolveSignalValues(recordA, opts);
  const b = winB ?? resolveSignalValues(recordB, opts);
  if (a.error || b.error) {
    return notApplicable('cross-correlation', `Values could not be resolved: ${a.error ?? b.error}`);
  }
  if (recordA.kind === 'categorical' || recordB.kind === 'categorical') {
    return notApplicable('cross-correlation', 'Pearson correlation is not defined for categorical label series; use similarity analysis instead.');
  }
  const tA = windowTimes(a);
  const tB = windowTimes(b);
  const grid = commonGrid(a, b, tA, tB, opts.maxPoints ?? 1200);
  if (!grid) {
    return notApplicable('cross-correlation', 'The two recordings do not overlap in time, so no simultaneous comparison exists. No alignment was assumed.');
  }
  const res = M.pearson(grid.a, grid.b);
  if (res.r === null) return insufficient('cross-correlation', 'Fewer than three overlapping samples carry values in both series.', res.n);
  const n = res.n;
  const se = n > 3 ? Math.sqrt((1 - res.r ** 2) / (n - 2)) : null;
  return mk('cross-correlation', 'computed', {
    n,
    params: {
      signalA: recordA.typeLabel ?? recordA.type,
      signalB: recordB.typeLabel ?? recordB.type,
      overlapSec: M.round(grid.times[grid.times.length - 1] - grid.times[0], 1),
      gridDt: M.round(grid.dt, 4),
    },
    values: {
      pearsonR: M.round(res.r, 4),
      r2: M.round(res.r ** 2, 4),
      strength: correlationStrength(res.r),
      direction: res.r > 0 ? 'positive' : res.r < 0 ? 'negative' : 'none',
      standardError: se === null ? null : M.round(se, 4),
      ci95: se === null ? null : [M.round(res.r - 1.96 * se, 4), M.round(res.r + 1.96 * se, 4)],
      relationshipType: 'Correlation',
    },
    method: `Both series interpolated onto a common ${M.round(grid.dt, 3)} s grid over their overlapping span (${formatDuration(grid.times[grid.times.length - 1] - grid.times[0])}), then Pearson r over pairwise-complete samples.`,
    limitations: [
      'This is a correlation — a statistical relationship between two recordings. It is not causation, not a temporal association with a lag, and not a diagnosis.',
      'Interpolation onto a common grid smooths both series, which can inflate r when one series is much sparser than the other.',
      `Overlapping span is ${formatDuration(grid.times[grid.times.length - 1] - grid.times[0])}; r estimated outside that span would be extrapolation.`,
      se === null ? 'Too few overlapping samples for a standard error.' : null,
    ].filter(Boolean),
  });
}

export function correlationStrength(r) {
  if (r === null) return 'not computable';
  const a = Math.abs(r);
  if (a < 0.1) return 'negligible';
  if (a < 0.3) return 'weak';
  if (a < 0.5) return 'moderate';
  if (a < 0.7) return 'strong';
  return 'very strong';
}

export function synchronizationAnalysis(recordA, recordB, winA, winB, opts = {}) {
  const a = winA ?? resolveSignalValues(recordA, opts);
  const b = winB ?? resolveSignalValues(recordB, opts);
  if (a.error || b.error) return notApplicable('cross-correlation', `Values could not be resolved: ${a.error ?? b.error}`);
  const tA = windowTimes(a);
  const tB = windowTimes(b);
  const grid = commonGrid(a, b, tA, tB, opts.maxPoints ?? 1000);
  if (!grid) return notApplicable('cross-correlation', 'The two recordings do not overlap in time, so synchronization cannot be assessed.');

  const dt = grid.dt;
  const maxLagSec = opts.maxLagSec ?? Math.min(30, (grid.times[grid.times.length - 1] - grid.times[0]) / 4);
  const maxLag = Math.max(1, Math.round(maxLagSec / dt));
  const za = M.zScore(grid.a);
  const zb = M.zScore(grid.b);
  let best = { lag: 0, r: -Infinity };
  const curve = [];
  for (let lag = -maxLag; lag <= maxLag; lag += 1) {
    const xs = [];
    const ys = [];
    for (let i = 0; i < za.length; i += 1) {
      const j = i + lag;
      if (j >= 0 && j < zb.length && M.isNum(za[i]) && M.isNum(zb[j])) {
        xs.push(za[i]);
        ys.push(zb[j]);
      }
    }
    const r = M.pearson(xs, ys).r;
    if (r !== null) {
      curve.push({ lagSec: M.round(lag * dt, 3), r: M.round(r, 4) });
      if (r > best.r) best = { lag, r };
    }
  }
  if (!curve.length) return insufficient('cross-correlation', 'No lag produced enough overlapping samples.', 0);

  const lagSec = best.lag * dt;
  const zeroLag = curve.find((c) => c.lagSec === 0)?.r ?? null;
  const classification =
    best.r >= 0.6 && Math.abs(lagSec) <= Math.max(dt * 2, 0.5)
      ? 'synchronization'
      : best.r >= 0.6
        ? 'lagged association'
        : best.r < 0.3
          ? 'desynchronization'
          : 'unclear';

  return {
    algorithm: 'synchronization',
    label: 'Synchronization analysis',
    status: 'computed',
    n: grid.a.length,
    params: {
      signalA: recordA.typeLabel ?? recordA.type,
      signalB: recordB.typeLabel ?? recordB.type,
      maxLagSec: M.round(maxLagSec, 2),
      gridDt: M.round(dt, 4),
    },
    values: {
      bestLagSec: M.round(lagSec, 3),
      bestCorrelation: M.round(best.r, 4),
      zeroLagCorrelation: zeroLag === null ? null : M.round(zeroLag, 4),
      classification,
      eventType: classification === 'synchronization' ? 'synchronization' : classification === 'desynchronization' ? 'desynchronization' : null,
      curve: curve.filter((_, i) => i % Math.max(1, Math.floor(curve.length / 120)) === 0),
    },
    method: `Normalised cross-correlation over lags ±${formatDuration(maxLagSec)} on a common ${M.round(dt, 3)} s grid.`,
    limitations: [
      classification === 'lagged association'
        ? `The strongest correlation occurs at a ${formatDuration(Math.abs(lagSec))} lag. A lag is a temporal association, not evidence that one signal causes the other.`
        : null,
      'Classification thresholds (|r| ≥ 0.6 for synchronization, < 0.3 for desynchronization) are research conventions chosen here, not established standards.',
      'Shared artifacts — movement, respiration, sensor noise — can synchronize two unrelated channels.',
    ].filter(Boolean),
  };
}

export function similarityAnalysis(recordA, recordB, winA, winB, opts = {}) {
  if (recordA.kind === 'categorical' && recordB.kind === 'categorical') {
    const a = winA ?? resolveSignalValues(recordA, opts);
    const b = winB ?? resolveSignalValues(recordB, opts);
    return labelAgreement(a.labels ?? [], b.labels ?? []);
  }
  const a = winA ?? resolveSignalValues(recordA, opts);
  const b = winB ?? resolveSignalValues(recordB, opts);
  if (a.error || b.error) return notApplicable('similarity', `Values could not be resolved: ${a.error ?? b.error}`);
  const grid = commonGrid(a, b, windowTimes(a), windowTimes(b), opts.maxPoints ?? 1000);
  if (!grid) return notApplicable('similarity', 'The two recordings do not overlap in time.');
  const za = M.zScore(grid.a);
  const zb = M.zScore(grid.b);
  const pairs = [];
  for (let i = 0; i < za.length; i += 1) if (M.isNum(za[i]) && M.isNum(zb[i])) pairs.push([za[i], zb[i]]);
  if (pairs.length < 8) return insufficient('similarity', 'Fewer than eight overlapping samples with values in both series.', pairs.length);
  const r = M.pearson(pairs.map((p) => p[0]), pairs.map((p) => p[1])).r;
  const nrmse = Math.sqrt(M.mean(pairs.map((p) => (p[0] - p[1]) ** 2)));
  return {
    algorithm: 'similarity',
    label: 'Similarity analysis',
    status: 'computed',
    n: pairs.length,
    params: { signalA: recordA.typeLabel ?? recordA.type, signalB: recordB.typeLabel ?? recordB.type },
    values: {
      correlation: r === null ? null : M.round(r, 4),
      normalizedRmse: M.round(nrmse, 4),
      shapeSimilarity: M.round(M.clamp(1 - nrmse / 2, 0, 1), 4),
      relationshipType: 'Similarity',
    },
    method: 'Both series z-normalised on a common grid; similarity reported as Pearson r and as normalised RMSE of the z-scored shapes.',
    limitations: [
      'Similarity compares waveform shape after standardisation. It says nothing about the scales being physiologically comparable.',
      'Similarity is not correlation with a lag, not association, and not evidence of a shared cause.',
    ],
  };
}

export function patternClustering(seriesList, opts = {}) {
  const k = opts.k ?? 3;
  const usable = (seriesList ?? []).filter((s) => s && s.features && s.features.length);
  if (usable.length < k * 2) {
    return {
      algorithm: 'pattern-clustering',
      label: 'Pattern clustering',
      status: 'insufficient-data',
      reason: `Clustering into ${k} groups needs at least ${k * 2} series; ${usable.length} were supplied. No assignments were invented.`,
      values: null,
      limitations: ['Clustering was not run, so no cluster structure is claimed.'],
    };
  }
  const dim = usable[0].features.length;
  const feats = usable.map((s) => s.features.slice(0, dim));
  // Standardise each feature so no single scale dominates the distance.
  const mu = [];
  const sg = [];
  for (let d = 0; d < dim; d += 1) {
    const col = feats.map((f) => f[d]);
    mu.push(M.mean(col));
    sg.push(M.sd(col) || 1);
  }
  const X = feats.map((f) => f.map((v, d) => (v - mu[d]) / sg[d]));

  const rng = M.mulberry32(opts.seed ?? 20260920);
  const centroids = [];
  const picked = new Set();
  while (centroids.length < k) {
    const i = Math.floor(rng() * X.length);
    if (picked.has(i)) continue;
    picked.add(i);
    centroids.push(X[i].slice());
  }

  let assign = new Array(X.length).fill(0);
  let inertia = null;
  for (let iter = 0; iter < 50; iter += 1) {
    assign = X.map((x) => {
      let best = 0;
      let bd = Infinity;
      for (let c = 0; c < centroids.length; c += 1) {
        const d = M.euclidean(x, centroids[c]);
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      return best;
    });
    let moved = false;
    for (let c = 0; c < k; c += 1) {
      const members = X.filter((_, i) => assign[i] === c);
      if (!members.length) continue;
      for (let d = 0; d < dim; d += 1) {
        const v = M.mean(members.map((m) => m[d]));
        if (Math.abs(v - centroids[c][d]) > 1e-9) moved = true;
        centroids[c][d] = v;
      }
    }
    inertia = M.sum(X.map((x, i) => M.euclidean(x, centroids[assign[i]]) ** 2));
    if (!moved) break;
  }

  const clusters = centroids.map((_, c) => {
    const members = usable.filter((_, i) => assign[i] === c);
    const centroidOriginal = centroids[c].map((v, d) => v * sg[d] + mu[d]);
    return {
      cluster: c,
      size: members.length,
      members: members.map((m) => m.id ?? m.label ?? 'series'),
      centroid: centroidOriginal.map((v) => M.round(v, 4)),
    };
  });

  return {
    algorithm: 'pattern-clustering',
    label: 'Pattern clustering',
    status: 'computed',
    n: usable.length,
    params: { k, seed: opts.seed ?? 20260920, featureNames: opts.featureNames ?? Array.from({ length: dim }, (_, i) => `f${i}`), iterations: 'up to 50' },
    values: { clusters, inertia: M.round(inertia, 4), singletonClusters: clusters.filter((c) => c.size === 1).length },
    method: `k-means (Euclidean) on ${dim} standardised features per series, k = ${k}, deterministic seeded initialisation.`,
    limitations: [
      'k was chosen by the researcher, not derived from the data; a different k gives a different partition.',
      clusters.some((c) => c.size < 2) ? 'At least one cluster has a single member, so it describes one series rather than a recurring pattern.' : null,
      'Clusters group similar feature vectors. They do not identify a condition, a cause, or a clinically meaningful subtype.',
    ].filter(Boolean),
  };
}

/** Feature vector used for clustering / fingerprinting a signal window. */
export function featureVector(values, times, dt) {
  const clean = M.finite(values);
  if (clean.length < 4) return null;
  const pts = [];
  for (let i = 0; i < values.length; i += 1) if (M.isNum(values[i]) && Number.isFinite(times[i])) pts.push({ x: times[i], y: values[i] });
  const fit = M.linreg(pts);
  return [
    M.round(M.mean(clean), 6),
    M.round(M.sd(clean) ?? 0, 6),
    M.round(M.rms(clean) ?? 0, 6),
    M.round(fit ? fit.slope : 0, 9),
    M.round(M.rmssd(values) ?? 0, 6),
    M.round(M.skewness(clean) ?? 0, 6),
  ];
}

export const FEATURE_NAMES = ['mean', 'sd', 'rms', 'slope/sec', 'rmssd', 'skewness'];

// ---------------------------------------------------------------------------
// Orchestrated processing for one record
// ---------------------------------------------------------------------------

/**
 * Run every algorithm that is legitimate for a record's processing profile.
 *
 * @param {object} record unified signal record
 * @param {object} opts   { window, quality, algorithms: [ids], maxPoints, startSec, lengthSec }
 */
export function runProcessing(record, opts = {}) {
  const type = getSignalType(record?.type);
  const profile = record?.profile ?? type?.profile ?? null;
  if (!profile) {
    return {
      record,
      profile: null,
      status: 'not-applicable',
      reason: `"${record?.type ?? 'this record'}" is not in the signal catalogue, so no processing profile — and therefore no appropriate algorithm set — is defined for it.`,
      results: [],
      limitations: ['No processing was performed. Nothing was inferred from an unrecognised signal type.'],
    };
  }

  const win = opts.window ?? resolveSignalValues(record, { startSec: opts.startSec ?? 0, lengthSec: opts.lengthSec ?? null, maxPoints: opts.maxPoints ?? 2000 });
  const quality = opts.quality ?? assessSignalQuality(record, win);
  const allowed = algorithmsForProfile(profile).map((a) => a.id);
  const requested = opts.algorithms?.length ? opts.algorithms : allowed;
  const times = windowTimes(win);
  const dt = win.dt ?? null;
  const results = [];
  const refused = [];

  if (win.error) {
    return {
      record,
      profile,
      profileLabel: PROCESSING_PROFILES[profile]?.label ?? profile,
      quality,
      status: 'insufficient-data',
      reason: win.error,
      results: requested.map((id) => insufficient(id, win.error)),
      refused: [],
      limitations: [win.error, 'No algorithm was run, so no result is reported.'],
    };
  }

  if (quality.grade === 'INSUFFICIENT DATA') {
    return {
      record,
      profile,
      profileLabel: PROCESSING_PROFILES[profile]?.label ?? profile,
      quality,
      status: 'insufficient-data',
      reason: 'The quality engine graded this recording INSUFFICIENT DATA, so no analysis was run.',
      results: requested.map((id) => insufficient(id, `Signal quality is INSUFFICIENT DATA (${quality.metrics?.usableSamples ?? 0} usable samples). Analysis was skipped rather than run on data that cannot support it.`)),
      refused: [],
      limitations: quality.limitations,
    };
  }

  for (const id of requested) {
    if (!allowed.includes(id)) {
      const alg = BY_ALG_ID.get(id);
      refused.push({
        algorithm: id,
        label: alg?.label ?? id,
        reason: `"${alg?.label ?? id}" is not appropriate for the "${PROCESSING_PROFILES[profile]?.label ?? profile}" profile used by ${record.typeLabel ?? record.type}. Applying it would produce a number with no defined meaning for this signal.`,
      });
      continue;
    }
    results.push(dispatch(id, record, win, times, dt, quality, opts));
  }

  const strong = canSupportStrongConclusions(quality);
  return {
    record,
    profile,
    profileLabel: PROCESSING_PROFILES[profile]?.label ?? profile,
    profileNote: PROCESSING_PROFILES[profile]?.note ?? '',
    quality,
    status: results.some((r) => r.status === 'computed') ? 'computed' : 'insufficient-data',
    results,
    refused,
    strongConclusionsAllowed: strong,
    limitations: [
      ...commonLimitations(record, quality),
      ...new Set(results.flatMap((r) => r.limitations ?? [])),
      strong ? null : `Quality is ${quality.grade}: results below are descriptive only.`,
    ].filter(Boolean),
  };
}

function dispatch(id, record, win, times, dt, quality, opts) {
  const values = win.values;
  const unit = record.unit ?? null;
  switch (id) {
    case 'baseline': {
      const r = baselineEstimation(values, dt);
      if (!r) return insufficient('baseline', 'Fewer than eight usable samples for a moving-median baseline.', M.finite(values).length);
      return mk('baseline', 'computed', {
        n: r.n,
        params: { windowSamples: r.windowSamples, windowSec: r.windowSec },
        values: {
          drift: r.drift,
          baselineSd: r.baselineSd,
          first: M.round(M.finite(r.baseline)[0], 5),
          last: M.round(M.finite(r.baseline)[M.finite(r.baseline).length - 1], 5),
          unit,
        },
        method: r.method,
        limitations: ['A moving-median baseline follows slow drift; rapid genuine shifts can be absorbed into it.'],
      });
    }
    case 'peak':
      return peakDetection(record, values, times, dt);
    case 'spectral':
      return spectralAnalysis(record, values, dt, opts);
    case 'noise':
      return noiseDetection(values, dt, record.profile);
    case 'time-domain': {
      const r = timeDomainStats(values, dt);
      if (r.values) r.values.unit = unit;
      return r;
    }
    case 'changepoint':
      return changePointDetection(values, times, dt, opts);
    case 'vector-magnitude':
      return vectorMagnitude(opts.axisWindows?.length ? opts.axisWindows : [win]);
    case 'movement-events':
      return movementEventDetection(values, times, dt, opts);
    case 'variability': {
      const r = variabilityAnalysis(values, dt);
      if (r.values) r.values.unit = unit;
      return r;
    }
    case 'trend': {
      const r = trendDetection(values, times, unit);
      return r;
    }
    case 'band-power':
      return relativeBandPower(opts.bandRecords ?? [record], opts.bandWindows ?? [win]);
    case 'cross-correlation':
      return opts.compareRecord
        ? crossSignalCorrelation(record, opts.compareRecord, win, opts.compareWindow)
        : notApplicable('cross-correlation', 'Cross-signal correlation needs a second signal to compare with. None was selected, and no partner was invented.');
    case 'descriptive': {
      const r = descriptiveStatistics(values, unit);
      return r;
    }
    case 'outliers':
      // Discrete spot values have no temporal neighbourhood, so the plain
      // robust test is correct here; continuous profiles would need the
      // isolated variant (see outlierDetection).
      return outlierDetection(values, times, unit, {
        isolated: (record.profile ?? getSignalType(record.type)?.profile) !== 'discrete-spot',
      });
    case 'group-comparison':
      return groupComparison(values, opts.compareValues, opts.groupLabels);
    case 'stage-distribution':
      return stageDistribution(win.labels ?? []);
    case 'transitions':
      return transitionCounting(win.labels ?? []);
    case 'regularity':
      return regularityIndex(win.labels ?? [], win.epochSec ?? dt);
    case 'similarity':
      return opts.compareRecord
        ? similarityAnalysis(record, opts.compareRecord, win, opts.compareWindow)
        : notApplicable('similarity', 'Similarity analysis needs a second series. None was selected.');
    case 'event-counting':
      return eventCounting(values, times);
    case 'inter-event':
      return interEventInterval(values, times);
    case 'burst':
      return burstDetection(values, times, opts);
    case 'repeated-pattern':
      return repeatedPatternDetection(values, times, dt);
    default:
      return notApplicable(id, `No implementation exists for "${id}". It was not approximated by another algorithm.`);
  }
}

// ---------------------------------------------------------------------------
// PART 14 — signal event detection
// ---------------------------------------------------------------------------

let eventSeq = 0;
function makeEvent(record, eventType, offsetSec, extra) {
  eventSeq += 1;
  return {
    id: `EVT-${record.id ?? 'sig'}-${String(eventSeq).padStart(4, '0')}`,
    signalId: record.id ?? null,
    subjectId: record.subjectId ?? null,
    signalType: record.type ?? null,
    signalLabel: record.typeLabel ?? record.type ?? 'Unknown',
    eventType,
    eventTypeLabel: EVENT_TYPES[eventType] ?? eventType,
    offsetSec: M.round(offsetSec, 3),
    timestamp: timestampAtOffset(record, offsetSec),
    dataClass: record.dataClass ?? null,
    supportingData: extra.supportingData ?? {},
    algorithm: extra.algorithm ?? 'not stated',
    confidence: extra.confidence ?? { value: null, basis: 'No confidence estimate was computed for this event type.' },
    uncertainty: extra.uncertainty ?? null,
    quality: extra.quality ?? null,
    limitations: extra.limitations ?? [],
  };
}

/**
 * Detect research events in one signal window.
 *
 * Every event is produced by a named algorithm operating on the actual samples,
 * and every confidence value states the statistic it came from. Events that
 * cannot be localised in time are not emitted.
 */
export function detectEvents(record, opts = {}) {
  const win = opts.window ?? resolveSignalValues(record, { startSec: opts.startSec ?? 0, lengthSec: opts.lengthSec ?? null, maxPoints: opts.maxPoints ?? 2000 });
  if (win.error) return { events: [], reason: win.error, limitations: [win.error] };

  const quality = opts.quality ?? assessSignalQuality(record, win);
  const grade = quality.grade;
  const times = windowTimes(win);
  const dt = win.dt ?? null;
  const events = [];
  const values = win.values;

  // ---- Signal-quality events (always available, no statistics needed) -------
  if (dt) {
    const runs = M.missingRuns(values);
    for (const run of runs) {
      const sec = run.length * dt;
      if (sec < Math.max(2, dt * 5)) continue;
      events.push(
        makeEvent(record, 'signal-quality', times[run.startIndex] ?? run.startIndex * dt, {
          algorithm: 'Missing-sample run detection',
          supportingData: {
            startIndex: run.startIndex,
            samples: run.length,
            durationSec: M.round(sec, 2),
            observation: `No samples present for ${formatDuration(sec)}.`,
          },
          confidence: { value: null, basis: 'Directly observed absence of samples — no probabilistic estimate applies.' },
          uncertainty: `±${formatDuration(dt / 2)} on the boundary`,
          quality: grade,
          limitations: ['A gap is a recording artifact. Nothing about the underlying physiology during the gap can be stated.'],
        }),
      );
    }
    const flat = M.longestConstantRun(values, 1e-9);
    if (flat.length >= Math.max(6, Math.round(0.25 / dt))) {
      events.push(
        makeEvent(record, 'signal-quality', times[flat.startIndex] ?? 0, {
          algorithm: 'Constant-value run detection',
          supportingData: {
            startIndex: flat.startIndex,
            samples: flat.length,
            durationSec: M.round(flat.length * dt, 2),
            observation: `Value held exactly constant for ${formatDuration(flat.length * dt)}.`,
          },
          confidence: { value: null, basis: 'Directly observed constant samples — no probabilistic estimate applies.' },
          uncertainty: `±${formatDuration(dt / 2)} on the boundary`,
          quality: grade,
          limitations: ['Reported as a sensor/transmission artifact, not as a stable physiological state.'],
        }),
      );
    }
  }

  if (grade === 'INSUFFICIENT DATA') {
    return {
      events,
      grade,
      reason: 'Only signal-quality events are reported: the recording was graded INSUFFICIENT DATA.',
      limitations: [...quality.limitations, 'Pattern, trend and peak events were not searched for, because the data cannot support them.'],
    };
  }

  const numericOk = record.kind !== 'categorical' && M.finite(values).length >= 16 && dt;

  // ---- Change points --------------------------------------------------------
  if (numericOk) {
    const cp = changePointDetection(values, times, dt, { maxPoints: 4 });
    if (cp.status === 'computed') {
      for (const p of cp.values.points) {
        const z = Math.abs(p.z);
        events.push(
          makeEvent(record, z >= 8 ? 'sudden-change' : 'change-point', p.timeSec, {
            algorithm: cp.method,
            supportingData: {
              magnitude: p.magnitude,
              z: p.z,
              direction: p.direction,
              comparisonWindowSamples: cp.params.windowSamples,
              unit: record.unit ?? null,
            },
            confidence: {
              value: M.round(M.clamp(z / 12, 0, 1), 3),
              basis: `Detection z-statistic (${M.round(z, 2)}) scaled against a reference |z| of 12. Heuristic — not a probability.`,
            },
            uncertainty: `±${formatDuration((cp.params.windowSamples / 2) * dt)} localization`,
            quality: grade,
            limitations: [
              z >= 8 ? 'Classified as a sudden change because the mean shift is large relative to the window spread.' : 'Classified as a change point; the transition may be gradual.',
              'A change point locates where the series changed. It does not explain why.',
            ],
          }),
        );
      }
    }
  }

  // ---- Trend / gradual drift ------------------------------------------------
  if (numericOk) {
    const tr = trendDetection(values, times, record.unit);
    if (tr.status === 'computed' && tr.values.direction !== 'no clear trend') {
      events.push(
        makeEvent(record, 'gradual-drift', times[0] ?? 0, {
          algorithm: tr.method,
          supportingData: {
            slopePerHour: tr.values.slopePerHour,
            r2: tr.values.r2,
            totalChangeOverWindow: tr.values.totalChangeOverWindow,
            direction: tr.values.direction,
            unit: record.unit ?? null,
            n: tr.n,
          },
          confidence: {
            value: M.round(M.clamp(tr.values.r2 * 1.2, 0, 1), 3),
            basis: `Coefficient of determination (r² = ${tr.values.r2}) of the linear fit, capped at 1. Heuristic — not a probability.`,
          },
          uncertainty: tr.values.slopeStdError === null ? null : `slope SE ${tr.values.slopeStdError} per second`,
          quality: grade,
          limitations: [`Describes drift across ${formatDuration(tr.values.spanSec)} only.`, 'A drift is a statistical relationship in this window, not a prognosis.'],
        }),
      );
    }
  }

  // ---- Peaks / repeated pattern / oscillation -------------------------------
  if (numericOk && record.profile === 'waveform-raw') {
    const pk = peakDetection(record, values, times, dt);
    if (pk.status === 'computed' && pk.values.count >= 3) {
      const cvv = pk.values.intervalCv;
      if (cvv !== null && cvv < 0.15) {
        events.push(
          makeEvent(record, 'repeated-pattern', pk.values.peaks[0]?.timeSec ?? 0, {
            algorithm: pk.method,
            supportingData: {
              eventLabel: pk.params.eventLabel,
              count: pk.values.count,
              meanIntervalSec: pk.values.meanIntervalSec,
              intervalCv: cvv,
              countPerMinute: pk.values.countPerMinute,
            },
            confidence: {
              value: M.round(M.clamp(1 - cvv / 0.15, 0, 1), 3),
              basis: `Interval regularity: 1 − (interval CV / 0.15), CV = ${cvv}. Heuristic — not a probability.`,
            },
            uncertainty: `interval SD ${pk.values.intervalSdSec ?? 'n/a'} s`,
            quality: grade,
            limitations: [`Regularity of detected ${pk.params.eventLabel}s in this window; detection depends on the threshold rule, not on annotated ground truth.`],
          }),
        );
      }
    }
    const sp = spectralAnalysis(record, values, dt, { segmentSize: 512, maxSegments: 4 });
    if (sp.status === 'computed') {
      const conc = sp.values.dominantPower && sp.values.totalPower ? sp.values.dominantPower / (sp.values.totalPower / sp.values.spectrum.length) : null;
      if (conc !== null && conc > 6) {
        events.push(
          makeEvent(record, 'oscillation', times[0] ?? 0, {
            algorithm: sp.method,
            supportingData: {
              dominantFrequencyHz: sp.values.dominantFrequencyHz,
              dominantCyclesPerMinute: sp.values.dominantCyclesPerMinute,
              resolutionHz: sp.values.resolutionHz,
              spectralConcentration: M.round(conc, 2),
            },
            confidence: {
              value: M.round(M.clamp(conc / 20, 0, 1), 3),
              basis: `Spectral concentration at the dominant bin (${M.round(conc, 2)}× the mean bin power) scaled against a reference of 20. Heuristic — not a probability.`,
            },
            uncertainty: `±${M.round(sp.values.resolutionHz / 2, 4)} Hz`,
            quality: grade,
            limitations: [`Resolution is ${sp.values.resolutionHz} Hz with ${sp.params.segments} averaged segment(s).`, 'A spectral peak describes the dominant rhythm in this window; it is not a clinical rhythm classification.'],
          }),
        );
      }
    }
  }

  // ---- Bursts and drops (any numeric continuous series) ---------------------
  if (numericOk) {
    const clean = M.finite(values);
    const med = M.median(clean);
    const scale = M.madScaled(clean) ?? M.sd(clean);
    if (scale) {
      const zSeries = values.map((v) => (M.isNum(v) ? (v - med) / scale : NaN));
      // Burst: sustained excursion above +2.5 robust σ.
      let start = -1;
      const bursts = [];
      for (let i = 0; i <= zSeries.length; i += 1) {
        const active = i < zSeries.length && M.isNum(zSeries[i]) && zSeries[i] > 2.5;
        if (active && start < 0) start = i;
        if (!active && start >= 0) {
          const dur = (i - start) * dt;
          if (dur >= Math.max(1, 5 * dt)) bursts.push({ start, end: i, dur, peak: Math.max(...M.finite(zSeries.slice(start, i))) });
          start = -1;
        }
      }
      for (const b of bursts.slice(0, 6)) {
        events.push(
          makeEvent(record, 'burst', times[b.start] ?? b.start * dt, {
            algorithm: 'Sustained robust z-score excursion',
            supportingData: {
              durationSec: M.round(b.dur, 2),
              peakRobustZ: M.round(b.peak, 2),
              thresholdRobustZ: 2.5,
              baselineMedian: M.round(med, 4),
              robustSigma: M.round(scale, 4),
              unit: record.unit ?? null,
            },
            confidence: { value: M.round(M.clamp(b.peak / 8, 0, 1), 3), basis: `Peak robust z (${M.round(b.peak, 2)}) scaled against a reference z of 8. Heuristic — not a probability.` },
            uncertainty: `±${formatDuration(dt)} on the boundary`,
            quality: grade,
            limitations: ['A burst is an amplitude excursion relative to this window\'s own median and spread.'],
          }),
        );
      }
      // Drop: sustained excursion below −2.5 robust σ.
      let dstart = -1;
      const drops = [];
      for (let i = 0; i <= zSeries.length; i += 1) {
        const active = i < zSeries.length && M.isNum(zSeries[i]) && zSeries[i] < -2.5;
        if (active && dstart < 0) dstart = i;
        if (!active && dstart >= 0) {
          const dur = (i - dstart) * dt;
          if (dur >= Math.max(1, 5 * dt)) drops.push({ start: dstart, end: i, dur, trough: Math.min(...M.finite(zSeries.slice(dstart, i))) });
          dstart = -1;
        }
      }
      for (const d of drops.slice(0, 4)) {
        events.push(
          makeEvent(record, 'drop', times[d.start] ?? d.start * dt, {
            algorithm: 'Sustained robust z-score excursion (negative)',
            supportingData: {
              durationSec: M.round(d.dur, 2),
              troughRobustZ: M.round(d.trough, 2),
              thresholdRobustZ: -2.5,
              baselineMedian: M.round(med, 4),
              robustSigma: M.round(scale, 4),
              unit: record.unit ?? null,
            },
            confidence: { value: M.round(M.clamp(Math.abs(d.trough) / 8, 0, 1), 3), basis: `Trough robust z (${M.round(d.trough, 2)}) scaled against a reference z of 8. Heuristic — not a probability.` },
            uncertainty: `±${formatDuration(dt)} on the boundary`,
            quality: grade,
            limitations: ['A drop is a downward amplitude excursion in this window. It is not a desaturation, hypoglycaemia or any other clinical event.'],
          }),
        );
      }
    }
  }

  // ---- Categorical: sustained state change ----------------------------------
  if (record.kind === 'categorical' && win.labels?.length >= 6) {
    const labels = win.labels;
    const epochSec = win.epochSec ?? dt ?? 1;
    let runLabel = null;
    let runStart = -1;
    for (let i = 0; i <= labels.length; i += 1) {
      const l = i < labels.length ? labels[i] : null;
      if (l !== runLabel) {
        if (runLabel !== null && runStart >= 0 && i - runStart >= 10) {
          events.push(
            makeEvent(record, 'repeated-pattern', (runStart) * epochSec + (win.t0 ?? 0), {
              algorithm: 'Sustained categorical run detection',
              supportingData: { label: runLabel, epochs: i - runStart, durationSec: M.round((i - runStart) * epochSec, 1) },
              confidence: { value: null, basis: 'Directly observed run of identical labels — no probabilistic estimate applies.' },
              uncertainty: `±${formatDuration(epochSec)} on the boundary`,
              quality: grade,
              limitations: ['A sustained label run describes the supplied annotations; it is not a verified physiological state.'],
            }),
          );
        }
        runLabel = l;
        runStart = i;
      }
    }
  }

  events.sort((a, b) => (a.offsetSec ?? 0) - (b.offsetSec ?? 0));
  const cap = opts.maxEvents ?? 60;
  const truncated = events.length > cap;
  return {
    events: events.slice(0, cap),
    totalDetected: events.length,
    truncated,
    grade,
    limitations: [
      ...quality.limitations,
      grade !== 'GOOD' ? `Signal quality is ${grade}, so pattern-based events are descriptive only.` : null,
      truncated ? `${events.length} events were detected; only the first ${cap} are listed.` : null,
      'Every event is an observation about this recording. None is a clinical event or a diagnosis.',
    ].filter(Boolean),
  };
}

/**
 * Synchronization / desynchronization events for a pair of signals (PART 14
 * requires these event types; they only exist between two recordings).
 */
export function detectSynchronizationEvents(recordA, recordB, opts = {}) {
  const sync = synchronizationAnalysis(recordA, recordB, opts.windowA, opts.windowB, opts);
  if (sync.status !== 'computed' || !sync.values.eventType) {
    return { events: [], sync, limitations: sync.limitations ?? [sync.reason].filter(Boolean) };
  }
  const type = sync.values.eventType;
  const base = {
    algorithm: sync.method,
    supportingData: {
      signals: [recordA.typeLabel ?? recordA.type, recordB.typeLabel ?? recordB.type],
      bestLagSec: sync.values.bestLagSec,
      correlation: sync.values.bestCorrelation,
      zeroLagCorrelation: sync.values.zeroLagCorrelation,
      classification: sync.values.classification,
    },
    confidence: {
      value: M.round(M.clamp(Math.abs(sync.values.bestCorrelation), 0, 1), 3),
      basis: `Magnitude of the cross-correlation peak (${sync.values.bestCorrelation}). Heuristic — not a probability.`,
    },
    uncertainty: `lag resolution ±${formatDuration(sync.params.gridDt)}`,
    limitations: sync.limitations,
  };
  return {
    sync,
    events: [makeEvent(recordA, type, 0, base), makeEvent(recordB, type, 0, base)],
    limitations: sync.limitations,
  };
}

export { PROCESSING_PROFILES };

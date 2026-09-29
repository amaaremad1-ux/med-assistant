/**
 * Signal quality engine (PART 7).
 *
 * For every physiological record this computes — from the samples themselves —
 * how much data is missing, where the sampling gaps and dropouts are, whether
 * any segment is a flatline, how much high-frequency noise is present, how many
 * isolated outliers exist, and how long the recording actually is.
 *
 * Honesty rules that shaped the implementation:
 *
 *  • A metric that does not apply to a signal kind is reported as
 *    `applicable: false` with a reason. A discrete blood-pressure reading has
 *    no sampling rate and no flatline; pretending otherwise would invent data.
 *
 *  • Thresholds and even applicability are per processing profile. An ECG and a
 *    step count are not noisy, spiky or flat in the same way, so a single global
 *    rule mislabels both. In particular:
 *      – amplitude outliers are NOT screened on raw waveforms, where the largest
 *        excursions are the signal itself (a QRS complex is not a corrupt sample);
 *      – a long run of exact zeros in a count metric (no steps overnight) is
 *        reported as an observation, not as a flatline fault.
 *
 *  • The grade feeds `conclusionLevel`. POOR and INSUFFICIENT DATA records are
 *    explicitly barred from supporting strong conclusions, which is what the
 *    specification requires and what keeps the rest of the platform from
 *    over-claiming on bad data.
 *
 * Nothing here is a clinical quality standard. The grades are research
 * heuristics and the reasoning is always shown alongside them.
 */

import { resolveSignalValues, windowTimes, formatDuration, formatRate } from './signalModel.js';
import {
  finite,
  countMissing,
  missingRuns,
  longestConstantRun,
  outlierIndices,
  isolatedOutlierIndices,
  madScaled,
  sd,
  median,
  diffs,
  lag1Autocorr,
  round,
} from './signalMath.js';
import { getSignalType } from '../data/signalTaxonomy.js';

export const QUALITY_GRADES = ['GOOD', 'FAIR', 'POOR', 'INSUFFICIENT DATA'];

/** Badge tone per grade. The grade text is always rendered next to the colour. */
export const GRADE_TONE = {
  GOOD: 'good',
  FAIR: 'warn',
  POOR: 'bad',
  'INSUFFICIENT DATA': 'neutral',
};

/** What a grade is allowed to support downstream (PART 7). */
export const CONCLUSION_LEVEL = {
  GOOD: 'Observations and comparisons may be reported.',
  FAIR: 'Descriptive observations only — quality issues must be stated alongside any result.',
  POOR: 'Strong conclusions are not supported by this recording.',
  'INSUFFICIENT DATA': 'No conclusions are supported — there is not enough data.',
};

export const MIN_USABLE_SAMPLES = 10;

/** Profile-specific noise cutoffs, expressed as high-frequency SD / signal SD. */
const NOISE_THRESHOLDS = {
  'waveform-raw': { elevated: 0.25, excessive: 0.5, cadenceGuard: false },
  'inertial-raw': { elevated: 0.35, excessive: 0.7, cadenceGuard: false },
  'rate-metric': { elevated: 0.6, excessive: 1.0, cadenceGuard: true },
  'band-power': { elevated: 0.9, excessive: 1.5, cadenceGuard: true },
  'discrete-spot': null,
  'categorical-epoch': null,
  'event-series': null,
};

/** Minimum window length before a profile can be meaningfully assessed. */
const MIN_WINDOW_SEC = {
  'waveform-raw': 5,
  'inertial-raw': 5,
  'rate-metric': 60,
  'band-power': 60,
  'discrete-spot': 0,
  'categorical-epoch': 0,
  'event-series': 0,
};

/**
 * Flatline applicability. `exemptZero` profiles can legitimately sit at exactly
 * zero (no steps, no events), so a zero run is reported as an observation
 * rather than penalised as a sensor fault.
 */
const FLATLINE_RULES = {
  'waveform-raw': { applicable: true, exemptZero: false },
  'inertial-raw': { applicable: true, exemptZero: false },
  'rate-metric': { applicable: true, exemptZero: true },
  'band-power': { applicable: true, exemptZero: true },
  'discrete-spot': { applicable: false, reason: 'Flatline detection applies to continuous recordings only.' },
  'categorical-epoch': { applicable: false, reason: 'A repeated stage label is a real state, not a flatline; flatline detection does not apply.' },
  'event-series': { applicable: false, reason: 'A run of zero-event epochs is a genuine absence of events, not a sensor fault.' },
};

/**
 * Outlier screening applicability. Raw waveforms are excluded on purpose: their
 * largest excursions are physiological transients, and a robust z-test would
 * flag the signal itself as corrupt.
 */
const OUTLIER_RULES = {
  'waveform-raw': { applicable: false, reason: 'Amplitude outlier screening is not applied to raw waveforms: the largest excursions are genuine transients (e.g. QRS complexes), so a robust z-test would flag the signal itself. Spikes are described by time-domain min/max and by peak detection instead.' },
  'inertial-raw': { applicable: false, reason: 'Amplitude outlier screening is not applied to raw inertial channels: movement produces large legitimate excursions. Movement episodes are described by movement event detection instead.' },
  'rate-metric': { applicable: true, isolated: true },
  'band-power': { applicable: true, isolated: true },
  'discrete-spot': { applicable: true, isolated: false },
  'categorical-epoch': { applicable: false, reason: 'Outlier tests do not apply to categorical labels.' },
  'event-series': { applicable: false, reason: 'An event indicator series takes only a small set of values, so an outlier test has nothing to measure.' },
};

const METRIC_LABELS = {
  samples: 'Samples in window',
  usableSamples: 'Usable samples',
  missingSamples: 'Missing samples',
  missingPct: 'Missing data',
  samplingRate: 'Sampling rate',
  effectiveRate: 'Analysed interval',
  windowSec: 'Window length',
  durationSec: 'Recording duration',
  gaps: 'Sampling gaps',
  dropout: 'Sensor dropout',
  flatline: 'Flatline',
  zeroRun: 'Sustained zero segment',
  noise: 'High-frequency noise',
  outliers: 'Outliers',
  spacing: 'Measurement spacing',
  stageCoverage: 'Labelled epochs',
};

export { METRIC_LABELS as QUALITY_METRIC_LABELS };

/**
 * Assess one signal record.
 *
 * @param {object} record  unified signal record (see src/lib/signalModel.js)
 * @param {object} [win]   already-resolved window; resolved here if omitted
 */
export function assessSignalQuality(record, win) {
  const type = getSignalType(record?.type);
  const profile = record?.profile ?? type?.profile ?? null;
  const window0 = win ?? resolveSignalValues(record, {});

  const base = {
    signalId: record?.id ?? null,
    subjectId: record?.subjectId ?? null,
    type: record?.type ?? null,
    typeLabel: record?.typeLabel ?? type?.label ?? record?.type ?? 'Unknown',
    profile,
    unit: record?.unit ?? null,
    dataClass: record?.dataClass ?? null,
    method:
      'Computed from the samples in the analysed window: missing runs, constant-value runs, MAD-based noise estimate and MAD-based outlier screening. Applicability of each metric depends on the processing profile.',
  };

  if (!profile) {
    return insufficientResult(base, `"${record?.type ?? 'this record'}" is not in the signal catalogue, so no processing profile and no appropriate quality metrics are defined for it.`);
  }
  if (window0.error) return insufficientResult(base, window0.error);
  if (record?.kind === 'categorical' || profile === 'categorical-epoch') return assessCategorical(base, record, window0, profile);
  if (record?.kind === 'discrete' || profile === 'discrete-spot') return assessDiscrete(base, record, window0, profile);
  return assessContinuous(base, record, window0, profile);
}

function insufficientResult(base, reason) {
  return {
    ...base,
    grade: 'INSUFFICIENT DATA',
    tone: GRADE_TONE['INSUFFICIENT DATA'],
    conclusionLevel: CONCLUSION_LEVEL['INSUFFICIENT DATA'],
    penalties: [{ metric: 'samples', detail: reason, severity: 3 }],
    metrics: {
      samples: 0,
      usableSamples: 0,
      missingSamples: 0,
      missingPct: null,
      samplingRate: null,
      samplingRateKnown: false,
      windowSec: null,
      durationSec: null,
      gaps: na(reason),
      dropout: na(reason),
      flatline: na(reason),
      noise: na(reason),
      outliers: na(reason),
    },
    limitations: [reason],
    notes: [],
  };
}

const na = (reason) => ({ applicable: false, reason });

// ---------------------------------------------------------------------------
// Continuous (raw waveform / derived rate / band power) signals
// ---------------------------------------------------------------------------

function assessContinuous(base, record, win, profile) {
  const values = win.values;
  const n = values.length;
  const dt = win.dt ?? null;
  const usable = finite(values);
  const missingSamples = countMissing(values);
  const missingPct = n ? (missingSamples / n) * 100 : null;
  const windowSec = dt ? n * dt : record.durationSec ?? null;

  const penalties = [];
  const notes = [];

  // ---- Sampling gaps & sensor dropout -------------------------------------
  const runs = missingRuns(values);
  const longest = runs.reduce((a, r) => (r.length > a.length ? r : a), { length: 0, startIndex: -1 });
  const gapSec = (samples) => (dt ? samples * dt : null);
  // A dropout is a sustained loss: at least 10 s, or at least 3 samples when the
  // cadence is coarser than that (a 5-minute CGM loses 15 minutes in 3 samples).
  const dropoutThresholdSamples = Math.max(3, dt ? Math.round(10 / dt) : 3);
  const dropouts = runs.filter((r) => r.length >= dropoutThresholdSamples);

  const gaps = dt
    ? {
        applicable: true,
        count: runs.length,
        longestSamples: longest.length,
        longestSec: gapSec(longest.length),
        totalMissingSec: gapSec(missingSamples),
        detail: runs.length
          ? `${runs.length} gap${runs.length === 1 ? '' : 's'}, longest ${formatDuration(gapSec(longest.length))}`
          : 'No sampling gaps detected',
      }
    : na('No sampling interval is declared, so gaps cannot be expressed in seconds.');

  const dropout = dt
    ? {
        applicable: true,
        detected: dropouts.length > 0,
        count: dropouts.length,
        longestSec: dropouts.length ? gapSec(Math.max(...dropouts.map((d) => d.length))) : 0,
        thresholdSec: dt * dropoutThresholdSamples,
        detail: dropouts.length
          ? `${dropouts.length} dropout segment${dropouts.length === 1 ? '' : 's'} ≥ ${formatDuration(dt * dropoutThresholdSamples)}`
          : 'No sustained sensor dropout detected',
      }
    : na('No sampling interval is declared, so dropout cannot be distinguished from ordinary spacing.');

  if (missingPct !== null) {
    if (missingPct >= 60) penalties.push({ metric: 'missingPct', severity: 3, detail: `${round(missingPct, 1)} % of samples are missing` });
    else if (missingPct >= 25) penalties.push({ metric: 'missingPct', severity: 2, detail: `${round(missingPct, 1)} % of samples are missing` });
    else if (missingPct >= 10) penalties.push({ metric: 'missingPct', severity: 1, detail: `${round(missingPct, 1)} % of samples are missing` });
  }
  if (dropouts.length) {
    const lostSec = dropouts.reduce((a, d) => a + d.length * (dt ?? 0), 0);
    const frac = windowSec ? lostSec / windowSec : 0;
    penalties.push({
      metric: 'dropout',
      severity: frac > 0.15 ? 2 : 1,
      detail: `Sensor dropout covering ${formatDuration(lostSec)} (${round(frac * 100, 1)} % of the window)`,
    });
  }

  // ---- Flatline ------------------------------------------------------------
  const flatRule = FLATLINE_RULES[profile] ?? { applicable: false, reason: 'No flatline rule is defined for this profile.' };
  let flatline;
  let zeroRun = null;
  if (!flatRule.applicable) {
    flatline = na(flatRule.reason);
  } else {
    const minFlatSamples = Math.max(6, dt ? Math.round(0.25 / dt) : 6);
    const scale = madScaled(usable) ?? sd(usable) ?? 0;
    const flatTolerance = scale ? Math.max(1e-9, scale * 1e-4) : 1e-9;
    const flat = longestConstantRun(values, flatTolerance);
    const detected = flat.length >= minFlatSamples;
    const stuckValue = detected ? values[flat.startIndex] : null;
    const isZeroRun = detected && flatRule.exemptZero && stuckValue === 0;
    if (isZeroRun) {
      zeroRun = {
        applicable: true,
        detected: true,
        longestSamples: flat.length,
        longestSec: gapSec(flat.length),
        detail: `Value held at exactly 0 for ${formatDuration(gapSec(flat.length))} (${flat.length} samples).`,
        note: 'For a count metric a sustained zero is usually a real absence of activity, so it is reported as an observation and not penalised.',
      };
      notes.push(zeroRun.note);
      flatline = { applicable: true, detected: false, longestSamples: 0, detail: 'The only constant segment sits at exactly zero and is reported separately as a sustained zero segment.' };
    } else {
      flatline = detected
        ? {
            applicable: true,
            detected: true,
            longestSamples: flat.length,
            longestSec: gapSec(flat.length),
            atSec: flat.startIndex >= 0 && dt ? flat.startIndex * dt + (win.t0 ?? 0) : null,
            stuckValue: round(stuckValue, 6),
            detail: `Constant value held for ${formatDuration(gapSec(flat.length))} (${flat.length} samples)`,
          }
        : { applicable: true, detected: false, longestSamples: flat.length, detail: 'No flatline segment detected' };
      if (detected) {
        penalties.push({ metric: 'flatline', severity: 2, detail: flatline.detail });
        notes.push('A flatline is a sensor or transmission artifact, not a physiological finding.');
      }
    }
  }

  // ---- Noise ---------------------------------------------------------------
  const rule = NOISE_THRESHOLDS[profile];
  let noise;
  if (!rule) {
    noise = na(`A high-frequency noise estimate is not defined for the "${profile}" processing profile.`);
  } else if (usable.length < MIN_USABLE_SAMPLES) {
    noise = na('Too few usable samples to estimate noise.');
  } else {
    const d = diffs(values);
    const noiseSd = d.length >= 4 ? (madScaled(d) ?? 0) / Math.SQRT2 : null;
    const signalSd = sd(usable);
    const ratio = noiseSd !== null && signalSd ? noiseSd / signalSd : null;
    const r1 = lag1Autocorr(values);
    let level = ratio === null ? 'unknown' : ratio > rule.excessive ? 'excessive' : ratio > rule.elevated ? 'elevated' : 'within tolerance';
    let severity = level === 'excessive' ? 2 : level === 'elevated' ? 1 : 0;
    let cadenceNote = null;

    // A diff-based noise estimate assumes adjacent samples of the underlying
    // signal are similar. For a derived metric or a band power sampled at a slow
    // cadence, near-zero autocorrelation can mean "each value summarises an
    // independent period" rather than "the sensor is noisy" — and the two cannot
    // be told apart from the samples alone.
    if (rule.cadenceGuard && (level === 'excessive' || level === 'elevated') && r1 !== null && Math.abs(r1) < 0.2) {
      level = 'not separable at this cadence';
      severity = 0;
      cadenceNote = `Adjacent samples are nearly uncorrelated (lag-1 r = ${round(r1, 3)}), so high sample-to-sample variation cannot be attributed to sensor noise rather than to genuinely independent values at this cadence. No quality penalty was applied.`;
      notes.push(cadenceNote);
    }

    noise = {
      applicable: true,
      ratio: round(ratio, 3),
      noiseSd: round(noiseSd, 4),
      signalSd: round(signalSd, 4),
      lag1Autocorr: round(r1, 3),
      level,
      thresholds: { elevated: rule.elevated, excessive: rule.excessive },
      excessive: level === 'excessive',
      elevated: level === 'elevated',
      detail:
        ratio === null
          ? 'Noise could not be estimated (the signal has no measurable spread).'
          : `High-frequency SD is ${round(ratio, 2)}× the signal SD — ${level}`,
      method: 'Noise SD estimated as MAD(successive differences)/√2, divided by the SD of the window.',
    };
    if (severity) penalties.push({ metric: 'noise', severity, detail: noise.detail });
    if (win.decimated) {
      notes.push(`The analysed window was decimated (${win.decimationMethod ?? 'aggregated'}), so the noise estimate describes the decimated series, not the native one.`);
    }
    if (level === 'within tolerance' || level === 'elevated') {
      notes.push('The ratio is relative to the variation present in this window: a slowly varying signal observed over a short window reads as noisy even when the sensor is stable.');
    }
  }

  // ---- Outliers --------------------------------------------------------------
  const outRule = OUTLIER_RULES[profile] ?? { applicable: false, reason: 'No outlier rule is defined for this profile.' };
  let outliers;
  if (!outRule.applicable) {
    outliers = na(outRule.reason);
  } else if (usable.length < MIN_USABLE_SAMPLES) {
    outliers = na('Too few usable samples for a robust outlier test.');
  } else {
    const res = outRule.isolated ? isolatedOutlierIndices(values, { k: 5 }) : outlierIndices(values, 5);
    outliers = {
      applicable: true,
      isolated: Boolean(outRule.isolated),
      count: res.indices.length,
      pct: n ? round((res.indices.length / n) * 100, 2) : null,
      extremeCount: res.extremeCount ?? res.indices.length,
      method: outRule.isolated
        ? 'Samples more than 5 robust σ (scaled MAD) from the median whose neighbourhood is quiet — sustained excursions are excluded because those are regime changes, not corrupt samples.'
        : 'Samples more than 5 robust σ (scaled MAD) from the median.',
      detail: res.indices.length
        ? `${res.indices.length} isolated outlier sample${res.indices.length === 1 ? '' : 's'} (${round((res.indices.length / n) * 100, 2)} %)`
        : 'No isolated outliers beyond 5 robust σ',
    };
    if (outRule.isolated && res.extremeCount > res.indices.length) {
      outliers.sustainedExcursions = res.extremeCount - res.indices.length;
      notes.push(
        `${res.extremeCount - res.indices.length} extreme sample(s) belong to sustained excursions rather than isolated spikes; they are reported by change-point and burst detection instead of being counted as outliers.`,
      );
    }
    if (outliers.pct !== null) {
      if (outliers.pct >= 8) penalties.push({ metric: 'outliers', severity: 2, detail: outliers.detail });
      else if (outliers.pct >= 2) penalties.push({ metric: 'outliers', severity: 1, detail: outliers.detail });
    }
  }

  // ---- Duration / sample count ----------------------------------------------
  const minWindow = MIN_WINDOW_SEC[profile] ?? 0;
  if (windowSec !== null && minWindow > 0 && windowSec < minWindow) {
    penalties.push({
      metric: 'windowSec',
      severity: 1,
      detail: `Window is ${formatDuration(windowSec)}; at least ${formatDuration(minWindow)} is expected for ${profile} analysis.`,
    });
  }

  const grade = gradeFrom(usable.length, penalties, missingPct);
  const limitations = buildLimitations({
    grade, missingPct, gaps, dropout, flatline, noise, outliers, windowSec, record, dt, win, penalties,
  });

  return {
    ...base,
    grade,
    tone: GRADE_TONE[grade],
    conclusionLevel: CONCLUSION_LEVEL[grade],
    penalties,
    metrics: {
      samples: n,
      usableSamples: usable.length,
      missingSamples,
      missingPct: round(missingPct, 2),
      samplingRate: record.samplingRate ?? null,
      samplingRateKnown: Boolean(record.samplingRate),
      effectiveRate: dt ? round(1 / dt, 5) : null,
      windowSec: round(windowSec, 2),
      durationSec: record.durationSec ?? null,
      decimated: Boolean(win.decimated),
      decimationMethod: win.decimationMethod ?? null,
      gaps,
      dropout,
      flatline,
      zeroRun,
      noise,
      outliers,
    },
    limitations,
    notes,
  };
}

// ---------------------------------------------------------------------------
// Discrete spot measurements (blood pressure, body temperature, glucose)
// ---------------------------------------------------------------------------

function assessDiscrete(base, record, win) {
  const values = win.values;
  const n = values.length;
  const usable = finite(values);
  const missingSamples = countMissing(values);
  const missingPct = n ? (missingSamples / n) * 100 : null;
  const times = windowTimes(win);
  const intervals = [];
  for (let i = 1; i < times.length; i += 1) {
    if (Number.isFinite(times[i]) && Number.isFinite(times[i - 1])) intervals.push(times[i] - times[i - 1]);
  }
  const medInterval = intervals.length ? median(intervals) : null;
  const irregular = intervals.length && medInterval
    ? intervals.filter((v) => Math.abs(v - medInterval) > medInterval * 0.5).length
    : 0;

  const penalties = [];
  const notes = [];
  if (missingPct !== null && missingPct >= 25) {
    penalties.push({ metric: 'missingPct', severity: 2, detail: `${round(missingPct, 1)} % of measurements have no value` });
  }
  if (medInterval && intervals.length >= 3 && irregular / intervals.length > 0.4) {
    penalties.push({
      metric: 'spacing',
      severity: 1,
      detail: 'Measurement times are irregular, so time-based statistics describe an unevenly sampled series.',
    });
  }

  let outliers;
  if (usable.length < 4) {
    outliers = na('Fewer than 4 measurements — a robust outlier test would flag ordinary variation as findings.');
  } else {
    const res = outlierIndices(values, 5);
    outliers = {
      applicable: true,
      isolated: false,
      count: res.indices.length,
      pct: n ? round((res.indices.length / n) * 100, 2) : null,
      method: 'Measurements more than 5 robust σ (scaled MAD) from the median.',
      detail: res.indices.length ? `${res.indices.length} outlying measurement(s)` : 'No outlying measurements',
    };
    if (outliers.pct !== null && outliers.pct >= 20) penalties.push({ metric: 'outliers', severity: 1, detail: outliers.detail });
  }

  const grade = gradeFrom(usable.length, penalties, missingPct, 4);
  return {
    ...base,
    grade,
    tone: GRADE_TONE[grade],
    conclusionLevel: CONCLUSION_LEVEL[grade],
    penalties,
    metrics: {
      samples: n,
      usableSamples: usable.length,
      missingSamples,
      missingPct: round(missingPct, 2),
      samplingRate: null,
      samplingRateKnown: false,
      windowSec: times.length >= 2 ? round(times[times.length - 1] - times[0], 1) : null,
      durationSec: record.durationSec ?? null,
      gaps: na('Spot measurements are not uniformly sampled, so "sampling gaps" do not apply.'),
      dropout: na('Sensor dropout cannot be inferred from spot measurements.'),
      flatline: na('Flatline detection applies to continuous recordings only.'),
      noise: na('High-frequency noise is not defined for a set of spot measurements.'),
      outliers,
      spacing: {
        applicable: intervals.length > 0,
        medianIntervalSec: round(medInterval, 1),
        irregularIntervals: irregular,
        intervals: intervals.length,
        detail: intervals.length
          ? `Median spacing ${formatDuration(medInterval)} across ${intervals.length} interval(s)`
          : 'Only one measurement — spacing cannot be described.',
      },
    },
    limitations: buildLimitations({ grade, missingPct, record, discrete: true, usable: usable.length, penalties, outliers }),
    notes: [...notes, 'Discrete measurements carry no sampling rate; gap and flatline metrics are reported as not applicable rather than as zero.'],
  };
}

// ---------------------------------------------------------------------------
// Categorical epochs (sleep stages, posture)
// ---------------------------------------------------------------------------

function assessCategorical(base, record, win) {
  const labels = win.labels ?? [];
  const n = labels.length;
  const missingSamples = labels.filter((l) => l === null || l === undefined).length;
  const usable = n - missingSamples;
  const missingPct = n ? (missingSamples / n) * 100 : null;
  const epochSec = win.epochSec ?? win.dt ?? null;
  const windowSec = epochSec ? n * epochSec : null;

  const runs = [];
  let cur = null;
  for (let i = 0; i < n; i += 1) {
    if (labels[i] === null || labels[i] === undefined) {
      if (!cur) cur = { startIndex: i, length: 0 };
      cur.length += 1;
    } else if (cur) {
      runs.push(cur);
      cur = null;
    }
  }
  if (cur) runs.push(cur);
  const longest = runs.reduce((a, r) => (r.length > a.length ? r : a), { length: 0, startIndex: -1 });

  const penalties = [];
  if (missingPct !== null) {
    if (missingPct >= 60) penalties.push({ metric: 'missingPct', severity: 3, detail: `${round(missingPct, 1)} % of epochs are unlabelled` });
    else if (missingPct >= 25) penalties.push({ metric: 'missingPct', severity: 2, detail: `${round(missingPct, 1)} % of epochs are unlabelled` });
    else if (missingPct >= 10) penalties.push({ metric: 'missingPct', severity: 1, detail: `${round(missingPct, 1)} % of epochs are unlabelled` });
  }

  const grade = gradeFrom(usable, penalties, missingPct, 8);
  const gaps = epochSec
    ? {
        applicable: true,
        count: runs.length,
        longestSamples: longest.length,
        longestSec: longest.length * epochSec,
        detail: runs.length
          ? `${runs.length} unlabelled stretch${runs.length === 1 ? '' : 'es'}, longest ${formatDuration(longest.length * epochSec)}`
          : 'Every epoch carries a label',
      }
    : na('Epoch length is not declared, so unlabelled stretches cannot be expressed in seconds.');

  return {
    ...base,
    grade,
    tone: GRADE_TONE[grade],
    conclusionLevel: CONCLUSION_LEVEL[grade],
    penalties,
    metrics: {
      samples: n,
      usableSamples: usable,
      missingSamples,
      missingPct: round(missingPct, 2),
      samplingRate: epochSec ? round(1 / epochSec, 5) : null,
      samplingRateKnown: Boolean(epochSec),
      epochSec,
      windowSec: round(windowSec, 1),
      durationSec: record.durationSec ?? null,
      gaps,
      dropout: na('Categorical epochs have no sensor channel to drop out.'),
      flatline: na(FLATLINE_RULES['categorical-epoch'].reason),
      noise: na('Numeric noise metrics do not apply to categorical labels.'),
      outliers: na('Outlier tests do not apply to categorical labels.'),
      stageCoverage: {
        applicable: true,
        labelled: usable,
        total: n,
        distinct: new Set(labels.filter(Boolean)).size,
      },
    },
    limitations: buildLimitations({ grade, missingPct, record, categorical: true, usable, penalties, gaps }),
    notes: ['Quality for categorical signals is driven by label coverage, not by numeric noise.'],
  };
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

function gradeFrom(usableCount, penalties, missingPct, minSamples = MIN_USABLE_SAMPLES) {
  if (usableCount < minSamples) return 'INSUFFICIENT DATA';
  if (missingPct !== null && missingPct >= 60) return 'INSUFFICIENT DATA';
  const score = penalties.reduce((a, p) => a + (p.severity ?? 1), 0);
  if (score === 0) return 'GOOD';
  if (score <= 2) return 'FAIR';
  return 'POOR';
}

export function canSupportStrongConclusions(assessment) {
  return assessment?.grade === 'GOOD';
}

export function conclusionLevel(assessment) {
  return assessment ? CONCLUSION_LEVEL[assessment.grade] ?? CONCLUSION_LEVEL['INSUFFICIENT DATA'] : CONCLUSION_LEVEL['INSUFFICIENT DATA'];
}

function buildLimitations(ctx) {
  const out = [];
  const { grade, missingPct, record } = ctx;

  if (ctx.discrete) {
    if ((ctx.usable ?? 0) < 4) out.push('Fewer than four measurements — only a listing is possible, no distribution can be described.');
    out.push('Spot measurements have no sampling rate; any time-weighted statistic would be an assumption, not a measurement.');
  }
  if (ctx.categorical) {
    out.push('Stage labels are taken as given; this engine does not re-derive them from raw signals and cannot verify them.');
  }
  if (missingPct !== null && missingPct > 0 && !ctx.discrete && !ctx.categorical) {
    out.push(`${round(missingPct, 1)} % of the analysed window has no sample. Missing samples were excluded, not filled.`);
  }
  if ((ctx.gaps?.count ?? 0) > 0) {
    out.push('Sampling gaps break continuity, so change-point and spectral results spanning a gap are not reliable.');
  }
  if (ctx.dropout?.detected) out.push('Sensor dropout was detected; segments around it were excluded from statistics.');
  if (ctx.flatline?.detected) out.push('A flatline segment was detected and treated as an artifact, not as a stable physiological state.');
  if (ctx.noise?.excessive) out.push('Noise is excessive for this signal type; amplitude-based features are dominated by noise.');
  if (ctx.win?.decimated) {
    out.push(`The window was aggregated for responsiveness (${ctx.win.decimationMethod ?? 'mean aggregation'}), so fast transients are attenuated and frequencies near the native Nyquist limit are not represented.`);
  }
  if (grade === 'POOR') out.push('Overall quality is POOR — this recording must not be used for strong conclusions.');
  if (grade === 'INSUFFICIENT DATA') out.push('There is not enough usable data to describe this signal at all.');

  if (!out.length) {
    if (grade === 'GOOD') {
      out.push('No quality defects were detected in the analysed window; this does not guarantee the recording is free of artifacts outside it.');
    } else {
      // A grade below GOOD must always be explainable from the penalties.
      for (const p of ctx.penalties ?? []) {
        out.push(`${METRIC_LABELS[p.metric] ?? p.metric}: ${p.detail}`);
      }
      if (!out.length) out.push(`Quality is ${grade}; no individual metric crossed its threshold, so the grade reflects the combination recorded above.`);
    }
  }
  return out;
}

/** Assess a list of records. Windows may be pre-resolved to avoid re-generating. */
export function assessAll(records, resolve = resolveSignalValues) {
  return records.map((r) => assessSignalQuality(r, resolve(r, {})));
}

/** Cohort-level quality summary used by the dashboard (all counts computed). */
export function summarizeQuality(assessments) {
  const counts = { GOOD: 0, FAIR: 0, POOR: 0, 'INSUFFICIENT DATA': 0 };
  let missingTotal = 0;
  let missingWeight = 0;
  for (const a of assessments) {
    counts[a.grade] = (counts[a.grade] ?? 0) + 1;
    const pct = a.metrics?.missingPct;
    const n = a.metrics?.samples ?? 0;
    if (pct !== null && pct !== undefined && n) {
      missingTotal += (pct / 100) * n;
      missingWeight += n;
    }
  }
  return {
    total: assessments.length,
    counts,
    goodPct: assessments.length ? round((counts.GOOD / assessments.length) * 100, 1) : null,
    usableForStrongConclusions: assessments.filter(canSupportStrongConclusions).length,
    weightedMissingPct: missingWeight ? round((missingTotal / missingWeight) * 100, 2) : null,
  };
}

export { QUALITY_GRADES as GRADES };

/**
 * Bio-signal taxonomy for the Human Bio-Signal Intelligence Engine.
 *
 * This is a CATALOGUE OF SIGNAL TYPES, not a claim about any patient. It
 * declares what kinds of physiological measurement the platform can hold, how
 * each is measured, and which processing algorithms are appropriate for it.
 *
 * Two distinctions matter for research honesty and are modelled explicitly:
 *
 *   kind: 'raw'      — a continuous waveform sampled from a sensor
 *         'derived'  — a metric computed from a raw signal or an aggregate
 *         'discrete' — individual spot measurements
 *         'categorical' — labelled epochs/states rather than numbers
 *
 *   profile — which processing pipeline is legitimate for this signal type.
 *         Applying one algorithm set to every signal is a methodological
 *         error, so profiles are declared per type and processing dispatches
 *         on them (see src/lib/signalProcessing.js).
 *
 * Nothing here is diagnostic. Sampling rates and units are typical research
 * values used to describe the data model, not clinical specifications.
 */

export const SIGNAL_CATEGORIES = [
  { id: 'cardiac', label: 'Cardiac', note: 'Electrical and mechanical heart activity' },
  { id: 'neural', label: 'Neural', note: 'Cortical electrical activity and band power' },
  { id: 'respiratory', label: 'Respiratory', note: 'Breathing waveform, rate and oxygenation' },
  { id: 'autonomic', label: 'Autonomic / Skin', note: 'Electrodermal activity and temperature' },
  { id: 'movement', label: 'Movement', note: 'Inertial sensors, activity and posture' },
  { id: 'sleep', label: 'Sleep', note: 'Duration, staging and regularity' },
  { id: 'metabolic', label: 'Metabolic', note: 'Glucose, continuous and spot' },
  { id: 'acoustic', label: 'Acoustic', note: 'Heart, respiratory and cough sounds' },
];

/**
 * Processing profiles. Each lists the algorithms that are methodologically
 * appropriate for the signal kinds assigned to it.
 */
export const PROCESSING_PROFILES = {
  'waveform-raw': {
    id: 'waveform-raw',
    label: 'Raw waveform analysis',
    algorithms: [
      'Baseline estimation',
      'Peak detection',
      'Frequency / spectral analysis',
      'Noise detection',
      'Time-domain statistics',
      'Change-point detection',
    ],
    note: 'For continuous sensor waveforms. Spectral results depend on a stable sampling rate.',
  },
  'inertial-raw': {
    id: 'inertial-raw',
    label: 'Inertial axis analysis',
    algorithms: [
      'Baseline estimation',
      'Vector magnitude',
      'Movement event detection',
      'Variability analysis',
      'Noise detection',
    ],
    note: 'Per-axis raw inertial data. Peaks are movement events, not physiological beats.',
  },
  'rate-metric': {
    id: 'rate-metric',
    label: 'Derived rate analysis',
    algorithms: [
      'Trend detection',
      'Variability analysis',
      'Change-point detection',
      'Time-domain statistics',
    ],
    note: 'Derived metrics. Peak detection here would re-detect what the derivation already did.',
  },
  'band-power': {
    id: 'band-power',
    label: 'Spectral band analysis',
    algorithms: [
      'Relative band power',
      'Trend detection',
      'Cross-signal correlation',
      'Time-domain statistics',
    ],
    note: 'Already a frequency-domain quantity, so raw spectral analysis is not re-applied.',
  },
  'discrete-spot': {
    id: 'discrete-spot',
    label: 'Discrete measurement analysis',
    algorithms: ['Descriptive statistics', 'Trend detection', 'Outlier detection', 'Group comparison'],
    note: 'Unevenly spaced spot values. Gap and sampling-rate metrics do not apply.',
  },
  'categorical-epoch': {
    id: 'categorical-epoch',
    label: 'Categorical epoch analysis',
    algorithms: ['Stage distribution', 'Transition counting', 'Regularity index', 'Similarity analysis'],
    note: 'Labelled states. Numeric signal statistics do not apply to labels.',
  },
  'event-series': {
    id: 'event-series',
    label: 'Event series analysis',
    algorithms: ['Event counting', 'Inter-event interval', 'Burst detection', 'Repeated pattern detection'],
    note: 'Sparse events in time rather than a sampled signal.',
  },
};

/**
 * The signal catalogue. `samplingRate` is the cadence at which the measurement
 * is produced. It is null for discrete spot measurements and for categorical
 * epochs, because a spot reading has no cadence and inventing one would be a
 * fabricated property of the data. Derived metrics DO carry a real cadence —
 * an HRV value per 5-minute window, a step count per hour, a sleep duration per
 * night — and stating it is what lets the quality engine tell "no data" apart
 * from "data at this interval".
 */
export const SIGNAL_TYPES = [
  // ---------- CARDIAC ----------
  { id: 'ecg', label: 'ECG', category: 'cardiac', kind: 'raw', unit: 'mV', samplingRate: 250, channel: 'II', profile: 'waveform-raw', description: 'Surface electrocardiogram waveform' },
  { id: 'heart-rate', label: 'Heart rate', category: 'cardiac', kind: 'derived', unit: 'bpm', samplingRate: 1, channel: 'HR', profile: 'rate-metric', description: 'Beats per minute derived from ECG or PPG intervals' },
  { id: 'hrv-rmssd', label: 'HRV (RMSSD)', category: 'cardiac', kind: 'derived', unit: 'ms', samplingRate: 1 / 300, channel: 'RMSSD', profile: 'rate-metric', description: 'Root mean square of successive RR interval differences, one value per 5-minute window' },
  { id: 'hrv-sdnn', label: 'HRV (SDNN)', category: 'cardiac', kind: 'derived', unit: 'ms', samplingRate: 1 / 300, channel: 'SDNN', profile: 'rate-metric', description: 'Standard deviation of NN intervals, one value per 5-minute window' },
  { id: 'ppg', label: 'PPG', category: 'cardiac', kind: 'raw', unit: 'a.u.', samplingRate: 64, channel: 'GREEN', profile: 'waveform-raw', description: 'Photoplethysmogram from an optical sensor' },
  { id: 'pulse-waveform', label: 'Pulse waveform', category: 'cardiac', kind: 'raw', unit: 'a.u.', samplingRate: 128, channel: 'PULSE', profile: 'waveform-raw', description: 'Arterial pulse pressure waveform' },
  { id: 'blood-pressure', label: 'Blood pressure', category: 'cardiac', kind: 'discrete', unit: 'mmHg', samplingRate: null, channel: 'SYS/DIA', profile: 'discrete-spot', description: 'Systolic and diastolic spot measurements' },

  // ---------- NEURAL ----------
  { id: 'eeg', label: 'EEG', category: 'neural', kind: 'raw', unit: 'µV', samplingRate: 256, channel: 'Fp1', profile: 'waveform-raw', description: 'Scalp electroencephalogram, single channel' },
  { id: 'eeg-delta', label: 'EEG Delta', category: 'neural', kind: 'derived', unit: 'µV²/Hz', samplingRate: null, channel: '0.5–4 Hz', profile: 'band-power', description: 'Delta band power' },
  { id: 'eeg-theta', label: 'EEG Theta', category: 'neural', kind: 'derived', unit: 'µV²/Hz', samplingRate: null, channel: '4–8 Hz', profile: 'band-power', description: 'Theta band power' },
  { id: 'eeg-alpha', label: 'EEG Alpha', category: 'neural', kind: 'derived', unit: 'µV²/Hz', samplingRate: null, channel: '8–13 Hz', profile: 'band-power', description: 'Alpha band power' },
  { id: 'eeg-beta', label: 'EEG Beta', category: 'neural', kind: 'derived', unit: 'µV²/Hz', samplingRate: null, channel: '13–30 Hz', profile: 'band-power', description: 'Beta band power' },
  { id: 'eeg-gamma', label: 'EEG Gamma', category: 'neural', kind: 'derived', unit: 'µV²/Hz', samplingRate: null, channel: '30–45 Hz', profile: 'band-power', description: 'Gamma band power' },

  // ---------- RESPIRATORY ----------
  { id: 'respiration-waveform', label: 'Respiration waveform', category: 'respiratory', kind: 'raw', unit: 'a.u.', samplingRate: 32, channel: 'THORAX', profile: 'waveform-raw', description: 'Thoracic or abdominal breathing waveform' },
  { id: 'respiratory-rate', label: 'Respiratory rate', category: 'respiratory', kind: 'derived', unit: 'br/min', samplingRate: null, channel: 'RR', profile: 'rate-metric', description: 'Breaths per minute derived from the waveform' },
  { id: 'respiratory-variability', label: 'Respiratory variability', category: 'respiratory', kind: 'derived', unit: '%', samplingRate: 1 / 60, channel: 'RVA', profile: 'rate-metric', description: 'Coefficient of variation of breathing intervals, one value per minute' },
  { id: 'spo2', label: 'SpO2', category: 'respiratory', kind: 'derived', unit: '%', samplingRate: 1, channel: 'SPO2', profile: 'rate-metric', description: 'Peripheral oxygen saturation estimate' },

  // ---------- AUTONOMIC / SKIN ----------
  { id: 'eda-gsr', label: 'EDA / GSR', category: 'autonomic', kind: 'raw', unit: 'µS', samplingRate: 8, channel: 'EDA', profile: 'waveform-raw', description: 'Electrodermal activity / galvanic skin response' },
  { id: 'skin-temperature', label: 'Skin temperature', category: 'autonomic', kind: 'raw', unit: '°C', samplingRate: 1, channel: 'SKIN', profile: 'rate-metric', description: 'Continuous skin temperature' },
  { id: 'body-temperature', label: 'Body temperature', category: 'autonomic', kind: 'discrete', unit: '°C', samplingRate: null, channel: 'CORE', profile: 'discrete-spot', description: 'Spot core temperature measurement' },
  { id: 'peripheral-temperature', label: 'Peripheral temperature', category: 'autonomic', kind: 'discrete', unit: '°C', samplingRate: null, channel: 'PERIPH', profile: 'discrete-spot', description: 'Spot peripheral temperature measurement' },

  // ---------- MOVEMENT ----------
  { id: 'accel-x', label: 'Accelerometer X', category: 'movement', kind: 'raw', unit: 'g', samplingRate: 50, channel: 'X', profile: 'inertial-raw', description: 'Linear acceleration, X axis' },
  { id: 'accel-y', label: 'Accelerometer Y', category: 'movement', kind: 'raw', unit: 'g', samplingRate: 50, channel: 'Y', profile: 'inertial-raw', description: 'Linear acceleration, Y axis' },
  { id: 'accel-z', label: 'Accelerometer Z', category: 'movement', kind: 'raw', unit: 'g', samplingRate: 50, channel: 'Z', profile: 'inertial-raw', description: 'Linear acceleration, Z axis' },
  { id: 'gyro-x', label: 'Gyroscope X', category: 'movement', kind: 'raw', unit: '°/s', samplingRate: 50, channel: 'X', profile: 'inertial-raw', description: 'Angular velocity, X axis' },
  { id: 'gyro-y', label: 'Gyroscope Y', category: 'movement', kind: 'raw', unit: '°/s', samplingRate: 50, channel: 'Y', profile: 'inertial-raw', description: 'Angular velocity, Y axis' },
  { id: 'gyro-z', label: 'Gyroscope Z', category: 'movement', kind: 'raw', unit: '°/s', samplingRate: 50, channel: 'Z', profile: 'inertial-raw', description: 'Angular velocity, Z axis' },
  { id: 'mag-x', label: 'Magnetometer X', category: 'movement', kind: 'raw', unit: 'µT', samplingRate: 50, channel: 'X', profile: 'inertial-raw', description: 'Magnetic field, X axis' },
  { id: 'mag-y', label: 'Magnetometer Y', category: 'movement', kind: 'raw', unit: 'µT', samplingRate: 50, channel: 'Y', profile: 'inertial-raw', description: 'Magnetic field, Y axis' },
  { id: 'mag-z', label: 'Magnetometer Z', category: 'movement', kind: 'raw', unit: 'µT', samplingRate: 50, channel: 'Z', profile: 'inertial-raw', description: 'Magnetic field, Z axis' },
  { id: 'activity', label: 'Activity', category: 'movement', kind: 'derived', unit: 'MET·min', samplingRate: 1 / 3600, channel: 'ACT', profile: 'rate-metric', description: 'Derived activity volume, one value per hour' },
  { id: 'steps', label: 'Steps', category: 'movement', kind: 'derived', unit: 'count', samplingRate: 1 / 3600, channel: 'STEPS', profile: 'rate-metric', description: 'Step count aggregated per hour' },
  { id: 'posture', label: 'Posture', category: 'movement', kind: 'categorical', unit: 'label', samplingRate: null, channel: 'POST', profile: 'categorical-epoch', description: 'Postural classification per epoch' },
  { id: 'movement-events', label: 'Movement events', category: 'movement', kind: 'derived', unit: 'events', samplingRate: 1 / 30, channel: 'MOVE', profile: 'event-series', description: 'Detected movement events, one indicator per 30-second epoch' },

  // ---------- SLEEP ----------
  { id: 'sleep-duration', label: 'Sleep duration', category: 'sleep', kind: 'derived', unit: 'min', samplingRate: 1 / 86400, channel: 'TST', profile: 'rate-metric', description: 'Total sleep time, one value per night' },
  { id: 'sleep-stages', label: 'Sleep stages', category: 'sleep', kind: 'categorical', unit: 'label', samplingRate: null, channel: 'STAGE', profile: 'categorical-epoch', description: 'Per-epoch sleep stage labels' },
  { id: 'sleep-wake-transitions', label: 'Sleep/wake transitions', category: 'sleep', kind: 'derived', unit: 'count', samplingRate: 1 / 86400, channel: 'TRANS', profile: 'rate-metric', description: 'Counted transitions between stages, one value per night' },
  { id: 'sleep-regularity', label: 'Sleep regularity', category: 'sleep', kind: 'derived', unit: 'index', samplingRate: 1 / 86400, channel: 'SRI', profile: 'rate-metric', description: 'Night-to-night regularity index, one value per night' },
  { id: 'sleep-movement', label: 'Sleep movement', category: 'sleep', kind: 'derived', unit: 'count', samplingRate: 1 / 3600, channel: 'SMOVE', profile: 'rate-metric', description: 'Movement counts during sleep, one value per hour' },

  // ---------- METABOLIC ----------
  { id: 'cgm', label: 'Continuous glucose', category: 'metabolic', kind: 'raw', unit: 'mg/dL', samplingRate: 1 / 300, channel: 'CGM', profile: 'rate-metric', description: 'Interstitial glucose sampled every 5 minutes' },
  { id: 'glucose', label: 'Glucose measurement', category: 'metabolic', kind: 'discrete', unit: 'mg/dL', samplingRate: null, channel: 'GLU', profile: 'discrete-spot', description: 'Laboratory or meter spot glucose' },

  // ---------- ACOUSTIC ----------
  { id: 'heart-sounds', label: 'Heart sounds', category: 'acoustic', kind: 'raw', unit: 'a.u.', samplingRate: 1000, channel: 'PCG', profile: 'waveform-raw', description: 'Phonocardiogram' },
  { id: 'respiratory-sounds', label: 'Respiratory sounds', category: 'acoustic', kind: 'raw', unit: 'a.u.', samplingRate: 1000, channel: 'LUNG', profile: 'waveform-raw', description: 'Recorded respiratory acoustics' },
  { id: 'cough-features', label: 'Cough audio features', category: 'acoustic', kind: 'derived', unit: 'events', samplingRate: 1 / 60, channel: 'COUGH', profile: 'event-series', description: 'Cough events detected per minute from audio' },
];

const BY_ID = new Map(SIGNAL_TYPES.map((t) => [t.id, t]));

export function getSignalType(id) {
  return BY_ID.get(id) ?? null;
}

export function signalTypeLabel(id) {
  return BY_ID.get(id)?.label ?? id;
}

export function signalCategoryLabel(id) {
  const t = BY_ID.get(id);
  return SIGNAL_CATEGORIES.find((c) => c.id === t?.category)?.label ?? 'Uncategorized';
}

export function signalsByCategory(categoryId) {
  return SIGNAL_TYPES.filter((t) => t.category === categoryId);
}

/** Human-readable kind label — the raw vs derived distinction from PART 5. */
export const KIND_LABEL = {
  raw: 'Raw signal',
  derived: 'Derived measurement',
  discrete: 'Discrete measurement',
  categorical: 'Categorical epochs',
};

export const SIGNAL_COUNTS = {
  types: SIGNAL_TYPES.length,
  categories: SIGNAL_CATEGORIES.length,
  raw: SIGNAL_TYPES.filter((t) => t.kind === 'raw').length,
  derived: SIGNAL_TYPES.filter((t) => t.kind === 'derived').length,
  discrete: SIGNAL_TYPES.filter((t) => t.kind === 'discrete').length,
  categorical: SIGNAL_TYPES.filter((t) => t.kind === 'categorical').length,
};

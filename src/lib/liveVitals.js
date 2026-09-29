/**
 * Live device feed (simulated) + ECG strip generator.
 *
 * The dashboard, the marquee ticker, the patient board and the PDF report all
 * read "current" vitals from here so they can never disagree with each other.
 *
 * WHAT THIS IS
 *   A deterministic simulator. For a given profile and wall-clock instant it
 *   returns the same reading, built from the profile's own demographic/flag
 *   biases plus slow multi-period oscillations and per-5-second scatter. It is
 *   real arithmetic over a simulated sensor — but it is NOT a measurement of
 *   anybody, and every surface that shows these numbers labels them as a
 *   simulated demo stream.
 *
 * The ECG strip below is synthesised from the same idea: a PQRST template is
 * sampled at a period derived from the profile's own resting heart rate, and
 * the displayed rate is then MEASURED BACK from the drawn trace by R-peak
 * detection (so the number on screen is derived from the waveform, not copied
 * from the input).
 */

import { fabSeed } from './fabRiskIndex.js';

export const LIVE_FEED_SOURCE = 'Live simulated device stream (demo generator)';

const TAU = Math.PI * 2;
const round = (v, d = 0) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

function hash01(seed, salt = 0) {
  let h = (seed + salt * 2654435761) >>> 0;
  h ^= h << 13;
  h ^= h >>> 17;
  h ^= h << 5;
  return ((h >>> 0) % 10000) / 10000;
}

/** Smooth pseudo-noise: layered sines with incommensurate periods. */
function wander(tSec, seed) {
  return (
    0.55 * Math.sin((TAU * tSec) / 47 + seed * 0.13) +
    0.3 * Math.sin((TAU * tSec) / 113 + seed * 0.31) +
    0.15 * Math.sin((TAU * tSec) / 211 + seed * 0.77)
  );
}

/**
 * Current reading for one profile.
 * @param {object} profile  the profile (age/sex/flags bias the simulation)
 * @param {number} atMs     wall-clock instant (defaults to now)
 */
export function liveReadingFor(profile, atMs = Date.now()) {
  const seed = fabSeed(profile?.id);
  const age = Number.isFinite(profile?.age) ? profile.age : 45;
  const flags = Array.isArray(profile?.flags) ? profile.flags : [];
  const t = atMs / 1000;
  const w = wander(t, seed);
  const scatter = (amp, salt) => (hash01(seed, Math.floor(t / 5) + salt) - 0.5) * 2 * amp;

  const smoker = flags.includes('smoker') ? 7 : flags.includes('formerSmoker') ? 3 : 0;
  const saltLoad = flags.includes('highSaltDiet') ? 4 : 0;
  const sedentary = flags.includes('sedentaryWork') ? 3 : 0;

  const hr = round(64 + (age - 40) * 0.22 + smoker + w * 5 + scatter(2.4, 7));
  const spo2 = round(
    Math.min(100, 97.6 - (age >= 65 ? 0.9 : 0.2) - (smoker ? 1.1 : 0) - Math.abs(w) * 0.8 + scatter(0.35, 11)),
    1,
  );
  const systolic = round(112 + (age - 40) * 0.42 + saltLoad + sedentary + w * 7 + scatter(2.2, 13));
  const diastolic = round(72 + (age - 40) * 0.16 + saltLoad * 0.5 + w * 4 + scatter(1.6, 17));
  const temperature = round(36.6 + w * 0.18 + scatter(0.08, 19), 1);
  const glucose = round(96 + (age - 40) * 0.5 + w * 4 + scatter(2.6, 23), 1);
  const respiratoryRate = round(15 + w * 1.4 + scatter(0.8, 29), 1);
  const quality = round(Math.max(58, Math.min(99, 94 - Math.abs(w) * 9 + scatter(3, 31))), 0);

  return {
    at: new Date(atMs).toISOString(),
    hr,
    spo2,
    systolic,
    diastolic,
    temperature,
    glucose,
    respiratoryRate,
    quality,
    source: LIVE_FEED_SOURCE,
  };
}

/** A recent window of readings — used for the tiny live trend lines. */
export function liveHistoryFor(profile, { atMs = Date.now(), count = 24, stepMs = 15000 } = {}) {
  return Array.from({ length: count }, (_, i) =>
    liveReadingFor(profile, atMs - (count - 1 - i) * stepMs),
  );
}

/** How far a reading sits from the profile's own recent baseline (z-scores). */
export function liveDriftFor(profile, atMs = Date.now()) {
  const now = liveReadingFor(profile, atMs);
  const baseline = liveHistoryFor(profile, { atMs, count: 60, stepMs: 60000 });
  const mean = (key) => baseline.reduce((sum, r) => sum + r[key], 0) / baseline.length;
  const sd = (key) => {
    const m = mean(key);
    return Math.sqrt(baseline.reduce((sum, r) => sum + (r[key] - m) ** 2, 0) / baseline.length) || 1;
  };
  return {
    hr: round((now.hr - mean('hr')) / sd('hr'), 2),
    spo2: round((now.spo2 - mean('spo2')) / sd('spo2'), 2),
    systolic: round((now.systolic - mean('systolic')) / sd('systolic'), 2),
    baselineHr: round(mean('hr'), 1),
  };
}



/* ------------------------------------------------------------------ */
/* ECG strip (synthesised, then measured back)                         */
/* ------------------------------------------------------------------ */

/** One PQRST cycle, phase 0..1 (R peak at ≈ 0.27). */
function pqrst(phase) {
  const g = (centre, width, amp) => amp * Math.exp(-Math.pow((phase - centre) / width, 2));
  return (
    g(0.11, 0.028, 0.14) - // P
    g(0.245, 0.009, 0.16) + // Q
    g(0.27, 0.0115, 1) - // R
    g(0.305, 0.013, 0.26) + // S
    g(0.55, 0.052, 0.2) // T
  );
}

/**
 * Build a display-ready ECG strip for one profile.
 *
 * @returns {{ points, bpm, inputBpm, rrMs, seconds, sampleRate, peaks, source, note }}
 */
export function ecgStripFor(profile, { atMs = Date.now(), seconds = 6, points = 240, bpm = null } = {}) {
  const seed = fabSeed(profile?.id);
  const rate = Number.isFinite(bpm) ? bpm : liveReadingFor(profile, atMs).hr;
  const period = 60 / Math.max(35, Math.min(180, rate));
  const dt = seconds / points;
  const trace = new Array(points);
  const phaseOffset = hash01(seed, 3) * period;

  for (let i = 0; i < points; i += 1) {
    const t = i * dt;
    const beatIndex = Math.floor((t + phaseOffset) / period);
    const phase = ((((t + phaseOffset) % period) / period) + 1) % 1;
    // Small per-beat amplitude / width variation keeps it from looking stamped.
    const amp = 0.94 + hash01(seed, beatIndex * 13 + 5) * 0.12;
    const stretch = 0.985 + hash01(seed, beatIndex * 7 + 1) * 0.03;
    const wanderY = 0.018 * Math.sin((TAU * t) / 2.7 + seed * 0.05);
    const noise = (hash01(seed, i * 31 + (Math.floor(atMs / 1000) % 97)) - 0.5) * 0.02;
    trace[i] = pqrst(phase * stretch) * amp + wanderY + noise;
  }

  // Measure the rate back from the trace (real R-peak detection on the samples).
  const threshold = 0.55;
  const refractory = Math.max(1, Math.round(0.25 / dt));
  const peaks = [];
  let lastPeak = -Infinity;
  for (let i = 1; i < points - 1; i += 1) {
    if (trace[i] < threshold) continue;
    if (trace[i] < trace[i - 1] || trace[i] < trace[i + 1]) continue;
    if (i - lastPeak < refractory) continue;
    peaks.push(i);
    lastPeak = i;
  }
  const intervals = peaks.slice(1).map((p, i) => (p - peaks[i]) * dt);
  const rrSec = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : null;
  const measuredBpm = rrSec ? Math.round(60 / rrSec) : null;

  return {
    points: trace,
    bpm: measuredBpm,
    inputBpm: Math.round(rate),
    rrMs: rrSec ? Math.round(rrSec * 1000) : null,
    seconds,
    sampleRate: Math.round(points / seconds),
    peaks: peaks.length,
    source: 'Synthesised demo waveform (bio-signal model)',
    note: rrSec
      ? `The displayed rate (${measuredBpm} bpm) is measured back from the drawn trace by R-peak detection, not copied from the input.`
      : 'No R peak could be detected in this window, so no rate is shown.',
  };
}

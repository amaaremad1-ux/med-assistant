/**
 * Local research audit trail (#28).
 * Persists to localStorage (research-demo only — no data leaves the browser).
 */

const KEY = 'sha_audit_v1';
export const AUDIT_TYPES = [
  'MEASUREMENT_RECEIVED',
  'MODEL_EXECUTED',
  'PREDICTION_GENERATED',
  'DATA_CHANGED',
  'EXPERIMENT_EXECUTED',
];

const TYPE_TONES = {
  MEASUREMENT_RECEIVED: 'good',
  MODEL_EXECUTED: 'proto',
  PREDICTION_GENERATED: 'warn',
  DATA_CHANGED: 'bad',
  EXPERIMENT_EXECUTED: 'proto',
};

const SEED_EVENTS = [
  { type: 'MEASUREMENT_RECEIVED', message: 'Device batch #1284 received (5 biomarkers · 12 samples)', at: '2026-09-20T09:41:00' },
  { type: 'MODEL_EXECUTED', message: 'demo-ensemble-v0.3 executed on 18-point longitudinal panel', at: '2026-09-20T09:41:30' },
  { type: 'PREDICTION_GENERATED', message: '5-year T2D estimate 34% (CI 29–39%) generated for PT-2026-04317', at: '2026-09-20T09:41:31' },
  { type: 'DATA_CHANGED', message: 'Weekly device stream appended — data quality recomputed (84/100)', at: '2026-09-20T09:41:35' },
];

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* corrupted store — fall through to seed */ }
  const seeded = SEED_EVENTS.map((e) => ({ ...e, id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()) }));
  try { localStorage.setItem(KEY, JSON.stringify(seeded)); } catch { /* storage unavailable */ }
  return seeded;
}

export function getEvents() {
  return read().sort((a, b) => (a.at < b.at ? 1 : -1));
}

export function logEvent(type, message, meta = {}) {
  if (!AUDIT_TYPES.includes(type)) throw new Error(`Unknown audit event type: ${type}`);
  const events = read();
  events.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
    type,
    message,
    meta,
    at: new Date().toISOString(),
  });
  // Cap the trail at 300 entries, dropping the oldest.
  const trimmed = events.slice(-300);
  try { localStorage.setItem(KEY, JSON.stringify(trimmed)); } catch { /* storage unavailable */ }
  return trimmed;
}

export function clearEvents(reason = 'Manual clear from Audit Trail page') {
  const cleared = [{ id: 'clear-' + Date.now(), type: 'DATA_CHANGED', message: `Audit log cleared — ${reason}`, at: new Date().toISOString(), meta: { cleared: true } }];
  try { localStorage.setItem(KEY, JSON.stringify(cleared)); } catch { /* storage unavailable */ }
  return cleared;
}

export const typeTone = (t) => TYPE_TONES[t] || 'proto';

export function formatWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso; // seeded demo strings
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

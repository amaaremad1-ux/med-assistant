/**
 * Research Data Hub — central catalogue of datasets by domain, with honest
 * pipeline status. "Processed" is only set when a parser actually succeeded.
 */

export const HUB_CATEGORIES = [
  { id: 'genetic', label: 'Genetic', note: 'Variant tables, VCF, DNA reports' },
  { id: 'lab', label: 'Lab', note: 'CBC, metabolic, lipids, hormones and other panels' },
  { id: 'bio-signals', label: 'Bio-signals', note: 'Time-series physiological recordings' },
  { id: 'medical-records', label: 'Medical Records', note: 'Uploaded clinical documents' },
  { id: 'wearable', label: 'Wearable', note: 'Consumer/research wearable streams' },
  { id: 'sleep', label: 'Sleep', note: 'Staging, duration and regularity series' },
  { id: 'activity', label: 'Activity', note: 'Steps, inertial and activity aggregates' },
  { id: 'longitudinal', label: 'Longitudinal', note: 'Repeated measures over calendar time' },
  { id: 'research', label: 'Research', note: 'Published or bundled research datasets' },
];

export const HUB_STATUSES = [
  'Uploaded',
  'Validating',
  'Processing',
  'Processed',
  'Error',
  'Insufficient data',
];

export const STATUS_TONE = {
  Uploaded: 'info',
  Validating: 'info',
  Processing: 'warn',
  Processed: 'good',
  Error: 'bad',
  'Insufficient data': 'neutral',
};

export function categoryLabel(id) {
  return HUB_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function inferHubCategory({ format, filename, declared } = {}) {
  if (declared && HUB_CATEGORIES.some((c) => c.id === declared)) return declared;
  const name = String(filename || '').toLowerCase();
  const fmt = String(format || '').toLowerCase();
  if (fmt === 'vcf' || /vcf|genetic|dna|gene/.test(name)) return 'genetic';
  if (fmt === 'edf' || fmt === 'edf+' || fmt === 'wfdb' || /ecg|eeg|edf|wfdb|signal/.test(name))
    return 'bio-signals';
  if (/sleep/.test(name)) return 'sleep';
  if (/step|activ|accel|gyro/.test(name)) return 'activity';
  if (/wear|fitbit|garmin|apple/.test(name)) return 'wearable';
  if (/lipid|cbc|metabolic|hormone|lab|glucose/.test(name) || fmt === 'csv') return 'lab';
  if (fmt === 'pdf' || /report|record|note/.test(name)) return 'medical-records';
  return 'research';
}

/**
 * Only mark Processed when extraction actually produced usable structure.
 * Failed parsers and empty parses must not be labelled successful.
 */
export function statusAfterParse({ ok, extractedCount, error, parserConfigured }) {
  if (!parserConfigured) return { status: 'Error', note: 'Parser not configured for this format' };
  if (error) return { status: 'Error', note: error };
  if (!ok) return { status: 'Error', note: 'Parsing failed.' };
  if (!extractedCount) return { status: 'Insufficient data', note: 'Parser ran; no structured records were found.' };
  return { status: 'Processed', note: null };
}

export function hubCounts(items) {
  const byCat = {};
  const byStatus = {};
  for (const c of HUB_CATEGORIES) byCat[c.id] = 0;
  for (const s of HUB_STATUSES) byStatus[s] = 0;
  for (const item of items) {
    byCat[item.category] = (byCat[item.category] ?? 0) + 1;
    byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
  }
  return { byCat, byStatus, total: items.length };
}

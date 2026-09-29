/**
 * Selectors over the normalized application data model.
 *
 * Every function here derives its output strictly from data that actually
 * exists in application state. Nothing is estimated, simulated, or invented:
 * when there are not enough measurements to say something, these helpers
 * return an explicit "insufficient" / null result instead of guessing.
 */

import { assessSignalQuality, summarizeQuality } from './signalQuality.js';

/**
 * Cohort-level signal quality (PART 31).
 *
 * This materialises one analysis window per recording, so it is measurably
 * more expensive than the other selectors here — callers should run it once
 * per state change (useMemo / useEffect), not on every render.
 *
 * Returns null when there are no recordings; an empty cohort has no quality to
 * report and is not the same as a cohort graded GOOD.
 */
export function signalQualitySummary(bioSignals = []) {
  if (!bioSignals.length) return null;
  const summary = summarizeQuality(bioSignals.map((s) => assessSignalQuality(s)));
  const graded = summary.total;
  const insufficient = summary.counts['INSUFFICIENT DATA'] ?? 0;
  return {
    ...summary,
    // Recordings that produced a grade at all — the denominator for any
    // statement about how the cohort behaves.
    graded: graded - insufficient,
    insufficient,
    note: graded
      ? `Graded from one analysed window per recording (${graded} recording${graded === 1 ? '' : 's'}). Quality outside that window was not assessed.`
      : 'No recordings to grade.',
  };
}

/**
 * Parse a laboratory reference range string into numeric bounds.
 * Supports "70–99", "70-99", "3.5 - 5.0", "<5.7", ">50".
 * Returns { lo, hi } where a missing bound is null, or null when unparseable.
 */
export function parseReferenceRange(rangeStr) {
  if (rangeStr == null || rangeStr === '') return null;
  const s = String(rangeStr).trim();

  const lt = s.match(/^<\s*([0-9.]+)$/);
  if (lt) return { lo: null, hi: parseFloat(lt[1]) };

  const gt = s.match(/^>\s*([0-9.]+)$/);
  if (gt) return { lo: parseFloat(gt[1]), hi: null };

  const pair = s.match(/^([0-9.]+)\s*(?:-|–|—|to)\s*([0-9.]+)$/);
  if (pair) return { lo: parseFloat(pair[1]), hi: parseFloat(pair[2]) };

  return null;
}

/**
 * Compare a numeric value against a reference range string.
 * Returns 'below' | 'within' | 'above', or null when the value or the range
 * is not usable (we never assume a universal reference range).
 */
export function evaluateAgainstRange(value, rangeStr) {
  const num = typeof value === 'number' ? value : parseFloat(value);
  const range = parseReferenceRange(rangeStr);
  if (!Number.isFinite(num) || !range) return null;
  if (range.lo != null && num < range.lo) return 'below';
  if (range.hi != null && num > range.hi) return 'above';
  return 'within';
}

/** Sort blood-test entries oldest → newest by ISO date. */
export function sortChronological(entries) {
  return [...entries].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

/** All entries for one analyte name, chronological. */
export function seriesFor(bloodTests, name) {
  return sortChronological(bloodTests.filter((b) => b.name === name));
}

/** Distinct analyte names present in the blood-test collection. */
export function distinctAnalytes(bloodTests) {
  const seen = [];
  for (const b of bloodTests) {
    if (!seen.includes(b.name)) seen.push(b.name);
  }
  return seen;
}

/**
 * Neutral trend summary for a chronological numeric series.
 * direction is one of: 'increasing' | 'decreasing' | 'stable' | 'insufficient'.
 * A change smaller than 1% of the current value counts as "stable".
 */
export function trendSummary(series) {
  const usable = series.filter(
    (p) => p && Number.isFinite(typeof p.value === 'number' ? p.value : parseFloat(p.value)),
  );
  const count = usable.length;
  if (count === 0) {
    return { count: 0, current: null, previous: null, change: null, direction: 'insufficient', completeness: 0 };
  }
  const current = usable[count - 1];
  const previous = count > 1 ? usable[count - 2] : null;
  if (!previous) {
    return { count, current, previous: null, change: null, direction: 'insufficient', completeness: completenessOf(usable) };
  }
  const cv = num(current.value);
  const pv = num(previous.value);
  const change = round2(cv - pv);
  const threshold = Math.abs(cv) * 0.01;
  let direction = 'stable';
  if (change > threshold) direction = 'increasing';
  else if (change < -threshold) direction = 'decreasing';
  return { count, current, previous, change, direction, completeness: completenessOf(usable) };
}

function num(v) {
  return typeof v === 'number' ? v : parseFloat(v);
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

/** Fraction (0..1) of entries that carry value + unit + date. */
export function completenessOf(entries) {
  if (!entries.length) return 0;
  const ok = entries.filter(
    (e) => e && e.value != null && e.value !== '' && e.unit && e.date,
  ).length;
  return ok / entries.length;
}

/** Blood-test entries that fall outside a laboratory-supplied range. */
export function outOfRangeEntries(bloodTests) {
  const out = [];
  for (const b of bloodTests) {
    const verdict = evaluateAgainstRange(b.value, b.referenceRange);
    if (verdict === 'below' || verdict === 'above') out.push({ ...b, verdict });
  }
  return sortChronological(out);
}

/** The most recent entry per analyte name. */
export function latestPerAnalyte(bloodTests) {
  const map = new Map();
  for (const b of sortChronological(bloodTests)) map.set(b.name, b);
  return [...map.values()];
}

/** Group blood tests by panel label (CBC / Metabolic / Lipids / Custom). */
export function groupByPanel(bloodTests) {
  const groups = new Map();
  for (const b of bloodTests) {
    const key = b.panel || 'Custom';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(b);
  }
  return [...groups.entries()].map(([panel, entries]) => ({
    panel,
    entries: sortChronological(entries).reverse(),
  }));
}

/**
 * Structured values available to the AI assistant from uploaded records.
 * Only values that were actually extracted by the pipeline are included.
 */
export function extractedFromRecords(medicalRecords) {
  const out = [];
  for (const r of medicalRecords) {
    if (!r.extracted || !r.extracted.length) continue;
    for (const e of r.extracted) {
      out.push({ ...e, fromRecord: r.displayName || r.originalName, recordId: r.id });
    }
  }
  return out;
}

/**
 * Field-level completeness per data domain (PART 31).
 *
 * Each domain declares the fields a record must carry to be analysable. A
 * record contributes `present / required` to its domain, and domains are
 * weighted by record count in the overall figure. A domain with no records is
 * reported as `null` and excluded from the overall — an absent domain is not
 * the same thing as a domain that is 0 % complete, and pretending otherwise
 * would let an empty upload folder drag the score down.
 */
const COMPLETENESS_FIELDS = [
  {
    key: 'medicalRecords',
    label: 'Medical records',
    requirement: 'processed status, declared category and source, and a recorded extraction outcome',
    fields: [
      { name: 'processed', test: (r) => r.status === 'processed' },
      { name: 'category', test: (r) => Boolean(r.category) },
      { name: 'source', test: (r) => Boolean(r.source) },
      // A clean parse that found no structured values is a real outcome and
      // counts as complete, provided it was written down.
      {
        name: 'extraction outcome',
        test: (r) => (r.extracted?.length ?? 0) > 0 || Boolean(r.extractionNote),
      },
    ],
  },
  {
    key: 'bloodTests',
    label: 'Laboratory entries',
    requirement: 'value, unit, collection date and analyte name',
    fields: [
      { name: 'analyte', test: (b) => Boolean(b.name) },
      { name: 'value', test: (b) => b.value !== null && b.value !== undefined && b.value !== '' },
      { name: 'unit', test: (b) => Boolean(b.unit) },
      { name: 'date', test: (b) => Boolean(b.date) },
    ],
  },
  {
    key: 'geneticRecords',
    label: 'Genetic variants',
    requirement: 'gene, variant identifier and zygosity',
    fields: [
      { name: 'gene', test: (g) => Boolean(g.gene) },
      { name: 'variant', test: (g) => Boolean(g.variant) },
      { name: 'zygosity', test: (g) => Boolean(g.zygosity) },
    ],
  },
  {
    key: 'bioSignals',
    label: 'Bio-signal recordings',
    requirement: 'known signal type, subject, time base, declared unit and stated source',
    fields: [
      { name: 'known type', test: (s) => s.typeKnown !== false && Boolean(s.profile) },
      { name: 'subject', test: (s) => Boolean(s.subjectId) },
      // Discrete spot measurements legitimately have no sampling rate; they
      // must instead declare how many readings they hold.
      {
        name: 'time base',
        test: (s) => Number.isFinite(s.samplingRate) || Number.isFinite(s.durationSec) || Number.isFinite(s.discreteCount),
      },
      { name: 'unit', test: (s) => Boolean(s.unit) },
      { name: 'source', test: (s) => Boolean(s.source) && s.source !== 'Source not stated' },
    ],
  },
  {
    key: 'hubItems',
    label: 'Research hub items',
    requirement: 'processed status, data class, provenance and at least one linked record',
    fields: [
      { name: 'processed', test: (h) => h.status === 'Processed' },
      { name: 'data class', test: (h) => Boolean(h.dataClass) },
      { name: 'provenance', test: (h) => Boolean(h.provenance) },
      {
        name: 'linked records',
        test: (h) =>
          Object.values(h.linked ?? {}).some((ids) => Array.isArray(ids) && ids.length > 0),
      },
    ],
  },
];

/** Compute completeness for one declared domain. */
function domainCompleteness(records, spec) {
  if (!records.length) {
    return {
      key: spec.key,
      label: spec.label,
      requirement: spec.requirement,
      records: 0,
      present: 0,
      required: 0,
      fraction: null,
      pct: null,
      gaps: [],
      note: 'No records in this domain — excluded from the overall score rather than counted as 0 %.',
    };
  }
  let present = 0;
  const missingByName = new Map();
  for (const r of records) {
    for (const f of spec.fields) {
      let ok = false;
      try {
        ok = Boolean(f.test(r));
      } catch {
        ok = false;
      }
      if (ok) present += 1;
      else missingByName.set(f.name, (missingByName.get(f.name) ?? 0) + 1);
    }
  }
  const required = records.length * spec.fields.length;
  return {
    key: spec.key,
    label: spec.label,
    requirement: spec.requirement,
    records: records.length,
    present,
    required,
    fraction: required ? present / required : null,
    pct: required ? Math.round((present / required) * 1000) / 10 : null,
    gaps: [...missingByName.entries()]
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count),
    note: null,
  };
}

/** Completeness across every domain that holds records. */
export function completenessReport({
  medicalRecords = [],
  bloodTests = [],
  geneticRecords = [],
  bioSignals = [],
  hubItems = [],
} = {}) {
  const byKey = { medicalRecords, bloodTests, geneticRecords, bioSignals, hubItems };
  const domains = COMPLETENESS_FIELDS.map((spec) => domainCompleteness(byKey[spec.key] ?? [], spec));
  const scored = domains.filter((d) => d.required > 0);
  const present = scored.reduce((a, d) => a + d.present, 0);
  const required = scored.reduce((a, d) => a + d.required, 0);
  return {
    domains,
    scoredDomains: scored.length,
    emptyDomains: domains.length - scored.length,
    overall: {
      present,
      required,
      fraction: required ? present / required : null,
      pct: required ? Math.round((present / required) * 1000) / 10 : null,
    },
    method:
      'Field-level completeness: required metadata fields present ÷ required fields, weighted by record count. No values are imputed to raise the score.',
  };
}

/** Distinct subject identifiers across the domains that declare one. */
export function distinctSubjects({ bioSignals = [], hubItems = [], geneticRecords = [] } = {}) {
  const seen = new Set();
  for (const s of bioSignals) if (s.subjectId) seen.add(s.subjectId);
  for (const g of geneticRecords) if (g.subjectId) seen.add(g.subjectId);
  for (const h of hubItems) if (h.subjectId) seen.add(h.subjectId);
  return [...seen];
}

/** Runs newest-first by recorded creation time (stable for equal timestamps). */
export function sortRunsNewestFirst(runs = []) {
  return [...runs].sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
}

/** The most recently recorded research run, or null when none exist. */
export function latestResearchRun(runs = []) {
  const sorted = sortRunsNewestFirst(runs);
  const r = sorted[0];
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    algorithm: r.algorithm,
    createdAt: r.createdAt ?? null,
    inputs: (r.inputIds ?? []).length,
    outputs: (r.outputs ?? []).length,
    limitations: (r.limitations ?? []).length,
  };
}

/**
 * The newest finding that was actually written down by an analysis run.
 * A run whose outputs carry no label has nothing to report, so it is skipped
 * rather than being described as a pattern.
 */
export function latestRecordedFinding(runs = []) {
  for (const r of sortRunsNewestFirst(runs)) {
    const out = (r.outputs ?? []).find((o) => o && (o.label || o.summary));
    if (out) {
      return {
        runId: r.id,
        runTitle: r.title,
        createdAt: r.createdAt ?? null,
        kind: out.kind ?? null,
        label: out.label ?? null,
        summary: out.summary ?? null,
      };
    }
  }
  return null;
}

/** Headline counts used by the dashboard cards. */
export function dataCounts({
  medicalRecords,
  bloodTests,
  geneticRecords,
  conversations,
  hubItems = [],
  bioSignals = [],
  researchRuns = [],
  datasetVersions = [],
  groundTruthLabels = [],
}) {
  const completeness = completenessReport({
    medicalRecords,
    bloodTests,
    geneticRecords,
    bioSignals,
    hubItems,
  });
  const subjects = distinctSubjects({ bioSignals, hubItems, geneticRecords });
  return {
    medicalRecords: medicalRecords.length,
    processedRecords: medicalRecords.filter((r) => r.status === 'processed').length,
    errorRecords: medicalRecords.filter((r) => r.status === 'error').length,
    bloodTests: bloodTests.length,
    analytes: distinctAnalytes(bloodTests).length,
    geneticRecords: geneticRecords.length,
    conversations: conversations.length,
    messages: conversations.reduce((n, c) => n + c.messages.length, 0),
    hubItems: hubItems.length,
    hubProcessed: hubItems.filter((h) => h.status === 'Processed').length,
    bioSignals: bioSignals.length,
    researchRuns: researchRuns.length,
    datasetVersions: datasetVersions.length,
    // PART 31 — derived dashboard state. Every value below is read from the
    // records above; nothing is defaulted to a plausible-looking number.
    subjects: subjects.length,
    subjectIds: subjects,
    referenceRanges: bloodTests.filter((b) => b.referenceRange).length,
    outOfRange: outOfRangeEntries(bloodTests).length,
    groundTruthLabels: groundTruthLabels.length,
    completeness,
    latestRun: latestResearchRun(researchRuns),
    latestFinding: latestRecordedFinding(researchRuns),
  };
}

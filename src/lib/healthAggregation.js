/**
 * Aggregation layer for the Unified Patient Health & Risk Dashboard.
 *
 * This module answers one question: "what health data does this profile
 * actually have?" It merges the two honest data sources available in the
 * prototype —
 *
 *   1. the application-wide record stores (Blood & Laboratory, Genetics, AI
 *      Assistant conversations, bio-signal recordings) — these belong to the
 *      PRIMARY profile only, because that is the person they were entered for;
 *   2. the per-profile records entered on the dashboard itself.
 *
 * It then derives the features the risk engine consumes. Design rules:
 *
 *   - Nothing is imputed. A value that was never recorded stays `null` and is
 *     reported as a gap rather than replaced by a plausible number.
 *   - Nothing is transferred between profiles. A family member's dashboard is
 *     empty until something is entered for them.
 *   - Synthetic demo series (the longitudinal panel used elsewhere in the
 *     prototype) are only ever attached to the primary profile, and are
 *     labelled `synthetic-demo` wherever they are displayed.
 */

import {
  sortChronological,
  evaluateAgainstRange,
  trendSummary,
} from './appDataSelectors.js';
import { MONTHLY } from '../data/syntheticData.js';
import { PRIMARY_PROFILE_ID } from '../data/healthProfiles.js';

export const AGGREGATION_VERSION = '1.0.0';

/**
 * Semantic analyte map. Each key is what the risk engine asks for; the pattern
 * is matched case-insensitively against the analyte name in the lab record.
 * Keeping this explicit means a differently-worded lab panel still lands in the
 * right slot ("Glucose (fasting)", "Fasting Glucose", "glucose — fasting").
 */
export const ANALYTE_MATCHERS = [
  { key: 'glucose', label: 'Fasting glucose', unit: 'mg/dL', pattern: /glucose|fbg/i },
  { key: 'hba1c', label: 'HbA1c', unit: '%', pattern: /hba1c|a1c|glycated/i },
  { key: 'ldl', label: 'LDL cholesterol', unit: 'mg/dL', pattern: /ldl/i },
  { key: 'hdl', label: 'HDL cholesterol', unit: 'mg/dL', pattern: /hdl/i },
  { key: 'triglycerides', label: 'Triglycerides', unit: 'mg/dL', pattern: /triglycerid/i },
  { key: 'totalCholesterol', label: 'Total cholesterol', unit: 'mg/dL', pattern: /total\s*cholesterol|cholesterol\s*total/i },
  { key: 'alt', label: 'ALT', unit: 'U/L', pattern: /^alt\b|alanine/i },
  { key: 'ast', label: 'AST', unit: 'U/L', pattern: /^ast\b|aspartate/i },
  { key: 'creatinine', label: 'Creatinine', unit: 'mg/dL', pattern: /creatinine/i },
  { key: 'egfr', label: 'eGFR', unit: 'mL/min/1.73m²', pattern: /egfr|gfr/i },
  { key: 'bun', label: 'BUN / Urea', unit: 'mg/dL', pattern: /\bbun\b|urea/i },
  { key: 'sodium', label: 'Sodium', unit: 'mmol/L', pattern: /sodium/i },
];

export const ANALYTE_KEYS = ANALYTE_MATCHERS.map((m) => m.key);

function matcherFor(key) {
  return ANALYTE_MATCHERS.find((m) => m.key === key) ?? null;
}

function numeric(value) {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function round1(v) {
  return Math.round(v * 10) / 10;
}

/** Latest numeric entry for a semantic analyte key, with its range verdict. */
export function latestAnalyte(labs, key) {
  const matcher = matcherFor(key);
  if (!matcher) return null;
  const matching = sortChronological(
    labs.filter((l) => matcher.pattern.test(String(l.name ?? '')) && numeric(l.value) != null),
  );
  const entry = matching[matching.length - 1];
  if (!entry) return null;
  return {
    key,
    label: entry.name || matcher.label,
    value: numeric(entry.value),
    unit: entry.unit || matcher.unit,
    date: entry.date ?? null,
    referenceRange: entry.referenceRange ?? null,
    referenceSource: entry.referenceSource ?? null,
    verdict: evaluateAgainstRange(entry.value, entry.referenceRange),
    source: entry.source ?? 'Source not stated',
    entryId: entry.id,
  };
}

/** Chronological numeric series for a semantic analyte key. */
export function analyteSeries(labs, key) {
  const matcher = matcherFor(key);
  if (!matcher) return [];
  return sortChronological(
    labs.filter((l) => matcher.pattern.test(String(l.name ?? '')) && numeric(l.value) != null),
  ).map((l) => ({ date: l.date ?? null, value: numeric(l.value), unit: l.unit || matcher.unit }));
}

/** Every semantic analyte present at least once, with count + trend. */
export function analyteOverview(labs) {
  return ANALYTE_MATCHERS.map((m) => {
    const latest = latestAnalyte(labs, m.key);
    if (!latest) return null;
    const series = analyteSeries(labs, m.key);
    return {
      ...latest,
      count: series.length,
      trend: trendSummary(series.map((s) => ({ value: s.value, unit: s.unit, date: s.date }))),
    };
  }).filter(Boolean);
}

/** Analytes that appear in the record set but map to no semantic key. */
export function unmappedAnalytes(labs) {
  const seen = [];
  for (const l of labs) {
    const name = String(l.name ?? '');
    if (!name) continue;
    if (ANALYTE_MATCHERS.some((m) => m.pattern.test(name))) continue;
    if (!seen.includes(name)) seen.push(name);
  }
  return seen;
}

/* ------------------------------------------------------------------ */
/* Genetic variants                                                    */
/* ------------------------------------------------------------------ */

/**
 * A variant is only counted as carried when the record actually reports an
 * alternate allele. The prototype's seed data deliberately includes a
 * "Homozygous reference" row — that is a no-call for a risk variant and must
 * never raise anyone's estimate.
 */
const NON_CARRIER_ZYGOSITY = ['Homozygous reference', 'Reference'];

export function carriesVariant(variant) {
  // Idempotent: rows that have already been through variantOverview() keep
  // their verdict, so re-scoring a normalised snapshot never loses a variant.
  if (variant?.carried === true) return true;
  if (variant?.carried === false) return false;
  const zyg = String(variant?.zygosity ?? '').trim();
  if (NON_CARRIER_ZYGOSITY.includes(zyg)) return false;
  const alt = String(variant?.alternate ?? '').trim();
  if (!alt || alt === '—' || alt === '-') return false;
  const ref = String(variant?.reference ?? '').trim();
  if (ref && ref === alt) return false;
  return true;
}

/** Genetic rows in a display-ready shape, flagged carried / not carried. */
export function variantOverview(genes) {
  return genes.map((g) => ({
    id: g.id,
    gene: String(g.gene ?? 'Gene not stated').trim(),
    variant: String(g.variant ?? 'Variant identifier not stated').trim(),
    zygosity: g.zygosity ?? 'Unknown',
    reference: g.reference ?? '—',
    alternate: g.alternate ?? '—',
    classification: g.classification ?? 'Research-only variant',
    confidence: g.confidence ?? 'Not stated',
    source: g.source ?? 'Source not stated',
    carried: carriesVariant(g),
    chromosome: g.chromosome ?? '—',
    position: g.position ?? '—',
  }));
}

/** Distinct gene symbols that are actually carried by this profile. */
export function carriedGenes(genes) {
  const out = [];
  for (const g of variantOverview(genes)) {
    if (!g.carried) continue;
    if (!out.includes(g.gene)) out.push(g.gene);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Daily tracking (bio-signals & lifestyle)                            */
/* ------------------------------------------------------------------ */

export const VITAL_FIELDS = [
  { id: 'sleepHours', label: 'Sleep duration', unit: 'h', step: '0.1', hint: 'Hours slept last night' },
  { id: 'steps', label: 'Steps', unit: 'steps', step: '100', hint: 'Daily step count' },
  { id: 'activityMinutes', label: 'Activity', unit: 'min/wk', step: '5', hint: 'Moderate activity per week' },
  { id: 'systolic', label: 'Systolic BP', unit: 'mmHg', step: '1', hint: 'Upper blood-pressure number' },
  { id: 'diastolic', label: 'Diastolic BP', unit: 'mmHg', step: '1', hint: 'Lower blood-pressure number' },
  { id: 'restingHr', label: 'Resting heart rate', unit: 'bpm', step: '1', hint: 'Resting pulse' },
  { id: 'weightKg', label: 'Weight', unit: 'kg', step: '0.1', hint: 'Body weight' },
];

export function vitalField(id) {
  return VITAL_FIELDS.find((f) => f.id === id) ?? null;
}

/** Latest value of one vital field from the profile's own daily entries. */
export function latestVital(vitals, id) {
  const usable = sortChronological(
    vitals.filter((v) => v.field === id && numeric(v.value) != null),
  );
  const entry = usable[usable.length - 1];
  if (!entry) return null;
  return {
    id,
    label: vitalField(id)?.label ?? id,
    value: numeric(entry.value),
    unit: entry.unit || vitalField(id)?.unit || '',
    date: entry.date ?? null,
    source: entry.source ?? 'Entered on dashboard',
  };
}

/** Average of the last `n` daily entries for one field (null when none). */
export function averageVital(vitals, id, n = 14) {
  const usable = sortChronological(vitals.filter((v) => v.field === id && numeric(v.value) != null));
  if (!usable.length) return null;
  const slice = usable.slice(-n);
  const mean = slice.reduce((a, v) => a + numeric(v.value), 0) / slice.length;
  return { value: round1(mean), days: slice.length, latest: numeric(slice[slice.length - 1].value) };
}

/**
 * The primary profile's daily-tracking series comes from the synthetic
 * longitudinal panel used elsewhere in the prototype. It is clearly labelled as
 * synthetic and is NEVER used for another profile.
 */
export function syntheticDailyPanel() {
  const last = MONTHLY[MONTHLY.length - 1];
  return {
    dataClass: 'synthetic-demo',
    label: 'Synthetic longitudinal panel (18 monthly points)',
    points: MONTHLY.length,
    sleep: last.sleep,
    activity: last.activity,
    systolic: last.systolic,
    glucose: last.glucose,
    hba1c: last.hba1c,
    bmi: last.bmi,
    triglycerides: last.triglycerides,
    ldl: last.ldl,
    date: last.date,
    series: MONTHLY.map((m) => ({
      date: m.date,
      label: m.label,
      sleep: m.sleep,
      activity: m.missingActivity ? null : m.activity,
      systolic: m.systolic,
      glucose: m.glucose,
      hba1c: m.hba1c,
      bmi: m.bmi,
      ldl: m.ldl,
    })),
    note: 'Generated by this prototype from a seeded PRNG. Not a real measurement.',
  };
}

export function bmiFrom(heightCm, weightKg) {
  const h = numeric(heightCm);
  const w = numeric(weightKg);
  if (!h || !w) return null;
  return round1(w / Math.pow(h / 100, 2));
}

export function bmiCategory(bmi) {
  if (bmi == null) return null;
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Healthy range';
  if (bmi < 30) return 'Overweight';
  return 'Obesity range';
}

/* ------------------------------------------------------------------ */
/* AI chat insights                                                    */
/* ------------------------------------------------------------------ */

/**
 * Lexicon scanned against the user's own messages. Everything matched is
 * reported as a SELF-REPORTED statement with the excerpt it came from — never
 * as a finding.
 */
export const SYMPTOM_LEXICON = [
  { id: 'thirst', label: 'Excessive thirst', category: 'Metabolic', terms: ['thirst', 'thirsty', 'very dry mouth'] },
  { id: 'urination', label: 'Frequent urination', category: 'Metabolic', terms: ['urinating', 'urination', 'pee a lot', 'frequent bathroom'] },
  { id: 'fatigue', label: 'Fatigue / low energy', category: 'General', terms: ['tired', 'fatigue', 'exhausted', 'no energy', 'low energy'] },
  { id: 'blurredVision', label: 'Blurred vision', category: 'Metabolic', terms: ['blurred vision', 'blurry vision'] },
  { id: 'weightLoss', label: 'Unintended weight loss', category: 'Metabolic', terms: ['losing weight', 'weight loss', 'lost weight'] },
  { id: 'chestPain', label: 'Chest pain / pressure', category: 'Cardiac', terms: ['chest pain', 'chest pressure', 'chest tightness'] },
  { id: 'breathlessness', label: 'Shortness of breath', category: 'Cardiac', terms: ['short of breath', 'breathless', 'shortness of breath'] },
  { id: 'palpitations', label: 'Palpitations', category: 'Cardiac', terms: ['palpitation', 'heart racing', 'racing heart'] },
  { id: 'headache', label: 'Headaches', category: 'Vascular', terms: ['headache', 'head aches', 'head pain'] },
  { id: 'dizziness', label: 'Dizziness', category: 'Vascular', terms: ['dizzy', 'dizziness', 'lightheaded'] },
  { id: 'swelling', label: 'Swelling (legs / ankles / face)', category: 'Renal', terms: ['swollen', 'swelling', 'puffy ankles', 'edema'] },
  { id: 'urineChange', label: 'Change in urine (foamy / dark / reduced)', category: 'Renal', terms: ['foamy urine', 'dark urine', 'less urine'] },
  { id: 'abdominalPain', label: 'Abdominal discomfort', category: 'Hepatic', terms: ['abdominal pain', 'stomach pain', 'belly pain'] },
  { id: 'bowelChange', label: 'Change in bowel habit', category: 'Colorectal', terms: ['constipation', 'diarrhea', 'bowel change', 'blood in stool', 'rectal bleeding'] },
  { id: 'breastLump', label: 'Breast lump / nipple change', category: 'Breast', terms: ['breast lump', 'lump in my breast', 'nipple discharge'] },
  { id: 'pelvicBloating', label: 'Pelvic bloating / pressure', category: 'Ovarian', terms: ['pelvic', 'bloating'] },
  { id: 'memory', label: 'Memory / word-finding difficulty', category: 'Cognitive', terms: ['forgetful', 'memory', 'forgetting words', 'misplacing things'] },
  { id: 'sleepTrouble', label: 'Poor sleep', category: 'Sleep', terms: ['insomnia', "can't sleep", 'trouble sleeping', 'waking up at night'] },
];

export const TOPIC_LEXICON = [
  { id: 'diet', label: 'Diet & nutrition', terms: ['diet', 'sugar', 'carb', 'meal', 'nutrition'] },
  { id: 'activity', label: 'Exercise & activity', terms: ['exercise', 'walk', 'gym', 'workout', 'steps'] },
  { id: 'medication', label: 'Medication', terms: ['medication', 'medicine', 'tablet', 'dose', 'statin', 'metformin'] },
  { id: 'sleep', label: 'Sleep', terms: ['sleep', 'nap', 'bedtime'] },
  { id: 'stress', label: 'Stress & mood', terms: ['stress', 'anxious', 'anxiety', 'worried', 'depressed'] },
  { id: 'alcohol', label: 'Alcohol', terms: ['alcohol', 'wine', 'beer', 'drinking'] },
  { id: 'salt', label: 'Salt intake', terms: ['salt', 'sodium', 'salty'] },
  { id: 'family', label: 'Family history', terms: ['my father', 'my mother', 'family history', 'runs in the family'] },
];

function excerptAround(text, term, span = 70) {
  const idx = text.toLowerCase().indexOf(String(term).toLowerCase());
  if (idx < 0) return text.slice(0, span * 2).trim();
  const start = Math.max(0, idx - span);
  const end = Math.min(text.length, idx + String(term).length + span);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

function scanText(text, lexicon, limit = 6) {
  const lower = String(text ?? '').toLowerCase();
  const hits = [];
  for (const entry of lexicon) {
    const term = entry.terms.find((t) => lower.includes(t.toLowerCase()));
    if (term) hits.push({ entry, term });
    if (hits.length >= limit) break;
  }
  return hits;
}

/**
 * Insight layer over the AI Assistant. Only the USER's own messages are read
 * (assistant replies are model output, not patient statements), plus notes the
 * user typed on the dashboard for this profile.
 */
export function extractChatInsights({ conversations = [], notes = [] } = {}) {
  const patientStatements = [];
  for (const conv of conversations) {
    for (const msg of conv.messages ?? []) {
      if (msg.role !== 'user') continue;
      const text = String(msg.text ?? '').trim();
      if (!text || text.startsWith('(image attached')) continue;
      patientStatements.push({
        id: `${conv.id}:${msg.id}`,
        conversationId: conv.id,
        conversationTitle: conv.title ?? 'Conversation',
        at: msg.at ?? null,
        text,
      });
    }
  }

  const observations = [];
  for (const stmt of patientStatements) {
    for (const hit of scanText(stmt.text, SYMPTOM_LEXICON)) {
      observations.push({
        id: `${stmt.id}:${hit.entry.id}`,
        symptomId: hit.entry.id,
        label: hit.entry.label,
        category: hit.entry.category,
        term: hit.term,
        excerpt: excerptAround(stmt.text, hit.term),
        conversationTitle: stmt.conversationTitle,
        at: stmt.at,
        origin: 'ai-chat',
      });
    }
  }

  for (const note of notes) {
    const text = String(note.text ?? note.title ?? '').trim();
    if (!text) continue;
    for (const hit of scanText(text, SYMPTOM_LEXICON)) {
      observations.push({
        id: `${note.id}:${hit.entry.id}`,
        symptomId: hit.entry.id,
        label: hit.entry.label,
        category: hit.entry.category,
        term: hit.term,
        excerpt: excerptAround(text, hit.term),
        conversationTitle: note.title ?? 'Dashboard note',
        at: note.date ?? note.createdAt ?? null,
        origin: 'dashboard-note',
      });
    }
  }

  const allText = [
    ...patientStatements.map((s) => s.text),
    ...notes.map((n) => String(n.text ?? '')),
  ].join(' \n ').toLowerCase();

  const topics = [];
  for (const topic of TOPIC_LEXICON) {
    const term = topic.terms.find((t) => allText.includes(t.toLowerCase()));
    if (!term) continue;
    topics.push({
      id: topic.id,
      label: topic.label,
      term,
      statements: patientStatements.filter((s) => s.text.toLowerCase().includes(term.toLowerCase())).length,
    });
  }

  return {
    statementsScanned: patientStatements.length,
    conversationsScanned: conversations.filter((c) => (c.messages ?? []).some((m) => m.role === 'user')).length,
    notesScanned: notes.length,
    observations,
    distinctSymptoms: [...new Set(observations.map((o) => o.symptomId))],
    topics,
    method:
      "Keyword scan over the user's own AI-chat messages and dashboard notes. Every match is a self-reported statement — not a verified finding and not a diagnosis.",
  };
}

/* ------------------------------------------------------------------ */
/* Unified profile snapshot                                            */
/* ------------------------------------------------------------------ */

/**
 * Build the unified data picture for one profile.
 *
 * @param {object} args
 * @param {object} args.profile   the active profile
 * @param {object} args.records   per-profile records (labs/vitals/genes/notes)
 * @param {object} args.appStore  app-wide stores (bloodTests/geneticRecords/conversations/bioSignals)
 */
export function buildProfileHealthSnapshot({ profile, records, appStore } = {}) {
  const isPrimary = Boolean(profile?.isPrimary) || profile?.id === PRIMARY_PROFILE_ID;
  const empty = { labs: [], vitals: [], genes: [], notes: [] };
  const own = { ...empty, ...(records ?? {}) };
  // Every store is spread into an array below, so a store that has not finished
  // hydrating (or a caller that omitted it) must still yield an array — never
  // undefined, which would throw and blank the dashboard.
  const store = {
    bloodTests: [],
    geneticRecords: [],
    conversations: [],
    bioSignals: [],
    ...(appStore ?? {}),
  };
  const asArray = (v) => (Array.isArray(v) ? v : []);
  const ownLabs = asArray(own.labs);
  const ownGenes = asArray(own.genes);
  const ownVitals = asArray(own.vitals);
  const ownNotes = asArray(own.notes);

  const labs = isPrimary ? [...asArray(store.bloodTests), ...ownLabs] : [...ownLabs];
  const genes = isPrimary ? [...asArray(store.geneticRecords), ...ownGenes] : [...ownGenes];
  const vitals = [...ownVitals];
  const notes = [...ownNotes];
  const conversations = isPrimary ? asArray(store.conversations) : [];
  const signals = isPrimary ? asArray(store.bioSignals) : [];
  const dailyPanel = isPrimary ? syntheticDailyPanel() : null;

  const insights = extractChatInsights({ conversations, notes });
  const heightCm = numeric(profile?.heightCm);
  const latestWeight = latestVital(vitals, 'weightKg');
  const weightKg = latestWeight?.value ?? numeric(profile?.weightKg);
  const bmi = bmiFrom(heightCm, weightKg);

  const labFeatures = {};
  for (const m of ANALYTE_MATCHERS) labFeatures[m.key] = latestAnalyte(labs, m.key);

  const vitalFeatures = {
    sleepHours: averageVital(vitals, 'sleepHours'),
    steps: averageVital(vitals, 'steps'),
    activityMinutes: averageVital(vitals, 'activityMinutes'),
    systolic: averageVital(vitals, 'systolic'),
    diastolic: averageVital(vitals, 'diastolic'),
    restingHr: averageVital(vitals, 'restingHr'),
    weightKg: latestWeight,
    bmi,
  };

  // Daily tracking falls back to the synthetic panel ONLY for the primary
  // profile, and only for the fields the user has not recorded themselves.
  if (dailyPanel) {
    if (!vitalFeatures.sleepHours && Number.isFinite(dailyPanel.sleep)) {
      vitalFeatures.sleepHours = { value: dailyPanel.sleep, days: 1, latest: dailyPanel.sleep, synthetic: true };
    }
    if (!vitalFeatures.activityMinutes && Number.isFinite(dailyPanel.activity)) {
      vitalFeatures.activityMinutes = { value: dailyPanel.activity, days: 1, latest: dailyPanel.activity, synthetic: true };
    }
    if (!vitalFeatures.systolic && Number.isFinite(dailyPanel.systolic)) {
      vitalFeatures.systolic = { value: dailyPanel.systolic, days: 1, latest: dailyPanel.systolic, synthetic: true };
    }
    if (!vitalFeatures.bmi && Number.isFinite(dailyPanel.bmi)) {
      vitalFeatures.bmi = dailyPanel.bmi;
    }
  }

  const variants = variantOverview(genes);
  const carried = variants.filter((v) => v.carried);

  const sources = [
    {
      id: 'app-records',
      label: 'Application record stores',
      applies: isPrimary,
      detail: isPrimary
        ? `${asArray(store.bloodTests).length} lab entries · ${asArray(store.geneticRecords).length} variants · ${conversations.length} AI conversations · ${signals.length} signal recordings`
        : 'Not attributed to this profile — these records belong to the primary profile.',
    },
    {
      id: 'profile-records',
      label: 'Records entered for this profile',
      applies: true,
      detail: `${ownLabs.length} labs · ${ownVitals.length} daily entries · ${ownGenes.length} variants · ${ownNotes.length} notes`,
    },
    {
      id: 'synthetic-panel',
      label: 'Synthetic longitudinal panel',
      applies: Boolean(dailyPanel),
      detail: dailyPanel
        ? 'Used for daily-tracking fields this profile has not recorded (clearly labelled synthetic).'
        : 'Not used for this profile.',
    },
  ];

  return {
    aggregationVersion: AGGREGATION_VERSION,
    profileId: profile?.id ?? null,
    profileName: profile?.name ?? 'Unnamed profile',
    isPrimary,
    demographics: {
      age: Number.isFinite(profile?.age) ? profile.age : null,
      sex: profile?.sex ?? 'Other / not stated',
      relation: profile?.relation ?? 'Self',
      heightCm,
      weightKg,
      bmi,
      bmiCategory: bmiCategory(bmi),
    },
    flags: profile?.flags ?? [],
    labs,
    labFeatures,
    labOverview: analyteOverview(labs),
    unmappedAnalytes: unmappedAnalytes(labs),
    vitals,
    vitalFeatures,
    dailyPanel,
    signals: signals.map((s) => ({
      id: s.id,
      type: s.type,
      typeLabel: s.typeLabel ?? s.type,
      category: s.category,
      kind: s.kind,
      dataClass: s.dataClass,
      unit: s.unit,
      durationSec: s.durationSec ?? null,
      source: s.source,
    })),
    genes: variants,
    carriedGenes: carried.map((v) => v.gene),
    insights,
    sources,
    counts: {
      labs: labs.length,
      ownLabs: ownLabs.length,
      vitals: ownVitals.length,
      genes: genes.length,
      ownGenes: ownGenes.length,
      notes: ownNotes.length,
      conversations: conversations.length,
      statements: insights?.statementsScanned ?? 0,
      observations: asArray(insights?.observations).length,
      signals: signals.length,
    },
  };
}

/**
 * Stable fingerprint of the inputs behind an analysis run. Used by the
 * "re-run" button to state honestly whether anything actually changed.
 */
export function snapshotFingerprint(snapshot) {
  // Tolerates a partial snapshot: a missing block contributes an empty bit
  // rather than throwing, so the "did anything change?" check can still run.
  const labBit = Object.entries(snapshot?.labFeatures ?? {})
    .map(([k, v]) => (v ? `${k}:${v.value}@${v.date ?? 'nd'}` : ''))
    .join('|');
  const vitalBit = Object.entries(snapshot?.vitalFeatures ?? {})
    .map(([k, v]) => {
      const val = typeof v === 'object' && v ? v.value : v;
      return val == null ? '' : `${k}:${val}`;
    })
    .join('|');
  const geneBit = (snapshot?.genes ?? [])
    .map((g) => `${g?.gene}/${g?.variant}/${g?.zygosity}`)
    .sort()
    .join('|');
  const insightBit = [...(snapshot?.insights?.distinctSymptoms ?? [])].sort().join('|');
  return [
    snapshot?.profileId ?? 'no-profile',
    snapshot?.counts?.labs ?? 0,
    snapshot?.counts?.vitals ?? 0,
    snapshot?.counts?.genes ?? 0,
    labBit,
    vitalBit,
    geneBit,
    insightBit,
  ].join('::');
}


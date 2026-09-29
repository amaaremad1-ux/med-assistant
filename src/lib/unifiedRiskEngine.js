/**
 * Unified AI Risk & Timeline Assessment engine (demo).
 *
 * WHAT THIS IS
 *   A transparent, additive, rule-based estimator that turns the aggregated
 *   data of ONE profile (laboratory results + daily tracking + genetic
 *   variants + AI-chat statements + self-declared flags) into, per disease:
 *
 *     - a risk percentage on a fixed horizon assumption,
 *     - an expected time horizon band,
 *     - the exact inputs that moved the estimate (with their source),
 *     - the inputs that are MISSING (reported as gaps, never imputed),
 *     - a personalized prevention plan whose items name the input that
 *       triggered them.
 *
 * WHAT THIS IS NOT
 *   Not a validated clinical model, not a diagnosis, and not a medical device.
 *   The base rates and the per-factor point values below are illustrative
 *   demo constants chosen to be directionally sensible; they are NOT
 *   calibrated to any cohort and must not be used for any clinical decision.
 *   Genetic entries are treated as RESEARCH-ONLY associations and are always
 *   reported with a genetics-counselling caveat.
 *
 * HOW IT WORKS (so anyone can audit it)
 *   1. Every profile starts from an age/sex base rate for the disease.
 *   2. Each factor that has data contributes a bounded number of percentage
 *      points, upward (risk) or downward (protective).
 *   3. The total is clamped to [1, 95] — the model never claims certainty.
 *   4. Coverage = factors with data ÷ factors in the model. Low coverage is
 *      surfaced on the card, in the horizon note and in the detail view.
 */

import { carriedGenes } from './healthAggregation.js';
import { riskFlagLabel } from '../data/healthProfiles.js';

export const RISK_MODEL_VERSION = 'unified-risk-demo-v0.1';
export const RISK_HORIZON_BASIS = '10-year horizon assumption';

/** Maximum points any single disease may take from genetics. */
export const GENE_POINT_CAP = 32;

export function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

export function roundPct(v) {
  return Math.round(v * 10) / 10;
}

/** Numeric value of a feature that may be a number or a { value } object. */
export function num(x) {
  if (x == null) return null;
  if (typeof x === 'number') return Number.isFinite(x) ? x : null;
  if (typeof x === 'object') return Number.isFinite(x.value) ? x.value : null;
  return null;
}

/** Unit carried by a feature that may be a number or a { value, unit } object. */
function unitOf(x, fallback = '') {
  if (x && typeof x === 'object' && x.unit) return x.unit;
  return fallback;
}

function dateOf(x) {
  return x && typeof x === 'object' ? (x.date ?? null) : null;
}

/**
 * Gene → disease associations. Research-only: these are repeatedly-reported
 * associations, not clinical risk scores, and several of these genes require
 * confirmatory clinical testing (e.g. BRCA1/2, LDLR, MLH1/MSH2). Points are
 * capped per disease by GENE_POINT_CAP.
 */
export const GENE_ASSOCIATIONS = [
  { gene: 'TCF7L2', diseases: ['t2d'], points: 9, note: 'Common variant repeatedly associated with type 2 diabetes in research cohorts.' },
  { gene: 'KCNQ1', diseases: ['t2d'], points: 5, note: 'Association with type 2 diabetes reported in research cohorts.' },
  { gene: 'PPARG', diseases: ['t2d'], points: 4, note: 'Association with insulin sensitivity reported in research.' },
  { gene: 'SLC30A8', diseases: ['t2d'], points: 4, note: 'Association with beta-cell zinc transport reported in research.' },
  { gene: 'GCK', diseases: ['t2d'], points: 6, note: 'Glucokinase variants can alter fasting glucose; specialist interpretation required.' },
  { gene: 'HNF1A', diseases: ['t2d'], points: 7, note: 'Monogenic-diabetes gene — interpretation requires a clinical genetics service.' },
  { gene: 'APOE', diseases: ['alzheimer', 'cvd'], points: 12, cvdPoints: 5, note: 'The most consistently reported late-onset Alzheimer association; APOE genotype requires specialist interpretation.' },
  { gene: 'TREM2', diseases: ['alzheimer'], points: 6, note: 'Rare-variant association with Alzheimer risk reported in research.' },
  { gene: 'LDLR', diseases: ['cvd'], points: 12, note: 'Familial hypercholesterolaemia gene — requires clinical confirmation and management.' },
  { gene: 'APOB', diseases: ['cvd'], points: 10, note: 'Familial hypercholesterolaemia gene — requires clinical confirmation.' },
  { gene: 'PCSK9', diseases: ['cvd'], points: 6, note: 'LDL-receptor pathway variant reported in lipid research.' },
  { gene: 'LPA', diseases: ['cvd'], points: 7, note: 'Lipoprotein(a) locus associated with cardiovascular risk in research.' },
  { gene: 'CDKN2B-AS1', diseases: ['cvd'], points: 4, note: 'Chromosome 9p21 locus associated with coronary disease in research.' },
  { gene: 'AGT', diseases: ['hypertension'], points: 4, note: 'Renin–angiotensin pathway variant reported in blood-pressure research.' },
  { gene: 'ADD1', diseases: ['hypertension'], points: 3, note: 'Association with salt sensitivity reported in research.' },
  { gene: 'ACE', diseases: ['hypertension', 'ckd'], points: 3, note: 'Renin–angiotensin pathway variant reported in research.' },
  { gene: 'APOL1', diseases: ['ckd'], points: 10, note: 'Associated with kidney disease in specific ancestries; requires specialist interpretation.' },
  { gene: 'UMOD', diseases: ['ckd'], points: 4, note: 'Association with kidney function reported in research.' },
  { gene: 'PNPLA3', diseases: ['masld'], points: 10, note: 'The most consistently reported gene for fatty liver disease.' },
  { gene: 'TM6SF2', diseases: ['masld'], points: 7, note: 'Association with liver fat content reported in research.' },
  { gene: 'BRCA1', diseases: ['breastOvarian'], points: 30, note: 'High-penetrance breast/ovarian cancer gene. Requires confirmatory clinical testing and genetic counselling — it is not a prediction.' },
  { gene: 'BRCA2', diseases: ['breastOvarian'], points: 24, note: 'High-penetrance breast/ovarian cancer gene. Requires confirmatory clinical testing and genetic counselling.' },
  { gene: 'PALB2', diseases: ['breastOvarian'], points: 10, note: 'Moderate-risk breast cancer gene reported in research.' },
  { gene: 'CHEK2', diseases: ['breastOvarian'], points: 7, note: 'Moderate-risk breast cancer gene reported in research.' },
  { gene: 'ATM', diseases: ['breastOvarian'], points: 6, note: 'Moderate-risk breast cancer gene reported in research.' },
  { gene: 'APC', diseases: ['colorectal'], points: 18, note: 'Hereditary colorectal cancer gene — requires specialist interpretation.' },
  { gene: 'MUTYH', diseases: ['colorectal'], points: 8, note: 'Colorectal cancer association reported in research.' },
  { gene: 'MLH1', diseases: ['colorectal'], points: 16, note: 'Lynch syndrome gene — requires clinical confirmation and a surveillance pathway.' },
  { gene: 'MSH2', diseases: ['colorectal'], points: 16, note: 'Lynch syndrome gene — requires clinical confirmation and a surveillance pathway.' },
  { gene: 'MSH6', diseases: ['colorectal'], points: 10, note: 'Lynch syndrome gene — requires clinical confirmation.' },
  { gene: 'PMS2', diseases: ['colorectal'], points: 8, note: 'Lynch syndrome gene — requires clinical confirmation.' },
];

const GENE_INDEX = new Map(
  GENE_ASSOCIATIONS.map((a) => [a.gene.toUpperCase(), a]),
);

/**
 * Points contributed by carried gene variants for one disease, with the
 * matching genes and their notes so the UI can name them.
 */
export function geneContribution(diseaseId, genes) {
  const carried = carriedGenes(genes ?? []);
  const matched = [];
  let points = 0;
  for (const gene of carried) {
    const assoc = GENE_INDEX.get(String(gene).toUpperCase());
    if (!assoc || !assoc.diseases.includes(diseaseId)) continue;
    const pts = diseaseId === 'cvd' && assoc.cvdPoints != null ? assoc.cvdPoints : assoc.points;
    points += pts;
    matched.push({ gene: assoc.gene, points: pts, note: assoc.note });
  }
  return { points: Math.min(points, GENE_POINT_CAP), raw: points, capped: points > GENE_POINT_CAP, matched };
}

/** Genes present in the profile that this engine does NOT model. */
export function unmodelledGenes(genes) {
  return carriedGenes(genes ?? []).filter((g) => !GENE_INDEX.has(String(g).toUpperCase()));
}

/* ------------------------------------------------------------------ */
/* Risk context                                                        */
/* ------------------------------------------------------------------ */

/**
 * Flatten a profile snapshot into the shape the factor rules read. Computed
 * once per snapshot so every disease model sees exactly the same inputs.
 */
export function buildRiskContext(snapshot) {
  const flags = new Set(snapshot?.flags ?? []);
  const labMeta = snapshot?.labFeatures ?? {};
  const lab = {};
  for (const key of Object.keys(labMeta)) lab[key] = num(labMeta[key]);

  const vit = snapshot?.vitalFeatures ?? {};
  const vital = {
    sleepHours: num(vit.sleepHours),
    steps: num(vit.steps),
    activityMinutes: num(vit.activityMinutes),
    systolic: num(vit.systolic),
    diastolic: num(vit.diastolic),
    restingHr: num(vit.restingHr),
    weightKg: num(vit.weightKg),
    bmi: num(vit.bmi),
  };
  const vitalSynthetic = {
    sleepHours: Boolean(vit.sleepHours?.synthetic),
    activityMinutes: Boolean(vit.activityMinutes?.synthetic),
    systolic: Boolean(vit.systolic?.synthetic),
  };

  const symptoms = new Set(snapshot?.insights?.distinctSymptoms ?? []);
  const symptomEvidence = new Map();
  for (const o of snapshot?.insights?.observations ?? []) {
    if (!symptomEvidence.has(o.symptomId)) symptomEvidence.set(o.symptomId, []);
    symptomEvidence.get(o.symptomId).push(o);
  }

  const geneCache = new Map();

  return {
    profileId: snapshot?.profileId ?? null,
    profileName: snapshot?.profileName ?? 'Unnamed profile',
    age: snapshot?.demographics?.age ?? null,
    sex: snapshot?.demographics?.sex ?? 'Other / not stated',
    isFemale: snapshot?.demographics?.sex === 'Female',
    bmi: vital.bmi,
    flags,
    hasFlag: (id) => flags.has(id),
    lab,
    labMeta,
    vital,
    vitalSynthetic,
    symptoms,
    symptomEvidence: (id) => symptomEvidence.get(id) ?? [],
    genePoints: (diseaseId) => {
      if (!geneCache.has(diseaseId)) {
        geneCache.set(diseaseId, geneContribution(diseaseId, snapshot?.genes ?? []));
      }
      return geneCache.get(diseaseId);
    },
    genes: snapshot?.genes ?? [],
    isPrimary: Boolean(snapshot?.isPrimary),
  };
}

/* ------------------------------------------------------------------ */
/* Factor factories                                                    */
/* ------------------------------------------------------------------ */

function normalize(result) {
  if (!result) return null;
  return {
    points: result.points ?? 0,
    valueText: result.valueText ?? null,
    why: result.why ?? '',
    evidence: result.evidence ?? null,
    date: result.date ?? null,
    redFlag: Boolean(result.redFlag),
    detail: result.detail ?? null,
  };
}

/** `rules` is an ordered list of { test, points, why } — first match wins. */
function firstMatch(rules, value) {
  return rules.find((r) => r.test(value)) ?? null;
}

export function labFactor(key, label, rules, opts = {}) {
  return {
    id: opts.id ?? `lab-${key}`,
    label,
    domain: 'Laboratory result',
    sourceLabel: opts.sourceLabel ?? 'Blood & Laboratory Data',
    evaluate: (ctx) => {
      const entry = ctx.labMeta[key];
      const value = ctx.lab[key];
      if (value == null) return null;
      const hit = firstMatch(rules, value);
      if (!hit) return null;
      return normalize({
        points: hit.points,
        valueText: `${value}${entry?.unit ? ` ${entry.unit}` : ''}`,
        why: hit.why,
        detail: entry?.verdict
          ? `Recorded value is ${entry.verdict} the laboratory range supplied with it.`
          : null,
        evidence: `${entry?.label ?? label} · ${entry?.date ?? 'date not stated'} · source: ${entry?.source ?? 'not stated'}`,
        date: entry?.date ?? null,
      });
    },
  };
}

export function vitalFactor(key, label, rules, opts = {}) {
  return {
    id: opts.id ?? `vital-${key}`,
    label,
    domain: opts.domain ?? 'Daily tracking',
    sourceLabel: opts.sourceLabel ?? 'Dashboard daily tracking',
    evaluate: (ctx) => {
      const raw = ctx.vital[key];
      const value = num(raw);
      if (value == null) return null;
      const hit = firstMatch(rules, value);
      if (!hit) return null;
      const unit = unitOf(raw, opts.unit ?? '');
      const synthetic = Boolean(ctx.vitalSynthetic[key]);
      return normalize({
        points: hit.points,
        valueText: `${value}${unit ? ` ${unit}` : ''}`,
        why: hit.why,
        detail: synthetic
          ? 'Value taken from the synthetic longitudinal demo panel (not a real measurement).'
          : null,
        evidence: synthetic
          ? 'Synthetic longitudinal panel (demo generator)'
          : `${raw?.date ? `Recorded ${raw.date}` : 'Recorded on dashboard'} · source: ${raw?.source ?? 'user entry'}`,
        date: dateOf(raw),
      });
    },
  };
}

export function flagFactor(flagId, points, why, opts = {}) {
  return {
    id: opts.id ?? `flag-${flagId}`,
    label: opts.label ?? riskFlagLabel(flagId),
    domain: 'Self-declared',
    sourceLabel: 'Profile risk flags',
    evaluate: (ctx) => {
      if (!ctx.hasFlag(flagId)) return null;
      return normalize({
        points,
        valueText: 'Declared',
        why,
        detail: 'Self-declared by the user on the profile — not a measured value.',
        evidence: 'Self-declared profile flag',
      });
    },
  };
}

export function symptomFactor(symptomIds, pointsEach, cap, why, opts = {}) {
  return {
    id: opts.id ?? `symptom-${symptomIds.join('-')}`,
    label: opts.label ?? 'Self-reported symptoms (AI chat / notes)',
    domain: 'AI chat insight',
    sourceLabel: 'AI Health Assistant & dashboard notes',
    evaluate: (ctx) => {
      const found = symptomIds.filter((id) => ctx.symptoms.has(id));
      if (!found.length) return null;
      const evidence = found
        .flatMap((id) => ctx.symptomEvidence(id))
        .slice(0, 3)
        .map((o) => `“${o.excerpt}” — ${o.conversationTitle}`)
        .join(' | ');
      return normalize({
        points: Math.min(pointsEach * found.length, cap),
        valueText: found.join(', '),
        why,
        detail: "Matched by a keyword scan of the user's own chat messages and notes. Self-reported and unverified.",
        evidence,
        redFlag: Boolean(opts.redFlag),
      });
    },
  };
}

export function geneFactor(diseaseId, opts = {}) {
  return {
    id: opts.id ?? `gene-${diseaseId}`,
    label: 'Carried genetic variants',
    domain: 'Genetic data',
    sourceLabel: 'Genetic & DNA Profile',
    evaluate: (ctx) => {
      const contrib = ctx.genePoints(diseaseId);
      if (!contrib.matched.length) return null;
      return normalize({
        points: contrib.points,
        valueText: contrib.matched.map((m) => `${m.gene} (+${m.points})`).join(', '),
        why: opts.why ?? 'A variant associated with this condition in research literature is recorded for this profile.',
        detail: `${contrib.matched.map((m) => `${m.gene}: ${m.note}`).join(' ')}${
          contrib.capped ? ` Genetic points for this condition are capped at ${GENE_POINT_CAP}.` : ''
        } Research-only association — requires clinical genetic confirmation and counselling; it is not a diagnosis.`,
        evidence: 'Genetic variant records (research-only classification)',
        redFlag: contrib.matched.some((m) => m.points >= 20),
      });
    },
  };
}

export function customFactor({ id, label, domain, sourceLabel, evaluate }) {
  return {
    id,
    label,
    domain,
    sourceLabel,
    evaluate: (ctx) => normalize(evaluate(ctx)),
  };
}

/* ------------------------------------------------------------------ */
/* Bands & horizon                                                     */
/* ------------------------------------------------------------------ */

export function riskBand(risk) {
  if (risk >= 60) return { id: 'high', label: 'High estimate', tone: 'bad' };
  if (risk >= 40) return { id: 'elevated', label: 'Elevated estimate', tone: 'warn' };
  if (risk >= 25) return { id: 'moderate', label: 'Moderate estimate', tone: 'warn' };
  if (risk >= 12) return { id: 'low-moderate', label: 'Low–moderate estimate', tone: 'info' };
  return { id: 'low', label: 'Low estimate', tone: 'good' };
}

const HORIZON_BANDS = [
  { min: 60, label: 'within 1–3 years', note: 'The inputs that drive this estimate are already in an adverse range.' },
  { min: 45, label: 'within 2–5 years', note: 'Several inputs are outside their usual range.' },
  { min: 30, label: 'within 5–8 years', note: 'The inputs point to a gradual accumulation of risk.' },
  { min: 18, label: 'within 8–12 years', note: 'The estimate is modest; the horizon is wide.' },
  { min: 0, label: '10+ years / not estimated', note: 'Few or no adverse inputs are present.' },
];

/**
 * Expected time-horizon band for a risk estimate. The band is a direct
 * function of the estimate, so it moves when the data moves — and it always
 * carries the coverage caveat so a data-poor profile can never look certain.
 */
export function horizonFor(risk, coveragePct) {
  const band = HORIZON_BANDS.find((b) => risk >= b.min) ?? HORIZON_BANDS[HORIZON_BANDS.length - 1];
  const caveat =
    coveragePct < 40
      ? ` Wide uncertainty: only ${Math.round(coveragePct)}% of this model's inputs are present.`
      : coveragePct < 70
        ? ` Partial inputs: ${Math.round(coveragePct)}% of this model's inputs are present.`
        : '';
  return {
    label: `Likely onset window: ${band.label}`,
    note: `${band.note}${caveat}`,
    basis: RISK_HORIZON_BASIS,
    coveragePct: Math.round(coveragePct),
  };
}

/* ------------------------------------------------------------------ */
/* Shared factor builders (each returns points scaled by `weight`)     */
/* ------------------------------------------------------------------ */

function scaled(points, weight) {
  const p = Math.round(points * weight);
  if (p === 0 && points !== 0) return points > 0 ? 1 : -1;
  return p;
}

export function activityFactor(weight = 1) {
  return vitalFactor(
    'activityMinutes',
    'Weekly moderate activity',
    [
      { test: (v) => v < 60, points: scaled(6, weight), why: 'Recorded activity is far below the 150 min/week level used by this demo model.' },
      { test: (v) => v < 150, points: scaled(2, weight), why: 'Recorded activity is below the 150 min/week level used by this demo model.' },
      { test: () => true, points: scaled(-3, weight), why: 'Activity meets the 150 min/week level used by this demo model, which is treated as protective.' },
    ],
    { unit: 'min/wk' },
  );
}

export function sleepFactor(weight = 1) {
  return vitalFactor(
    'sleepHours',
    'Sleep duration',
    [
      { test: (v) => v < 6, points: scaled(4, weight), why: 'Short sleep duration is a repeatedly-reported association with metabolic and cardiovascular risk.' },
      { test: (v) => v < 7, points: scaled(2, weight), why: 'Sleep is slightly below the 7–9 h range used by this demo model.' },
      { test: (v) => v <= 9, points: scaled(-1, weight), why: 'Sleep is inside the 7–9 h range used by this demo model.' },
      { test: () => true, points: scaled(1, weight), why: 'Long sleep can accompany other conditions; it is treated as a weak signal only.' },
    ],
    { unit: 'h' },
  );
}

export function bmiFactor(weight = 1) {
  return vitalFactor(
    'bmi',
    'Body mass index',
    [
      { test: (v) => v >= 30, points: scaled(9, weight), why: 'BMI is in the obesity range, one of the strongest inputs in this demo model.' },
      { test: (v) => v >= 25, points: scaled(5, weight), why: 'BMI is in the overweight range used by this demo model.' },
      { test: (v) => v >= 23, points: scaled(1, weight), why: 'BMI is just above the 23 kg/m² level used by this demo model.' },
      { test: () => true, points: scaled(-3, weight), why: 'BMI is inside the healthy range used by this demo model, treated as protective.' },
    ],
    { unit: 'kg/m²' },
  );
}

export function systolicFactor(weight = 1) {
  return vitalFactor(
    'systolic',
    'Systolic blood pressure',
    [
      { test: (v) => v >= 160, points: scaled(12, weight), why: 'Systolic pressure is in the range conventionally described as stage 2 hypertension; clinical confirmation is required.' },
      { test: (v) => v >= 140, points: scaled(8, weight), why: 'Systolic pressure is at or above the level conventionally described as hypertension.' },
      { test: (v) => v >= 130, points: scaled(4, weight), why: 'Systolic pressure is in the "elevated" band used by this demo model.' },
      { test: (v) => v >= 120, points: scaled(1, weight), why: 'Systolic pressure is slightly above the optimal level used by this demo model.' },
      { test: () => true, points: scaled(-2, weight), why: 'Systolic pressure is in the optimal range used by this demo model.' },
    ],
    { unit: 'mmHg' },
  );
}

export function diastolicFactor(weight = 1) {
  return vitalFactor(
    'diastolic',
    'Diastolic blood pressure',
    [
      { test: (v) => v >= 100, points: scaled(8, weight), why: 'Diastolic pressure is at or above the level conventionally described as hypertension.' },
      { test: (v) => v >= 90, points: scaled(5, weight), why: 'Diastolic pressure is at or above 90 mmHg.' },
      { test: (v) => v >= 85, points: scaled(2, weight), why: 'Diastolic pressure is in the elevated band used by this demo model.' },
      { test: () => true, points: scaled(-1, weight), why: 'Diastolic pressure is inside the usual range used by this demo model.' },
    ],
    { unit: 'mmHg' },
  );
}

export function smokingFactor(points, why) {
  return flagFactor('smoker', points, why);
}

export function alcoholFlagFactor(points) {
  return flagFactor(
    'alcoholRegular',
    points,
    'Regular alcohol intake is a self-declared factor repeatedly associated with this condition in research literature.',
  );
}

export function saltFlagFactor(points) {
  return flagFactor(
    'highSaltDiet',
    points,
    'A high-salt diet is a self-declared factor associated with higher blood pressure in research literature.',
  );
}

/** Declared family history — used as a self-declared, non-measured input. */
export function familyHistoryFactor(flagId, points, why) {
  return flagFactor(flagId, points, why);
}

/* ------------------------------------------------------------------ */
/* Disease models                                                      */
/* ------------------------------------------------------------------ */

/**
 * Age-band base rate. `table` is ordered by ascending upper age bound and the
 * last row catches everyone older. Illustrative demo constants only.
 */
function ageSexBase(table, opts = {}) {
  return (ctx) => {
    const age = ctx.age ?? opts.defaultAge ?? 45;
    const row = table.find((r) => age < r.max) ?? table[table.length - 1];
    const sexAdj =
      ctx.sex === 'Male' ? (opts.male ?? 1) : ctx.sex === 'Female' ? (opts.female ?? 1) : 1;
    return {
      points: roundPct(row.points * sexAdj),
      why: `${row.why} Sex adjustment ×${sexAdj} applied from the profile's declared sex.`,
    };
  };
}

const GENERAL_DISCLAIMER =
  'This estimate is produced by an unvalidated demo model from the data listed below. It is not a diagnosis and must not be used for medical decisions.';

export const DISEASE_MODELS = [
  /* ---------------------------- Type 2 diabetes --------------------------- */
  {
    id: 't2d',
    label: 'Type 2 diabetes',
    short: 'T2D',
    category: 'Metabolic',
    icon: 'droplet',
    horizonBasis: RISK_HORIZON_BASIS,
    disclaimer: GENERAL_DISCLAIMER,
    baseFor: ageSexBase(
      [
        { max: 35, points: 3, why: 'Baseline for under-35s is low in this demo model.' },
        { max: 45, points: 6, why: 'Baseline for the 35–44 age band in this demo model.' },
        { max: 55, points: 10, why: 'Baseline for the 45–54 age band in this demo model.' },
        { max: 65, points: 14, why: 'Baseline for the 55–64 age band in this demo model.' },
        { max: 200, points: 16, why: 'Baseline for the 65+ age band in this demo model.' },
      ],
      { male: 1.1, female: 0.9 },
    ),
    factors: [
      labFactor('hba1c', 'HbA1c', [
        { test: (v) => v >= 6.5, points: 20, why: 'HbA1c is inside the range conventionally used to diagnose diabetes. This is NOT a diagnosis — it needs clinical confirmation, and it is used here only as an input to the estimate.' },
        { test: (v) => v >= 6.0, points: 12, why: 'HbA1c sits in the upper part of the prediabetes range used by this demo model.' },
        { test: (v) => v >= 5.7, points: 8, why: 'HbA1c sits inside the prediabetes range used by this demo model.' },
        { test: (v) => v >= 5.4, points: 2, why: 'HbA1c is slightly above the 5.4% level used by this demo model.' },
        { test: () => true, points: -3, why: 'HbA1c is below the 5.4% level used by this demo model, treated as protective.' },
      ]),
      labFactor('glucose', 'Fasting glucose', [
        { test: (v) => v >= 126, points: 16, why: 'Fasting glucose is inside the range conventionally used to diagnose diabetes — clinical confirmation is required and this is not a diagnosis.' },
        { test: (v) => v >= 100, points: 9, why: 'Fasting glucose is in the impaired range used by this demo model.' },
        { test: () => true, points: -2, why: 'Fasting glucose is below the impaired range used by this demo model.' },
      ]),
      customFactor({
        id: 'tg-hdl-ratio',
        label: 'Triglyceride / HDL ratio',
        domain: 'Laboratory result',
        sourceLabel: 'Blood & Laboratory Data',
        evaluate: (ctx) => {
          const tg = ctx.lab.triglycerides;
          const hdl = ctx.lab.hdl;
          if (tg == null || hdl == null || hdl === 0) return null;
          const ratio = roundPct(tg / hdl);
          if (ratio >= 3.5) return { points: 6, valueText: `${ratio}`, why: 'A triglyceride/HDL ratio at or above 3.5 is a repeatedly-reported marker of insulin resistance.', evidence: `TG ${tg} / HDL ${hdl}` };
          if (ratio >= 2) return { points: 3, valueText: `${ratio}`, why: 'Triglyceride/HDL ratio is moderately raised in this demo model.', evidence: `TG ${tg} / HDL ${hdl}` };
          return { points: -2, valueText: `${ratio}`, why: 'Triglyceride/HDL ratio is in the favourable range used by this demo model.', evidence: `TG ${tg} / HDL ${hdl}` };
        },
      }),
      labFactor('alt', 'ALT (liver enzyme)', [
        { test: (v) => v > 40, points: 4, why: 'Raised ALT is associated with liver fat in research; it is not specific and needs clinical interpretation.' },
      ]),
      bmiFactor(1),
      activityFactor(1),
      sleepFactor(1),
      familyHistoryFactor('familyHistoryT2D', 7, 'A first-degree family history of type 2 diabetes is a consistently reported risk factor and is used here as a self-declared input.'),
      geneFactor('t2d'),
      symptomFactor(
        ['thirst', 'urination', 'fatigue', 'blurredVision', 'weightLoss'],
        2,
        6,
        'Self-reported symptoms that can accompany disordered glucose handling. They are unverified statements, not findings.',
        { id: 'symptom-t2d' },
      ),
    ],
    gaps: [
      { when: (ctx) => ctx.lab.hba1c == null && ctx.lab.glucose == null, label: 'No HbA1c or fasting glucose recorded — the two strongest inputs for this model are missing.' },
      { when: (ctx) => ctx.vital.bmi == null, label: 'No height/weight recorded, so BMI could not be computed.' },
      { when: (ctx) => ctx.vital.activityMinutes == null, label: 'No activity record.' },
      { when: (ctx) => ctx.vital.sleepHours == null, label: 'No sleep record.' },
      { when: (ctx) => !ctx.genes.length, label: 'No genetic variants recorded — genetic contribution is not assessed.' },
      { when: (ctx) => ctx.lab.alt == null, label: 'No ALT recorded — the liver-enzyme input is not available.' },
    ],
    plan: [
      {
        id: 't2d-1',
        title: 'Structured lifestyle programme (weight + activity)',
        detail: 'Programmes combining diet and 150 min/week of activity are the best-evidenced way to slow progression from the prediabetes range. Ask your clinician about a local programme.',
        cadence: 'Ongoing · review every 3 months',
        priority: 'high',
        linkedTo: ['vital-bmi', 'lab-hba1c', 'lab-glucose', 'vital-activityMinutes'],
      },
      {
        id: 't2d-2',
        title: 'Reduce refined carbohydrate and sugar-sweetened drinks',
        detail: 'Replace refined carbohydrate and sweetened drinks with whole grains, legumes and vegetables. A dietitian can personalise this further.',
        cadence: 'Daily habit',
        priority: 'high',
        linkedTo: ['lab-hba1c', 'lab-glucose', 'tg-hdl-ratio'],
      },
      {
        id: 't2d-3',
        title: 'Re-test HbA1c and fasting glucose',
        detail: 'Repeat testing is how progression is actually tracked; this dashboard cannot determine it on its own.',
        cadence: 'Every 3–6 months',
        priority: 'high',
        linkedTo: ['lab-hba1c', 'lab-glucose'],
        alsoWhen: (ctx) => ctx.lab.hba1c == null || ctx.lab.glucose == null,
      },
      {
        id: 't2d-4',
        title: 'Build the activity target up gradually',
        detail: 'Start with 20-minute daily walks and add two resistance sessions per week, building toward 150 min/week.',
        cadence: '5 days per week',
        priority: 'medium',
        linkedTo: ['vital-activityMinutes'],
      },
      {
        id: 't2d-5',
        title: 'Protect 7–9 hours of sleep',
        detail: 'Short sleep is associated with poorer glucose control; a fixed sleep and wake time is the first step.',
        cadence: 'Nightly',
        priority: 'medium',
        linkedTo: ['vital-sleepHours'],
      },
      {
        id: 't2d-6',
        title: 'Discuss the recorded genetic variants with a clinician',
        detail: 'Variants recorded for this profile are associated with type 2 diabetes in research. They do not diagnose anything, but a clinician can say whether any warrant confirmatory testing or earlier screening.',
        cadence: 'Next appointment',
        priority: 'high',
        linkedTo: ['gene-t2d'],
      },
      {
        id: 't2d-7',
        title: 'Ask about family-history-based screening',
        detail: 'A declared family history usually justifies earlier or more frequent glucose testing. That is a clinical decision.',
        cadence: 'Next appointment',
        priority: 'medium',
        linkedTo: ['flag-familyHistoryT2D'],
      },
      {
        id: 't2d-8',
        title: 'Baseline set: keep recording the core inputs',
        detail: 'HbA1c, fasting glucose, weight/BMI, activity and sleep are the inputs this model needs. Recording them makes the next analysis meaningful.',
        cadence: 'Each measurement',
        priority: 'medium',
        linkedTo: [],
        always: true,
      },
    ],
  },

  /* ------------------------ Cardiovascular disease ----------------------- */
  {
    id: 'cvd',
    label: 'Coronary heart disease',
    short: 'CVD',
    category: 'Cardiovascular',
    icon: 'heart',
    horizonBasis: RISK_HORIZON_BASIS,
    disclaimer: GENERAL_DISCLAIMER,
    baseFor: ageSexBase(
      [
        { max: 40, points: 3, why: 'Baseline for under-40s in this demo model.' },
        { max: 50, points: 6, why: 'Baseline for the 40–49 age band in this demo model.' },
        { max: 60, points: 11, why: 'Baseline for the 50–59 age band in this demo model.' },
        { max: 200, points: 18, why: 'Baseline for the 60+ age band in this demo model.' },
      ],
      { male: 1.4, female: 0.75 },
    ),
    factors: [
      labFactor('ldl', 'LDL cholesterol', [
        { test: (v) => v >= 190, points: 14, why: 'LDL at or above 190 mg/dL is a level at which clinical guidelines usually recommend family screening for inherited high cholesterol.' },
        { test: (v) => v >= 160, points: 12, why: 'LDL is well above the target used by this demo model.' },
        { test: (v) => v >= 130, points: 7, why: 'LDL is above the target used by this demo model.' },
        { test: (v) => v >= 100, points: 3, why: 'LDL is mildly above the target used by this demo model.' },
        { test: () => true, points: -2, why: 'LDL is inside the target range used by this demo model.' },
      ]),
      labFactor('hdl', 'HDL cholesterol', [
        { test: (v) => v < 40, points: 6, why: 'Low HDL is a reported cardiovascular risk marker.' },
        { test: (v) => v < 50, points: 2, why: 'HDL is below the favourable level used by this demo model.' },
        { test: () => true, points: -4, why: 'HDL is in the favourable range used by this demo model.' },
      ]),
      labFactor('triglycerides', 'Triglycerides', [
        { test: (v) => v >= 200, points: 4, why: 'Triglycerides at or above 200 mg/dL are a reported cardiovascular risk marker.' },
        { test: (v) => v >= 150, points: 2, why: 'Triglycerides are mildly raised in this demo model.' },
        { test: () => true, points: -1, why: 'Triglycerides are inside the favourable range used by this demo model.' },
      ]),
      systolicFactor(1),
      smokingFactor(11, 'Smoking is one of the strongest modifiable cardiovascular risk factors in research literature.'),
      bmiFactor(0.6),
      activityFactor(0.8),
      sleepFactor(0.5),
      customFactor({
        id: 'glucose-diabetes-range',
        label: 'Glucose handling in the diabetes range',
        domain: 'Laboratory result',
        sourceLabel: 'Blood & Laboratory Data',
        evaluate: (ctx) => {
          const hba1c = ctx.lab.hba1c;
          const glucose = ctx.lab.glucose;
          if (hba1c == null && glucose == null) return null;
          const diabetic = (hba1c != null && hba1c >= 6.5) || (glucose != null && glucose >= 126);
          if (!diabetic) return null;
          return {
            points: 7,
            valueText: `${hba1c != null ? `HbA1c ${hba1c}%` : ''}${glucose != null ? `${hba1c != null ? ' · ' : ''}glucose ${glucose} mg/dL` : ''}`,
            why: 'Glucose values in the range conventionally used to diagnose diabetes are also reported to raise cardiovascular risk. Clinical confirmation is required.',
            evidence: 'Laboratory records for this profile',
          };
        },
      }),
      familyHistoryFactor('familyHistoryCVD', 7, 'A first-degree family history of heart disease is a reported risk factor and is used here as a self-declared input.'),
      geneFactor('cvd'),
      symptomFactor(
        ['chestPain', 'breathlessness', 'palpitations'],
        3,
        8,
        'Self-reported cardiac symptoms. These are unverified statements — but symptoms like these usually warrant prompt clinical assessment rather than waiting for a dashboard.',
        { id: 'symptom-cvd', redFlag: true, label: 'Self-reported cardiac symptoms (AI chat / notes)' },
      ),
    ],
    gaps: [
      { when: (ctx) => ctx.lab.ldl == null, label: 'No LDL cholesterol recorded — a primary input for this model.' },
      { when: (ctx) => ctx.lab.hdl == null, label: 'No HDL cholesterol recorded.' },
      { when: (ctx) => ctx.vital.systolic == null && ctx.vital.diastolic == null, label: 'No blood-pressure readings recorded.' },
      { when: (ctx) => ctx.vital.bmi == null, label: 'No height/weight recorded, so BMI could not be computed.' },
      { when: (ctx) => ctx.vital.activityMinutes == null, label: 'No activity record.' },
      { when: (ctx) => !ctx.genes.length, label: 'No genetic variants recorded — inherited lipid disorders cannot be assessed.' },
    ],
    plan: [
      {
        id: 'cvd-1',
        title: 'Know your blood pressure and lipid numbers',
        detail: 'Blood pressure and a full lipid panel are the two measurements that change cardiovascular management. Record both here after each test so the estimate stays current.',
        cadence: 'Blood pressure: monthly · lipids: 6–12 monthly',
        priority: 'high',
        linkedTo: ['lab-ldl', 'lab-hdl', 'vital-systolic'],
        alsoWhen: (ctx) => ctx.vital.systolic == null || ctx.lab.ldl == null,
      },
      {
        id: 'cvd-2',
        title: 'Stop smoking / avoid second-hand smoke',
        detail: 'Smoking cessation reduces cardiovascular risk more than any single medication in most risk profiles. A cessation service roughly triples quit rates.',
        cadence: 'Immediate',
        priority: 'high',
        linkedTo: ['flag-smoker'],
      },
      {
        id: 'cvd-3',
        title: '150 minutes of moderate activity per week',
        detail: 'Split into 30-minute sessions on five days, plus two short resistance sessions.',
        cadence: '5 days per week',
        priority: 'high',
        linkedTo: ['vital-activityMinutes'],
      },
      {
        id: 'cvd-4',
        title: 'Discuss lipid-lowering treatment eligibility',
        detail: 'Whether LDL treatment is appropriate depends on your total cardiovascular risk, which only a clinician can score. The numbers above are an unvalidated demo estimate.',
        cadence: 'Next appointment',
        priority: 'high',
        linkedTo: ['lab-ldl', 'gene-cvd', 'flag-familyHistoryCVD'],
      },
      {
        id: 'cvd-5',
        title: 'Ask about family screening for inherited high cholesterol',
        detail: 'If LDL is very high, or if LDLR/APOB variants are recorded, close relatives may also need testing. This is a clinical pathway, not a dashboard decision.',
        cadence: 'Next appointment',
        priority: 'high',
        linkedTo: ['gene-cvd'],
        alsoWhen: (ctx) => ctx.lab.ldl != null && ctx.lab.ldl >= 190,
      },
      {
        id: 'cvd-6',
        title: 'Seek urgent assessment for chest pain or breathlessness',
        detail: 'Chest pain, pressure, or new breathlessness should be assessed clinically straight away. This dashboard is not an emergency service and cannot rule anything out.',
        cadence: 'If symptoms occur',
        priority: 'high',
        linkedTo: ['symptom-cvd'],
        always: true,
      },
      {
        id: 'cvd-7',
        title: 'Work on weight and sleep as secondary levers',
        detail: 'Modest weight reduction and 7–9 hours of sleep both move blood pressure and lipid metabolism in the right direction.',
        cadence: 'Ongoing',
        priority: 'medium',
        linkedTo: ['vital-bmi', 'vital-sleepHours'],
      },
    ],
  },

  /* ----------------------------- Hypertension ---------------------------- */
  {
    id: 'hypertension',
    label: 'High blood pressure (hypertension)',
    short: 'HTN',
    category: 'Cardiovascular',
    icon: 'gauge',
    horizonBasis: RISK_HORIZON_BASIS,
    disclaimer: GENERAL_DISCLAIMER,
    baseFor: ageSexBase(
      [
        { max: 30, points: 5, why: 'Baseline for under-30s in this demo model.' },
        { max: 40, points: 10, why: 'Baseline for the 30–39 age band in this demo model.' },
        { max: 50, points: 18, why: 'Baseline for the 40–49 age band in this demo model.' },
        { max: 60, points: 28, why: 'Baseline for the 50–59 age band in this demo model.' },
        { max: 200, points: 40, why: 'Baseline for the 60+ age band in this demo model.' },
      ],
      { male: 1.15, female: 0.95 },
    ),
    factors: [
      systolicFactor(1.4),
      diastolicFactor(1.4),
      saltFlagFactor(4),
      alcoholFlagFactor(3),
      smokingFactor(4, 'Smoking raises blood pressure and arterial stiffness; it is used here as a self-declared input.'),
      bmiFactor(0.8),
      activityFactor(0.5),
      sleepFactor(0.75),
      customFactor({
        id: 'stress-reported',
        label: 'Reported stress',
        domain: 'AI chat insight',
        sourceLabel: 'AI Health Assistant & dashboard notes',
        evaluate: (ctx) => {
          const reported = ctx.symptomEvidence('sleepTrouble');
          if (!reported.length) return null;
          return {
            points: 2,
            valueText: 'Poor sleep reported',
            why: 'Self-reported poor sleep is associated with higher blood-pressure recordings in research; it may also reflect measurement conditions.',
            evidence: `“${reported[0].excerpt}” — ${reported[0].conversationTitle}`,
          };
        },
      }),
      geneFactor('hypertension'),
      familyHistoryFactor('familyHistoryHypertension', 5, 'A declared family history of high blood pressure is a reported risk factor and is used here as a self-declared input.'),
      symptomFactor(
        ['headache', 'dizziness'],
        2,
        4,
        'Headache and dizziness are commonly reported with high blood pressure but are non-specific; they are unverified self-reports.',
        { id: 'symptom-htn' },
      ),
    ],
    gaps: [
      { when: (ctx) => ctx.vital.systolic == null, label: 'No systolic blood-pressure reading recorded — the model is running on baseline risk only.' },
      { when: (ctx) => ctx.vital.diastolic == null, label: 'No diastolic blood-pressure reading recorded.' },
      { when: (ctx) => ctx.vital.bmi == null, label: 'No height/weight recorded, so BMI could not be computed.' },
      { when: (ctx) => ctx.lab.sodium == null, label: 'No sodium result recorded (relevant to salt intake).' },
      { when: (ctx) => !ctx.genes.length, label: 'No genetic variants recorded.' },
    ],
    plan: [
      {
        id: 'htn-1',
        title: 'Home blood-pressure log (seated, rested, 2 readings)',
        detail: 'Take two readings a minute apart, morning and evening, seated and rested for 5 minutes. Record them in the daily tracking tab — repeated readings are what a clinician can act on.',
        cadence: 'Daily for 7 days, then 1–2 days per week',
        priority: 'high',
        linkedTo: ['vital-systolic', 'vital-diastolic'],
        always: true,
      },
      {
        id: 'htn-2',
        title: 'Cut salt intake toward 5 g/day',
        detail: 'Most salt comes from processed food and restaurant meals. Reducing it lowers systolic pressure over weeks.',
        cadence: 'Daily habit',
        priority: 'high',
        linkedTo: ['flag-highSaltDiet', 'vital-systolic'],
      },
      {
        id: 'htn-3',
        title: 'Moderate alcohol and stop smoking',
        detail: 'Both raise blood pressure directly. Cutting alcohol to the guideline level typically lowers systolic pressure within weeks.',
        cadence: 'Ongoing',
        priority: 'high',
        linkedTo: ['flag-alcoholRegular', 'flag-smoker'],
      },
      {
        id: 'htn-4',
        title: 'Ask for a formal blood-pressure assessment',
        detail: 'A diagnosis of hypertension needs repeated, properly-taken readings (often including ambulatory monitoring). This dashboard cannot diagnose it.',
        cadence: 'Next appointment',
        priority: 'high',
        linkedTo: ['vital-systolic', 'vital-diastolic'],
        always: true,
      },
      {
        id: 'htn-5',
        title: 'Weight and activity as pressure-lowering levers',
        detail: 'Weight reduction of a few kilograms and 150 min/week of activity both reduce blood pressure measurably.',
        cadence: 'Ongoing',
        priority: 'medium',
        linkedTo: ['vital-bmi', 'vital-activityMinutes'],
      },
    ],
  },

  /* -------------------------- Chronic kidney disease --------------------- */
  {
    id: 'ckd',
    label: 'Chronic kidney disease',
    short: 'CKD',
    category: 'Renal',
    icon: 'activity',
    horizonBasis: RISK_HORIZON_BASIS,
    disclaimer: GENERAL_DISCLAIMER,
    baseFor: ageSexBase(
      [
        { max: 40, points: 2, why: 'Baseline for under-40s in this demo model.' },
        { max: 50, points: 4, why: 'Baseline for the 40–49 age band in this demo model.' },
        { max: 60, points: 7, why: 'Baseline for the 50–59 age band in this demo model.' },
        { max: 200, points: 12, why: 'Baseline for the 60+ age band in this demo model.' },
      ],
      { male: 1, female: 1 },
    ),
    factors: [
      labFactor('egfr', 'eGFR (kidney filtration)', [
        { test: (v) => v < 45, points: 24, why: 'An eGFR below 45 mL/min/1.73m² is in the range clinical guidelines use to define moderate-to-severe reduction in kidney function. It requires clinical confirmation.' },
        { test: (v) => v < 60, points: 14, why: 'An eGFR below 60 is the threshold conventionally used to define reduced kidney function when persistent.' },
        { test: (v) => v < 90, points: 5, why: 'eGFR is mildly reduced in the range used by this demo model.' },
        { test: () => true, points: -2, why: 'eGFR is inside the usual range used by this demo model.' },
      ]),
      labFactor('creatinine', 'Creatinine', [
        { test: (v) => v > 1.5, points: 12, why: 'Creatinine is substantially above the usual range, which can indicate reduced filtration. Clinical interpretation is required.' },
        { test: (v) => v > 1.2, points: 6, why: 'Creatinine is above the level used by this demo model.' },
        { test: () => true, points: -1, why: 'Creatinine is inside the usual range used by this demo model.' },
      ]),
      labFactor('bun', 'BUN / Urea', [
        { test: (v) => v > 20, points: 3, why: 'Raised BUN/urea can accompany reduced kidney function; it is non-specific and needs clinical interpretation.' },
      ]),
      systolicFactor(0.5),
      customFactor({
        id: 'ckd-glucose-range',
        label: 'Glucose handling in the impaired or diabetes range',
        domain: 'Laboratory result',
        sourceLabel: 'Blood & Laboratory Data',
        evaluate: (ctx) => {
          const hba1c = ctx.lab.hba1c;
          const glucose = ctx.lab.glucose;
          if (hba1c == null && glucose == null) return null;
          const impaired = (hba1c != null && hba1c >= 6.0) || (glucose != null && glucose >= 100);
          if (!impaired) return null;
          const diabetic = (hba1c != null && hba1c >= 6.5) || (glucose != null && glucose >= 126);
          return {
            points: diabetic ? 8 : 3,
            valueText: diabetic ? 'Diabetes range' : 'Impaired range',
            why: diabetic
              ? 'Glucose values in the diabetes range are a leading reported cause of kidney damage; clinical confirmation is required.'
              : 'Mildly impaired glucose handling is a reported risk factor for kidney disease.',
            evidence: 'Laboratory records for this profile',
          };
        },
      }),
      bmiFactor(0.4),
      smokingFactor(4, 'Smoking is a reported risk factor for kidney-function decline.'),
      geneFactor('ckd'),
      familyHistoryFactor('familyHistoryCKD', 5, 'A declared family history of kidney disease is a reported risk factor and is used here as a self-declared input.'),
      symptomFactor(
        ['swelling', 'urineChange', 'fatigue'],
        2,
        5,
        'Self-reported symptoms that can accompany reduced kidney function. They are unverified and non-specific — clinical testing is the only way to know.',
        { id: 'symptom-ckd' },
      ),
    ],
    gaps: [
      { when: (ctx) => ctx.lab.egfr == null, label: 'No eGFR recorded — this is the primary input for this model.' },
      { when: (ctx) => ctx.lab.creatinine == null, label: 'No creatinine recorded.' },
      { when: (ctx) => ctx.vital.systolic == null, label: 'No blood-pressure reading recorded (blood pressure is a key kidney input).' },
      { when: (ctx) => ctx.lab.glucose == null && ctx.lab.hba1c == null, label: 'No glucose or HbA1c recorded.' },
      { when: (ctx) => !ctx.genes.length, label: 'No genetic variants recorded.' },
    ],
    plan: [
      {
        id: 'ckd-1',
        title: 'Request eGFR and creatinine with your next panel',
        detail: 'Kidney function is only visible through blood and urine testing. Ask about a urine albumin:creatinine ratio as well — it can detect damage before eGFR falls.',
        cadence: 'At least annually · more often if impaired',
        priority: 'high',
        linkedTo: ['lab-egfr', 'lab-creatinine'],
        always: true,
      },
      {
        id: 'ckd-2',
        title: 'Keep blood pressure in the target range',
        detail: 'Blood-pressure control is the single most effective way to slow kidney-function decline where one exists.',
        cadence: 'Track weekly',
        priority: 'high',
        linkedTo: ['vital-systolic', 'vital-diastolic'],
      },
      {
        id: 'ckd-3',
        title: 'Review medications and supplements for kidney safety',
        detail: 'Some painkillers (NSAIDs), certain supplements and some imaging contrast agents stress the kidneys. Ask a pharmacist or clinician to review what you take.',
        cadence: 'Before starting anything new',
        priority: 'medium',
        linkedTo: ['lab-egfr', 'lab-creatinine'],
        alsoWhen: (ctx) => ctx.lab.egfr != null && ctx.lab.egfr < 60,
      },
      {
        id: 'ckd-4',
        title: 'Tighten glucose control',
        detail: 'Where glucose sits in the impaired or diabetes range, kidney risk is strongly linked to glucose management. That is a clinical management decision.',
        cadence: 'Ongoing',
        priority: 'high',
        linkedTo: ['ckd-glucose-range', 'lab-hba1c'],
      },
      {
        id: 'ckd-5',
        title: 'Ask for a nephrology opinion if eGFR stays low',
        detail: 'Persistent eGFR below 60 usually warrants a specialist review pathway. This dashboard cannot make that referral for you.',
        cadence: 'Next appointment',
        priority: 'high',
        linkedTo: ['lab-egfr'],
        alsoWhen: (ctx) => ctx.lab.egfr != null && ctx.lab.egfr < 60,
      },
    ],
  },

  /* ------------------------ Fatty liver disease (MASLD) ------------------ */
  {
    id: 'masld',
    label: 'Fatty liver disease (MASLD)',
    short: 'MASLD',
    category: 'Hepatic',
    icon: 'flask',
    horizonBasis: RISK_HORIZON_BASIS,
    disclaimer: GENERAL_DISCLAIMER,
    baseFor: ageSexBase(
      [
        { max: 30, points: 5, why: 'Baseline for under-30s in this demo model.' },
        { max: 40, points: 9, why: 'Baseline for the 30–39 age band in this demo model.' },
        { max: 50, points: 14, why: 'Baseline for the 40–49 age band in this demo model.' },
        { max: 200, points: 18, why: 'Baseline for the 50+ age band in this demo model.' },
      ],
      { male: 1.2, female: 0.9 },
    ),
    factors: [
      labFactor('alt', 'ALT (liver enzyme)', [
        { test: (v) => v > 80, points: 20, why: 'ALT is more than twice the upper limit used by this demo model — a clinical review of liver health is warranted.' },
        { test: (v) => v > 40, points: 14, why: 'ALT is above the upper limit used by this demo model. Raised ALT is associated with liver fat in research but is not specific.' },
        { test: () => true, points: -2, why: 'ALT is inside the range used by this demo model.' },
      ]),
      labFactor('ast', 'AST (liver enzyme)', [
        { test: (v) => v > 40, points: 8, why: 'AST is above the upper limit used by this demo model; liver enzymes need clinical interpretation.' },
      ]),
      labFactor('triglycerides', 'Triglycerides', [
        { test: (v) => v >= 200, points: 7, why: 'Raised triglycerides are a core feature of the metabolic pattern associated with fatty liver disease.' },
        { test: (v) => v >= 150, points: 4, why: 'Triglycerides are mildly raised in this demo model.' },
      ]),
      labFactor('hdl', 'HDL cholesterol', [
        { test: (v) => v < 40, points: 4, why: 'Low HDL is part of the metabolic pattern associated with fatty liver disease in research.' },
      ]),
      bmiFactor(1.2),
      customFactor({
        id: 'masld-glucose-range',
        label: 'Glucose handling in the impaired or diabetes range',
        domain: 'Laboratory result',
        sourceLabel: 'Blood & Laboratory Data',
        evaluate: (ctx) => {
          const hba1c = ctx.lab.hba1c;
          const glucose = ctx.lab.glucose;
          if (hba1c == null && glucose == null) return null;
          const diabetic = (hba1c != null && hba1c >= 6.5) || (glucose != null && glucose >= 126);
          const impaired = (hba1c != null && hba1c >= 6.0) || (glucose != null && glucose >= 100);
          if (!diabetic && !impaired) return null;
          return {
            points: diabetic ? 6 : 3,
            valueText: diabetic ? 'Diabetes range' : 'Impaired range',
            why: 'Insulin resistance is the mechanism most consistently linked to fatty liver disease in research. Clinical confirmation of the glucose value is required.',
            evidence: 'Laboratory records for this profile',
          };
        },
      }),
      alcoholFlagFactor(5),
      activityFactor(0.5),
      geneFactor('masld'),
      symptomFactor(
        ['abdominalPain', 'fatigue'],
        2,
        4,
        'Self-reported abdominal discomfort and fatigue. These are non-specific and unverified; most fatty liver disease causes no symptoms at all.',
        { id: 'symptom-masld' },
      ),
    ],
    gaps: [
      { when: (ctx) => ctx.lab.alt == null && ctx.lab.ast == null, label: 'No ALT or AST recorded — liver enzymes are the main laboratory input for this model.' },
      { when: (ctx) => ctx.lab.triglycerides == null, label: 'No triglycerides recorded.' },
      { when: (ctx) => ctx.vital.bmi == null, label: 'No height/weight recorded, so BMI could not be computed.' },
      { when: (ctx) => ctx.lab.hba1c == null && ctx.lab.glucose == null, label: 'No glucose or HbA1c recorded.' },
      { when: (ctx) => !ctx.genes.length, label: 'No genetic variants recorded.' },
    ],
    plan: [
      {
        id: 'masld-1',
        title: 'Aim for 7–10% weight reduction if BMI is raised',
        detail: 'Weight reduction is the best-evidenced intervention for liver fat in research, and it works even without reaching an ideal weight.',
        cadence: 'Gradual · review every 3 months',
        priority: 'high',
        linkedTo: ['vital-bmi'],
      },
      {
        id: 'masld-2',
        title: 'Review alcohol intake with a clinician',
        detail: 'Alcohol and metabolic liver disease interact. A clinician can advise on a safe level for your situation.',
        cadence: 'Next appointment',
        priority: 'high',
        linkedTo: ['flag-alcoholRegular', 'lab-alt'],
      },
      {
        id: 'masld-3',
        title: 'Repeat liver enzymes',
        detail: 'Single abnormal liver enzymes are common and often transient. A repeat test, plus other liver markers, is what makes the result interpretable.',
        cadence: 'Every 3–6 months while abnormal',
        priority: 'high',
        linkedTo: ['lab-alt', 'lab-ast'],
        always: true,
      },
      {
        id: 'masld-4',
        title: 'Ask whether a liver assessment (e.g. scan) is indicated',
        detail: 'Liver enzymes do not measure liver fat or scarring. Where the pattern persists, clinicians use imaging or elastography to assess it.',
        cadence: 'Next appointment',
        priority: 'medium',
        linkedTo: ['lab-alt', 'lab-ast', 'gene-masld'],
      },
      {
        id: 'masld-5',
        title: 'Cut sugary drinks and refined carbohydrate',
        detail: 'Fructose from sweetened drinks is metabolised in the liver and is a repeatedly-reported contributor to liver fat.',
        cadence: 'Daily habit',
        priority: 'medium',
        linkedTo: ['masld-glucose-range', 'lab-triglycerides'],
      },
    ],
  },

  /* ------------------------------- Alzheimer's --------------------------- */
  {
    id: 'alzheimer',
    label: "Alzheimer's disease",
    short: 'AD',
    category: 'Cognitive',
    icon: 'cpu',
    horizonBasis: RISK_HORIZON_BASIS,
    disclaimer: GENERAL_DISCLAIMER,
    baseFor: ageSexBase(
      [
        { max: 50, points: 1, why: 'Baseline for under-50s is very low in this demo model.' },
        { max: 60, points: 3, why: 'Baseline for the 50–59 age band in this demo model.' },
        { max: 70, points: 8, why: 'Baseline for the 60–69 age band in this demo model.' },
        { max: 200, points: 18, why: 'Baseline for the 70+ age band, where age dominates the estimate.' },
      ],
      { male: 0.85, female: 1.15 },
    ),
    factors: [
      geneFactor('alzheimer', {
        why: 'Recorded variants are reported Alzheimer-associated. APOE genotype must be interpreted by a specialist — it is never a prediction, and it is not used here as one.',
      }),
      familyHistoryFactor('familyHistoryAlzheimer', 6, 'A declared family history of Alzheimer\'s disease is a reported risk factor and is used here as a self-declared input.'),
      systolicFactor(0.4),
      customFactor({
        id: 'alzheimer-glucose-range',
        label: 'Glucose handling in the diabetes range',
        domain: 'Laboratory result',
        sourceLabel: 'Blood & Laboratory Data',
        evaluate: (ctx) => {
          const hba1c = ctx.lab.hba1c;
          const glucose = ctx.lab.glucose;
          if (hba1c == null && glucose == null) return null;
          const diabetic = (hba1c != null && hba1c >= 6.5) || (glucose != null && glucose >= 126);
          const impaired = (hba1c != null && hba1c >= 6.0) || (glucose != null && glucose >= 100);
          if (!diabetic && !impaired) return null;
          return {
            points: diabetic ? 5 : 2,
            valueText: diabetic ? 'Diabetes range' : 'Impaired range',
            why: 'Disordered glucose handling is a reported vascular risk factor for cognitive decline. Clinical confirmation of the glucose value is required.',
            evidence: 'Laboratory records for this profile',
          };
        },
      }),
      labFactor('ldl', 'LDL cholesterol', [
        { test: (v) => v >= 160, points: 3, why: 'Raised LDL is treated as a vascular risk input in this demo model.' },
      ]),
      sleepFactor(1),
      activityFactor(0.5),
      symptomFactor(
        ['memory', 'fatigue'],
        3,
        6,
        'Self-reported memory or word-finding difficulty. This is an unverified statement and is NOT a cognitive assessment — memory concerns deserve a clinical review.',
        { id: 'symptom-alzheimer', redFlag: false },
      ),
    ],
    gaps: [
      { when: (ctx) => !ctx.genes.length, label: 'No genetic variants recorded — the APOE-related contribution cannot be assessed at all.' },
      { when: (ctx) => ctx.vital.systolic == null, label: 'No blood-pressure reading recorded — a modifiable vascular input is missing.' },
      { when: (ctx) => ctx.vital.sleepHours == null, label: 'No sleep record.' },
      { when: (ctx) => ctx.vital.activityMinutes == null, label: 'No activity record.' },
      { when: (ctx) => ctx.lab.ldl == null && ctx.lab.hba1c == null && ctx.lab.glucose == null, label: 'No metabolic or lipid results recorded.' },
    ],
    plan: [
      {
        id: 'ad-1',
        title: 'Keep blood pressure and glucose in range',
        detail: 'Vascular risk factors are the most actionable inputs for cognitive health in research. Management is a clinical decision.',
        cadence: 'Ongoing',
        priority: 'high',
        linkedTo: ['vital-systolic', 'alzheimer-glucose-range'],
      },
      {
        id: 'ad-2',
        title: 'Protect sleep and treat sleep problems',
        detail: 'Persistent short sleep and untreated sleep apnoea are reported associates of cognitive decline. A sleep assessment may be worth requesting.',
        cadence: 'Nightly · review in 3 months',
        priority: 'medium',
        linkedTo: ['vital-sleepHours'],
      },
      {
        id: 'ad-3',
        title: 'Stay physically and socially active',
        detail: '150 min/week of activity plus regular social contact is the combination most consistently associated with slower cognitive decline.',
        cadence: '5 days per week',
        priority: 'medium',
        linkedTo: ['vital-activityMinutes'],
      },
      {
        id: 'ad-4',
        title: 'Discuss any memory concern with a clinician',
        detail: 'Memory or word-finding changes deserve a proper clinical assessment — there are reversible causes, and this dashboard cannot assess cognition.',
        cadence: 'Next appointment',
        priority: 'high',
        linkedTo: ['symptom-alzheimer'],
        always: true,
      },
      {
        id: 'ad-5',
        title: 'Ask for genetic counselling before acting on APOE results',
        detail: 'APOE results carry implications for relatives and should never be interpreted alone. A clinical genetics service can explain what they do and do not mean.',
        cadence: 'Before drawing conclusions',
        priority: 'high',
        linkedTo: ['gene-alzheimer'],
      },
    ],
  },

  /* ------------------- Breast & ovarian cancer (female only) -------------- */
  {
    id: 'breastOvarian',
    label: 'Breast & ovarian cancer',
    short: 'BRCA',
    category: 'Oncology',
    icon: 'shield',
    horizonBasis: RISK_HORIZON_BASIS,
    disclaimer: GENERAL_DISCLAIMER,
    appliesTo: (ctx) => ctx.isFemale,
    notApplicable:
      'This model is only run for profiles with a declared female sex. No estimate is produced otherwise — the dashboard never applies a cancer-risk estimate to the wrong population.',
    baseFor: ageSexBase(
      [
        { max: 40, points: 1.5, why: 'Baseline for under-40s in this demo model.' },
        { max: 50, points: 3, why: 'Baseline for the 40–49 age band in this demo model.' },
        { max: 60, points: 4.5, why: 'Baseline for the 50–59 age band in this demo model.' },
        { max: 200, points: 6, why: 'Baseline for the 60+ age band in this demo model.' },
      ],
      { male: 1, female: 1 },
    ),
    factors: [
      geneFactor('breastOvarian', {
        why: 'A high- or moderate-penetrance breast/ovarian cancer gene variant is recorded. This DOMINATES the estimate — and it is exactly the situation where a clinical genetics service, not a dashboard, decides what happens next.',
      }),
      familyHistoryFactor('familyHistoryBreastOvarian', 8, 'A declared family history of breast or ovarian cancer is a reported risk factor and is used here as a self-declared input.'),
      alcoholFlagFactor(4),
      bmiFactor(0.3),
      activityFactor(0.4),
      symptomFactor(
        ['breastLump', 'pelvicBloating'],
        3,
        6,
        'Self-reported breast or pelvic changes. These need prompt clinical assessment — a lump or persistent pelvic bloating is a "see someone now" symptom, not a dashboard metric.',
        { id: 'symptom-breastOvarian', redFlag: true, label: 'Self-reported breast / pelvic changes' },
      ),
    ],
    gaps: [
      { when: (ctx) => !ctx.genes.length, label: 'No genetic variants recorded — hereditary risk cannot be assessed, and family-history-based screening decisions could not be informed.' },
      { when: (ctx) => !ctx.hasFlag('familyHistoryBreastOvarian'), label: 'Family history has not been declared for this profile (an empty answer is not the same as a negative one).' },
      { when: (ctx) => ctx.vital.bmi == null, label: 'No height/weight recorded, so BMI could not be computed.' },
    ],
    plan: [
      {
        id: 'bo-1',
        title: 'Confirm the screening interval with your clinician',
        detail: 'Breast screening intervals depend on age, family history and any confirmed genetic result. The estimate above cannot choose an interval — a clinician can.',
        cadence: 'Every screening round',
        priority: 'high',
        linkedTo: ['gene-breastOvarian', 'flag-familyHistoryBreastOvarian'],
        always: true,
      },
      {
        id: 'bo-2',
        title: 'Request a clinical genetics referral',
        detail: 'BRCA1/BRCA2 and other high-penetrance findings should be confirmed in an accredited clinical laboratory and discussed with a genetic counsellor, who will also address implications for relatives.',
        cadence: 'Next appointment',
        priority: 'high',
        linkedTo: ['gene-breastOvarian'],
      },
      {
        id: 'bo-3',
        title: 'Get any new lump, nipple change or pelvic bloating assessed promptly',
        detail: 'Breast lumps, nipple discharge, persistent pelvic bloating or pelvic pressure should be clinically assessed without waiting. This dashboard cannot rule anything out.',
        cadence: 'If symptoms appear',
        priority: 'high',
        linkedTo: ['symptom-breastOvarian'],
        always: true,
      },
      {
        id: 'bo-4',
        title: 'Reduce alcohol and maintain a healthy weight',
        detail: 'Both are reported modifiable risk factors for breast cancer, though their effect is far smaller than that of a high-penetrance gene.',
        cadence: 'Ongoing',
        priority: 'medium',
        linkedTo: ['flag-alcoholRegular', 'vital-bmi'],
      },
      {
        id: 'bo-5',
        title: 'Ask about ovarian-cancer surveillance options',
        detail: 'Surveillance for ovarian cancer is controversial and depends on genetic status. Ask what is recommended in your situation rather than relying on this estimate.',
        cadence: 'Next appointment',
        priority: 'medium',
        linkedTo: ['gene-breastOvarian'],
      },
    ],
  },

  /* --------------------------- Colorectal cancer ------------------------- */
  {
    id: 'colorectal',
    label: 'Colorectal (bowel) cancer',
    short: 'CRC',
    category: 'Oncology',
    icon: 'activity',
    horizonBasis: RISK_HORIZON_BASIS,
    disclaimer: GENERAL_DISCLAIMER,
    baseFor: ageSexBase(
      [
        { max: 45, points: 0.5, why: 'Baseline for under-45s is low in this demo model.' },
        { max: 55, points: 1.5, why: 'Baseline for the 45–54 age band in this demo model.' },
        { max: 65, points: 3, why: 'Baseline for the 55–64 age band in this demo model.' },
        { max: 200, points: 4.5, why: 'Baseline for the 65+ age band in this demo model.' },
      ],
      { male: 1.1, female: 0.95 },
    ),
    factors: [
      geneFactor('colorectal', {
        why: 'A hereditary colorectal cancer gene variant is recorded. Confirmation in a clinical laboratory and a surveillance pathway are the appropriate next steps — this estimate is not a substitute.',
      }),
      familyHistoryFactor('familyHistoryColorectal', 7, 'A declared family history of colorectal cancer is a reported risk factor and lowers the age at which screening is usually offered.'),
      smokingFactor(4, 'Smoking is a reported risk factor for colorectal cancer.'),
      bmiFactor(0.4),
      alcoholFlagFactor(3),
      activityFactor(0.3),
      symptomFactor(
        ['bowelChange', 'weightLoss', 'abdominalPain'],
        3,
        7,
        'Self-reported bowel changes, unintended weight loss or abdominal discomfort. Rectal bleeding or a persistent bowel-habit change needs urgent clinical assessment.',
        { id: 'symptom-colorectal', redFlag: true, label: 'Self-reported bowel / weight symptoms' },
      ),
    ],
    gaps: [
      { when: (ctx) => !ctx.genes.length, label: 'No genetic variants recorded — hereditary colorectal risk cannot be assessed.' },
      { when: (ctx) => !ctx.hasFlag('familyHistoryColorectal'), label: 'Family history has not been declared (an empty answer is not the same as a negative one).' },
      { when: (ctx) => ctx.vital.bmi == null, label: 'No height/weight recorded, so BMI could not be computed.' },
      { when: (ctx) => ctx.vital.activityMinutes == null, label: 'No activity record.' },
    ],
    plan: [
      {
        id: 'crc-1',
        title: 'Ask about bowel-cancer screening',
        detail: 'Screening (a stool test and/or colonoscopy, depending on national guidance and your risk) is the intervention that actually reduces bowel-cancer deaths. Ask what applies at your age.',
        cadence: 'Per screening programme · discuss now',
        priority: 'high',
        linkedTo: ['flag-familyHistoryColorectal', 'gene-colorectal'],
        always: true,
      },
      {
        id: 'crc-2',
        title: 'Request an earlier screening discussion if family history is declared',
        detail: 'A declared family history usually shifts screening earlier than the general population start age. That is a clinical decision.',
        cadence: 'Next appointment',
        priority: 'high',
        linkedTo: ['flag-familyHistoryColorectal'],
      },
      {
        id: 'crc-3',
        title: 'Get rectal bleeding or a persistent bowel change assessed',
        detail: 'Blood in stool, unexplained iron deficiency, unintended weight loss or a lasting change in bowel habit should be assessed clinically without delay.',
        cadence: 'If symptoms appear',
        priority: 'high',
        linkedTo: ['symptom-colorectal'],
        always: true,
      },
      {
        id: 'crc-4',
        title: 'Reduce alcohol, stop smoking and increase activity',
        detail: 'These are the reported modifiable factors for bowel cancer, and they overlap with the cardiovascular and metabolic plans on this page.',
        cadence: 'Ongoing',
        priority: 'medium',
        linkedTo: ['flag-alcoholRegular', 'flag-smoker', 'vital-activityMinutes', 'vital-bmi'],
      },
      {
        id: 'crc-5',
        title: 'Ask for genetic counselling on any recorded Lynch-syndrome gene',
        detail: 'Lynch-syndrome genes (MLH1, MSH2, MSH6, PMS2) imply a family surveillance pathway. This needs a specialist service.',
        cadence: 'Next appointment',
        priority: 'high',
        linkedTo: ['gene-colorectal'],
      },
    ],
  },
];

const DISEASE_INDEX = new Map(DISEASE_MODELS.map((d) => [d.id, d]));

export function diseaseModelById(id) {
  return DISEASE_INDEX.get(id) ?? null;
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

/**
 * Score one disease for one profile.
 *
 * Returns `applies:false` (with the model's own explanation) when the model
 * must not be run for this profile — e.g. a sex-limited cancer model.
 */
export function assessDisease(def, ctx) {
  const factors = def?.factors ?? [];
  const identity = {
    id: def?.id,
    label: def?.label,
    short: def?.short,
    category: def?.category,
    icon: def?.icon,
    horizonBasis: def?.horizonBasis,
    disclaimer: def?.disclaimer,
  };

  if (def?.appliesTo && !def.appliesTo(ctx)) {
    return {
      ...identity,
      applies: false,
      notApplicable: def.notApplicable ?? 'This model does not apply to this profile.',
      risk: null,
      band: null,
      horizon: null,
      contributors: [],
      drivers: [],
      protective: [],
      missingInputs: [],
      gaps: [],
      plan: [],
      redFlags: [],
      coverage: { factors: factors.length, withData: 0, pct: 0 },
      confidenceNote: 'No estimate produced for this profile.',
    };
  }

  const base = def?.baseFor ? def.baseFor(ctx) : { points: 0, why: 'This model declares no age/sex baseline.' };
  const contributors = [];
  const missingInputs = [];
  const fired = new Set();

  for (const factor of factors) {
    const result = factor?.evaluate ? factor.evaluate(ctx) : null;
    if (!result) {
      missingInputs.push({ id: factor?.id, label: factor?.label, domain: factor?.domain, sourceLabel: factor?.sourceLabel });
      continue;
    }
    fired.add(factor.id);
    contributors.push({
      id: factor.id,
      label: factor.label,
      domain: factor.domain,
      sourceLabel: factor.sourceLabel,
      points: num(result.points),
      valueText: result.valueText,
      why: result.why,
      detail: result.detail,
      evidence: result.evidence,
      date: result.date,
      redFlag: result.redFlag,
      direction: result.points > 0 ? 'increase' : result.points < 0 ? 'protective' : 'neutral',
    });
  }

  const raw = num(base?.points) + contributors.reduce((sum, c) => sum + num(c.points), 0);
  const risk = roundPct(clamp(raw, 1, 95));
  const coveragePct = factors.length ? (fired.size / factors.length) * 100 : 0;

  const factorById = new Map(factors.map((f) => [f?.id, f]));
  const plan = (def?.plan ?? [])
    .filter((item) => {
      if (item?.always) return true;
      const linked = (item?.linkedTo ?? []).some((id) => fired.has(id));
      if (linked) return true;
      return item?.alsoWhen ? Boolean(item.alsoWhen(ctx)) : false;
    })
    .map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.detail,
      cadence: item.cadence,
      priority: item.priority ?? 'medium',
      // Which of THIS profile's inputs triggered the advice — never generic.
      triggeredBy: (item.linkedTo ?? [])
        .filter((id) => fired.has(id))
        .map((id) => ({
          id,
          label: factorById.get(id)?.label ?? id,
          valueText: contributors.find((c) => c.id === id)?.valueText ?? null,
          sourceLabel: factorById.get(id)?.sourceLabel ?? null,
        })),
      selfDeclaredTrigger: (item.linkedTo ?? []).some((id) => String(id).startsWith('flag-') && fired.has(id)),
    }))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));

  const gaps = (def?.gaps ?? []).filter((g) => g?.when?.(ctx)).map((g) => g.label);
  const redFlags = contributors.filter((c) => c.redFlag);

  return {
    ...identity,
    applies: true,
    risk,
    band: riskBand(risk),
    horizon: horizonFor(risk, coveragePct),
    base: { points: num(base?.points) ?? 0, why: base?.why ?? 'No baseline explanation was declared for this model.' },
    contributors: [...contributors].sort((a, b) => Math.abs(b.points) - Math.abs(a.points)),
    drivers: contributors.filter((c) => c.points > 0).sort((a, b) => b.points - a.points),
    protective: contributors.filter((c) => c.points < 0).sort((a, b) => a.points - b.points),
    missingInputs,
    gaps,
    plan,
    redFlags,
    coverage: {
      factors: factors.length,
      withData: fired.size,
      pct: Math.round(coveragePct),
    },
    confidenceNote: `${fired.size} of ${factors.length} model inputs are present (${Math.round(coveragePct)}%)${
      fired.size === 0
        ? '. No measured input is available, so the number shown is the age/sex baseline alone and should not be read as a personal estimate.'
        : '.'
    }`,
    rawTotal: roundPct(raw),
  };
}

/**
 * Run the whole model set for one profile snapshot.
 *
 * @param {object} snapshot  output of buildProfileHealthSnapshot()
 * @param {object} [opts]    { includeNotApplicable = true, now }
 */
export function assessHealthRisks(snapshot, opts = {}) {
  const ctx = buildRiskContext(snapshot);
  const all = DISEASE_MODELS.map((def) => assessDisease(def, ctx));
  const applicable = all.filter((r) => r?.applies);
  const ranked = [...applicable].sort((a, b) => num(b?.risk) - num(a?.risk));

  const factorsTotal = applicable.reduce((a, r) => a + num(r?.coverage?.factors), 0);
  const factorsWithData = applicable.reduce((a, r) => a + num(r?.coverage?.withData), 0);
  const overallCoveragePct = factorsTotal ? Math.round((factorsWithData / factorsTotal) * 1000) / 10 : 0;

  const domainTotals = new Map();
  for (const r of applicable) {
    for (const c of r?.drivers ?? []) {
      if (!c?.domain) continue;
      domainTotals.set(c.domain, (domainTotals.get(c.domain) ?? 0) + num(c.points));
    }
  }

  const summary = {
    diseasesModelled: applicable.length,
    diseasesNotApplicable: all.length - applicable.length,
    highest: ranked[0] ?? null,
    lowest: ranked[ranked.length - 1] ?? null,
    averageRisk: applicable.length
      ? roundPct(applicable.reduce((a, r) => a + num(r?.risk), 0) / applicable.length)
      : null,
    countHigh: applicable.filter((r) => num(r?.risk) >= 60).length,
    countElevated: applicable.filter((r) => num(r?.risk) >= 40).length,
    countModerate: applicable.filter((r) => num(r?.risk) >= 25).length,
    redFlagCount: applicable.filter((r) => (r?.redFlags ?? []).length > 0).length,
    inputsPresent: factorsWithData,
    inputsTotal: factorsTotal,
    coveragePct: overallCoveragePct,
    planItems: applicable.reduce((a, r) => a + (r?.plan ?? []).length, 0),
    highPriorityPlanItems: applicable.reduce(
      (a, r) => a + (r?.plan ?? []).filter((p) => p?.priority === 'high').length,
      0,
    ),
  };

  return {
    modelVersion: RISK_MODEL_VERSION,
    horizonBasis: RISK_HORIZON_BASIS,
    generatedAt: opts.now ?? new Date().toISOString(),
    profile: {
      id: snapshot?.profileId ?? null,
      name: snapshot?.profileName ?? 'Unnamed profile',
      age: snapshot?.demographics?.age ?? null,
      sex: snapshot?.demographics?.sex ?? 'Other / not stated',
      relation: snapshot?.demographics?.relation ?? 'Self',
      isPrimary: Boolean(snapshot?.isPrimary),
    },
    inputCounts: snapshot?.counts ?? {},
    results: all,
    ranked,
    summary,
    domainBreakdown: [...domainTotals.entries()]
      .map(([domain, points]) => ({ domain, points: roundPct(points) }))
      .sort((a, b) => b.points - a.points),
    unmodelledGenes: unmodelledGenes(snapshot?.genes ?? []),
    flags: [...(snapshot?.flags ?? [])],
    notes: [
      'Every number on this page is an unvalidated demo estimate built from the inputs listed with it — not a diagnosis, not a validated risk score.',
      'Values in the prediabetes, hypertension, diabetes and similar ranges are described as "the range conventionally used to diagnose"; confirmation always requires clinical testing.',
      'Genetic entries are research-only associations. Several of the modelled genes (e.g. BRCA1/2, LDLR, MLH1/MSH2) require confirmatory clinical testing and genetic counselling.',
      'Self-reported symptoms matched from AI chat are unverified statements, and the dashboard cannot rule anything out.',
    ],
  };
}

/** Compact { diseaseId: risk } map — used to diff two analysis runs. */
export function riskByDisease(assessment) {
  const out = {};
  for (const r of assessment?.results ?? []) {
    if (r?.applies && r?.id != null) out[r.id] = num(r.risk, null);
  }
  return out;
}

/**
 * Compare two assessment runs. Deterministic models return identical numbers
 * for identical inputs, so this is what the "re-run" button reports: what
 * actually moved and what did not.
 *
 * Either side may be null, an empty object or a partially built assessment (a
 * failed scoring pass, a store that has not hydrated yet). Nothing here assumes
 * a field exists — an unusable pair returns null so the caller can say "no
 * comparison was possible" instead of reporting a fake change.
 */
export function diffAssessments(previous, next) {
  if (!previous || !next) return null;
  const before = riskByDisease(previous);
  const after = riskByDisease(next);
  const nextResults = next?.results ?? [];
  const ids = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  if (ids.length === 0) {
    return {
      changed: [],
      unchanged: [],
      anyChange: false,
      comparable: 0,
      summary:
        'Neither run produced a scoreable estimate, so there is nothing to compare. This happens when no model applies to the profile or when scoring failed.',
    };
  }
  const changed = [];
  const unchanged = [];
  for (const id of ids) {
    const a = before[id];
    const b = after[id];
    // A model that applies in one run but not the other is a change of
    // applicability, not a change of risk — it is not reported as a movement.
    if (a == null || b == null) continue;
    const delta = roundPct(b - a);
    const label = nextResults.find((r) => r?.id === id)?.label ?? id;
    if (Math.abs(delta) < 0.05) unchanged.push({ id, label, risk: b });
    else changed.push({ id, label, from: a, to: b, delta });
  }
  changed.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  const comparable = changed.length + unchanged.length;
  return {
    changed,
    unchanged,
    anyChange: changed.length > 0,
    comparable,
    summary: changed.length
      ? `${changed.length} of ${comparable} comparable estimate(s) changed.`
      : `No estimate changed across ${comparable} comparable model(s) — the inputs are identical to the previous run. Add or correct data and run the analysis again to see a difference.`,
  };
}




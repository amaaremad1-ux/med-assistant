/**
 * Module 12 logic — pediatric & geriatric dose adaptor.
 *
 * Standard, published anthropometric / renal formulas (DuBois, Mosteller,
 * Cockcroft-Gault, Schwartz) plus a small per-drug renal band table. The band
 * tables are demo knowledge entries chosen to be directionally sensible for a
 * research prototype: every recommendation the UI shows is labelled as needing
 * professional countersignature, and nothing here is a validated dosing system.
 */

const round = (v, d = 2) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

/** DuBois & DuBois body-surface area in m² (height cm, weight kg). */
export function calculateBsaDuBois(heightCm, weightKg) {
  const h = Number(heightCm);
  const w = Number(weightKg);
  if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0 || w <= 0) return 0;
  return round(0.007184 * w ** 0.425 * h ** 0.725, 2);
}

/** Mosteller body-surface area in m². */
export function calculateBsaMosteller(heightCm, weightKg) {
  const h = Number(heightCm);
  const w = Number(weightKg);
  if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0 || w <= 0) return 0;
  return round(Math.sqrt((h * w) / 3600), 2);
}

/**
 * Cockcroft-Gault creatinine clearance in mL/min.
 * Returns { value, stage } so the UI can show the renal band it used.
 */
export function calculateCockcroftGault(ageYears, weightKg, serumCreatinine, sex = 'male') {
  const age = Number(ageYears);
  const wt = Number(weightKg);
  const scr = Number(serumCreatinine);
  if (!Number.isFinite(age) || !Number.isFinite(wt) || !Number.isFinite(scr) || scr <= 0) {
    return { value: 0, stage: 'not computable' };
  }
  const female = String(sex).toLowerCase().startsWith('f');
  const value = round(((140 - age) * wt * (female ? 0.85 : 1)) / (72 * scr), 1);
  let stage = 'within usual range';
  if (value < 15) stage = 'kidney-failure band';
  else if (value < 30) stage = 'severely reduced';
  else if (value < 60) stage = 'moderately reduced';
  else if (value < 90) stage = 'mildly reduced';
  return { value, stage };
}

/** Schwartz bedside paediatric eGFR in mL/min/1.73 m². */
export function calculateSchwartzEgfr(heightCm, serumCreatinine) {
  const h = Number(heightCm);
  const scr = Number(serumCreatinine);
  if (!Number.isFinite(h) || !Number.isFinite(scr) || scr <= 0) return 0;
  return round((0.413 * h) / scr, 1);
}

const bands = (critical, caution) => [
  { label: 'eGFR 0–29.9', minEgfr: 0, maxEgfr: 29.9, band: 'Critical', instruction: critical },
  { label: 'eGFR 30–59.9', minEgfr: 30, maxEgfr: 59.9, band: 'Caution', instruction: caution },
  { label: 'eGFR ≥ 60', minEgfr: 60, maxEgfr: 250, band: 'Safe', instruction: 'Standard adult dose.' },
];

/** Demo renal-dosing knowledge base (one row per agent). */
export const RENAL_DOSE_KNOWLEDGE = [
  {
    drug: 'Amoxicillin',
    adultStandardDose: '500 mg PO q8h',
    pediatricBsaDose: '25 mg/kg/day in 3 divided doses',
    weightBased: 'Paediatric: 25 mg/kg/day divided q8h',
    renalRules: bands(
      '500 mg q12h; avoid high-dose regimens.',
      '500 mg q8h with extended interval review.',
    ),
  },
  {
    drug: 'Metformin',
    adultStandardDose: '500 mg PO q12h',
    pediatricBsaDose: 'Not recommended under 10 y',
    weightBased: null,
    renalRules: bands(
      'Contraindicated — stop and refer.',
      'Maximum 500 mg once daily; review quarterly.',
    ),
  },
  {
    drug: 'Gentamicin',
    adultStandardDose: '5 mg/kg IV q24h',
    pediatricBsaDose: '7.5 mg/kg IV q24h',
    weightBased: 'Dose by actual body weight, levels guided',
    renalRules: bands(
      'Level-guided dosing only; extend to q48h.',
      'Extend interval to q36–48h with levels.',
    ),
  },
  {
    drug: 'Levetiracetam',
    adultStandardDose: '500 mg PO q12h',
    pediatricBsaDose: '20 mg/kg/day in 2 divided doses',
    weightBased: 'Paediatric: 20 mg/kg/day divided q12h',
    renalRules: bands(
      '250 mg q12h (or 500 mg q24h post-dialysis).',
      '500 mg q12h with review.',
    ),
  },
  {
    drug: 'Ibuprofen',
    adultStandardDose: '400 mg PO q8h PRN',
    pediatricBsaDose: '30 mg/kg/day in 3 divided doses',
    weightBased: 'Paediatric: 10 mg/kg per dose q8h PRN',
    renalRules: bands(
      'Avoid — NSAID in severe renal impairment.',
      'Avoid if possible; shortest course only.',
    ),
  },
];

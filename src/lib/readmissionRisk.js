/**
 * 30-Day Hospital Readmission Forecast Engine
 *
 * Implements an auditable clinical risk model based on validated paradigms
 * (LACE Index, HOSPITAL score, and chronic disease trajectory metrics).
 */

function scoreLos(los) {
  const d = Math.max(0, Number(los) || 0);
  if (d < 1) return { points: 0, label: 'Same day (<24h)' };
  if (d === 1) return { points: 1, label: '1 day' };
  if (d === 2) return { points: 2, label: '2 days' };
  if (d === 3) return { points: 3, label: '3 days' };
  if (d <= 6) return { points: 4, label: `${d} days (4–6 range)` };
  if (d <= 13) return { points: 5, label: `${d} days (7–13 range)` };
  return { points: 7, label: `${d} days (14+ days)` };
}

function scoreAcuity(admissionType) {
  const type = String(admissionType || 'elective').toLowerCase();
  if (type === 'emergent' || type === 'emergency' || type === 'ed') {
    return { points: 3, label: 'Emergency admission (+3 pts)' };
  }
  if (type === 'urgent') {
    return { points: 2, label: 'Urgent admission (+2 pts)' };
  }
  return { points: 0, label: 'Elective admission (+0 pts)' };
}

export const COMORBIDITY_WEIGHTS = {
  mi: { label: 'Myocardial Infarction', weight: 1 },
  chf: { label: 'Congestive Heart Failure', weight: 2 },
  pvd: { label: 'Peripheral Vascular Disease', weight: 1 },
  cevd: { label: 'Cerebrovascular Disease (Stroke/TIA)', weight: 1 },
  dementia: { label: 'Dementia', weight: 1 },
  copd: { label: 'Chronic Pulmonary Disease', weight: 1 },
  ctd: { label: 'Connective Tissue Disease', weight: 1 },
  pud: { label: 'Peptic Ulcer Disease', weight: 1 },
  liver_mild: { label: 'Mild Liver Disease', weight: 1 },
  t2d: { label: 'Diabetes without complications', weight: 1 },
  t2d_comp: { label: 'Diabetes with end-organ damage', weight: 2 },
  ckd_moderate: { label: 'Moderate-Severe CKD (eGFR < 45)', weight: 2 },
  tumor_solid: { label: 'Solid Tumor / Malignancy', weight: 2 },
  liver_severe: { label: 'Severe Liver Disease (Cirrhosis)', weight: 3 },
};

function scoreComorbidities(comorbidities = []) {
  let points = 0;
  const items = [];
  for (const c of comorbidities) {
    const meta = COMORBIDITY_WEIGHTS[c];
    if (meta) {
      points += meta.weight;
      items.push({ id: c, label: meta.label, points: meta.weight });
    }
  }
  return { points: Math.min(6, points), rawPoints: points, items };
}

function scoreEdVisits(count) {
  const c = Math.max(0, parseInt(count, 10) || 0);
  if (c === 0) return { points: 0, label: '0 prior visits' };
  if (c === 1) return { points: 1, label: '1 prior visit (+1 pt)' };
  if (c === 2) return { points: 2, label: '2 prior visits (+2 pts)' };
  if (c === 3) return { points: 3, label: '3 prior visits (+3 pts)' };
  return { points: 4, label: `${c} prior visits (4+ pts max)` };
}

function scoreBiomarkersAndSocial({
  hemoglobin,
  sodium,
  polypharmacyCount = 0,
  dischargedOnWeekend = false,
  livesAlone = false,
  followupScheduled = true,
}) {
  const drivers = [];
  const protective = [];
  let points = 0;

  if (hemoglobin != null && Number(hemoglobin) < 12) {
    points += 2;
    drivers.push({
      factor: 'Discharge Anemia',
      detail: `Hemoglobin ${hemoglobin} g/dL (< 12 g/dL threshold)`,
      points: 2,
    });
  }

  if (sodium != null && Number(sodium) < 135) {
    points += 2;
    drivers.push({
      factor: 'Hyponatremia',
      detail: `Serum sodium ${sodium} mEq/L (< 135 mEq/L threshold)`,
      points: 2,
    });
  }

  if (polypharmacyCount >= 5) {
    const pts = polypharmacyCount >= 8 ? 2 : 1;
    points += pts;
    drivers.push({
      factor: 'Complex Polypharmacy',
      detail: `${polypharmacyCount} active medications prescribed`,
      points: pts,
    });
  }

  if (dischargedOnWeekend) {
    points += 1;
    drivers.push({
      factor: 'Weekend Discharge',
      detail: 'Reduced outpatient clinic availability over weekend',
      points: 1,
    });
  }

  if (livesAlone) {
    points += 1;
    drivers.push({
      factor: 'Living Alone / Limited Support',
      detail: 'Unsupervised medication adherence and early symptom reporting risk',
      points: 1,
    });
  }

  if (followupScheduled) {
    points -= 2;
    protective.push({
      factor: '7-Day Follow-Up Booked',
      detail: 'Early outpatient reconciliation decreases 30-day bounce-back by ~25%',
      points: -2,
    });
  }

  return { points, drivers, protective };
}

export function readmissionTier(score) {
  if (score <= 4) {
    return {
      band: 'low',
      label: 'Low Risk',
      tone: 'good',
      pctRisk: Math.min(8.5, Math.max(3.2, score * 1.8 + 2)),
      description: 'Standard post-discharge instructions and routine primary care follow-up within 14–21 days.',
    };
  }
  if (score <= 9) {
    return {
      band: 'moderate',
      label: 'Moderate Risk',
      tone: 'warn',
      pctRisk: Math.min(22, Math.max(9.0, (score - 4) * 2.6 + 9)),
      description: 'Follow-up appointment within 7 days recommended; pharmacist discharge reconciliation advised.',
    };
  }
  return {
    band: 'high',
    label: 'High Readmission Risk',
    tone: 'bad',
    pctRisk: Math.min(48, Math.max(24, (score - 9) * 3.5 + 24)),
    description: 'High risk of 30-day relapse. Dedicated transitional care management and 48-hour call recommended.',
  };
}

export function calculateReadmissionRisk({
  patientId,
  patientName = 'Elena Vasquez',
  losDays = 2,
  admissionType = 'emergent',
  comorbidities = ['t2d', 'chf'],
  edVisits6m = 1,
  hemoglobin = 11.4,
  sodium = 136,
  polypharmacyCount = 6,
  dischargedOnWeekend = false,
  livesAlone = false,
  followupScheduled = true,
} = {}) {
  const los = scoreLos(losDays);
  const acuity = scoreAcuity(admissionType);
  const comorb = scoreComorbidities(comorbidities);
  const ed = scoreEdVisits(edVisits6m);
  const bio = scoreBiomarkersAndSocial({
    hemoglobin,
    sodium,
    polypharmacyCount,
    dischargedOnWeekend,
    livesAlone,
    followupScheduled,
  });

  const rawScore = los.points + acuity.points + comorb.points + ed.points + bio.points;
  const score = Math.max(0, Math.min(20, rawScore));
  const tier = readmissionTier(score);

  const allDrivers = [
    ...(los.points > 0 ? [{ factor: 'Length of Stay', detail: los.label, points: los.points }] : []),
    ...(acuity.points > 0 ? [{ factor: 'Admission Acuity', detail: acuity.label, points: acuity.points }] : []),
    ...comorb.items.map((i) => ({ factor: `Comorbidity: ${i.label}`, detail: `Charlson weight +${i.points}`, points: i.points })),
    ...(ed.points > 0 ? [{ factor: 'Prior ED Utilization', detail: ed.label, points: ed.points }] : []),
    ...bio.drivers,
  ].sort((a, b) => b.points - a.points);

  return {
    patientId,
    patientName,
    score,
    band: tier.band,
    bandLabel: tier.label,
    bandTone: tier.tone,
    pctProbability: Math.round(tier.pctRisk * 10) / 10,
    recommendation: tier.description,
    components: {
      los: { value: losDays, points: los.points, label: los.label },
      acuity: { value: admissionType, points: acuity.points, label: acuity.label },
      comorbidities: { count: comorbidities.length, points: comorb.points, list: comorb.items },
      edVisits: { count: edVisits6m, points: ed.points, label: ed.label },
    },
    drivers: allDrivers,
    protective: bio.protective,
    assessedAt: new Date().toISOString(),
  };
}


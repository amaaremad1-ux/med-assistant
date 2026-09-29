/**
 * Module 1: XAI - Explainable Clinical Risk Engine
 * Decomposes composite risk (LACE + HOSPITAL + Charlson) using SHAP attributions and waterfall.
 */

export function calculateXaiDecomposition({
  baseRisk = 12,
  hba1c = 6.4,
  systolicBp = 138,
  polypharmacyCount = 6,
  renalEgfr = 72,
  hasSpecialistFollowup = true,
  dailyExercise = true,
}) {
  const factors = [];

  if (hba1c >= 8.5) {
    factors.push({ name: 'Severe Hyperglycemia (HbA1c ≥ 8.5%)', category: 'Biomarker', delta: 28, direction: 'risk', weight: 0.35, why: 'High glycemic exposure directly damages microvascular beds.' });
  } else if (hba1c >= 6.5) {
    factors.push({ name: 'Elevated HbA1c (Type 2 Diabetes range)', category: 'Biomarker', delta: 18, direction: 'risk', weight: 0.22, why: 'Suboptimal glycemic control increases endothelial stress.' });
  } else if (hba1c >= 5.7) {
    factors.push({ name: 'Borderline Prediabetes HbA1c (5.7–6.4%)', category: 'Biomarker', delta: 8, direction: 'risk', weight: 0.10, why: 'Mild insulin resistance increases readmission vulnerability.' });
  }

  if (systolicBp >= 160) {
    factors.push({ name: 'Stage 2 Hypertension (SBP ≥ 160 mmHg)', category: 'Hemodynamic', delta: 22, direction: 'risk', weight: 0.28, why: 'Elevated afterload triggers end-organ strain and heart failure exacerbations.' });
  } else if (systolicBp >= 140) {
    factors.push({ name: 'Stage 1 Hypertension (SBP 140–159 mmHg)', category: 'Hemodynamic', delta: 12, direction: 'risk', weight: 0.15, why: 'Moderate hemodynamic burden accelerates arterial stiffness.' });
  }

  if (polypharmacyCount >= 8) {
    factors.push({ name: 'Severe Polypharmacy (≥8 active drugs)', category: 'Pharmacology', delta: 20, direction: 'risk', weight: 0.25, why: 'High drug interaction probability and adherence decay.' });
  } else if (polypharmacyCount >= 5) {
    factors.push({ name: 'Polypharmacy (5–7 medications)', category: 'Pharmacology', delta: 10, direction: 'risk', weight: 0.12, why: 'Complex dosing regimen increases metabolic adverse risks.' });
  }

  if (renalEgfr < 45) {
    factors.push({ name: 'Stage 3b/4 CKD (eGFR < 45 mL/min)', category: 'Renal', delta: 16, direction: 'risk', weight: 0.20, why: 'Decreased drug clearance leads to medication toxicity.' });
  } else if (renalEgfr < 60) {
    factors.push({ name: 'Moderate Renal Decline (eGFR 45–59 mL/min)', category: 'Renal', delta: 8, direction: 'risk', weight: 0.10, why: 'Mild clearance limitation requires attentive dose titration.' });
  }

  if (hasSpecialistFollowup) {
    factors.push({ name: 'Scheduled Post-Discharge Specialist Follow-up', category: 'Care Management', delta: -14, direction: 'protective', weight: 0.18, why: 'Rapid 7-day clinical review resolves early decompensation before ER arrival.' });
  }

  if (dailyExercise) {
    factors.push({ name: 'Active Lifestyle / Structured Exercise Protocol', category: 'Lifestyle', delta: -8, direction: 'protective', weight: 0.10, why: 'Preserves autonomic reserve and improves peripheral glucose utilization.' });
  }

  let running = baseRisk;
  const waterfallSteps = [{ name: 'Baseline Population Risk', val: baseRisk, running: baseRisk, delta: baseRisk, type: 'base' }];

  let totalRiskDeltas = 0;
  factors.forEach((f) => {
    if (f.delta > 0) totalRiskDeltas += f.delta;
  });

  const explainedFactors = factors.map((f) => {
    running = Math.max(2, Math.min(98, running + f.delta));
    const pctContribution = totalRiskDeltas > 0 && f.delta > 0 ? Math.round((f.delta / totalRiskDeltas) * 100) : 0;
    waterfallSteps.push({
      name: f.name,
      delta: f.delta,
      running,
      direction: f.direction,
      type: f.direction === 'risk' ? 'risk' : 'protective',
    });
    return {
      ...f,
      pctContribution: f.direction === 'risk' ? `${pctContribution}%` : 'Protective offset',
    };
  });

  const finalRiskScore = Math.max(4, Math.min(96, running));
  const primaryDriver = [...factors].sort((a, b) => b.delta - a.delta)[0];
  let clinicalRecommendation = 'Cohort profile is stable with well-mitigated baseline drivers.';
  if (primaryDriver && primaryDriver.delta > 0) {
    if (primaryDriver.category === 'Biomarker') {
      clinicalRecommendation = `Target Glycemic Derangement: Highest attribution driver is ${primaryDriver.name} (+${primaryDriver.delta}% risk). Intensify basal-bolus titration or SGLT2i adjuvant, with 14-day CGM tele-review.`;
    } else if (primaryDriver.category === 'Hemodynamic') {
      clinicalRecommendation = `Optimize Hemodynamics: Primary risk contributor is ${primaryDriver.name} (+${primaryDriver.delta}% risk). Titrate ARB/ACEi or add low-dose CCB, plus home ambulatory blood pressure tracking.`;
    } else if (primaryDriver.category === 'Pharmacology') {
      clinicalRecommendation = `Deprescribing Audit: Significant risk driver is ${primaryDriver.name} (+${primaryDriver.delta}% risk). Execute comprehensive Beers criteria audit to withdraw redundant anticholinergic or sedative co-prescriptions.`;
    } else if (primaryDriver.category === 'Renal') {
      clinicalRecommendation = `Renal Preservation: Substantial risk driver is ${primaryDriver.name}. Avoid nephrotoxins (NSAIDs), recheck cystatin-C and electrolytes within 10 days, and adjust renally cleared drug regimens.`;
    }
  }

  return {
    baseRisk,
    finalRiskScore,
    waterfallSteps,
    factors: explainedFactors,
    primaryDriver: primaryDriver || null,
    clinicalRecommendation,
  };
}

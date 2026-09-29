/**
 * Module 11, 12, 13: Geospatial, Adaptive Dosing & Tele-Triage
 */

export const HOSPITAL_WARDS_AND_ZONES = [
  { id: 'zone-north', name: 'North Wing · Surgical ICU & Step-Down', x: 28, y: 32, activeCases: 14, mrsaOutbreakRisk: 'High (Cluster identified)', tone: 'bad' },
  { id: 'zone-east', name: 'East Wing · Acute Respiratory & Pulmonology', x: 68, y: 28, activeCases: 22, mrsaOutbreakRisk: 'Elevated (Influenza/RSV cluster)', tone: 'warn' },
  { id: 'zone-south', name: 'South Wing · Cardiology & Telemetry Ward', x: 72, y: 72, activeCases: 8, mrsaOutbreakRisk: 'Low (Strict aseptic control)', tone: 'good' },
  { id: 'zone-west', name: 'West Wing · General Internal Medicine & Nephrology', x: 25, y: 68, activeCases: 18, mrsaOutbreakRisk: 'Medium (CRE surveillance alert)', tone: 'warn' },
  { id: 'zone-central', name: 'Central Complex · Trauma & Emergency Center', x: 48, y: 50, activeCases: 31, mrsaOutbreakRisk: 'High (Surge barrier protocol)', tone: 'bad' },
];

export function evaluateEpidemiologicalAlerts(zones = HOSPITAL_WARDS_AND_ZONES) {
  const criticalClusters = zones.filter((z) => z.tone === 'bad');
  return {
    totalMonitoredBeds: zones.reduce((acc, z) => acc + z.activeCases, 0),
    activeClusters: criticalClusters.length,
    nosocomialIndex: criticalClusters.length >= 2 ? 'Code Amber: Nosocomial Barrier Protocols Active' : 'Standard Biosafety',
    alerts: criticalClusters.map((c) => 'Nosocomial Alert in ' + c.name + ': ' + c.mrsaOutbreakRisk + '. Implement enhanced terminal cleaning and isolation.'),
  };
}

export function calculateAdaptiveDosing({
  age = 65,
  weightKg = 72,
  heightCm = 170,
  sex = 'Female',
  serumCreatinine = 1.3,
  targetDrug = 'vancomycin',
}) {
  const bsa = Math.sqrt((heightCm * weightKg) / 3600);
  const roundedBsa = +bsa.toFixed(2);
  const isFemale = (sex || '').toLowerCase().startsWith('f');
  let crCl = ((140 - age) * weightKg) / (72 * Math.max(0.4, serumCreatinine));
  if (isFemale) crCl *= 0.85;
  const roundedCrCl = +crCl.toFixed(1);

  let recommendedDose = 'Standard adult dosage', dosingInterval = 'Every 12 hours', adjustmentReason = 'CrCl in normal range (> 60 mL/min).', warningTone = 'good';
  if (targetDrug === 'vancomycin') {
    if (roundedCrCl < 20) { recommendedDose = '15 mg/kg load, then maintenance via trough levels'; dosingInterval = 'Every 48 to 72 hours'; adjustmentReason = 'Severe renal impairment (CrCl < 20 mL/min).'; warningTone = 'bad'; }
    else if (roundedCrCl < 50) { recommendedDose = '15 mg/kg'; dosingInterval = 'Every 24 hours'; adjustmentReason = 'Moderate renal decline (CrCl 20-49 mL/min).'; warningTone = 'warn'; }
    else { recommendedDose = '15-20 mg/kg (approx 1250 mg)'; dosingInterval = 'Every 8 to 12 hours'; adjustmentReason = 'Adequate renal filtration.'; warningTone = 'good'; }
  } else if (targetDrug === 'enoxaparin') {
    if (roundedCrCl < 30) { recommendedDose = '1 mg/kg once daily (or 30 mg SC once daily for DVT prophylaxis)'; dosingInterval = 'Every 24 hours'; adjustmentReason = 'CrCl < 30 mL/min leads to 2-3x anti-Xa accumulation.'; warningTone = 'bad'; }
    else { recommendedDose = '1 mg/kg twice daily (treatment) or 40 mg once daily (prophylaxis)'; dosingInterval = 'Every 12 hours (treatment)'; warningTone = 'good'; }
  } else if (targetDrug === 'chemo_cisplatin') {
    const calculatedChemoDose = Math.round(roundedBsa * 75);
    if (roundedCrCl < 60) { recommendedDose = Math.round(calculatedChemoDose * 0.5) + ' mg (50% reduction)'; dosingInterval = 'Day 1 with hydration'; adjustmentReason = 'CrCl ' + roundedCrCl + ' mL/min < 60 threshold. High nephrotoxicity risk.'; warningTone = 'bad'; }
    else { recommendedDose = calculatedChemoDose + ' mg (based on ' + roundedBsa + ' m2 BSA)'; dosingInterval = 'Every 21-day cycle'; warningTone = 'good'; }
  }

  return { bsa: roundedBsa, crCl: roundedCrCl, isPediatric: age < 18, recommendedDose, dosingInterval, adjustmentReason, warningTone };
}

export function evaluateRemotePatientSurvey({
  weightDeltaKg = 2.4,
  shortnessOfBreathScale = 3,
  ankleEdema = true,
  missedDosesLast3Days = 1,
  fatigueScale: _fatigueScale = 4,
}) {
  let riskScore = 0;
  const redFlags = [];
  if (weightDeltaKg >= 2.0) { riskScore += 45; redFlags.push('Rapid Fluid Retention: +' + weightDeltaKg + ' kg gain over 48h (Threshold >= 2.0 kg).'); }
  else if (weightDeltaKg >= 1.0) { riskScore += 15; redFlags.push('Mild fluid accumulation: +' + weightDeltaKg + ' kg.'); }

  if (shortnessOfBreathScale >= 4) { riskScore += 30; redFlags.push('Orthopnea / Paroxysmal Nocturnal Dyspnea (Scale >= 4).'); }
  else if (shortnessOfBreathScale >= 3) { riskScore += 15; redFlags.push('Exertional dyspnea on minimal walking.'); }

  if (ankleEdema) { riskScore += 15; redFlags.push('New or worsening bilateral ankle pitting edema.'); }
  if (missedDosesLast3Days >= 2) { riskScore += 20; redFlags.push('Critical non-adherence: ' + missedDosesLast3Days + ' missed loop diuretic doses.'); }

  let triageTier = 'Stable - Standard Remote Monitoring', triageAction = 'Reinforce sodium restriction and daily morning weight tracking before breakfast.', alertTone = 'good';
  if (riskScore >= 60) { triageTier = 'URGENT: Imminent Acute Heart Failure Readmission'; triageAction = 'Direct Outreach: Contact patient immediately for outpatient IV Furosemide or mobile urgent response.'; alertTone = 'bad'; }
  else if (riskScore >= 30) { triageTier = 'MODERATE: Early Decompensation Warning'; triageAction = 'Nurse Tele-Consult within 4 hours. Temporarily adjust oral diuretic dose per protocol.'; alertTone = 'warn'; }

  return { riskScore, triageTier, triageAction, alertTone, redFlags };
}

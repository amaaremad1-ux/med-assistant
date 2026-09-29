/**
 * Module 2 & 3: Digital Twin Simulator & Smart ICU Fleet Allocation
 */

export function simulateDigitalTwin({
  systolicBp = 135,
  diastolicBp: _diastolicBp = 85,
  drugDosePct = 100,
  baselineHr = 72,
  baselineCreatinine = 1.1,
  baselineSpO2 = 98,
}) {
  const sbpRatio = systolicBp / 120;
  const doseFactor = drugDosePct / 100;

  const projectedHr = Math.round(baselineHr + (sbpRatio - 1) * 25 - (doseFactor - 1) * 12);
  const cardiacStrain = Math.min(100, Math.round(((systolicBp * projectedHr) / 12000) * 50));

  let projectedCreatinine = +(baselineCreatinine * (systolicBp > 160 ? 1.25 : systolicBp < 95 ? 1.4 : 1.0) * (doseFactor > 1.5 ? 1.15 : 1.0)).toFixed(2);
  const renalPerfusionScore = Math.max(10, Math.min(100, Math.round(100 - (projectedCreatinine - 0.8) * 45)));

  const projectedSpO2 = Math.max(82, Math.min(100, Math.round(baselineSpO2 - (systolicBp > 175 ? 4 : 0) - (doseFactor < 0.6 ? 3 : 0))));

  const organFailureRisk24h = Math.min(95, Math.max(5, Math.round((cardiacStrain * 0.4) + ((100 - renalPerfusionScore) * 0.4) + ((100 - projectedSpO2) * 2))));
  const organFailureRisk48h = Math.min(98, Math.max(4, Math.round(organFailureRisk24h * (systolicBp > 165 || projectedSpO2 < 92 ? 1.35 : 0.75))));

  const trajectorySeries = [
    { hour: '0h', risk: Math.round(organFailureRisk24h * 0.7), cardiac: cardiacStrain, renal: 100 - renalPerfusionScore },
    { hour: '6h', risk: Math.round(organFailureRisk24h * 0.8), cardiac: Math.round(cardiacStrain * 1.02), renal: Math.round((100 - renalPerfusionScore) * 1.03) },
    { hour: '12h', risk: Math.round(organFailureRisk24h * 0.92), cardiac: Math.round(cardiacStrain * 1.05), renal: Math.round((100 - renalPerfusionScore) * 1.07) },
    { hour: '24h', risk: organFailureRisk24h, cardiac: Math.round(cardiacStrain * 1.1), renal: Math.round((100 - renalPerfusionScore) * 1.12) },
    { hour: '36h', risk: Math.round((organFailureRisk24h + organFailureRisk48h) / 2), cardiac: Math.round(cardiacStrain * 1.15), renal: Math.round((100 - renalPerfusionScore) * 1.18) },
    { hour: '48h', risk: organFailureRisk48h, cardiac: Math.round(cardiacStrain * 1.2), renal: Math.round((100 - renalPerfusionScore) * 1.25) },
  ];

  return {
    projectedHr,
    cardiacStrain,
    projectedCreatinine,
    renalPerfusionScore,
    projectedSpO2,
    organFailureRisk24h,
    organFailureRisk48h,
    recoveryProbability: Math.max(5, 100 - organFailureRisk48h),
    trajectorySeries,
  };
}

export function calculateIcuTriageScore({
  fabScore = 50,
  sbp = 120,
  hr = 75,
  spo2 = 96,
  gcs = 15,
  vasopressors = false,
  mechanicalVentilation = false,
}) {
  let priorityPoints = 0;
  const criteria = [];

  if (sbp < 90 || sbp > 200) { priorityPoints += 25; criteria.push('Hemodynamic Shock (SBP < 90 or > 200 mmHg)'); }
  if (spo2 < 90) { priorityPoints += 25; criteria.push('Severe Hypoxemia (SpO2 < 90% on ambient air)'); }
  if (hr > 130 || hr < 45) { priorityPoints += 20; criteria.push('Critical Cardiac Arrhythmia / Tachycardia'); }
  if (gcs <= 8) { priorityPoints += 30; criteria.push('Coma / Severely Impaired Sensorium (GCS ≤ 8)'); }
  else if (gcs <= 12) { priorityPoints += 15; criteria.push('Acute Encephalopathy (GCS 9–12)'); }

  if (mechanicalVentilation) { priorityPoints += 35; criteria.push('Active Invasive Mechanical Ventilation'); }
  if (vasopressors) { priorityPoints += 30; criteria.push('Refractory Vasopressor Infusion'); }

  priorityPoints += Math.round(fabScore * 0.3);

  let tier = 'Tier 4 - Standard Ward';
  let tierTone = 'good';
  let recommendedBed = 'General Medical Floor';

  if (priorityPoints >= 80) {
    tier = 'Tier 1 - Resuscitation / ICU Bed Mandatory';
    tierTone = 'bad';
    recommendedBed = 'ICU Isolation / Level 3 Critical Bed';
  } else if (priorityPoints >= 50) {
    tier = 'Tier 2 - Step-Down HDU / Coronary Care';
    tierTone = 'warn';
    recommendedBed = 'High Dependency Unit (HDU) Bed';
  } else if (priorityPoints >= 25) {
    tier = 'Tier 3 - Monitored Telemetry Bed';
    tierTone = 'info';
    recommendedBed = 'Step-Down Monitored Bed';
  }

  return { priorityPoints, tier, tierTone, recommendedBed, criteria };
}

export function generateIcuStressCohort(count = 20) {
  const patientNames = [
    'Elena Vasquez', 'Marcus Vance', 'David Chen', 'Amina Idris', 'Tariq Al-Mansoor',
    'Robert Sterling', 'Fatima Zahra', 'Arthur Pendelton', 'Sophia Lorenzi', 'Jamal Washington',
    'Ingrid Bergman', 'Carlos Santana', 'Mei-Ling Zhou', 'Gabriel Silva', 'Olga Romanova',
    'Kenji Sato', 'Nour El-Din', 'Grace Hopper', 'Hannah Schmidt', 'Lucas Moura'
  ];

  return Array.from({ length: count }, (_, idx) => {
    const isCritical = idx < 5;
    const isModerate = idx >= 5 && idx < 12;
    const sbp = isCritical ? (idx % 2 === 0 ? 78 : 210) : isModerate ? 155 : 124 + (idx % 10);
    const hr = isCritical ? 138 : isModerate ? 104 : 74 + (idx % 12);
    const spo2 = isCritical ? 86 : isModerate ? 93 : 98;
    const gcs = isCritical ? 7 : isModerate ? 12 : 15;
    const fab = isCritical ? 82 : isModerate ? 55 : 28;
    const vasopressors = isCritical && idx % 2 === 0;
    const mechanicalVentilation = isCritical;

    const triage = calculateIcuTriageScore({
      fabScore: fab,
      sbp,
      hr,
      spo2,
      gcs,
      vasopressors,
      mechanicalVentilation,
    });

    return {
      id: 'ICU-PT-' + String(idx + 1).padStart(3, '0'),
      name: patientNames[idx] || ('Patient ' + (idx + 1)),
      age: 45 + (idx * 2) % 40,
      bed: idx < 8 ? ('ICU-Bed-0' + (idx + 1)) : idx < 14 ? ('HDU-Bed-0' + (idx - 7)) : ('Ward-Bed-0' + (idx - 13)),
      sbp,
      hr,
      spo2,
      gcs,
      fab,
      vasopressors,
      mechanicalVentilation,
      ...triage,
    };
  }).sort((a, b) => b.priorityPoints - a.priorityPoints);
}

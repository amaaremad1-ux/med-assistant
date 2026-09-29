/**
 * Module 5: Stroke & Sepsis Early Warning System (mNEWS2 & qSOFA)
 */

export function calculateMnews2AndQsofa({
  rr = 18,
  spo2 = 98,
  onAir = true,
  sbp = 120,
  hr = 75,
  temp = 37.0,
  consciousness = 'Alert',
  hasArrhythmia = false,
}) {
  let newsScore = 0;
  const breakdown = [];

  if (rr <= 8) { newsScore += 3; breakdown.push('RR ≤ 8 bpm (+3)'); }
  else if (rr <= 11) { newsScore += 1; breakdown.push('RR 9–11 bpm (+1)'); }
  else if (rr <= 20) { /* normal */ }
  else if (rr <= 24) { newsScore += 2; breakdown.push('RR 21–24 bpm (+2)'); }
  else { newsScore += 3; breakdown.push('RR ≥ 25 bpm (+3)'); }

  if (spo2 <= 91) { newsScore += 3; breakdown.push('SpO2 ≤ 91% (+3)'); }
  else if (spo2 <= 93) { newsScore += 2; breakdown.push('SpO2 92–93% (+2)'); }
  else if (spo2 <= 95) { newsScore += 1; breakdown.push('SpO2 94–95% (+1)'); }

  if (!onAir) { newsScore += 2; breakdown.push('Supplemental Oxygen (+2)'); }

  if (sbp <= 90) { newsScore += 3; breakdown.push('SBP ≤ 90 mmHg (+3)'); }
  else if (sbp <= 100) { newsScore += 2; breakdown.push('SBP 91–100 mmHg (+2)'); }
  else if (sbp <= 110) { newsScore += 1; breakdown.push('SBP 101–110 mmHg (+1)'); }
  else if (sbp >= 220) { newsScore += 3; breakdown.push('Hypertensive Urgency SBP ≥ 220 (+3)'); }

  if (hr <= 40) { newsScore += 3; breakdown.push('Severe Bradycardia HR ≤ 40 bpm (+3)'); }
  else if (hr <= 50) { newsScore += 1; breakdown.push('HR 41–50 bpm (+1)'); }
  else if (hr <= 90) { /* normal */ }
  else if (hr <= 110) { newsScore += 1; breakdown.push('HR 91–110 bpm (+1)'); }
  else if (hr <= 130) { newsScore += 2; breakdown.push('HR 111–130 bpm (+2)'); }
  else { newsScore += 3; breakdown.push('Extreme Tachycardia HR ≥ 131 bpm (+3)'); }

  if (temp <= 35.0) { newsScore += 3; breakdown.push('Hypothermia Temp ≤ 35.0°C (+3)'); }
  else if (temp <= 36.0) { newsScore += 1; breakdown.push('Temp 35.1–36.0°C (+1)'); }
  else if (temp <= 38.0) { /* normal */ }
  else if (temp <= 39.0) { newsScore += 1; breakdown.push('Pyrexia Temp 38.1–39.0°C (+1)'); }
  else { newsScore += 2; breakdown.push('High Fever Temp ≥ 39.1°C (+2)'); }

  if (consciousness !== 'Alert') { newsScore += 3; breakdown.push('Altered Sensorium (' + consciousness + ') (+3)'); }

  let qSofaScore = 0;
  const qSofaCriteria = [];
  if (rr >= 22) { qSofaScore += 1; qSofaCriteria.push('Tachypnea (RR ≥ 22 breaths/min)'); }
  if (consciousness !== 'Alert') { qSofaScore += 1; qSofaCriteria.push('Altered Mentation (GCS < 15)'); }
  if (sbp <= 100) { qSofaScore += 1; qSofaCriteria.push('Hypotension (SBP ≤ 100 mmHg)'); }

  let strokeRisk = 'Low';
  let strokeAlert = false;
  if (hasArrhythmia && (sbp > 160 || hr > 115)) {
    strokeRisk = 'High (Embolic Cardioversion / AFib Alert)';
    strokeAlert = true;
  } else if (sbp >= 200 || (consciousness !== 'Alert' && sbp >= 160)) {
    strokeRisk = 'Critical (Hemorrhagic / Ischemic Threshold)';
    strokeAlert = true;
  }

  let protocol = 'Routine clinical ward monitoring every 12 hours.';
  let alertTone = 'good';
  if (newsScore >= 7 || qSofaScore >= 2 || strokeAlert) {
    protocol = 'CRITICAL EMERGENCY: Call Medical Emergency Team (MET) / Sepsis-Stroke Code immediately. Deliver Sepsis 6 bundle within 1 hour.';
    alertTone = 'bad';
  } else if (newsScore >= 5 || qSofaScore === 1) {
    protocol = 'URGENT REVIEW: Acute care clinician to review within 30 minutes. Increase monitoring frequency to every 1 hour.';
    alertTone = 'warn';
  }

  return {
    newsScore,
    qSofaScore,
    strokeRisk,
    strokeAlert,
    breakdown,
    qSofaCriteria,
    protocol,
    alertTone,
  };
}

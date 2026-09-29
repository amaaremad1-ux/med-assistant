/**
 * Module 13 logic — tele-triage & remote monitoring.
 *
 * A transparent rule set over a daily home check-in: the heart-failure weight
 * rule (≥ 2 kg above the discharge baseline), symptom flags, adherence and
 * mood. Every point is bounded and every flag names the answer that raised it,
 * so the escalation tier shown in the UI is always traceable to an input.
 *
 * This is a demo triage aid for a research prototype — not a medical device
 * and not a substitute for clinical judgement.
 */

export const TELE_TONE_MAP = { Low: 'good', Medium: 'warn', High: 'bad' };

export function assessRemoteMonitoringSymptoms({
  baselineWeight = null,
  currentWeight = null,
  shortnessOfBreath = false,
  edema = false,
  chestPain = false,
  medicationAdherence = true,
  moodScore = 3,
  medications = [],
} = {}) {
  const base = Number(baselineWeight);
  const now = Number(currentWeight);
  const delta = Number.isFinite(base) && Number.isFinite(now) ? now - base : 0;
  const weightAlert = delta >= 2;

  const flags = [];
  let score = 0;

  if (weightAlert) {
    score += 3;
    flags.push(`Weight +${delta.toFixed(1)} kg vs discharge baseline — HF rule triggered (≥ 2 kg).`);
  } else if (delta >= 1) {
    score += 1;
    flags.push(`Weight +${delta.toFixed(1)} kg vs baseline — below the 2 kg rule, keep watching.`);
  }
  if (shortnessOfBreath) {
    score += 2;
    flags.push('New or worse breathlessness reported at home.');
  }
  if (edema) {
    score += 2;
    flags.push('Ankle swelling reported at home.');
  }
  if (chestPain) {
    score += 3;
    flags.push('Chest pain reported — same-day clinical assessment rule.');
  }
  if (medicationAdherence === false) {
    score += 1;
    flags.push(
      medications.length
        ? `Doses missed since last check-in (${medications.length} medication${medications.length === 1 ? '' : 's'} on file).`
        : 'Doses missed since last check-in.',
    );
  }
  if (Number.isFinite(moodScore) && moodScore <= 2) {
    score += 1;
    flags.push(`Low mood self-rated ${moodScore}/5 at check-in.`);
  }

  const riskLevel = score >= 6 ? 'High' : score >= 3 ? 'Medium' : 'Low';
  const escalationLevel = chestPain || score >= 6 ? 'RED' : score >= 3 ? 'AMBER' : 'GREEN';
  const escalationMessage =
    escalationLevel === 'RED'
      ? 'Same-day contact: clinic calls the patient today and arranges assessment.'
      : escalationLevel === 'AMBER'
        ? '48-hour review: nurse reviews the trend at the next outreach slot.'
        : 'Routine follow-up: continue the scheduled remote monitoring cadence.';

  return {
    riskScore: score,
    riskLevel,
    toneMap: TELE_TONE_MAP,
    escalationLevel,
    escalationMessage,
    weightAlert,
    deltaKg: Math.round(delta * 10) / 10,
    flags,
    note:
      'Rule-based demo triage over a home questionnaire. Escalation tiers describe the prototype workflow only — they are not clinical advice.',
  };
}

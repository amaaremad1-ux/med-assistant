/**
 * Hallucination guard for the research copilot.
 * Every claim path must verify that the backing collection is non-empty.
 */

export const INSUFFICIENT_EVIDENCE = 'Insufficient evidence.';

export function guardSnapshot(snapshot) {
  const missing = snapshot?.missing ?? [];
  const available = snapshot?.available ?? [];
  return {
    hasLabs: (snapshot?.bloodTests?.count ?? 0) > 0,
    hasGenetics: (snapshot?.genetic?.count ?? 0) > 0,
    hasRecords: (snapshot?.medicalRecords?.count ?? 0) > 0,
    hasSignals: (snapshot?.signals?.count ?? 0) > 0,
    hasHub: (snapshot?.hub?.count ?? 0) > 0,
    missing,
    available,
  };
}

export function requireData(flag, label) {
  if (flag) return null;
  return `${INSUFFICIENT_EVIDENCE} No ${label} are available in application state.`;
}

export function guardedLine(condition, textWhenPresent) {
  return condition ? textWhenPresent : INSUFFICIENT_EVIDENCE;
}

/**
 * Céline clinical-suite engine barrel.
 *
 * The 13 championship modules keep their logic in small single-purpose files
 * under src/lib/celine/. The module components import everything from this one
 * path so the suite has a single, auditable public surface.
 *
 * Nothing here adds behaviour — it only re-exports, so the contract of each
 * function lives next to its implementation.
 */

export {
  computeSha256,
  appendCryptographicLog,
  getImmutableAuditTrail,
} from './celine/cryptoAudit.js';

export { classifyStartTriage, generateDisasterCohort } from './celine/disasterTriage.js';

export { calculateMnews2AndQsofa } from './celine/earlyWarning.js';

export { generateFhirR4Bundle } from './celine/fhirExport.js';

export {
  HOSPITAL_WARDS_AND_ZONES,
  evaluateEpidemiologicalAlerts,
  calculateAdaptiveDosing,
  evaluateRemotePatientSurvey,
} from './celine/geoDosingTele.js';

export { calculateCompositeMortality } from './celine/mortalityEngine.js';

export { PGX_GENE_DRUG_DATABASE, checkPgxInteractions } from './celine/pgxEngine.js';

export { simulateDigitalTwin, calculateIcuTriageScore, generateIcuStressCohort } from './celine/twinIcu.js';

export { VOICE_COMMAND_REGISTRY, parseVoiceToSoap } from './celine/voiceScribe.js';

export { calculateXaiDecomposition } from './celine/xaiRisk.js';

export {
  RENAL_DOSE_KNOWLEDGE,
  calculateBsaDuBois,
  calculateBsaMosteller,
  calculateCockcroftGault,
  calculateSchwartzEgfr,
} from './celine/moduleDos.js';

export { assessRemoteMonitoringSymptoms, TELE_TONE_MAP } from './celine/moduleTele.js';

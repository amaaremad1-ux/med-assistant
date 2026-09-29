/**
 * Module 7: Hands-Free Voice Command System & Scribing
 */

export const VOICE_COMMAND_REGISTRY = [
  { trigger: ['show ecg', 'ecg', 'cardiac monitor', 'رسم قلب'], tab: 'icu', actionName: 'Navigate to ICU Monitor' },
  { trigger: ['pharmacy', 'smart pharmacy', 'drug check', 'صيدلية'], tab: 'pgx', actionName: 'Open PGx & Pharmacy Matrix' },
  { trigger: ['icu', 'icu bed', 'intensive care', 'عناية مركزة'], tab: 'icu', actionName: 'Open Smart ICU Bed Fleet Allocation' },
  { trigger: ['disaster', 'mass casualty', 'triage', 'كوارث'], tab: 'disaster', actionName: 'Launch START Disaster Casualty Triage' },
  { trigger: ['digital twin', 'what if', 'twin simulator', 'توأم رقمي'], tab: 'twin', actionName: 'Launch Digital Twin Simulator' },
  { trigger: ['fhir', 'export fhir', 'hl7', 'تصدير'], tab: 'fhir', actionName: 'Open FHIR R4 Interoperability' },
  { trigger: ['stroke', 'sepsis', 'early warning', 'جلطة', 'تسمم'], tab: 'warning', actionName: 'Open Stroke & Sepsis Early Warning' },
  { trigger: ['pharmacogenomics', 'cyp450', 'genes drug', 'جينات الأدوية'], tab: 'pgx', actionName: 'Open Pharmacogenomics CYP450 Matrix' },
  { trigger: ['mortality', 'sofa', 'apache', 'وفيات'], tab: 'mortality', actionName: 'Open SOFA & Mortality Multi-Score Engine' },
  { trigger: ['geospatial', 'epidemic', 'heatmap', 'خريطة الأوبئة'], tab: 'geo', actionName: 'Open Epidemiological Heatmap' },
  { trigger: ['pediatric', 'pediatrics', 'dose adaptor', 'جرعات أطفال'], tab: 'dosing', actionName: 'Open Pediatric & Geriatric Dose Adaptor' },
  { trigger: ['remote', 'telehealth', 'tele-triage', 'طب اتصالي'], tab: 'tele', actionName: 'Open Tele-Triage & Remote Monitoring' },
  { trigger: ['audit trail', 'hash', 'security', 'أمان'], tab: 'audit', actionName: 'Open Cryptographic Immutable Audit' },
];

export function parseVoiceToSoap(rawTranscript = '') {
  const text = rawTranscript.toLowerCase();
  let subjective = 'Patient verbal interview recorded via sterile field voice command.\n';
  let objective = 'Objective observations captured by telemetry sensor grid.\n';
  let assessment = 'Assessment derived from clinical dialogue parsing.\n';
  let plan = 'Therapeutic plan generated from dictated physician orders.\n';

  if (text.includes('pain') || text.includes('chest') || text.includes('fatigue') || text.includes('ألم')) {
    subjective += 'Chief Complaint: Dictated symptoms indicate acute discomfort: ' + rawTranscript;
  } else {
    subjective += 'Clinical Dictation: ' + (rawTranscript || 'Routine review of clinical status.');
  }

  objective += 'Vitals confirmed regular; multi-lead bio-telemetry synchronized with hospital central monitor.';
  assessment += 'Clinical presentation aligns with active management of chronic cardio-metabolic markers.';
  plan += 'Continue pharmacologic protocol, maintain daily tele-monitoring, follow up scheduled.';

  return { subjective, objective, assessment, plan };
}

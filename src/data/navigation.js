/**
 * Application navigation for the clinical console.
 * Existing sections are preserved. New RESEARCH / GENETICS / SIGNALS / LABS /
 * ANALYSIS groups surface the bio-signal intelligence platform without
 * removing prior sidebar items, and the CLINICAL SUITE group hosts the patient
 * risk, pharmacy, notes and report modules.
 */

export const navSections = [
  {
    section: 'Overview',
    items: [{ to: '/', label: 'Research Dashboard', icon: 'dashboard', end: true }],
  },
  {
    section: 'Clinical Suite',
    items: [
      { to: '/celine', label: 'Clinical Suite · 13 Modules', icon: 'sparkles' },
      { to: '/patients', label: 'Patients & FAB Risk', icon: 'users' },
      { to: '/readmission', label: 'Readmission Forecast', icon: 'trending' },
      { to: '/timeline', label: 'Timeline & Analytics', icon: 'activity' },
      { to: '/pharmacy', label: 'Smart Pharmacy & Symptoms', icon: 'pills' },
      { to: '/notes', label: 'Clinical Notes (SOAP)', icon: 'clipboard' },
      { to: '/clinical-report', label: 'Clinical Report (PDF)', icon: 'printer' },
    ],
  },
  {
    section: 'Patient',
    items: [
      { to: '/unified-dashboard', label: 'Unified Health & Risk', icon: 'shield' },
      { to: '/patient', label: 'Patient Dashboard', icon: 'user' },
      { to: '/profile', label: 'Health Profile', icon: 'clipboard' },
    ],
  },
  {
    section: 'Device & Data',
    items: [{ to: '/device', label: 'Device Interface', icon: 'bluetooth' }],
  },
  {
    section: 'Data',
    items: [
      { to: '/records', label: 'Medical Records', icon: 'file' },
      { to: '/blood-lab', label: 'Blood & Laboratory Data', icon: 'droplet' },
      { to: '/genetic', label: 'Genetic & DNA Profile', icon: 'dna' },
    ],
  },
  {
    section: 'Research',
    items: [
      { to: '/research-hub', label: 'Research Data Hub', icon: 'database' },
      { to: '/dataset-builder', label: 'Dataset Builder & Evidence', icon: 'clipboard' },
      { to: '/research-lab', label: 'Research Lab', icon: 'flask' },
      { to: '/research-reports', label: 'Discovery Reports', icon: 'file' },
    ],
  },
  {
    section: 'Genetics',
    items: [
      { to: '/genetic', label: 'Genetic & DNA Profile', icon: 'dna' },
      { to: '/genetic-explorer', label: 'Genetic Research Explorer', icon: 'search' },
    ],
  },
  {
    section: 'Signals',
    items: [
      { to: '/signals', label: 'Bio-Signal Library', icon: 'pulse' },
      { to: '/signal-intelligence', label: 'Baseline · Fingerprint · Fusion', icon: 'gauge' },
      { to: '/signal-replay', label: 'Signal Event Replay', icon: 'activity' },
    ],
  },
  {
    section: 'Labs',
    items: [
      { to: '/blood-lab', label: 'Blood & Laboratory Data', icon: 'droplet' },
      { to: '/lab-research', label: 'Laboratory Research View', icon: 'flask' },
    ],
  },
  {
    section: 'Analysis',
    items: [
      { to: '/longitudinal', label: 'Longitudinal AI', icon: 'trending' },
      { to: '/risk', label: 'Risk Intelligence', icon: 'shield' },
      { to: '/biomarker-map', label: 'Biomarker Map', icon: 'network' },
      { to: '/cross-domain', label: 'Cross-Domain Correlation', icon: 'network' },
      { to: '/family-genome', label: 'Family & Genome Layer', icon: 'users' },
      { to: '/assistant', label: 'AI Health Assistant', icon: 'message' },
    ],
  },
  {
    section: 'Simulation',
    items: [
      { to: '/counterfactual', label: 'Counterfactual', icon: 'sliders' },
      { to: '/whatif', label: 'What-If Lab', icon: 'flask' },
    ],
  },
  {
    section: 'Research Lab',
    items: [
      { to: '/lab', label: 'Experiments', icon: 'flask' },
      { to: '/models', label: 'Model Registry', icon: 'cpu' },
      { to: '/validation', label: 'Validation Study', icon: 'check' },
      { to: '/fairness', label: 'Fairness Research', icon: 'users' },
      { to: '/federated', label: 'Federated Research', icon: 'network' },
    ],
  },
  {
    section: 'Real Research Cases',
    items: [
      { to: '/research-cases', label: 'Case Library', icon: 'heart' },
      { to: '/research-compare', label: 'Real vs Synthetic', icon: 'gauge' },
      { to: '/research-analytics', label: 'Dataset Analytics', icon: 'activity' },
      { to: '/research-methodology', label: 'Data & Methodology', icon: 'file' },
    ],
  },
  {
    section: 'System',
    items: [
      { to: '/modules', label: 'Disease Modules', icon: 'pulse' },
      { to: '/privacy', label: 'Privacy & Data', icon: 'lock' },
      { to: '/audit', label: 'Audit Trail', icon: 'clock' },
      { to: '/settings', label: 'Settings', icon: 'sliders' },
    ],
  },
];

export const routeTitles = navSections.flatMap((s) =>
  s.items.map((i) => ({ to: i.to, label: i.label })),
);

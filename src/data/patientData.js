/**
 * Placeholder data for the clinical console prototype.
 *
 * IMPORTANT: All values below are synthetic demo data. Nothing here comes from
 * a real patient, a real device, or a validated clinical model. The risk score
 * is an illustrative estimate, not a medical diagnosis.
 */

export const patient = {
  id: 'PT-2026-04317',
  name: 'Elena Vasquez',
  initials: 'EV',
  age: 54,
  sex: 'Female',
  ethnicity: 'Hispanic',
  height: '162 cm',
  weight: '78 kg',
  bmi: 29.7,
  bmiCategory: 'Overweight',
  lastVisit: 'Sep 12, 2026',
  nextVisit: 'Oct 24, 2026',
  physician: 'Dr. Amara Okafor, MD',
  clinic: 'Northside Family Medicine',
  flags: [
    'Family history of T2D',
    'Prediabetic range (HbA1c 6.1%)',
    'Sedentary lifestyle',
  ],
};

/** status: 'normal' | 'borderline' | 'elevated' | 'high' */
export const statusMeta = {
  normal: { label: 'Normal', tone: 'good' },
  borderline: { label: 'Borderline', tone: 'warn' },
  elevated: { label: 'Elevated', tone: 'warn' },
  high: { label: 'High', tone: 'bad' },
};

export const biomarkers = [
  {
    id: 'glucose',
    name: 'Fasting Glucose',
    icon: 'droplet',
    value: 112,
    unit: 'mg/dL',
    reference: '70–99 mg/dL',
    status: 'borderline',
    trend: [98, 101, 104, 103, 108, 112],
    trendNote: '+14 mg/dL over 12 months',
  },
  {
    id: 'hba1c',
    name: 'HbA1c',
    icon: 'gauge',
    value: 6.1,
    unit: '%',
    reference: 'Below 5.7%',
    status: 'borderline',
    trend: [5.5, 5.6, 5.8, 5.9, 6.0, 6.1],
    trendNote: '+0.6 pts over 12 months',
  },
  {
    id: 'blood-pressure',
    name: 'Blood Pressure',
    icon: 'heart',
    value: '128/82',
    unit: 'mmHg',
    reference: 'Below 120/80 mmHg',
    status: 'borderline',
    trend: [122, 124, 123, 126, 127, 128],
    trendNote: 'Systolic +6 over 9 months',
  },
  {
    id: 'bmi',
    name: 'Body Mass Index',
    icon: 'user',
    value: 29.7,
    unit: 'kg/m²',
    reference: '18.5–24.9 kg/m²',
    status: 'elevated',
    trend: [27.4, 27.9, 28.3, 28.6, 29.1, 29.7],
    trendNote: '+2.3 kg/m² over 18 months',
  },
  {
    id: 'ldl',
    name: 'LDL Cholesterol',
    icon: 'flask',
    value: 138,
    unit: 'mg/dL',
    reference: 'Below 100 mg/dL',
    status: 'borderline',
    trend: [128, 131, 133, 134, 136, 138],
    trendNote: 'Steady, mildly rising',
  },
  {
    id: 'triglycerides',
    name: 'Triglycerides',
    icon: 'activity',
    value: 165,
    unit: 'mg/dL',
    reference: 'Below 150 mg/dL',
    status: 'borderline',
    trend: [148, 152, 155, 158, 161, 165],
    trendNote: '+17 mg/dL over 12 months',
  },
];

export const riskAssessment = {
  score: 34,
  horizon: '5-year',
  category: 'Moderate',
  categoryNote: 'Prediabetes range with multiple compounding factors',
  confidence: '95% CI: 26–42%',
  populationAverage: 16,
  comparison: '≈ 2.1× the age-matched population average',
  model: 'T2D-Risk Prototype v0.9 (demo)',
  lastComputed: 'Sep 15, 2026',
  disclaimer:
    'This score is a statistical estimate produced by an unvalidated prototype model using synthetic demo data. It is not a medical diagnosis and must not be used for clinical decisions.',
};

/** Illustrative relative-contribution weights — they sum to 100 but are for display only. */
export const contributingFactors = [
  {
    factor: 'HbA1c trajectory',
    weight: 22,
    detail: '6.1% and rising — prediabetic range',
  },
  {
    factor: 'Family history',
    weight: 18,
    detail: 'Mother diagnosed with T2D at age 58',
  },
  {
    factor: 'Body composition',
    weight: 16,
    detail: 'BMI 29.7 with central adiposity pattern',
  },
  {
    factor: 'Physical inactivity',
    weight: 14,
    detail: 'Under 90 min moderate activity per week',
  },
  {
    factor: 'Age & ethnicity',
    weight: 12,
    detail: 'Risk escalates after 45 in this demographic',
  },
  {
    factor: 'Lipid profile',
    weight: 10,
    detail: 'Triglyceride/HDL ratio of 3.8',
  },
  {
    factor: 'Sleep duration',
    weight: 8,
    detail: '5.9 h average — below recommended range',
  },
];

export const recommendations = [
  {
    id: 'rec-1',
    title: 'Enroll in a structured lifestyle program',
    detail:
      'Refer to a diabetes prevention program (DPP-style, CDC-recognized equivalent). Target 5–7% body-weight loss over 12 months.',
    priority: 'high',
    category: 'Lifestyle',
    icon: 'clipboard',
  },
  {
    id: 'rec-2',
    title: 'Increase physical activity',
    detail:
      'Build toward 150 min/week of moderate aerobic activity plus two resistance sessions. Start with 20-minute daily walks.',
    priority: 'high',
    category: 'Activity',
    icon: 'activity',
  },
  {
    id: 'rec-3',
    title: 'Nutrition counseling',
    detail:
      'Reduce refined carbohydrates and sugar-sweetened beverages. Adopt a Mediterranean-style eating pattern with a dietitian.',
    priority: 'medium',
    category: 'Nutrition',
    icon: 'utensils',
  },
  {
    id: 'rec-4',
    title: 'Recheck HbA1c in 3 months',
    detail:
      'Monitor for progression beyond the prediabetic range. Pair with fasting glucose and a repeat lipid panel.',
    priority: 'medium',
    category: 'Monitoring',
    icon: 'calendar',
  },
  {
    id: 'rec-5',
    title: 'Sleep hygiene screening',
    detail:
      'Target 7–8 h of sleep per night. Screen for obstructive sleep apnea if snoring or daytime fatigue persists.',
    priority: 'low',
    category: 'Sleep',
    icon: 'moon',
  },
];

export const measurements = [
  {
    date: 'Sep 12, 2026',
    type: 'Fasting glucose',
    value: '112 mg/dL',
    status: 'borderline',
    note: 'Morning draw, 10 h fasted',
  },
  {
    date: 'Sep 12, 2026',
    type: 'HbA1c',
    value: '6.1%',
    status: 'borderline',
    note: 'Lab panel — prediabetic range',
  },
  {
    date: 'Aug 30, 2026',
    type: 'Blood pressure',
    value: '128/82 mmHg',
    status: 'borderline',
    note: 'Measured in clinic, seated 5 min',
  },
  {
    date: 'Aug 14, 2026',
    type: 'Weight',
    value: '78 kg',
    status: 'elevated',
    note: 'BMI 29.7 — up 0.6 kg since July',
  },
  {
    date: 'Jul 02, 2026',
    type: 'Lipid panel',
    value: 'LDL 136 / HDL 44 / TG 161 mg/dL',
    status: 'borderline',
    note: 'HDL below female target (> 50)',
  },
  {
    date: 'Jun 18, 2026',
    type: 'Fasting glucose',
    value: '108 mg/dL',
    status: 'borderline',
    note: 'Repeat confirmatory draw',
  },
  {
    date: 'Jun 05, 2026',
    type: 'Fasting glucose',
    value: '104 mg/dL',
    status: 'borderline',
    note: 'Flagged for follow-up — above reference',
  },
];

export const navigation = [
  {
    section: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', active: true },
      { id: 'risk', label: 'Risk Assessment', icon: 'shield' },
      { id: 'patients', label: 'Patients', icon: 'users' },
    ],
  },
  {
    section: 'Analytics',
    items: [
      { id: 'trends', label: 'Trends', icon: 'trending' },
      { id: 'reports', label: 'Reports', icon: 'file' },
    ],
  },
  {
    section: 'System',
    items: [{ id: 'settings', label: 'Settings', icon: 'sliders' }],
  },
];

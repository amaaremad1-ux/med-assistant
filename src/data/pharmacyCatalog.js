/**
 * Smart Pharmacy catalogue — conditions, drug options, prices and interaction
 * rules used by the Smart Pharmacy & Symptom Checker module.
 *
 * HOW TO READ THIS FILE
 *  - `CONDITIONS` maps a clinical topic to keyword patterns (English + Arabic),
 *    the drug options that may be considered for it, general self-care advice,
 *    red flags and the specialist to consult.
 *  - `DRUGS` holds one record per generic drug: class, active ingredient,
 *    strengths, the dose line an adult reference table would show, an efficacy
 *    profile (potency, onset, evidence level), safety notes, a demo price and
 *    the classes/ids it interacts with.
 *  - `INTERACTION_RULES` are pairwise (drug↔drug or class↔class) rules.
 *
 * HONESTY RULES (important)
 *  - Dose lines are GENERAL ADULT REFERENCE INFORMATION, not prescribing advice,
 *    and are always rendered with "verify with the prescriber / pharmacist".
 *  - Prices are SYNTHETIC DEMO ESTIMATES (USD, per pack) so the cost matrix can
 *    be demonstrated. They are not pharmacy quotes for any country.
 *  - Nothing here selects a treatment for a person. The engine ranks the options
 *    contained in this file and shows why; a clinician still decides.
 */

export const CATALOG_META = {
  version: 'pharmacy-catalog-demo-v1.0',
  title: 'Smart Pharmacy catalogue (general medical reference, demo build)',
  priceNote:
    'Prices are synthetic demo estimates in USD per pack, used only to demonstrate the cost-comparison matrix. They are not a quote and not country-specific.',
  doseNote:
    'Dose lines are general adult reference information for education. They are not a prescription: verify every dose, duration and suitability with the prescriber or pharmacist before use.',
  interactionNote:
    'Interaction rules cover the drugs and classes in this catalogue plus the patient medications recorded in this browser. An interaction check that finds nothing is NOT proof that a combination is safe — anything outside the catalogue is reported as unchecked.',
};

/** Class labels used for class-level interaction matching. */
export const DRUG_CLASSES = {
  biguanide: 'Biguanide antidiabetic',
  sulfonylurea: 'Sulfonylurea antidiabetic',
  sglt2: 'SGLT2 inhibitor',
  dpp4: 'DPP-4 inhibitor',
  acei: 'ACE inhibitor',
  arb: 'Angiotensin-receptor blocker',
  ccb: 'Calcium-channel blocker',
  thiazide: 'Thiazide diuretic',
  betablocker: 'Beta blocker',
  statin: 'Statin (HMG-CoA reductase inhibitor)',
  fibrate: 'Fibrate',
  nsaid: 'NSAID',
  paracetamol: 'Paracetamol / acetaminophen',
  antihistamine2: 'Second-generation antihistamine',
  antihistamine1: 'First-generation (sedating) antihistamine',
  ppi: 'Proton-pump inhibitor',
  antacid: 'Antacid',
  aminopenicillin: 'Aminopenicillin',
  macrolide: 'Macrolide antibiotic',
  nitrofuran: 'Nitrofuran antibiotic',
  iron: 'Oral iron',
  levothyroxine: 'Thyroid hormone',
  ssri: 'SSRI antidepressant',
  anticoagulant: 'Anticoagulant',
  antidiabeticOther: 'Other glucose-lowering agent',
};


/* ------------------------------------------------------------------ */
/* Conditions                                                          */
/* ------------------------------------------------------------------ */

export const CONDITIONS = [
  {
    id: 't2d',
    label: 'Prediabetes / type 2 diabetes range',
    labelAr: 'مرحلة ما قبل السكري / السكري من النوع الثاني',
    keywords: [
      'diabetes', 'diabetic', 'prediabetes', 'prediabetic', 'high blood sugar', 'blood glucose high',
      'sugar high', 'hba1c', 'fasting glucose', 'insulin resistance', 'frequent urination',
      'سكري', 'السكري', 'سكر مرتفع', 'سكر الدم', 'ما قبل السكري', 'مقاومة الأنسولين', 'كثرة التبول',
    ],
    drugIds: ['metformin', 'glimepiride', 'dapagliflozin', 'sitagliptin', 'empagliflozin'],
    advice: [
      'Structured nutrition and 150 min/week of moderate activity lower glucose more than most single drugs.',
      'Recheck HbA1c and fasting glucose in 3 months; monitor home readings if advised.',
      'Weight loss of 5–7 % materially improves glycaemia in the prediabetes range.',
    ],
    specialist: 'Endocrinology / diabetes educator, plus a dietitian',
    redFlags: ['glucose-confusion', 'dehydration'],
  },
  {
    id: 'hypertension',
    label: 'High blood pressure (hypertension range)',
    labelAr: 'ارتفاع ضغط الدم',
    keywords: [
      'blood pressure', 'hypertension', 'high bp', 'bp high', 'systolic', 'diastolic',
      'ضغط', 'ضغط الدم', 'ارتفاع الضغط', 'ضغط مرتفع', 'الضغط العالي',
    ],
    drugIds: ['amlodipine', 'lisinopril', 'losartan', 'hydrochlorothiazide', 'bisoprolol'],
    advice: [
      'Confirm with repeated seated readings on separate days; single readings mislead.',
      'Reduce sodium, limit alcohol, stop smoking, target 150 min/week of activity.',
      'Home monitoring with a validated cuff beats clinic-only assessment for trend tracking.',
    ],
    specialist: 'Cardiology / internal medicine',
    redFlags: ['chest-pain', 'stroke', 'vision-loss'],
  },
  {
    id: 'dyslipidemia',
    label: 'High cholesterol / triglycerides',
    labelAr: 'ارتفاع الكوليسترول والدهون الثلاثية',
    keywords: [
      'cholesterol', 'ldl', 'hdl', 'triglyceride', 'triglycerides', 'lipid', 'lipids', 'dyslipidemia',
      'hyperlipidemia', 'fats in blood',
      'كوليسترول', 'الكوليسترول', 'دهون', 'الدهون', 'الدهون الثلاثية', 'دهون الدم',
    ],
    drugIds: ['atorvastatin', 'rosuvastatin', 'ezetimibe', 'fenofibrate', 'omega3'],
    advice: [
      'Replace saturated fat, add soluble fibre and 2 portions of oily fish per week.',
      'A 5–10 % weight reduction lowers triglycerides substantially.',
      'Repeat the full lipid panel 8–12 weeks after any change to judge direction.',
    ],
    specialist: 'Cardiology / lipid clinic',
    redFlags: ['chest-pain'],
  },
  {
    id: 'uri',
    label: 'Common cold, flu and sore throat',
    labelAr: 'الزكام والإنفلونزا والتهاب الحلق',
    keywords: [
      'cold', 'flu', 'influenza', 'sore throat', 'throat pain', 'cough', 'runny nose', 'congestion',
      'sneezing', 'pharyngitis',
      'زكام', 'انفلونزا', 'إنفلونزا', 'التهاب الحلق', 'كحة', 'سعال', 'رشح', 'زكمة', 'احتقان',
    ],
    drugIds: ['paracetamol', 'ibuprofen', 'cetirizine', 'loratadine', 'xylometazoline', 'amoxicillin'],
    advice: [
      'Rest, fluids and 6–8 h sleep; most viral upper-respiratory infections settle in 5–7 days.',
      'Antibiotics do not help viral colds and appear here only for a clinician-confirmed bacterial cause.',
      'Steam inhalation and saline nasal rinses relieve congestion without drugs.',
    ],
    specialist: 'Primary care / ENT if it persists beyond 10 days',
    redFlags: ['breathing', 'fever-redflag', 'dehydration'],
  },
  {
    id: 'pain-fever',
    label: 'Pain, headache and fever',
    labelAr: 'الألم والصداع والحمى',
    keywords: [
      'pain', 'headache', 'migraine', 'myalgia', 'muscle pain', 'back pain', 'joint pain', 'toothache',
      'fever', 'temperature', 'period pain', 'dysmenorrhea', 'sprain',
      'ألم', 'الام', 'صداع', 'شقيقة', 'حمى', 'حرارة', 'ألم عضلي', 'ألم الظهر', 'مفاصل', 'أسنان', 'التواء',
    ],
    drugIds: ['paracetamol', 'ibuprofen', 'naproxen', 'diclofenac-topical'],
    advice: [
      'Use the lowest effective dose for the shortest time; NSAIDs are not for everyone.',
      'Cold packs for acute injury, heat for muscle spasm.',
      'Persistent or worsening pain needs assessment, not escalation of painkillers.',
    ],
    specialist: 'Primary care, or rheumatology / neurology for persistent pain',
    redFlags: ['consciousness', 'fever-redflag', 'chest-pain'],
  },
  {
    id: 'allergy',
    label: 'Allergic rhinitis, hives and itching',
    labelAr: 'حساسية الأنف والأرتيكاريا والحكة',
    keywords: [
      'allergy', 'allergic', 'hay fever', 'rhinitis', 'hives', 'urticaria', 'itch', 'itching', 'rash',
      'sneezing', 'watery eyes', 'eczema flare',
      'حساسية', 'أرتيكاريا', 'هرش', 'حكة', 'طفح', 'رشح تحسسي', 'عطاس', 'دموع', 'إكزيما',
    ],
    drugIds: ['cetirizine', 'loratadine', 'diphenhydramine', 'hydrocortisone-topical', 'prednisolone-short'],
    advice: [
      'Identify and avoid the trigger; antihistamines control symptoms but do not stop the cause.',
      'Second-generation antihistamines are less sedating than first-generation ones.',
      'A widespread rash with breathing difficulty is an emergency — call for help.',
    ],
    specialist: 'Allergy / immunology',
    redFlags: ['anaphylaxis', 'breathing'],
  },
  {
    id: 'gerd',
    label: 'Heartburn, reflux and indigestion',
    labelAr: 'حرقة المعدة والارتجاع وعسر الهضم',
    keywords: [
      'heartburn', 'reflux', 'acid', 'gerd', 'indigestion', 'dyspepsia', 'stomach burning', 'bloating',
      'حرقة', 'ارتجاع', 'حموضة', 'معدة', 'عسر الهضم', 'انتفاخ', 'حرقان المعدة',
    ],
    drugIds: ['omeprazole', 'pantoprazole', 'antacid', 'famotidine'],
    advice: [
      'Smaller meals, no food 3 h before bed, raise the head of the bed.',
      'Weight reduction and stopping smoking both reduce reflux episodes.',
      'Persistent reflux beyond 8 weeks, or difficulty swallowing, needs endoscopy assessment.',
    ],
    specialist: 'Gastroenterology',
    redFlags: ['bleeding', 'chest-pain'],
  },
  {
    id: 'uti',
    label: 'Urinary symptoms / suspected urinary infection',
    labelAr: 'أعراض المسالك البولية / التهاب بولي',
    keywords: [
      'urinary', 'uti', 'burning urination', 'dysuria', 'urine', 'cystitis', 'frequency', 'bladder',
      'booty', 'تبول', 'حرقان البول', 'التهاب المسالك', 'المثانة', 'بول',
    ],
    drugIds: ['nitrofurantoin', 'fosfomycin', 'amoxicillin'],
    advice: [
      'Increase fluids and empty the bladder fully; avoid bladder irritants (caffeine, alcohol).',
      'A urine culture before antibiotics guides the choice and avoids resistance.',
      'Fever, flank pain or vomiting means the infection may involve the kidney — urgent review.',
    ],
    specialist: 'Primary care / urology',
    redFlags: ['fever-redflag', 'sepsis'],
  },
  {
    id: 'skin',
    label: 'Skin rash, fungal infection, acne and minor wounds',
    labelAr: 'الطفح الجلدي والفطريات وحب الشباب والجروح البسيطة',
    keywords: [
      'skin', 'rash', 'fungal', 'ringworm', 'athlete foot', 'tinea', 'acne', 'pimple', 'wound', 'cut',
      'abrasion', 'boil', 'eczema', 'dermatitis', 'psoriasis',
      'جلد', 'طفح جلدي', 'فطريات', 'فطري', 'حب الشباب', 'حبوب', 'جرح', 'جروح', 'خدش', 'إكزيما', 'دمامل', 'قوباء',
    ],
    drugIds: ['clotrimazole-topical', 'hydrocortisone-topical', 'mupirocin-topical', 'benzoyl-peroxide', 'chlorhexidine'],
    advice: [
      'Keep the area clean and dry; a photo taken now makes change over time judgeable.',
      'Fungal rashes need the full course even after the rash fades (usually 2–4 weeks).',
      'A spreading rash with fever, or a wound with spreading redness, needs same-day review.',
    ],
    specialist: 'Dermatology (wound care nurse for wounds)',
    redFlags: ['fever-redflag', 'bleeding'],
  },
  {
    id: 'anemia',
    label: 'Iron-deficiency anaemia range',
    labelAr: 'نقص الحديد / فقر الدم',
    keywords: [
      'anemia', 'anaemia', 'iron', 'ferritin', 'hemoglobin', 'haemoglobin', 'low hb', 'pale',
      'fatigue', 'tired all the time', 'hair loss',
      'أنيميا', 'فقر الدم', 'حديد', 'فيريتين', 'هيموجلوبين', 'شحوب', 'إرهاق', 'تعب', 'تساقط الشعر',
    ],
    drugIds: ['ferrous-sulfate', 'ferrous-fumarate', 'vitamin-b12', 'folic-acid'],
    advice: [
      'Take oral iron with vitamin C; tea, coffee and calcium reduce absorption.',
      'Find the cause of the deficiency — it is a sign, not a diagnosis by itself.',
      'Repeat haemoglobin and ferritin 8–12 weeks after starting supplementation.',
    ],
    specialist: 'Haematology / gastroenterology if the deficiency persists',
    redFlags: ['bleeding', 'breathing'],
  },
];

export const CONDITION_BY_ID = Object.fromEntries(CONDITIONS.map((c) => [c.id, c]));

/* Red-flag definitions used by conditions (labels only; behaviour lives in the engine). */
export const RED_FLAGS = {
  'chest-pain': 'Chest pain, pressure or tightness — especially radiating to arm, jaw or back',
  stroke: 'Face drooping, arm weakness or speech difficulty — time-critical',
  breathing: 'Severe or worsening difficulty breathing',
  anaphylaxis: 'Swelling of face/throat, wheeze or collapse after an exposure',
  bleeding: 'Bleeding that does not stop, or black/bloody stools',
  consciousness: 'Confusion, fainting or seizure',
  'fever-redflag': 'Fever with stiff neck, non-blanching rash, or any fever in an infant under 3 months',
  dehydration: 'No urine for 12+ hours, sunken eyes, extreme drowsiness',
  'glucose-confusion': 'Very high glucose with drowsiness, vomiting or fruity breath',
  sepsis: 'Fever with rapid breathing, confusion or a very unwell feeling',
  'vision-loss': 'Sudden visual change with a high blood-pressure reading',
};

/* ------------------------------------------------------------------ */
/* Drugs                                                               */
/* ------------------------------------------------------------------ */

export const DRUGS = [
  {
    id: 'metformin',
    name: 'Metformin',
    brands: ['Glucophage', 'Glycomet'],
    ingredient: 'Metformin hydrochloride',
    class: 'biguanide',
    rx: true,
    forms: ['Tablet', 'Extended-release tablet'],
    strengths: ['500 mg', '850 mg', '1000 mg'],
    conditions: ['t2d'],
    tier: 'first-line',
    dose: {
      adult: '500 mg once daily with the largest meal, increasing every 1–2 weeks as tolerated',
      target: '1000 mg twice daily (or 2000 mg once daily extended-release)',
      max: '2550 mg/day in divided doses',
      duration: 'Long term unless the prescriber stops it',
      verify: 'Renal function and vitamin B12 reviewed periodically on long-term therapy.',
    },
    efficacy: { potency: 7, onsetHours: 72, onset: '2–4 weeks for an HbA1c effect', evidence: 'high', effect: 'Lowers HbA1c roughly 1.0–1.5 % as monotherapy; weight-neutral, no hypoglycaemia on its own.' },
    safety: {
      pregnancy: 'Used in pregnancy under specialist supervision — confirm with the prescriber.',
      renal: 'Dose review below an eGFR of 45; generally avoided below 30.',
      hepatic: 'Avoid in significant liver disease.',
      cautions: ['Gastrointestinal upset in the first weeks — slow titration helps.', 'Stop during severe illness, dehydration or before contrast imaging.'],
    },
    price: { packLabel: '30 tablets × 500 mg', priceUsd: 4.2, unitsPerPack: 30, dailyUnits: 2 },
  },
  {
    id: 'glimepiride',
    name: 'Glimepiride',
    brands: ['Amaryl'],
    ingredient: 'Glimepiride',
    class: 'sulfonylurea',
    rx: true,
    forms: ['Tablet'],
    strengths: ['1 mg', '2 mg', '4 mg'],
    conditions: ['t2d'],
    tier: 'second-line',
    dose: {
      adult: '1 mg once daily with breakfast',
      target: '2–4 mg once daily',
      max: '6–8 mg/day',
      duration: 'Long term if effective and tolerated',
      verify: 'Hypoglycaemia risk is real — the eating pattern must be regular.',
    },
    efficacy: { potency: 8, onsetHours: 24, onset: 'Days for glucose, weeks for HbA1c', evidence: 'high', effect: 'Lowers HbA1c ~1.0–1.5 % faster than metformin, but with hypoglycaemia and weight gain.' },
    safety: {
      pregnancy: 'Not first choice in pregnancy — specialist decision.',
      renal: 'Higher hypoglycaemia risk in renal impairment; dose reduction needed.',
      hepatic: 'Caution; monitor glucose closely.',
      cautions: ['Hypoglycaemia with missed meals, alcohol or in older adults.', 'Weight gain is common.'],
    },
    price: { packLabel: '30 tablets × 2 mg', priceUsd: 5.4, unitsPerPack: 30, dailyUnits: 1 },
  },
  {
    id: 'dapagliflozin',
    name: 'Dapagliflozin',
    brands: ['Forxiga', 'Farxiga'],
    ingredient: 'Dapagliflozin',
    class: 'sglt2',
    rx: true,
    forms: ['Tablet'],
    strengths: ['5 mg', '10 mg'],
    conditions: ['t2d', 'hypertension'],
    tier: 'second-line',
    dose: {
      adult: '10 mg once daily in the morning',
      target: '10 mg once daily',
      max: '10 mg/day',
      duration: 'Long term under review',
      verify: 'Volume status reviewed; genital hygiene advice given.',
    },
    efficacy: { potency: 7, onsetHours: 48, onset: 'Days for glucose, weeks for HbA1c', evidence: 'high', effect: 'HbA1c ~0.6–0.9 % plus weight and blood-pressure reduction; organ-protective evidence in selected patients.' },
    safety: {
      pregnancy: 'Not recommended in pregnancy or breastfeeding.',
      renal: 'Initiation is limited by eGFR thresholds — follow current labelling.',
      hepatic: 'Caution in severe impairment.',
      cautions: ['Genital/urinary fungal infection is the commonest adverse effect.', 'Volume depletion with diuretics; euglycaemic ketoacidosis is rare but serious.'],
    },
    price: { packLabel: '28 tablets × 10 mg', priceUsd: 26.0, unitsPerPack: 28, dailyUnits: 1 },
  },
  {
    id: 'empagliflozin',
    name: 'Empagliflozin',
    brands: ['Jardiance'],
    ingredient: 'Empagliflozin',
    class: 'sglt2',
    rx: true,
    forms: ['Tablet'],
    strengths: ['10 mg', '25 mg'],
    conditions: ['t2d', 'hypertension'],
    tier: 'second-line',
    dose: {
      adult: '10 mg once daily in the morning',
      target: '10–25 mg once daily',
      max: '25 mg/day',
      duration: 'Long term under review',
      verify: 'Same volume-status and genital-infection counselling as dapagliflozin.',
    },
    efficacy: { potency: 7, onsetHours: 48, onset: 'Days for glucose', evidence: 'high', effect: 'Comparable to dapagliflozin for HbA1c, weight and BP, with cardiovascular/kidney outcome evidence in selected groups.' },
    safety: {
      pregnancy: 'Not recommended in pregnancy or breastfeeding.',
      renal: 'eGFR thresholds apply to initiation.',
      hepatic: 'Caution in severe impairment.',
      cautions: ['Genital fungal infection; volume depletion.', 'The higher strength is not automatically better — 10 mg is the usual start.'],
    },
    price: { packLabel: '30 tablets × 10 mg', priceUsd: 29.5, unitsPerPack: 30, dailyUnits: 1 },
  },
  {
    id: 'sitagliptin',
    name: 'Sitagliptin',
    brands: ['Januvia'],
    ingredient: 'Sitagliptin phosphate',
    class: 'dpp4',
    rx: true,
    forms: ['Tablet'],
    strengths: ['25 mg', '50 mg', '100 mg'],
    conditions: ['t2d'],
    tier: 'second-line',
    dose: {
      adult: '100 mg once daily',
      target: '100 mg once daily (dose-adjusted in renal impairment)',
      max: '100 mg/day',
      duration: 'Long term under review',
      verify: 'The dose must be reduced when eGFR is low.',
    },
    efficacy: { potency: 5, onsetHours: 72, onset: '2–4 weeks', evidence: 'high', effect: 'HbA1c ~0.5–0.8 % with a low hypoglycaemia risk and a weight-neutral profile.' },
    safety: {
      pregnancy: 'Not recommended in pregnancy.',
      renal: 'Dose reduction required (50 mg or 25 mg by eGFR).',
      hepatic: 'Caution in severe impairment.',
      cautions: ['Pancreatitis reported rarely.', 'With a sulfonylurea the hypoglycaemia risk rises — the sulfonylurea dose may need reducing.'],
    },
    price: { packLabel: '28 tablets × 100 mg', priceUsd: 24.0, unitsPerPack: 28, dailyUnits: 1 },
  },
  {
    id: 'amlodipine',
    name: 'Amlodipine',
    brands: ['Norvasc', 'Amlor'],
    ingredient: 'Amlodipine besylate',
    class: 'ccb',
    rx: true,
    forms: ['Tablet'],
    strengths: ['2.5 mg', '5 mg', '10 mg'],
    conditions: ['hypertension'],
    tier: 'first-line',
    dose: {
      adult: '5 mg once daily',
      target: '5–10 mg once daily',
      max: '10 mg/day',
      duration: 'Long term',
      verify: 'Ankle swelling is dose-related — review the dose rather than adding a diuretic blindly.',
    },
    efficacy: { potency: 7, onsetHours: 120, onset: 'Within 24–48 h; full effect in 1–2 weeks', evidence: 'high', effect: 'Typical systolic reduction 8–14 mmHg; effective in older adults and isolated systolic hypertension.' },
    safety: {
      pregnancy: 'Used for hypertension in pregnancy in some settings — specialist decision.',
      renal: 'No specific dose change for mild-to-moderate impairment.',
      hepatic: 'Start at 2.5 mg in significant liver impairment.',
      cautions: ['Ankle oedema, flushing and headache are common.', 'Grapefruit juice can raise drug levels.'],
    },
    price: { packLabel: '30 tablets × 5 mg', priceUsd: 3.0, unitsPerPack: 30, dailyUnits: 1 },
  },
  {
    id: 'lisinopril',
    name: 'Lisinopril',
    brands: ['Zestril', 'Prinivil'],
    ingredient: 'Lisinopril dihydrate',
    class: 'acei',
    rx: true,
    forms: ['Tablet'],
    strengths: ['2.5 mg', '5 mg', '10 mg', '20 mg'],
    conditions: ['hypertension', 't2d'],
    tier: 'first-line',
    dose: {
      adult: '10 mg once daily',
      target: '10–20 mg once daily',
      max: '40 mg/day',
      duration: 'Long term',
      verify: 'Renal function and potassium checked 1–2 weeks after starting or increasing.',
    },
    efficacy: { potency: 8, onsetHours: 72, onset: 'Within 3–7 days', evidence: 'high', effect: 'Typical systolic reduction 8–12 mmHg; kidney-protective in diabetes with albuminuria, so often chosen when both conditions coexist.' },
    safety: {
      pregnancy: 'CONTRAINDICATED in pregnancy — stop immediately if pregnancy is suspected.',
      renal: 'Renal function can dip after starting; monitor. Careful with potassium-raising drugs.',
      hepatic: 'No specific adjustment.',
      cautions: ['Dry cough in ~10 % (class effect).', 'Angio-oedema is rare but means permanent avoidance of the class.', 'NSAIDs blunt the effect and increase kidney risk.'],
    },
    price: { packLabel: '30 tablets × 10 mg', priceUsd: 3.8, unitsPerPack: 30, dailyUnits: 1 },
  },
  {
    id: 'losartan',
    name: 'Losartan',
    brands: ['Cozaar'],
    ingredient: 'Losartan potassium',
    class: 'arb',
    rx: true,
    forms: ['Tablet'],
    strengths: ['25 mg', '50 mg', '100 mg'],
    conditions: ['hypertension', 't2d'],
    tier: 'first-line',
    dose: {
      adult: '50 mg once daily',
      target: '50–100 mg once daily',
      max: '100 mg/day',
      duration: 'Long term',
      verify: 'Same biochemistry monitoring as an ACE inhibitor.',
    },
    efficacy: { potency: 7, onsetHours: 120, onset: 'Within 1 week', evidence: 'high', effect: 'Typical systolic reduction 6–10 mmHg; the usual substitute when an ACE-inhibitor cough is intolerable.' },
    safety: {
      pregnancy: 'CONTRAINDICATED in pregnancy — identical to the ACE inhibitors.',
      renal: 'Monitor renal function and potassium.',
      cautions: ['Hyperkalaemia with potassium supplements or spironolactone.', 'NSAIDs blunt the effect and increase renal risk.'],
    },
    price: { packLabel: '30 tablets × 50 mg', priceUsd: 4.6, unitsPerPack: 30, dailyUnits: 1 },
  },
  {
    id: 'hydrochlorothiazide',
    name: 'Hydrochlorothiazide',
    brands: ['Esidrex', 'Microzide'],
    ingredient: 'Hydrochlorothiazide',
    class: 'thiazide',
    rx: true,
    forms: ['Tablet'],
    strengths: ['12.5 mg', '25 mg'],
    conditions: ['hypertension'],
    tier: 'first-line',
    dose: {
      adult: '12.5–25 mg once daily in the morning',
      target: '25 mg once daily',
      max: '50 mg/day — higher doses add little and worsen electrolytes',
      duration: 'Long term',
      verify: 'Sodium, potassium, uric acid and glucose checked after starting.',
    },
    efficacy: { potency: 6, onsetHours: 96, onset: '1–2 weeks', evidence: 'high', effect: 'Typical systolic reduction 6–10 mmHg; inexpensive and effective in salt-sensitive hypertension.' },
    safety: {
      pregnancy: 'Avoid in pregnancy (fetal risk) — specialist alternative needed.',
      renal: 'Loses effect at low eGFR; monitor electrolytes.',
      cautions: ['Low potassium and sodium; raised uric acid and glucose.', 'Photosensitivity and gout flare-ups.'],
    },
    price: { packLabel: '30 tablets × 25 mg', priceUsd: 2.4, unitsPerPack: 30, dailyUnits: 1 },
  },
  {
    id: 'bisoprolol',
    name: 'Bisoprolol',
    brands: ['Concor', 'Zebeta'],
    ingredient: 'Bisoprolol fumarate',
    class: 'betablocker',
    rx: true,
    forms: ['Tablet'],
    strengths: ['2.5 mg', '5 mg', '10 mg'],
    conditions: ['hypertension'],
    tier: 'second-line',
    dose: {
      adult: '2.5–5 mg once daily',
      target: '5–10 mg once daily',
      max: '10 mg/day unless a specialist advises more',
      duration: 'Long term; never stop abruptly',
      verify: 'Pulse checked before each increase; asthma history reviewed.',
    },
    efficacy: { potency: 7, onsetHours: 72, onset: 'Days to weeks', evidence: 'high', effect: 'Typical systolic reduction 6–10 mmHg with rate control; useful when a fast resting rate accompanies hypertension.' },
    safety: {
      pregnancy: 'Specialist decision; growth monitoring implications.',
      renal: 'Reduce the starting dose in severe impairment.',
      cautions: ['Masks hypoglycaemia symptoms in diabetes.', 'Wheezing in asthma/COPD; rebound on abrupt withdrawal.'],
    },
    price: { packLabel: '30 tablets × 5 mg', priceUsd: 3.6, unitsPerPack: 30, dailyUnits: 1 },
  },
  {
    id: 'atorvastatin',
    name: 'Atorvastatin',
    brands: ['Lipitor', 'Atorlip'],
    ingredient: 'Atorvastatin calcium',
    class: 'statin',
    rx: true,
    forms: ['Tablet'],
    strengths: ['10 mg', '20 mg', '40 mg', '80 mg'],
    conditions: ['dyslipidemia'],
    tier: 'first-line',
    dose: {
      adult: '10–20 mg once daily, any time of day',
      target: '20–40 mg once daily, titrated to the LDL goal',
      max: '80 mg/day',
      duration: 'Long term while tolerated and indicated',
      verify: 'A lipid panel 6–8 weeks after each change; liver enzymes if symptomatic.',
    },
    efficacy: { potency: 9, onsetHours: 168, onset: 'LDL falls within 2 weeks; full effect at 4–6 weeks', evidence: 'high', effect: 'Lowers LDL cholesterol roughly 40–50 % at 20–40 mg — the strongest single-agent reduction in this catalogue.' },
    safety: {
      pregnancy: 'Not used in pregnancy or breastfeeding — stop and discuss.',
      renal: 'No dose change for mild-to-moderate impairment.',
      cautions: ['Muscle aches: report severe pain or weakness.', 'Grapefruit interaction; avoid combining with a fibrate without supervision.'],
    },
    price: { packLabel: '30 tablets × 20 mg', priceUsd: 6.5, unitsPerPack: 30, dailyUnits: 1 },
  },
  {
    id: 'rosuvastatin',
    name: 'Rosuvastatin',
    brands: ['Crestor'],
    ingredient: 'Rosuvastatin calcium',
    class: 'statin',
    rx: true,
    forms: ['Tablet'],
    strengths: ['5 mg', '10 mg', '20 mg', '40 mg'],
    conditions: ['dyslipidemia'],
    tier: 'first-line',
    dose: {
      adult: '5–10 mg once daily',
      target: '10–20 mg once daily',
      max: '40 mg/day (specialist use at the top dose)',
      duration: 'Long term while tolerated and indicated',
      verify: 'Baseline lipids and a repeat at 6–8 weeks; consider a lower start dose in Asian ancestry.',
    },
    efficacy: { potency: 9, onsetHours: 168, onset: 'Within 2 weeks', evidence: 'high', effect: 'Lowers LDL cholesterol roughly 45–55 % at 10–20 mg — slightly more per milligram than atorvastatin.' },
    safety: {
      pregnancy: 'Not used in pregnancy or breastfeeding.',
      renal: 'Use a lower starting dose at impaired renal function.',
      cautions: ['Muscle symptoms; rare rhabdomyolysis.', 'Adds to the effect of warfarin — INR monitoring needed.'],
    },
    price: { packLabel: '30 tablets × 10 mg', priceUsd: 7.4, unitsPerPack: 30, dailyUnits: 1 },
  },
  {
    id: 'ezetimibe',
    name: 'Ezetimibe',
    brands: ['Ezetrol', 'Zetia'],
    ingredient: 'Ezetimibe',
    class: 'lipidOther',
    rx: true,
    forms: ['Tablet'],
    strengths: ['10 mg'],
    conditions: ['dyslipidemia'],
    tier: 'adjunct',
    dose: {
      adult: '10 mg once daily',
      target: '10 mg once daily',
      max: '10 mg/day',
      duration: 'Long term as an add-on',
      verify: 'Used when a statin alone misses the LDL goal or is not tolerated.',
    },
    efficacy: { potency: 4, onsetHours: 168, onset: '2–4 weeks', evidence: 'high', effect: 'Adds roughly 15–20 % further LDL reduction on top of a statin — an adjunct, not a replacement.' },
    safety: {
      pregnancy: 'Not recommended in pregnancy.',
      renal: 'No adjustment required.',
      cautions: ['Usually well tolerated; rare liver-enzyme rise.', 'Best value comes as an add-on to a maximally tolerated statin.'],
    },
    price: { packLabel: '30 tablets × 10 mg', priceUsd: 9.0, unitsPerPack: 30, dailyUnits: 1 },
  },
  {
    id: 'fenofibrate',
    name: 'Fenofibrate',
    brands: ['Lipanthyl'],
    ingredient: 'Fenofibrate micronised',
    class: 'fibrate',
    rx: true,
    forms: ['Capsule'],
    strengths: ['145 mg', '160 mg', '200 mg'],
    conditions: ['dyslipidemia'],
    tier: 'second-line',
    dose: {
      adult: '145 mg once daily with food',
      target: '145 mg once daily',
      max: '200 mg/day (formulation-dependent)',
      verify: 'Renal function and a full lipid panel before and after starting.',
    },
    efficacy: { potency: 6, onsetHours: 336, onset: '2–4 weeks', evidence: 'high', effect: 'Reduces triglycerides by roughly 30–50 % and raises HDL, with less LDL effect than a statin.' },
    safety: {
      pregnancy: 'Contraindicated in pregnancy and breastfeeding.',
      renal: 'Reduce the dose or avoid in renal impairment.',
      cautions: ['Myopathy risk rises with a statin — rarely combined without monitoring.', 'Gallstones and a mild creatinine rise are recognised.'],
    },
    price: { packLabel: '30 capsules × 145 mg', priceUsd: 11.5, unitsPerPack: 30, dailyUnits: 1 },
  },
  {
    id: 'omega3',
    name: 'Omega-3 fatty acids (EPA/DHA)',
    brands: ['Omacor', 'fish-oil products'],
    ingredient: 'Icosapent / docosahexaenoic acid',
    class: 'supplement',
    rx: false,
    forms: ['Capsule'],
    strengths: ['500 mg', '1000 mg'],
    conditions: ['dyslipidemia'],
    tier: 'adjunct',
    dose: {
      adult: '1–2 g combined EPA/DHA daily with meals',
      target: 'As advised; prescription strengths differ',
      max: '4 g/day only under supervision',
      verify: 'Bleeding risk reviewed when an anticoagulant is also taken.',
    },
    efficacy: { potency: 3, onsetHours: 672, onset: '8–12 weeks', evidence: 'moderate', effect: 'Lowers triglycerides modestly (about 10–25 % at 2–4 g/day) — the gentlest option in the lipid list.' },
    safety: {
      pregnancy: 'Discuss with the prescriber; dietary intake is usually preferred.',
      renal: 'No adjustment required.',
      cautions: ['Fishy aftertaste and reflux; higher doses may increase bleeding tendency.', 'Choose a product with a declared EPA/DHA content.'],
    },
    price: { packLabel: '60 capsules × 500 mg', priceUsd: 8.0, unitsPerPack: 60, dailyUnits: 4 },
  },
  {
    id: 'paracetamol',
    name: 'Paracetamol (acetaminophen)',
    brands: ['Panadol', 'Tylenol'],
    ingredient: 'Paracetamol',
    class: 'paracetamol',
    rx: false,
    forms: ['Tablet', 'Syrup'],
    strengths: ['500 mg', '1000 mg'],
    conditions: ['pain-fever', 'uri'],
    tier: 'first-line',
    dose: {
      adult: '500–1000 mg every 4–6 h as needed',
      target: 'The lowest dose that controls the symptom',
      max: '3000 mg/day in self-care (4000 mg/day only on professional advice)',
      verify: 'The total daily intake from ALL products must be added together — many cold remedies already contain it.',
    },
    efficacy: { potency: 5, onsetHours: 1, onset: '30–60 minutes', evidence: 'high', effect: 'Reliable for pain and fever; it does not reduce inflammation and is the safest option when an NSAID is unsuitable.' },
    safety: {
      pregnancy: 'Preferred analgesic in pregnancy at the lowest effective dose for the shortest time.',
      renal: 'Generally acceptable; avoid prolonged high doses in severe impairment.',
      cautions: ['Overdose causes serious liver injury — never exceed the daily maximum.', 'Alcohol use and liver disease lower the safe ceiling.'],
    },
    price: { packLabel: '24 tablets × 500 mg', priceUsd: 1.9, unitsPerPack: 24, dailyUnits: 6 },
  },
  { id: 'ibuprofen', name: 'Ibuprofen', brands: ['Brufen', 'Advil'], ingredient: 'Ibuprofen', class: 'nsaid', rx: false, forms: ['Tablet', 'Suspension'], strengths: ['200 mg', '400 mg', '600 mg'], conditions: ['pain-fever', 'uri'], tier: 'first-line',
    dose: { adult: '200–400 mg every 6–8 h with food', max: '1200 mg/day in self-care; higher only on prescription', verify: 'Review kidney function, blood pressure, stomach history and anticoagulants first.' },
    efficacy: { potency: 7, onsetHours: 0.75, onset: '30–45 min', evidence: 'high', effect: 'Stronger than paracetamol for inflammatory pain, but with more contraindications.' },
    safety: { pregnancy: 'Avoid, especially after 20 weeks (ductus and kidney risk).', renal: 'Avoid in renal impairment or dehydration.', cautions: ['Stomach bleeding risk with steroids, anticoagulants or prior ulcer.', 'Raises blood pressure; blunts ACE-inhibitor/ARB and diuretics.'] },
    price: { packLabel: '20 tablets × 400 mg', priceUsd: 2.3, unitsPerPack: 20, dailyUnits: 3 } },
  { id: 'naproxen', name: 'Naproxen', brands: ['Naprosyn', 'Aleve'], ingredient: 'Naproxen sodium', class: 'nsaid', rx: false, forms: ['Tablet'], strengths: ['220 mg', '250 mg', '500 mg'], conditions: ['pain-fever'], tier: 'second-line',
    dose: { adult: '250–500 mg twice daily with food', max: '1000 mg/day in self-care', verify: 'Same pre-checks as ibuprofen: kidneys, blood pressure, stomach, anticoagulants.' },
    efficacy: { potency: 7, onsetHours: 1, onset: 'About 1 h, longer duration than ibuprofen', evidence: 'high', effect: 'Longer-acting NSAID for all-day pain control; a higher stomach-irritation profile than ibuprofen.' },
    safety: { pregnancy: 'Avoid, particularly after 20 weeks.', renal: 'Avoid in renal impairment or dehydration.', cautions: ['Stomach bleeding and blood-pressure elevation.', 'Never combine with another NSAID.'] },
    price: { packLabel: '20 tablets × 250 mg', priceUsd: 3.1, unitsPerPack: 20, dailyUnits: 2 } },
  { id: 'diclofenac-topical', name: 'Diclofenac gel 1 %', brands: ['Voltaren gel'], ingredient: 'Diclofenac sodium (topical)', class: 'nsaid', rx: false, forms: ['Gel'], strengths: ['1 %'], conditions: ['pain-fever'], tier: 'adjunct',
    dose: { adult: 'Apply 2–4 g to the painful area 3–4 times daily and rub in', max: 'Per product instructions; never on broken skin', verify: 'Wash hands afterwards; avoid sun exposure on the treated area.' },
    efficacy: { potency: 5, onsetHours: 2, onset: 'Within a few hours', evidence: 'high', effect: 'Local NSAID effect for joint and muscle pain with far lower systemic exposure than oral NSAIDs.' },
    safety: { pregnancy: 'Avoid in the third trimester; discuss earlier use.', renal: 'Low systemic exposure, but large-area use still matters in renal impairment.', cautions: ['Local irritation and photosensitivity.', 'Still counts towards the total NSAID load.'] },
    price: { packLabel: '50 g tube of 1 % gel', priceUsd: 5.2, unitsPerPack: 1, dailyUnits: 0 } },
  { id: 'cetirizine', name: 'Cetirizine', brands: ['Zyrtec'], ingredient: 'Cetirizine dihydrochloride', class: 'antihistamine2', rx: false, forms: ['Tablet', 'Syrup'], strengths: ['5 mg', '10 mg'], conditions: ['allergy', 'uri'], tier: 'first-line',
    dose: { adult: '10 mg once daily', max: '10 mg/day', verify: 'Dose reduced in significant renal impairment.' },
    efficacy: { potency: 6, onsetHours: 1, onset: 'Within 1 h', evidence: 'high', effect: 'Controls sneezing, itching and hives for a full 24 h; mildly sedating for some people.' },
    safety: { pregnancy: 'Considered acceptable in pregnancy — confirm with the prescriber.', renal: 'Reduce the dose in significant impairment.', cautions: ['Mild drowsiness and dry mouth.', 'Avoid combining with other sedating medicines.'] },
    price: { packLabel: '20 tablets × 10 mg', priceUsd: 2.6, unitsPerPack: 20, dailyUnits: 1 } },
  { id: 'loratadine', name: 'Loratadine', brands: ['Claritin'], ingredient: 'Loratadine', class: 'antihistamine2', rx: false, forms: ['Tablet'], strengths: ['10 mg'], conditions: ['allergy', 'uri'], tier: 'first-line',
    dose: { adult: '10 mg once daily', max: '10 mg/day', verify: 'The non-sedating choice when driving or working matters.' },
    efficacy: { potency: 5, onsetHours: 2, onset: '1–3 h', evidence: 'high', effect: 'Slower and slightly weaker than cetirizine, but the least sedating of the antihistamines listed.' },
    safety: { pregnancy: 'Commonly used in pregnancy — confirm with the prescriber.', renal: 'Caution in severe impairment.', cautions: ['Dry mouth and headache.', 'Effect can fade with continuous long-term use for some people.'] },
    price: { packLabel: '20 tablets × 10 mg', priceUsd: 3.2, unitsPerPack: 20, dailyUnits: 1 } },
  { id: 'diphenhydramine', name: 'Diphenhydramine', brands: ['Benadryl'], ingredient: 'Diphenhydramine hydrochloride', class: 'antihistamine1', rx: false, forms: ['Capsule', 'Syrup'], strengths: ['25 mg', '50 mg'], conditions: ['allergy'], tier: 'adjunct',
    dose: { adult: '25–50 mg at night when needed', max: '300 mg/day for short-term use', verify: 'Sedating — not for driving; avoid in older adults (confusion and falls).' },
    efficacy: { potency: 6, onsetHours: 0.5, onset: '15–30 min', evidence: 'moderate', effect: 'Fast relief of itching and hives with strong sedation; the weakest safety profile of the antihistamines here.' },
    safety: { pregnancy: 'Used for specific indications in pregnancy — confirm with the prescriber.', renal: 'Caution; sedating effects accumulate.', cautions: ['Marked drowsiness and next-day hangover.', 'Avoid with alcohol and in older adults (anticholinergic burden).'] },
    price: { packLabel: '20 capsules × 25 mg', priceUsd: 2.1, unitsPerPack: 20, dailyUnits: 1 } },
  { id: 'omeprazole', name: 'Omeprazole', brands: ['Losec', 'Prilosec'], ingredient: 'Omeprazole', class: 'ppi', rx: false, forms: ['Capsule'], strengths: ['10 mg', '20 mg', '40 mg'], conditions: ['gerd'], tier: 'first-line',
    dose: { adult: '20 mg once daily 30 min before breakfast', max: '40 mg/day for reflux; higher only on prescription', verify: 'Long-term use should be reviewed — the lowest effective dose, with a stop date in mind.' },
    efficacy: { potency: 8, onsetHours: 24, onset: 'Relief within 24 h, healing in 4–8 weeks', evidence: 'high', effect: 'Strong acid suppression: the most effective class for erosive reflux and oesophagitis.' },
    safety: { pregnancy: 'Considered acceptable in pregnancy when needed — confirm with the prescriber.', renal: 'No dose adjustment required.', cautions: ['Long-term use associates with low magnesium, B12 and a small fracture risk.', 'Can mask a more serious stomach problem if symptoms persist.'] },
    price: { packLabel: '30 capsules × 20 mg', priceUsd: 4.4, unitsPerPack: 30, dailyUnits: 1 } },
  { id: 'pantoprazole', name: 'Pantoprazole', brands: ['Controloc', 'Protonix'], ingredient: 'Pantoprazole sodium', class: 'ppi', rx: false, forms: ['Tablet'], strengths: ['20 mg', '40 mg'], conditions: ['gerd'], tier: 'first-line',
    dose: { adult: '20–40 mg once daily before breakfast', max: '40 mg/day for reflux maintenance', verify: 'Review the need at 8 weeks; step down to the lowest effective dose.' },
    efficacy: { potency: 8, onsetHours: 24, onset: 'Within 24 h', evidence: 'high', effect: 'Comparable to omeprazole for reflux control, with fewer CYP-interaction concerns.' },
    safety: { pregnancy: 'Limited data — confirm with the prescriber.', renal: 'No dose adjustment required.', cautions: ['Headache and diarrhoea are the commonest effects.', 'Same long-term considerations as omeprazole.'] },
    price: { packLabel: '30 tablets × 40 mg', priceUsd: 5.6, unitsPerPack: 30, dailyUnits: 1 } },
  { id: 'antacid', name: 'Antacid (alginate / calcium carbonate)', brands: ['Gaviscon', 'Rennie'], ingredient: 'Sodium alginate + antacid salts', class: 'antacid', rx: false, forms: ['Suspension', 'Chewable tablet'], strengths: ['10 ml', '500 mg'], conditions: ['gerd'], tier: 'adjunct',
    dose: { adult: '10–20 ml (or 1–2 tablets) after meals and at bedtime', max: 'Per product instructions; usually no more than four doses a day', verify: 'Sodium content matters if you are on a salt-restricted diet.' },
    efficacy: { potency: 4, onsetHours: 0.1, onset: 'Within minutes', evidence: 'moderate', effect: 'Fast symptom relief by forming a physical barrier and neutralising acid, but it does not heal inflammation.' },
    safety: { pregnancy: 'Alginate/calcium antacids are commonly used in pregnancy — confirm with the prescriber.', renal: 'Magnesium-containing antacids are avoided in renal failure.', cautions: ['Can interfere with absorption of other medicines — separate by 2 h.', 'High sodium load in some formulations.'] },
    price: { packLabel: '200 ml suspension', priceUsd: 4.0, unitsPerPack: 1, dailyUnits: 0 } },
  { id: 'famotidine', name: 'Famotidine', brands: ['Pepcid'], ingredient: 'Famotidine', class: 'h2blocker', rx: false, forms: ['Tablet'], strengths: ['10 mg', '20 mg', '40 mg'], conditions: ['gerd'], tier: 'second-line',
    dose: { adult: '10–20 mg twice daily, or 20–40 mg at night', max: '40 mg/day in self-care', verify: 'Dose reduced when kidney function is reduced.' },
    efficacy: { potency: 5, onsetHours: 1, onset: 'Within 1 h', evidence: 'high', effect: 'Moderate acid suppression — less potent than a PPI; useful for mild or night-time symptoms.' },
    safety: { pregnancy: 'Considered acceptable when needed — confirm with the prescriber.', renal: 'Reduce the dose in impairment.', cautions: ['Fewer long-term concerns than PPIs.', 'Not enough on its own for erosive oesophagitis.'] },
    price: { packLabel: '20 tablets × 20 mg', priceUsd: 3.4, unitsPerPack: 20, dailyUnits: 2 } },
  { id: 'xylometazoline', name: 'Xylometazoline nasal spray', brands: ['Otrivin'], ingredient: 'Xylometazoline hydrochloride', class: 'decongestant', rx: false, forms: ['Nasal spray'], strengths: ['0.05 %', '0.1 %'], conditions: ['uri'], tier: 'adjunct',
    dose: { adult: '1 spray per nostril up to 3 times daily', max: 'Never longer than 5 consecutive days', verify: 'Rebound congestion is the main risk — the 5-day ceiling is not optional.' },
    efficacy: { potency: 6, onsetHours: 0.05, onset: 'Within minutes', evidence: 'high', effect: 'Rapid nasal decongestion for a blocked nose; purely symptomatic and short-term.' },
    safety: { pregnancy: 'Discuss before use in pregnancy.', renal: 'No specific adjustment.', cautions: ['Rebound congestion after 5 days of use.', 'Avoid in uncontrolled hypertension or arrhythmia unless advised.'] },
    price: { packLabel: '10 ml spray 0.1 %', priceUsd: 3.0, unitsPerPack: 1, dailyUnits: 0 } },
  { id: 'amoxicillin', name: 'Amoxicillin', brands: ['Amoxil'], ingredient: 'Amoxicillin trihydrate', class: 'aminopenicillin', rx: true, forms: ['Capsule', 'Suspension'], strengths: ['250 mg', '500 mg', '875 mg'], conditions: ['uri', 'uti'], tier: 'second-line',
    dose: { adult: '500 mg every 8 h (or 875 mg every 12 h)', max: 'Duration set by the prescriber — usually 5–7 days', verify: 'Penicillin allergy checked first; the full course must be completed.' },
    efficacy: { potency: 7, onsetHours: 24, onset: '24–72 h for a susceptible infection', evidence: 'high', effect: 'Effective ONLY against bacterial infection — useless for viral colds and flu, which is why it ranks low for a viral illness.' },
    safety: { pregnancy: 'Generally considered safe in pregnancy — confirm with the prescriber.', renal: 'Dose interval extended in renal impairment.', cautions: ['Allergy and anaphylaxis; rash in infectious mononucleosis.', 'Diarrhoea, Candida overgrowth, and resistance from unnecessary use.'] },
    price: { packLabel: '16 capsules × 500 mg', priceUsd: 4.8, unitsPerPack: 16, dailyUnits: 3 } },
  { id: 'nitrofurantoin', name: 'Nitrofurantoin', brands: ['Macrobid', 'Furadantin'], ingredient: 'Nitrofurantoin', class: 'nitrofuran', rx: true, forms: ['Capsule'], strengths: ['50 mg', '100 mg'], conditions: ['uti'], tier: 'first-line',
    dose: { adult: '100 mg every 12 h with food', max: 'Usually 5 days for uncomplicated cystitis', verify: 'Not effective for kidney (upper-tract) infection; avoid at low eGFR.' },
    efficacy: { potency: 7, onsetHours: 24, onset: '24–48 h symptom improvement', evidence: 'high', effect: 'First choice for uncomplicated bladder infection, with favourable resistance profiles in many settings.' },
    safety: { pregnancy: 'Avoid at term (haemolysis risk in the newborn) — specialist decision.', renal: 'Ineffective and risky at low eGFR.', cautions: ['Nausea; brown urine discolouration is harmless.', 'Rare lung and nerve reactions on long-term use.'] },
    price: { packLabel: '20 capsules × 100 mg', priceUsd: 6.2, unitsPerPack: 20, dailyUnits: 2 } },
  { id: 'fosfomycin', name: 'Fosfomycin (single dose)', brands: ['Monuril'], ingredient: 'Fosfomycin trometamol', class: 'fosfomycin', rx: true, forms: ['Granule sachet'], strengths: ['3 g'], conditions: ['uti'], tier: 'second-line',
    dose: { adult: '3 g as a single sachet dissolved in water', max: 'One dose; a second only on advice', verify: 'Confirm the diagnosis first — a single dose fails if the infection is not simple cystitis.' },
    efficacy: { potency: 6, onsetHours: 24, onset: '24–48 h', evidence: 'high', effect: 'Convenient single-dose option; adherence is the advantage, not superior potency.' },
    safety: { pregnancy: 'Used in pregnancy for specific indications — confirm with the prescriber.', renal: 'Avoid in significant renal impairment.', cautions: ['Diarrhoea and headache.', 'Not for pyelonephritis or complicated infection.'] },
    price: { packLabel: '1 sachet of 3 g', priceUsd: 8.5, unitsPerPack: 1, dailyUnits: 0 } },
  { id: 'clotrimazole-topical', name: 'Clotrimazole cream 1 %', brands: ['Canesten'], ingredient: 'Clotrimazole', class: 'topical-antifungal', rx: false, forms: ['Cream'], strengths: ['1 %'], conditions: ['skin'], tier: 'first-line',
    dose: { adult: 'Apply thinly twice daily to the affected area and 2 cm beyond it', max: 'Continue 2 weeks after the rash clears for tinea; 4 weeks for athlete foot', verify: 'Keep the area dry; if there is no improvement in 4 weeks, review the diagnosis.' },
    efficacy: { potency: 7, onsetHours: 72, onset: 'Itch improves in 2–3 days, rash in 2–4 weeks', evidence: 'high', effect: 'Effective against most dermatophyte and Candida skin infections — the strongest topical antifungal here.' },
    safety: { pregnancy: 'Topical use is considered acceptable — confirm with the prescriber.', renal: 'Negligible systemic absorption.', cautions: ['Local irritation or burning.', 'Stopping early is the commonest cause of relapse.'] },
    price: { packLabel: '20 g tube 1 %', priceUsd: 3.7, unitsPerPack: 1, dailyUnits: 0 } },
  { id: 'hydrocortisone-topical', name: 'Hydrocortisone cream 1 %', brands: ['Cortaid'], ingredient: 'Hydrocortisone acetate 1 %', class: 'topical-steroid', rx: false, forms: ['Cream', 'Ointment'], strengths: ['1 %'], conditions: ['allergy', 'skin'], tier: 'second-line',
    dose: { adult: 'Apply thinly once or twice daily for up to 7 days', max: 'Not on the face for more than 5 days, and never on broken or infected skin', verify: 'Thinning of the skin is the risk of overuse — if it is infected, the infection must be treated too.' },
    efficacy: { potency: 6, onsetHours: 12, onset: 'Within hours to 1 day', evidence: 'high', effect: 'Rapid control of itch and inflammation in eczema, insect bites and contact dermatitis.' },
    safety: { pregnancy: 'Short courses on small areas are considered acceptable — confirm with the prescriber.', renal: 'Negligible systemic absorption on small areas.', cautions: ['Skin thinning, striae and masking of infection with prolonged use.', 'Avoid on the face, flexures and in children without advice.'] },
    price: { packLabel: '30 g tube 1 %', priceUsd: 3.3, unitsPerPack: 1, dailyUnits: 0 } },
  { id: 'mupirocin-topical', name: 'Mupirocin ointment 2 %', brands: ['Bactroban'], ingredient: 'Mupirocin', class: 'topical-antibiotic', rx: false, forms: ['Ointment'], strengths: ['2 %'], conditions: ['skin'], tier: 'first-line',
    dose: { adult: 'Apply three times daily for 5–7 days to infected or impetiginised skin', max: 'Do not extend beyond 10 days; not for large areas', verify: 'Spreading redness or fever needs systemic assessment, not more ointment.' },
    efficacy: { potency: 7, onsetHours: 24, onset: '1–2 days', evidence: 'high', effect: 'Effective topical antibacterial for localised skin infection such as impetigo and infected minor wounds.' },
    safety: { pregnancy: 'Limited data — confirm with the prescriber.', renal: 'Negligible systemic absorption on small areas.', cautions: ['Local irritation.', 'Reserve for confirmed local infection to limit resistance.'] },
    price: { packLabel: '15 g tube 2 %', priceUsd: 5.9, unitsPerPack: 1, dailyUnits: 0 } },
  { id: 'chlorhexidine', name: 'Chlorhexidine antiseptic 0.5 %', brands: ['antiseptic solution'], ingredient: 'Chlorhexidine gluconate', class: 'topical-antiseptic', rx: false, forms: ['Solution', 'Wipes'], strengths: ['0.5 %', '2 %'], conditions: ['skin'], tier: 'adjunct',
    dose: { adult: 'Clean the wound and surrounding skin once or twice daily', max: 'External use only; never in the ear canal or eyes', verify: 'Not a substitute for review of a deep or dirty wound.' },
    efficacy: { potency: 4, onsetHours: 0.05, onset: 'Immediate antiseptic action', evidence: 'moderate', effect: 'Reduces surface bacteria in wound care — it helps prevent infection rather than treating established infection.' },
    safety: { pregnancy: 'Topical use considered acceptable.', renal: 'No systemic exposure on intact skin.', cautions: ['Stings and can irritate broken skin.', 'Avoid contact with eyes and the middle ear.'] },
    price: { packLabel: '250 ml solution', priceUsd: 4.2, unitsPerPack: 1, dailyUnits: 0 } },
  { id: 'benzoyl-peroxide', name: 'Benzoyl peroxide 5 % gel', brands: ['Acnecide'], ingredient: 'Benzoyl peroxide', class: 'topical-acne', rx: false, forms: ['Gel'], strengths: ['2.5 %', '5 %', '10 %'], conditions: ['skin'], tier: 'first-line',
    dose: { adult: 'Apply a pea-sized amount once daily, increasing to twice daily if tolerated', max: 'Per product instructions; start at the lowest strength', verify: 'Bleaches fabric and towels; use sunscreen as it increases photosensitivity.' },
    efficacy: { potency: 6, onsetHours: 336, onset: '4–6 weeks for a visible effect', evidence: 'high', effect: 'Reduces inflammatory and non-inflammatory acne by killing Cutibacterium and reducing keratin plugging.' },
    safety: { pregnancy: 'Limited data — discuss with the prescriber; often avoided in pregnancy.', renal: 'Negligible systemic absorption.', cautions: ['Dryness, peeling and irritation in the first weeks.', 'Rare true allergic reaction; stop if severe swelling occurs.'] },
    price: { packLabel: '30 g gel 5 %', priceUsd: 4.9, unitsPerPack: 1, dailyUnits: 0 } },
  { id: 'ferrous-sulfate', name: 'Ferrous sulfate', brands: ['Feospan'], ingredient: 'Ferrous sulfate (65 mg elemental iron)', class: 'iron', rx: false, forms: ['Tablet', 'Syrup'], strengths: ['200 mg (65 mg iron)', '325 mg'], conditions: ['anemia'], tier: 'first-line',
    dose: { adult: 'One tablet once daily, or on alternate days, with vitamin C', max: 'Per prescriber; alternate-day dosing is often better absorbed', verify: 'Repeat haemoglobin and ferritin at 8–12 weeks; find the cause of the deficiency.' },
    efficacy: { potency: 8, onsetHours: 168, onset: 'Fatigue improves in 2–4 weeks; ferritin takes longer', evidence: 'high', effect: 'The most effective and cheapest way to rebuild iron stores; the strongest option in this group.' },
    safety: { pregnancy: 'Commonly used in pregnancy — confirm the dose with the prescriber.', renal: 'No specific adjustment.', cautions: ['Constipation, dark stools and nausea are common.', 'Take 2 h away from tea, coffee, calcium and antacids.'] },
    price: { packLabel: '30 tablets × 200 mg', priceUsd: 2.9, unitsPerPack: 30, dailyUnits: 1 } },
  { id: 'ferrous-fumarate', name: 'Ferrous fumarate', brands: ['Fersaday'], ingredient: 'Ferrous fumarate (65 mg elemental iron)', class: 'iron', rx: false, forms: ['Tablet'], strengths: ['210 mg', '322 mg'], conditions: ['anemia'], tier: 'first-line',
    dose: { adult: 'One tablet once or twice daily with food or juice', max: 'Per prescriber', verify: 'Same monitoring and separation rules as ferrous sulfate.' },
    efficacy: { potency: 8, onsetHours: 168, onset: '2–4 weeks for symptoms', evidence: 'high', effect: 'Equivalent to ferrous sulfate with slightly better gastrointestinal tolerance for many people.' },
    safety: { pregnancy: 'Commonly used in pregnancy — confirm with the prescriber.', renal: 'No specific adjustment.', cautions: ['Constipation and nausea.', 'Keep out of reach of children — iron overdose is dangerous.'] },
    price: { packLabel: '30 tablets × 210 mg', priceUsd: 3.6, unitsPerPack: 30, dailyUnits: 1 } },
  { id: 'folic-acid', name: 'Folic acid', brands: ['generic'], ingredient: 'Folic acid', class: 'supplement', rx: false, forms: ['Tablet'], strengths: ['400 µg', '5 mg'], conditions: ['anemia'], tier: 'adjunct',
    dose: { adult: '400 µg daily (5 mg daily only when prescribed)', max: '5 mg/day on prescription for specific deficiencies', verify: 'Never treat B12 deficiency with folic acid alone — it can mask neurological damage.' },
    efficacy: { potency: 3, onsetHours: 336, onset: 'Weeks', evidence: 'high', effect: 'Corrects folate deficiency and supports red-cell production; essential alongside iron in pregnancy.' },
    safety: { pregnancy: 'Recommended in pregnancy (usually 400 µg, or 5 mg in higher-risk groups).', renal: 'No specific adjustment.', cautions: ['Can mask a vitamin B12 deficiency.', 'Check B12 before treating anaemia with folic acid alone.'] },
    price: { packLabel: '30 tablets × 400 µg', priceUsd: 1.6, unitsPerPack: 30, dailyUnits: 1 } },
  { id: 'vitamin-b12', name: 'Vitamin B12 (cyanocobalamin)', brands: ['generic'], ingredient: 'Cyanocobalamin', class: 'supplement', rx: false, forms: ['Tablet', 'Injection'], strengths: ['500 µg', '1000 µg'], conditions: ['anemia'], tier: 'adjunct',
    dose: { adult: '1000 µg once daily orally, or as prescribed if given by injection', max: 'Per prescriber', verify: 'Absorption is poor without intrinsic factor — injections may be needed rather than tablets.' },
    efficacy: { potency: 5, onsetHours: 336, onset: 'Weeks for blood counts; nerve recovery slower', evidence: 'high', effect: 'Corrects B12 deficiency and prevents neurological progression; must be confirmed by a blood test first.' },
    safety: { pregnancy: 'Needed in pregnancy at prescribed doses.', renal: 'No specific adjustment.', cautions: ['Does not replace investigating the cause of the deficiency.', 'Long-term metformin and vegan diets are common causes.'] },
    price: { packLabel: '30 tablets × 1000 µg', priceUsd: 5.1, unitsPerPack: 30, dailyUnits: 1 } },
  { id: 'prednisolone-short', name: 'Prednisolone (short course)', brands: ['generic'], ingredient: 'Prednisolone', class: 'corticosteroid', rx: true, forms: ['Tablet'], strengths: ['5 mg', '10 mg', '20 mg'], conditions: ['allergy'], tier: 'second-line',
    dose: { adult: 'Short tapering course exactly as prescribed (commonly 20–40 mg daily then reduced)', max: 'Never self-escalate; never stop a long course abruptly', verify: 'Prescriber-led only: raises glucose and blood pressure, and interacts with NSAIDs and diabetes drugs.' },
    efficacy: { potency: 9, onsetHours: 6, onset: 'Hours; strong effect within 1–2 days', evidence: 'high', effect: 'The most powerful anti-inflammatory option here — reserved for severe allergic or inflammatory flares.' },
    safety: { pregnancy: 'Specialist decision.', renal: 'Fluid retention; monitor.', cautions: ['Raises blood glucose, blood pressure and infection risk.', 'With NSAIDs it multiplies the stomach-bleeding risk.'] },
    price: { packLabel: '30 tablets × 5 mg', priceUsd: 3.2, unitsPerPack: 30, dailyUnits: 2 } },
];

/* ------------------------------------------------------------------ */
/* Interaction rules                                                   */
/* ------------------------------------------------------------------ */

export const INTERACTION_RULES = [
  {
    a: { class: 'nsaid' },
    b: { class: 'acei' },
    severity: 'major',
    mechanism: 'NSAIDs constrict the kidney afferent arteriole and blunt ACE inhibitor BP response.',
    management: 'Avoid regular NSAIDs. Prefer paracetamol; monitor BP and renal function.',
  },
  {
    a: { class: 'nsaid' },
    b: { class: 'arb' },
    severity: 'major',
    mechanism: 'Blunts ARB antihypertensive action and risks acute renal injury / hyperkalemia.',
    management: 'Prefer paracetamol. If essential, monitor creatinine and potassium.',
  },
  {
    a: { class: 'nsaid' },
    b: { class: 'thiazide' },
    severity: 'moderate',
    mechanism: 'NSAIDs attenuate diuretic and natriuretic effect; elevates risk of nephrotoxicity.',
    management: 'Short courses only; maintain hydration and check renal electrolytes.',
  },
  {
    a: { class: 'nsaid' },
    b: { class: 'corticosteroid' },
    severity: 'major',
    mechanism: 'Synergistic erosion of gastric mucosa — ulceration and hemorrhage risk multiplies.',
    management: 'Avoid co-prescribing. If required, add proton pump inhibitor gastroprotection.',
  },
  {
    a: { class: 'nsaid' },
    b: { class: 'nsaid' },
    severity: 'major',
    mechanism: 'Duplicative COX inhibition with doubled toxicity and zero clinical advantage.',
    management: 'Do not combine systemic NSAIDs.',
  },
  {
    a: { class: 'nsaid' },
    b: { class: 'anticoagulant' },
    severity: 'major',
    mechanism: 'Platelet anti-aggregation + GI micro-ulcers with anticoagulation = high bleed risk.',
    management: 'Avoid combination. Use non-NSAID analgesia under doctor supervision.',
  },
  {
    a: { class: 'nsaid' },
    b: { class: 'ssri' },
    severity: 'moderate',
    mechanism: 'Platelet serotonin reduction elevates upper GI bleed risk.',
    management: 'Use paracetamol or add PPI gastroprotection.',
  },
  {
    a: { class: 'acei' },
    b: { class: 'arb' },
    severity: 'major',
    mechanism: 'Dual RAAS inhibition causes hyperkalemia and acute kidney injury without benefit.',
    management: 'Contraindicated combination; select ACEI or ARB monotherapy.',
  },
  {
    a: { class: 'sulfonylurea' },
    b: { class: 'betablocker' },
    severity: 'moderate',
    mechanism: 'Beta-blockers mask hypoglycemia warning signs (tachycardia, tremor).',
    management: 'Advise diaphoresis/hunger cues; increase blood glucose testing.',
  },
  {
    a: { class: 'sulfonylurea' },
    b: { class: 'dpp4' },
    severity: 'moderate',
    mechanism: 'Additive insulin secretagogue stimulation escalates hypoglycemia risk.',
    management: 'Reduce sulfonylurea dosage by 50% upon starting DPP-4 inhibitor.',
  },
  {
    a: { class: 'sulfonylurea' },
    b: { class: 'sglt2' },
    severity: 'minor',
    mechanism: 'Mild additive hypoglycemic effect.',
    management: 'Routine capillary blood glucose surveillance.',
  },
  {
    a: { class: 'statin' },
    b: { class: 'fibrate' },
    severity: 'major',
    mechanism: 'Combined myopathy risk and life-threatening rhabdomyolysis.',
    management: 'Avoid gemfibrozil. If fenofibrate is required, monitor serial CK.',
  },
  {
    a: { class: 'statin' },
    b: { class: 'macrolide' },
    severity: 'major',
    mechanism: 'CYP3A4 inhibition surges serum statin levels up to 10-fold.',
    management: 'Hold statin during antibiotic treatment.',
  },
  {
    a: { class: 'statin' },
    b: { class: 'anticoagulant' },
    severity: 'moderate',
    mechanism: 'Statins may enhance vitamin K antagonist anticoagulation.',
    management: 'Check INR and monitor for unexpected bruising or bleeding.',
  },
  {
    a: { class: 'iron' },
    b: { class: 'ppi' },
    severity: 'moderate',
    mechanism: 'Acid suppression decreases non-heme iron solubilization and mucosal uptake.',
    management: 'Co-administer iron with Vitamin C or separate by several hours.',
  },
  {
    a: { class: 'iron' },
    b: { class: 'antacid' },
    severity: 'moderate',
    mechanism: 'Antacid cations chelate elemental iron into insoluble complexes.',
    management: 'Separate administration by at least 2 to 3 hours.',
  },
  {
    a: { class: 'iron' },
    b: { class: 'aminopenicillin' },
    severity: 'minor',
    mechanism: 'Mutual binding reduces bioavailability of both oral penicillin and iron.',
    management: 'Space doses at least 2 hours apart.',
  },
  {
    a: { class: 'levothyroxine' },
    b: { class: 'iron' },
    severity: 'moderate',
    mechanism: 'Iron salts bind levothyroxine in gut lumen causing severe under-treatment.',
    management: 'Enforce strict 4-hour temporal separation between thyroid medication and iron.',
  },
  {
    a: { class: 'levothyroxine' },
    b: { class: 'antacid' },
    severity: 'moderate',
    mechanism: 'Calcium/magnesium antacids bind thyroid hormone and block systemic absorption.',
    management: 'Take levothyroxine on an empty stomach at least 4 hours before antacids.',
  },
  {
    a: { class: 'corticosteroid' },
    b: { class: 'sglt2' },
    severity: 'moderate',
    mechanism: 'Systemic steroids induce insulin resistance and blunt antidiabetic efficacy.',
    management: 'Intensify glycemic monitoring during corticosteroid burst.',
  },
  {
    a: { class: 'corticosteroid' },
    b: { class: 'thiazide' },
    severity: 'moderate',
    mechanism: 'Additive renal potassium wasting produces risk of hypokalemia and arrhythmia.',
    management: 'Check serum potassium if co-therapy continues past 5 days.',
  },
  {
    a: { id: 'paracetamol' },
    b: { class: 'anticoagulant' },
    severity: 'moderate',
    mechanism: 'High sustained paracetamol intake (>2g/day) elevates INR in warfarin patients.',
    management: 'Intermittent single doses are fine; monitor INR if regular high dosing occurs.',
  },
  {
    a: { id: 'diphenhydramine' },
    b: { class: 'ssri' },
    severity: 'moderate',
    mechanism: 'Additive central anticholinergic effects and excessive sedation.',
    management: 'Prefer second-generation non-sedating antihistamines (cetirizine, loratadine).',
  },
  {
    a: { class: 'antihistamine1' },
    b: { class: 'corticosteroid' },
    severity: 'minor',
    mechanism: 'Additive central psychotropic sedation and daytime drowsiness.',
    management: 'Administer sedating antihistamine strictly at bedtime.',
  },
  {
    a: { class: 'nitrofuran' },
    b: { class: 'antacid' },
    severity: 'minor',
    mechanism: 'Magnesium trisilicate antacids decrease nitrofurantoin GI absorption.',
    management: 'Space administration by 2 hours.',
  },

];


/* ------------------------------------------------------------------ */
/* Helpers and Text / Interaction Resolution Engine                   */
/* ------------------------------------------------------------------ */

export const DRUG_BY_ID = Object.fromEntries(DRUGS.map((d) => [d.id, d]));

export function drugById(id) {
  return DRUG_BY_ID[id] ?? null;
}

export function drugsForCondition(conditionId) {
  return DRUGS.filter((d) => d.conditions?.includes(conditionId));
}

/**
 * Drug aliases for regex and OCR token matching.
 */
export const DRUG_NAME_ALIASES = {
  metformin: ['metformin', 'glucophage', 'glycomet', 'ميتفورمين', 'ميتفورمن', 'جلوكوفاج'],
  glimepiride: ['glimepiride', 'amaryl', 'أماريل', 'جليمبيريد'],
  dapagliflozin: ['dapagliflozin', 'forxiga', 'farxiga', 'فوركسيجا', 'داباجليفلوزين'],
  empagliflozin: ['empagliflozin', 'jardiance', 'جارديانس', 'إمباجليفلوزين'],
  sitagliptin: ['sitagliptin', 'januvia', 'جانوفيا', 'سيتاجليبتين'],
  amlodipine: ['amlodipine', 'norvasc', 'amlor', 'أملوديبين', 'املوديبين', 'نورفاسك'],
  lisinopril: ['lisinopril', 'zestril', 'prinivil', 'ليزينوبريل'],
  losartan: ['losartan', 'cozaar', 'لوسارتان', 'كوزار'],
  hydrochlorothiazide: ['hydrochlorothiazide', 'esidrex', 'microzide', 'هيدروكلوروثيازيد'],
  bisoprolol: ['bisoprolol', 'concor', 'بيسوبرولول', 'كونكور'],
  atorvastatin: ['atorvastatin', 'lipitor', 'atorlip', 'أتورفاستاتين', 'اتورفاستاتين', 'ليبيتور'],
  rosuvastatin: ['rosuvastatin', 'crestor', 'روزوفاستاتين', 'كريستور'],
  ezetimibe: ['ezetimibe', 'ezetrol', 'zetia', 'ايزيتيميب', 'إيزيتيميب'],
  fenofibrate: ['fenofibrate', 'lipanthyl', 'فينوفايبرات', 'ليبانثيل'],
  omega3: ['omega 3', 'omega-3', 'fish oil', 'أوميغا', 'اوميغا', 'زيت السمك'],
  paracetamol: ['paracetamol', 'acetaminophen', 'panadol', 'tylenol', 'باراسيتامول', 'بنادول'],
  ibuprofen: ['ibuprofen', 'brufen', 'advil', 'ايبوبروفين', 'إيبوبروفين', 'بروفين'],
  naproxen: ['naproxen', 'naprosyn', 'aleve', 'نابروكسين'],
  'diclofenac-topical': ['diclofenac', 'voltaren', 'ديكلوفيناك', 'فولتارين'],
  cetirizine: ['cetirizine', 'zyrtec', 'سيتريزين', 'زيرتك'],
  loratadine: ['loratadine', 'claritin', 'لوراتادين', 'كلاريتين'],
  diphenhydramine: ['diphenhydramine', 'benadryl', 'ديفينهيدرامين'],
  omeprazole: ['omeprazole', 'losec', 'prilosec', 'أوميبرازول', 'اوميبرازول', 'لوزيك'],
  pantoprazole: ['pantoprazole', 'controloc', 'protonix', 'بانتوبرازول', 'كنترولوك'],
  antacid: ['antacid', 'gaviscon', 'rennie', 'مضاد حموضة', 'جافيسكون'],
  famotidine: ['famotidine', 'pepcid', 'فاموتيدين'],
  xylometazoline: ['xylometazoline', 'otrivin', 'زيلوميتازولين', 'أوترفين', 'أوتريفين'],
  amoxicillin: ['amoxicillin', 'amoxil', 'أموكسيسيلين', 'اموكسيسيلين'],
  nitrofurantoin: ['nitrofurantoin', 'macrobid', 'furadantin', 'نيتروفورانتوين'],
  fosfomycin: ['fosfomycin', 'monuril', 'فوسفوميسين'],
  'clotrimazole-topical': ['clotrimazole', 'canesten', 'كلوتريمازول', 'كانستين'],
  'hydrocortisone-topical': ['hydrocortisone', 'هيدروكورتيزون'],
  'mupirocin-topical': ['mupirocin', 'bactroban', 'موبيروسين'],
  chlorhexidine: ['chlorhexidine', 'كلورهيكسيدين'],
  'benzoyl-peroxide': ['benzoyl peroxide', 'acnecide', 'بنزويل بيروكسيد'],
  'ferrous-sulfate': ['ferrous sulfate', 'ferrous sulphate', 'iron tablet', 'كبريتات الحديد', 'حديد'],
  'ferrous-fumarate': ['ferrous fumarate', 'فومارات الحديد'],
  'folic-acid': ['folic acid', 'folate', 'حمض الفوليك', 'فوليك أسيد'],
  'vitamin-b12': ['vitamin b12', 'cyanocobalamin', 'b12', 'فيتامين ب12', 'ب12'],
  'prednisolone-short': ['prednisolone', 'prednisone', 'بريدنيزولون'],
};

/**
 * Identify drugs from input text (prescription strings, symptoms, or OCR output).
 * Returns array of matched catalogue drug objects.
 */
export function parsePrescriptionText(text) {
  if (!text || typeof text !== 'string') return [];
  const normalized = text.toLowerCase();
  const matched = [];
  const matchedIds = new Set();

  for (const [drugId, aliases] of Object.entries(DRUG_NAME_ALIASES)) {
    for (const alias of aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-zA-Z0-9\u0600-\u06FF])${escaped}([^a-zA-Z0-9\u0600-\u06FF]|$)`, 'iu');
      if (regex.test(normalized)) {
        if (!matchedIds.has(drugId)) {
          matchedIds.add(drugId);
          const drug = drugById(drugId);
          if (drug) matched.push(drug);
        }
        break;
      }
    }
  }

  return matched;
}

/**
 * Check conflicts between a candidate drug and an array of active medication IDs or objects.
 */
export function checkDrugInteractions(candidateDrug, currentDrugs) {
  if (!candidateDrug || !currentDrugs || currentDrugs.length === 0) return [];
  const candidate = typeof candidateDrug === 'string' ? drugById(candidateDrug) : candidateDrug;
  if (!candidate) return [];

  const conflicts = [];

  for (const active of currentDrugs) {
    const activeDrug = typeof active === 'string' ? drugById(active) : active;
    if (!activeDrug || activeDrug.id === candidate.id) continue;

    for (const rule of INTERACTION_RULES) {
      const matchA =
        (rule.a.id && rule.a.id === candidate.id) ||
        (rule.a.class && rule.a.class === candidate.class);

      const matchB =
        (rule.b.id && rule.b.id === activeDrug.id) ||
        (rule.b.class && rule.b.class === activeDrug.class);

      const matchARev =
        (rule.a.id && rule.a.id === activeDrug.id) ||
        (rule.a.class && rule.a.class === activeDrug.class);

      const matchBRev =
        (rule.b.id && rule.b.id === candidate.id) ||
        (rule.b.class && rule.b.class === candidate.class);

      if ((matchA && matchB) || (matchARev && matchBRev)) {
        conflicts.push({
          candidateDrug: candidate.name,
          conflictingDrug: activeDrug.name,
          severity: rule.severity,
          mechanism: rule.mechanism,
          management: rule.management,
        });
      }
    }
  }

  return conflicts;
}



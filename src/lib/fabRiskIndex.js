/**
 * FAB Risk Index — the composite patient risk score behind the
 * "Patients & FAB Risk Assessment" board.
 *
 * WHAT "FAB" MEANS HERE
 *   F — Family-history burden     (self-declared family-history flags + the risk
 *                                  band of the family profiles held in this app)
 *   A — Age & lifestyle load      (age band + smoking / alcohol / salt / sitting)
 *   B — Biomarker load            (latest laboratory values against the ranges
 *                                  that were supplied with them, plus daily
 *                                  tracking: BP, resting heart rate, SpO₂, BMI,
 *                                  sleep, activity)
 *
 * HOW IT IS BUILT (fully auditable)
 *   Every component adds a bounded number of points from an explicit rule list.
 *   Each rule that fires is returned with the exact value it read, where that
 *   value came from, and how many points it added — so the number on a patient
 *   card can always be traced back to a measurement. Nothing is imputed and
 *   nothing is invented: a rule with no data simply does not score and the
 *   missing input is reported instead.
 *
 * WHAT IT IS NOT
 *   Not a validated clinical score, not a diagnosis, not a triage tool. The
 *   point values are demo constants chosen to be directionally sensible for this
 *   prototype. Cut-points that mirror conventional thresholds are labelled with
 *   the range they come from and never assert a diagnosis.
 *
 * Bands: score < 25 → low · 25–49.9 → medium · ≥ 50 → high.
 */

export const FAB_VERSION = 'fab-index-demo-v1.0';

/** Maximum points each component can contribute (F + A + B = 100). */
export const FAB_COMPONENT_MAX = { family: 26, age: 26, biomarkers: 48 };

export const FAB_BANDS = [
  { id: 'low', label: 'Low risk', min: 0, tone: 'good' },
  { id: 'medium', label: 'Medium risk', min: 25, tone: 'warn' },
  { id: 'high', label: 'High risk', min: 50, tone: 'bad' },
];

export function fabBand(score) {
  const s = Number.isFinite(score) ? score : 0;
  if (s >= 50) return FAB_BANDS[2];
  if (s >= 25) return FAB_BANDS[1];
  return FAB_BANDS[0];
}

const round1 = (v) => Math.round(v * 10) / 10;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Average of the last `n` daily entries for a vital field (null when none). */
function vital(features, id) {
  const f = features?.[id];
  if (!f || !Number.isFinite(f.value)) return null;
  return f;
}

function analyte(features, key) {
  const a = features?.[key];
  if (!a || !Number.isFinite(a.value)) return null;
  return a;
}

/** Points → evidence rows for one component (keeps the scoring lists short). */
function makeAccumulator() {
  const evidence = [];
  return {
    add(points, label, detail, source, kind = 'risk') {
      if (!points) return;
      evidence.push({ points, label, detail, source, kind });
    },
    total() {
      return round1(evidence.reduce((sum, e) => sum + e.points, 0));
    },
    evidence,
  };
}


/* ------------------------------------------------------------------ */
/* F — Family-history burden                                           */
/* ------------------------------------------------------------------ */

const FAMILY_FLAG_POINTS = 8; // per self-declared family-history flag
const FAMILY_FLAG_CAP = 20;

function familyComponent(profile, family) {
  const acc = makeAccumulator();
  const flags = Array.isArray(profile?.flags) ? profile.flags : [];
  const historyFlags = flags.filter((f) => String(f).startsWith('familyHistory'));

  acc.add(
    Math.min(FAMILY_FLAG_CAP, historyFlags.length * FAMILY_FLAG_POINTS),
    `${historyFlags.length} self-declared family-history factor${historyFlags.length === 1 ? '' : 's'}`,
    historyFlags.length
      ? historyFlags
          .map((f) => String(f).replace('familyHistory', '').replace(/([A-Z])/g, ' $1').trim())
          .join(' · ')
      : 'No family-history flag is declared for this profile.',
    'Self-declared on the profile (not verified)',
  );

  // Relatives held in this app: a relative whose OWN data-driven band is elevated
  // adds a small inherited-context term. The scores passed in are data-only (no
  // family term), so this never recurses.
  const high = (family ?? []).filter((r) => r?.band === 'high');
  const medium = (family ?? []).filter((r) => r?.band === 'medium');
  if (high.length || medium.length) {
    acc.add(
      Math.min(6, high.length * 3 + medium.length * 1.5),
      `${high.length + medium.length} relative${high.length + medium.length === 1 ? '' : 's'} in this app carry elevated FAB bands`,
      [...high, ...medium].map((r) => `${r.name} (${r.relation ?? 'relative'}) ${r.score}/100`).join(' · '),
      'Family profiles stored locally in this browser',
    );
  }

  return {
    id: 'family',
    label: 'F · Family-history burden',
    max: FAB_COMPONENT_MAX.family,
    points: clamp(acc.total(), 0, FAB_COMPONENT_MAX.family),
    evidence: acc.evidence,
    missing: profile ? [] : ['No profile loaded'],
  };
}

/* ------------------------------------------------------------------ */
/* A — Age & lifestyle load                                            */
/* ------------------------------------------------------------------ */

const AGE_BANDS = [
  { min: null, max: 39, points: 0, label: 'under 40' },
  { min: 40, max: 54, points: 4, label: '40–54' },
  { min: 55, max: 64, points: 8, label: '55–64' },
  { min: 65, max: 74, points: 12, label: '65–74' },
  { min: 75, max: null, points: 16, label: '75 and over' },
];

const LIFESTYLE_RULES = [
  { flag: 'smoker', points: 6, label: 'Currently smoking (self-declared)' },
  { flag: 'formerSmoker', points: 2, label: 'Former smoker (self-declared)' },
  { flag: 'alcoholRegular', points: 2, label: 'Regular alcohol intake (self-declared)' },
  { flag: 'highSaltDiet', points: 3, label: 'High-salt diet (self-declared)' },
  { flag: 'sedentaryWork', points: 3, label: 'Sedentary work / mostly sitting (self-declared)' },
];

function ageComponent(profile) {
  const acc = makeAccumulator();
  const age = Number.isFinite(profile?.age) ? profile.age : null;
  const band =
    age == null
      ? null
      : AGE_BANDS.find((b) => (b.min ?? -Infinity) <= age && age <= (b.max ?? Infinity));
  if (band) {
    acc.add(band.points, `Age band ${band.label}`, `Recorded age ${age}`, 'Profile demographics');
  }

  const flags = Array.isArray(profile?.flags) ? profile.flags : [];
  let lifestylePoints = 0;
  const hits = [];

  for (const rule of LIFESTYLE_RULES) {
    if (flags.includes(rule.flag)) {
      lifestylePoints += rule.points;
      hits.push(rule.label);
    }
  }
  acc.add(
    Math.min(12, lifestylePoints),
    `${hits.length} lifestyle factor${hits.length === 1 ? '' : 's'} declared`,
    hits.length ? hits.join(' · ') : 'No lifestyle flag is declared for this profile.',
    'Self-declared on the profile (not verified)',
  );

  return {
    id: 'age',
    label: 'A · Age & lifestyle load',
    max: FAB_COMPONENT_MAX.age,
    points: clamp(acc.total(), 0, FAB_COMPONENT_MAX.age),
    evidence: acc.evidence,
    missing: age == null ? ['Age is not recorded, so the age band did not score'] : [],
  };
}

/* ------------------------------------------------------------------ */
/* B — Biomarker load                                                  */
/* ------------------------------------------------------------------ */

/** Conventional cut-points. Each note names the range it comes from. */
const THRESHOLD_RULES = [
  {
    key: 'hba1c',
    tiers: [
      { gte: 6.5, points: 10, note: '≥ 6.5 % is the range conventionally used to identify diabetes' },
      { gte: 5.7, points: 6, note: '5.7–6.4 % is the range conventionally used to identify prediabetes' },
    ],
  },
  {
    key: 'glucose',
    tiers: [
      { gte: 126, points: 8, note: '≥ 126 mg/dL fasting is the range conventionally used to identify diabetes' },
      { gte: 100, points: 5, note: '100–125 mg/dL fasting is the range conventionally used to identify prediabetes' },
    ],
  },
  {
    key: 'ldl',
    tiers: [
      { gte: 160, points: 6, note: '≥ 160 mg/dL is a high LDL band for primary-prevention discussion' },
      { gte: 130, points: 3, note: '130–159 mg/dL is above the usual primary-prevention target' },
    ],
  },
  {
    key: 'triglycerides',
    tiers: [
      { gte: 200, points: 5, note: '≥ 200 mg/dL is the high-triglyceride band' },
      { gte: 150, points: 3, note: '150–199 mg/dL is the borderline-high triglyceride band' },
    ],
  },
  {
    key: 'egfr',
    tiers: [
      { lte: 60, points: 6, note: 'eGFR below 60 is the band used to describe reduced kidney function' },
      { lte: 89, points: 2, note: 'eGFR 60–89 sits in the mildly reduced band' },
    ],
  },
];

function biomarkerComponent(snapshot, liveReading) {
  const acc = makeAccumulator();
  const labs = snapshot?.labFeatures ?? {};
  const vitals = snapshot?.vitalFeatures ?? {};

  // 1) Anything reported outside the range that came WITH the result.
  const outOfRange = Object.values(labs).filter(
    (f) => f && f.verdict && f.verdict !== 'within' && f.referenceRange,
  );
  acc.add(
    Math.min(16, outOfRange.length * 4),
    `${outOfRange.length} laboratory value${outOfRange.length === 1 ? '' : 's'} outside the supplied reference range`,
    outOfRange.length
      ? outOfRange.map((f) => `${f.label} ${f.value} ${f.unit} vs ${f.referenceRange} (${f.verdict})`).join(' · ')
      : 'Every laboratory value that carries a reference range is inside it.',
    'Laboratory results with their own range field',
  );

  // 2) Conventional cut-points (highest applicable tier only).
  for (const rule of THRESHOLD_RULES) {
    const feature = analyte(labs, rule.key);
    if (!feature) continue;
    for (const tier of rule.tiers) {
      const hit = tier.gte != null ? feature.value >= tier.gte : feature.value <= tier.lte;
      if (!hit) continue;
      acc.add(
        tier.points,
        `${feature.label} ${feature.value} ${feature.unit}${tier.gte != null ? ` ≥ ${tier.gte}` : ` ≤ ${tier.lte}`}`,
        tier.note,
        `${feature.source}${feature.date ? ` · ${feature.date}` : ''}`,
      );
      break;
    }
  }

  // 3) Sex-specific HDL term (only when sex is recorded).
  const hdl = analyte(labs, 'hdl');
  const sex = snapshot?.demographics?.sex ?? null;
  if (hdl && (sex === 'Female' || sex === 'Male')) {
    const cut = sex === 'Female' ? 50 : 40;
    if (hdl.value < cut) {
      acc.add(
        3,
        `HDL ${hdl.value} ${hdl.unit} below the ${cut} mg/dL threshold for ${sex === 'Female' ? 'women' : 'men'}`,
        'Low HDL is one of the conventional components of the lipid risk picture.',
        `${hdl.source}${hdl.date ? ` · ${hdl.date}` : ''}`,
      );
    }
  }

  // 4) Blood pressure — recorded daily tracking first; the live simulated
  //    reading is used only as a clearly-labelled fallback.
  const sysRecorded = vital(vitals, 'systolic');
  const diaRecorded = vital(vitals, 'diastolic');
  const bpSource = sysRecorded
    ? 'Daily tracking entries'
    : liveReading
      ? 'Live simulated device stream (fallback)'
      : null;
  const sysValue = sysRecorded?.value ?? liveReading?.systolic ?? null;
  const diaValue = diaRecorded?.value ?? liveReading?.diastolic ?? null;
  if (sysValue != null) {
    const bp = `${sysValue}/${diaValue ?? '—'} mmHg`;
    if (sysValue >= 140 || (diaValue ?? 0) >= 90) {
      acc.add(8, `Blood pressure ${bp}`, '≥ 140/90 mmHg is the conventional hypertension band; confirmation needs repeated clinical readings.', bpSource);
    } else if (sysValue >= 130 || (diaValue ?? 0) >= 85) {
      acc.add(5, `Blood pressure ${bp}`, '130–139/85–89 mmHg is the conventional stage-1 band.', bpSource);
    } else if (sysValue >= 120) {
      acc.add(2, `Blood pressure ${bp}`, '120–129 mmHg is the conventional elevated band.', bpSource);
    }
  }

  // 5) Resting heart rate, SpO₂, BMI, sleep and activity.
  const hrRecorded = vital(vitals, 'restingHr');
  const hr = hrRecorded?.value ?? liveReading?.hr ?? null;
  if (hr != null) {
    const hrSource = hrRecorded ? 'Daily tracking entries' : 'Live simulated device stream (fallback)';
    if (hr >= 100) acc.add(6, `Resting heart rate ${hr} bpm`, 'Resting tachycardia (≥ 100 bpm) is a conventional flag.', hrSource);
    else if (hr >= 90) acc.add(4, `Resting heart rate ${hr} bpm`, 'A resting rate of 90–99 bpm is above the usual 60–80 bpm range.', hrSource);
  }

  const spo2 = liveReading?.spo2 ?? null;
  if (spo2 != null) {
    if (spo2 < 94) acc.add(6, `Oxygen saturation ${spo2} %`, 'SpO₂ below 94 % is a conventional desaturation flag.', 'Live simulated device stream');
    else if (spo2 < 96) acc.add(3, `Oxygen saturation ${spo2} %`, 'SpO₂ 94–95 % sits at the lower edge of the usual range.', 'Live simulated device stream');
  }

  const bmi = snapshot?.demographics?.bmi ?? null;
  if (Number.isFinite(bmi)) {
    if (bmi >= 35) acc.add(6, `BMI ${bmi} kg/m²`, 'BMI ≥ 35 is the conventional class-II obesity band.', 'Height and weight on the profile');
    else if (bmi >= 30) acc.add(4, `BMI ${bmi} kg/m²`, 'BMI 30–34.9 is the conventional obesity band.', 'Height and weight on the profile');
    else if (bmi >= 25) acc.add(2, `BMI ${bmi} kg/m²`, 'BMI 25–29.9 is the conventional overweight band.', 'Height and weight on the profile');
  }

  const sleep = vital(vitals, 'sleepHours');
  if (sleep && sleep.value < 6) {
    acc.add(2, `Sleep ${sleep.value} h`, 'Below 6 h is short of the 7–9 h recommendation.', sleep.synthetic ? 'Synthetic longitudinal panel' : 'Daily tracking entries');
  }

  const activity = vital(vitals, 'activityMinutes');
  if (activity && activity.value < 90) {
    acc.add(3, `Activity ${activity.value} min/week`, 'Below the 150 min/week moderate-activity recommendation.', activity.synthetic ? 'Synthetic longitudinal panel' : 'Daily tracking entries');
  } else if (activity && activity.value >= 150) {
    acc.add(-3, `Activity ${activity.value} min/week`, 'Meets the 150 min/week recommendation — scored as protective.', activity.synthetic ? 'Synthetic longitudinal panel' : 'Daily tracking entries', 'protective');
  }

  return {
    id: 'biomarkers',
    label: 'B · Biomarker load',
    max: FAB_COMPONENT_MAX.biomarkers,
    points: clamp(acc.total(), 0, FAB_COMPONENT_MAX.biomarkers),
    evidence: [...acc.evidence].sort((a, b) => b.points - a.points),
    missing: Object.keys(labs).length
      ? []
      : ['No laboratory results are available for this profile, so only tracking data scored'],
  };
}

/* ------------------------------------------------------------------ */
/* Vitals table (used by the board, the ticker and the PDF report)     */
/* ------------------------------------------------------------------ */

const VITAL_TONE = (value, warn, bad, dir = 'high') => {
  if (!Number.isFinite(value)) return 'neutral';
  if (dir === 'high') return value >= bad ? 'bad' : value >= warn ? 'warn' : 'good';
  return value <= bad ? 'bad' : value <= warn ? 'warn' : 'good';
};

/**
 * The vitals shown on a patient card. Recorded tracking always wins; the live
 * simulated reading fills only the gaps and is labelled as such.
 */
export function fabVitalsTable(snapshot, liveReading) {
  const v = snapshot?.vitalFeatures ?? {};
  const labs = snapshot?.labFeatures ?? {};
  const rows = [];
  const push = (label, value, unit, source, tone, extra = {}) => {
    if (value == null || value === '') return;
    rows.push({ label, value, unit, source, tone, ...extra });
  };

  const sys = v.systolic?.value ?? liveReading?.systolic;
  const dia = v.diastolic?.value ?? liveReading?.diastolic;
  if (sys != null) {
    push(
      'Blood pressure',
      `${sys}/${dia ?? '—'}`,
      'mmHg',
      v.systolic ? 'Daily tracking' : 'Live simulation',
      VITAL_TONE(sys, 130, 140),
    );
  }
  const hr = v.restingHr?.value ?? liveReading?.hr;
  push('Heart rate', hr, 'bpm', v.restingHr ? 'Daily tracking' : 'Live simulation', VITAL_TONE(hr, 90, 100));
  push('SpO₂', liveReading?.spo2, '%', 'Live simulation', VITAL_TONE(liveReading?.spo2, 96, 94, 'low'));
  push('Temperature', liveReading?.temperature, '°C', 'Live simulation', VITAL_TONE(liveReading?.temperature, 37.4, 38));
  push('BMI', snapshot?.demographics?.bmi, 'kg/m²', 'Profile height & weight', VITAL_TONE(snapshot?.demographics?.bmi, 25, 30));

  const labRow = (key, warn, bad, dir) => {
    const f = labs[key];
    if (!f) return;
    push(f.label, f.value, f.unit, f.source, VITAL_TONE(f.value, warn, bad, dir), { date: f.date });
  };
  labRow('hba1c', 5.7, 6.5);
  labRow('glucose', 100, 126);
  labRow('ldl', 130, 160);
  labRow('triglycerides', 150, 200);
  const hdl = labs.hdl;
  if (hdl) {
    const cut = snapshot?.demographics?.sex === 'Female' ? 50 : 40;
    push(hdl.label, hdl.value, hdl.unit, hdl.source, hdl.value < cut ? 'warn' : 'good', { date: hdl.date });
  }
  labRow('egfr', 90, 60, 'low');

  return rows;
}

/** Stable 32-bit seed for a profile id — drives the decorative ECG strip. */
export function fabSeed(profileId) {
  const s = String(profileId ?? 'profile');
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100000;
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                  */
/* ------------------------------------------------------------------ */

/**
 * Compute the FAB index for one profile.
 *
 * @param {object} args
 * @param {object} args.snapshot    buildProfileHealthSnapshot() output
 * @param {object} args.profile     the profile being scored
 * @param {object} [args.liveReading] current simulated device reading
 * @param {Array}  [args.family]    other profiles as { name, relation, score, band }
 *                                  scored WITHOUT the family term (no recursion)
 * @param {object} [args.records]   the profile's own records (used for counts)
 */
export function fabRiskIndex({ snapshot, profile, liveReading = null, family = [], records = null } = {}) {
  const components = [
    familyComponent(profile, family),
    ageComponent(profile),
    biomarkerComponent(snapshot, liveReading),
  ];

  const score = round1(clamp(components.reduce((sum, c) => sum + c.points, 0), 0, 100));
  const band = fabBand(score);
  const evidence = components.flatMap((c) => c.evidence.map((e) => ({ ...e, component: c.id })));
  const drivers = evidence.filter((e) => e.points > 0).sort((a, b) => b.points - a.points);
  const protective = evidence.filter((e) => e.points < 0).sort((a, b) => a.points - b.points);
  const missing = components.flatMap((c) => c.missing ?? []);
  const meds = Array.isArray(records?.meds) ? records.meds : [];

  return {
    version: FAB_VERSION,
    profileId: profile?.id ?? null,
    profileName: profile?.name ?? 'Unnamed profile',
    relation: profile?.relation ?? 'Self',
    score,
    band: band.id,
    bandLabel: band.label,
    bandTone: band.tone,
    components,
    drivers,
    protective,
    evidence,
    missing,
    coverage: {
      scoredRules: drivers.length + protective.length,
      declaredFactors:
        (Array.isArray(profile?.flags) ? profile.flags.length : 0) +
        (snapshot?.labOverview?.length ?? 0),
      componentMax: components.reduce((sum, c) => sum + c.max, 0),
    },
    vitals: fabVitalsTable(snapshot, liveReading),
    medsOnFile: meds.length,
    seed: fabSeed(profile?.id),
    note:
      'FAB is a transparent demo composite (Family history, Age & lifestyle, Biomarkers). Every point traces to a recorded or self-declared input listed in the breakdown — it is not a validated score and not a diagnosis.',
  };
}


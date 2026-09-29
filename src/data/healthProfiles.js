/**
 * Multi-profile (family) model for the Unified Patient Health & Risk Dashboard.
 *
 * A "profile" is one person whose health records this browser holds: the device
 * owner ("Self") plus any family members the user chooses to add. Every record
 * entered here stays in this browser only (localStorage) and is never
 * attributed to anyone other than the profile it was entered for.
 *
 * The seed profiles are SYNTHETIC DEMO DATA. The primary profile shares the
 * subject identity used elsewhere in the prototype (see src/data/patientData.js),
 * so the dashboard can aggregate the records already entered on the Lab,
 * Genetics and AI Assistant pages. Family members start with no records at all —
 * nothing is transferred, inferred or inherited into their profile.
 */

/** Preset relationship labels offered by the add-member form. */
export const PROFILE_RELATIONS = [
  'Self',
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Son',
  'Daughter',
  'Spouse / Partner',
  'Grandparent',
  'Grandchild',
  'Other relative',
];

/** Preset sex options. Kept explicit so sex-specific screening can be gated. */
export const PROFILE_SEXES = ['Female', 'Male', 'Other / not stated'];

/**
 * Self-declared risk flags. These are the ONLY risk factors the dashboard
 * accepts without an underlying measurement, and every one of them is labelled
 * "self-declared" wherever it is used. Nothing here is inferred from the data.
 */
export const RISK_FLAGS = [
  { id: 'familyHistoryT2D', label: 'Family history of type 2 diabetes', group: 'Family history' },
  { id: 'familyHistoryCVD', label: 'Family history of heart disease', group: 'Family history' },
  { id: 'familyHistoryHypertension', label: 'Family history of high blood pressure', group: 'Family history' },
  { id: 'familyHistoryBreastOvarian', label: 'Family history of breast / ovarian cancer', group: 'Family history' },
  { id: 'familyHistoryColorectal', label: 'Family history of colorectal cancer', group: 'Family history' },
  { id: 'familyHistoryAlzheimer', label: "Family history of Alzheimer's disease", group: 'Family history' },
  { id: 'familyHistoryCKD', label: 'Family history of kidney disease', group: 'Family history' },
  { id: 'smoker', label: 'Currently smoking (any amount)', group: 'Lifestyle' },
  { id: 'formerSmoker', label: 'Former smoker', group: 'Lifestyle' },
  { id: 'alcoholRegular', label: 'Regular alcohol intake', group: 'Lifestyle' },
  { id: 'highSaltDiet', label: 'High-salt diet', group: 'Lifestyle' },
  { id: 'sedentaryWork', label: 'Sedentary work / mostly sitting', group: 'Lifestyle' },
];

export const RISK_FLAG_GROUPS = ['Family history', 'Lifestyle'];

export function riskFlagLabel(id) {
  return RISK_FLAGS.find((f) => f.id === id)?.label ?? id;
}

/** The profile whose records are shared with the rest of the application. */
export const PRIMARY_PROFILE_ID = 'profile-self';

/** Demo profiles. Synthetic only — no real person is represented. */
export const SEED_PROFILES = [
  {
    id: PRIMARY_PROFILE_ID,
    name: 'Elena Vasquez',
    relation: 'Self',
    age: 54,
    sex: 'Female',
    isPrimary: true,
    heightCm: 162,
    weightKg: 78,
    flags: ['familyHistoryT2D', 'sedentaryWork'],
    createdAt: '2026-09-12T09:00:00.000Z',
    note: 'Primary profile — shares the synthetic subject used across the prototype.',
  },
  {
    id: 'profile-father',
    name: 'Rafael Vasquez',
    relation: 'Father',
    age: 79,
    sex: 'Male',
    isPrimary: false,
    heightCm: 171,
    weightKg: 84,
    flags: ['familyHistoryCVD', 'familyHistoryT2D', 'highSaltDiet'],
    createdAt: '2026-09-14T10:30:00.000Z',
    note: 'Synthetic demo family member — starts with no records of his own.',
  },
];

/** Empty per-profile record store. Every collection is user-entered only. */
export function emptyProfileRecords() {
  return { labs: [], vitals: [], genes: [], notes: [] };
}

export const PROFILE_RECORD_KINDS = [
  { id: 'labs', label: 'Laboratory results' },
  { id: 'vitals', label: 'Daily tracking' },
  { id: 'genes', label: 'Genetic variants' },
  { id: 'notes', label: 'Notes & symptoms' },
];

/** Initials for the avatar chip ("Elena Vasquez" → "EV"). */
export function profileInitials(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** "54 yrs · Female · Father" summary line used by the switcher and header. */
export function profileMetaLine(profile) {
  if (!profile) return '';
  const bits = [];
  if (Number.isFinite(profile.age)) bits.push(`${profile.age} yrs`);
  if (profile.sex) bits.push(profile.sex);
  if (profile.relation && profile.relation !== 'Self') bits.push(profile.relation);
  return bits.join(' · ');
}

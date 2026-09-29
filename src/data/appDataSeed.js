/**
 * Seed records for the normalized application data model.
 *
 * EVERYTHING in this file is SYNTHETIC DEMO DATA. It exists only so the
 * prototype UI has something to render on first load. Nothing here comes from
 * a real person, a real laboratory, or a real genetic test, and none of it is
 * a diagnosis. Each collection is surfaced in the UI with a
 * "Synthetic Demo Data" label so it is never mistaken for real results.
 *
 * User-created records (uploads, manual lab entries, conversations) are stored
 * separately in localStorage by AppDataContext and are kept distinct from
 * these seeds.
 */

export const DEMO_SOURCE_LABEL = 'Synthetic Demo Data';

/**
 * Manual / panel blood-test entries. `referenceRange` is only present when a
 * range was actually supplied with the value; `referenceSource` records where
 * it came from so the UI can label it honestly.
 * status is purely the laboratory-supplied flag when one exists, else null.
 */
export const SEED_BLOOD_TESTS = [
  {
    id: 'bt-seed-glucose-1',
    name: 'Glucose (fasting)',
    panel: 'Metabolic',
    value: 104,
    unit: 'mg/dL',
    referenceRange: '70–99',
    referenceSource: 'laboratory',
    date: '2026-06-05',
    source: DEMO_SOURCE_LABEL,
    notes: 'Flagged for follow-up in the synthetic demo panel.',
  },
  {
    id: 'bt-seed-glucose-2',
    name: 'Glucose (fasting)',
    panel: 'Metabolic',
    value: 108,
    unit: 'mg/dL',
    referenceRange: '70–99',
    referenceSource: 'laboratory',
    date: '2026-06-18',
    source: DEMO_SOURCE_LABEL,
    notes: 'Repeat confirmatory draw (synthetic).',
  },
  {
    id: 'bt-seed-glucose-3',
    name: 'Glucose (fasting)',
    panel: 'Metabolic',
    value: 112,
    unit: 'mg/dL',
    referenceRange: '70–99',
    referenceSource: 'laboratory',
    date: '2026-09-12',
    source: DEMO_SOURCE_LABEL,
    notes: 'Morning draw, 10 h fasted (synthetic).',
  },
  {
    id: 'bt-seed-hba1c-1',
    name: 'HbA1c',
    panel: 'Metabolic',
    value: 6.1,
    unit: '%',
    referenceRange: '<5.7',
    referenceSource: 'laboratory',
    date: '2026-09-12',
    source: DEMO_SOURCE_LABEL,
    notes: 'Prediabetic range in the synthetic demo panel.',
  },
  {
    id: 'bt-seed-ldl-1',
    name: 'LDL cholesterol',
    panel: 'Lipids',
    value: 136,
    unit: 'mg/dL',
    referenceRange: null,
    referenceSource: null,
    date: '2026-07-02',
    source: DEMO_SOURCE_LABEL,
    notes: 'No reference range supplied with this synthetic value.',
  },
  {
    id: 'bt-seed-hdl-1',
    name: 'HDL cholesterol',
    panel: 'Lipids',
    value: 44,
    unit: 'mg/dL',
    referenceRange: null,
    referenceSource: null,
    date: '2026-07-02',
    source: DEMO_SOURCE_LABEL,
    notes: 'No reference range supplied with this synthetic value.',
  },
  {
    id: 'bt-seed-tg-1',
    name: 'Triglycerides',
    panel: 'Lipids',
    value: 161,
    unit: 'mg/dL',
    referenceRange: null,
    referenceSource: null,
    date: '2026-07-02',
    source: DEMO_SOURCE_LABEL,
    notes: 'No reference range supplied with this synthetic value.',
  },
];

/**
 * Genetic variant rows. Classification is deliberately non-clinical
 * ("Research-only") and confidence is labelled as a demo value. The UI never
 * presents these as proving disease.
 */
export const SEED_GENETIC_RECORDS = [
  {
    id: 'gn-seed-1',
    gene: 'APOE',
    variant: 'rs429358',
    chromosome: '19',
    position: '44908684',
    reference: 'T',
    alternate: 'C',
    zygosity: 'Heterozygous',
    source: DEMO_SOURCE_LABEL,
    classification: 'Research-only variant',
    confidence: 'Demo confidence (not clinically validated)',
  },
  {
    id: 'gn-seed-2',
    gene: 'MTHFR',
    variant: 'rs1801133',
    chromosome: '1',
    position: '11856378',
    reference: 'A',
    alternate: 'C',
    zygosity: 'Heterozygous',
    source: DEMO_SOURCE_LABEL,
    classification: 'Research-only variant',
    confidence: 'Demo confidence (not clinically validated)',
  },
  {
    id: 'gn-seed-3',
    gene: 'HFE',
    variant: 'rs1800562',
    chromosome: '6',
    position: '26093141',
    reference: 'G',
    alternate: 'A',
    zygosity: 'Homozygous reference',
    source: DEMO_SOURCE_LABEL,
    classification: 'Research-only variant',
    confidence: 'Demo confidence (not clinically validated)',
  },
];

/**
 * Pre-seeded medical records so the upload centre is not empty on first run.
 * The CSV record carries genuinely-parsed structured values (they came from
 * the demo CSV text below); the TXT record parsed cleanly but contained no
 * structured lab values, which is a realistic and honest outcome.
 */
export const SEED_MEDICAL_RECORDS = [
  {
    id: 'mr-seed-1',
    displayName: 'demo-lipid-panel.csv',
    originalName: 'demo-lipid-panel.csv',
    fileType: 'csv',
    category: 'Blood Test',
    status: 'processed',
    uploadedAt: '2026-09-10T09:15:00.000Z',
    sizeBytes: 96,
    source: DEMO_SOURCE_LABEL,
    extractionAvailable: true,
    extractionNote:
      'Structured values parsed from the demo CSV text bundled with this prototype.',
    extracted: [
      { name: 'LDL cholesterol', value: 136, unit: 'mg/dL', referenceRange: null },
      { name: 'HDL cholesterol', value: 44, unit: 'mg/dL', referenceRange: null },
      { name: 'Triglycerides', value: 161, unit: 'mg/dL', referenceRange: null },
    ],
    imported: false,
  },
  {
    id: 'mr-seed-2',
    displayName: 'demo-clinic-note.txt',
    originalName: 'demo-clinic-note.txt',
    fileType: 'txt',
    category: 'Medical Report',
    status: 'processed',
    uploadedAt: '2026-09-11T14:02:00.000Z',
    sizeBytes: 214,
    source: DEMO_SOURCE_LABEL,
    extractionAvailable: true,
    extractionNote:
      'Text parsed successfully; no structured laboratory values were present in the document.',
    extracted: [],
    imported: false,
  },
];

/**
 * Seed hub items and family metadata. All synthetic / demo unless noted.
 */

import { DEMO_SIGNALS, DEMO_SUBJECTS, DEMO_DATA_CLASS, DEMO_SIGNAL_SOURCE } from './demoBioSignals.js';
import { DEMO_SOURCE_LABEL } from './appDataSeed.js';
import { createProvenance } from '../lib/provenance.js';

export { DEMO_SUBJECTS };

export const SEED_HUB_ITEMS = [
  {
    id: 'hub-seed-lab',
    name: 'Demo lipid panel (CSV)',
    category: 'lab',
    status: 'Processed',
    format: 'csv',
    filename: 'demo-lipid-panel.csv',
    source: DEMO_SOURCE_LABEL,
    dataClass: 'synthetic-demo',
    uploadedAt: '2026-09-10T09:15:00.000Z',
    note: 'Structured values parsed from bundled demo CSV.',
    linked: { medicalRecordIds: ['mr-seed-1'], labIds: ['bt-seed-ldl-1', 'bt-seed-hdl-1', 'bt-seed-tg-1'], geneticIds: [], signalIds: [] },
    provenance: createProvenance({ origin: DEMO_SOURCE_LABEL, filename: 'demo-lipid-panel.csv', format: 'csv', parser: 'delimited-text', dataClass: 'synthetic-demo' }),
  },
  {
    id: 'hub-seed-genetic',
    name: 'Demo variant table',
    category: 'genetic',
    status: 'Processed',
    format: 'csv',
    filename: 'demo-variants.csv',
    source: DEMO_SOURCE_LABEL,
    dataClass: 'synthetic-demo',
    uploadedAt: '2026-09-12T11:00:00.000Z',
    note: 'Three research-only variant rows (synthetic).',
    linked: { medicalRecordIds: [], labIds: [], geneticIds: ['gn-seed-1', 'gn-seed-2', 'gn-seed-3'], signalIds: [] },
    provenance: createProvenance({ origin: DEMO_SOURCE_LABEL, filename: 'demo-variants.csv', format: 'csv', parser: 'delimited-text', dataClass: 'synthetic-demo' }),
  },
  {
    id: 'hub-seed-signals',
    name: 'Demo bio-signal cohort',
    category: 'bio-signals',
    status: 'Processed',
    format: 'generated',
    filename: null,
    source: DEMO_SIGNAL_SOURCE,
    dataClass: DEMO_DATA_CLASS,
    uploadedAt: '2026-09-01T08:00:00.000Z',
    note: 'Metadata-only demo recordings; samples generated on demand.',
    linked: { medicalRecordIds: [], labIds: [], geneticIds: [], signalIds: DEMO_SIGNALS.map((s) => s.id) },
    provenance: createProvenance({ origin: DEMO_SIGNAL_SOURCE, parser: 'demo-generator', dataClass: DEMO_DATA_CLASS }),
  },
  {
    id: 'hub-seed-sleep',
    name: 'Demo sleep staging window',
    category: 'sleep',
    status: 'Processed',
    format: 'generated',
    filename: null,
    source: DEMO_SIGNAL_SOURCE,
    dataClass: DEMO_DATA_CLASS,
    uploadedAt: '2026-09-01T08:00:00.000Z',
    note: 'Subset of demo signals with category sleep.',
    linked: { medicalRecordIds: [], labIds: [], geneticIds: [], signalIds: DEMO_SIGNALS.filter((s) => s.category === 'sleep').map((s) => s.id) },
    provenance: createProvenance({ origin: DEMO_SIGNAL_SOURCE, parser: 'demo-generator', dataClass: DEMO_DATA_CLASS }),
  },
  {
    id: 'hub-seed-activity',
    name: 'Demo activity / inertial set',
    category: 'activity',
    status: 'Processed',
    format: 'generated',
    filename: null,
    source: DEMO_SIGNAL_SOURCE,
    dataClass: DEMO_DATA_CLASS,
    uploadedAt: '2026-09-01T08:00:00.000Z',
    note: 'Accelerometer and step demo recordings.',
    linked: { medicalRecordIds: [], labIds: [], geneticIds: [], signalIds: DEMO_SIGNALS.filter((s) => s.category === 'movement').map((s) => s.id) },
    provenance: createProvenance({ origin: DEMO_SIGNAL_SOURCE, parser: 'demo-generator', dataClass: DEMO_DATA_CLASS }),
  },
  {
    id: 'hub-seed-note',
    name: 'Demo clinic note (TXT)',
    category: 'medical-records',
    status: 'Insufficient data',
    format: 'txt',
    filename: 'demo-clinic-note.txt',
    source: DEMO_SOURCE_LABEL,
    dataClass: 'synthetic-demo',
    uploadedAt: '2026-09-11T14:02:00.000Z',
    note: 'Text parsed; no structured laboratory values were present.',
    linked: { medicalRecordIds: ['mr-seed-2'], labIds: [], geneticIds: [], signalIds: [] },
    provenance: createProvenance({ origin: DEMO_SOURCE_LABEL, filename: 'demo-clinic-note.txt', format: 'txt', parser: 'delimited-text', dataClass: 'synthetic-demo' }),
  },
];

export const SEED_FAMILY = DEMO_SUBJECTS;

export const SEED_RESEARCH_RUNS = [
  {
    id: 'run-seed-quality',
    title: 'Demo quality sweep',
    algorithm: 'Signal quality engine v1',
    parameters: { maxPoints: 2000 },
    inputIds: DEMO_SIGNALS.slice(0, 5).map((s) => s.id),
    outputs: [],
    limitations: ['Demo run on synthetic recordings only.'],
    qualityNotes: ['Not a clinical quality audit.'],
    createdAt: '2026-09-15T10:00:00.000Z',
    language: 'Research observation. Requires professional interpretation.',
  },
];

/**
 * Dataset builder (versioned manifests) and research-run / evidence-graph helpers.
 */

import { makeId, createProvenance, describeProvenance } from './provenance.js';

export function nextVersion(existingVersions) {
  if (!existingVersions?.length) return 'v1';
  const last = existingVersions[existingVersions.length - 1];
  const m = String(last.version).match(/^v(\d+)(?:\.(\d+))?$/);
  if (!m) return `v${existingVersions.length + 1}`;
  const major = Number(m[1]);
  const minor = Number(m[2] || 0);
  return `v${major}.${minor + 1}`;
}

export function buildDatasetManifest({
  name,
  version,
  description,
  signalIds = [],
  geneticIds = [],
  labIds = [],
  hubIds = [],
  notes = '',
}) {
  const id = makeId('dset');
  const createdAt = new Date().toISOString();
  return {
    id,
    name: name || 'Untitled dataset',
    version: version || 'v1',
    description: description || '',
    createdAt,
    counts: {
      signals: signalIds.length,
      genetic: geneticIds.length,
      labs: labIds.length,
      hub: hubIds.length,
    },
    members: { signalIds, geneticIds, labIds, hubIds },
    notes,
    provenance: createProvenance({
      origin: 'Dataset Builder',
      parser: 'manifest-1.0',
      parserVersion: '1.0.0',
      dataClass: 'research-dataset',
      notes: ['Manifest lists identifiers of records that existed at freeze time.'],
    }),
    limitations: [
      'This manifest is a snapshot of identifiers, not a re-export of raw samples.',
      'Records deleted later will appear as missing when the dataset is reconstituted.',
    ],
  };
}

export function createResearchRun({
  title,
  algorithm,
  parameters = {},
  inputIds = [],
  outputs = [],
  limitations = [],
  qualityNotes = [],
}) {
  return {
    id: makeId('run'),
    title: title || 'Untitled research run',
    algorithm: algorithm || 'Not stated',
    parameters,
    inputIds,
    outputs,
    limitations: limitations.length
      ? limitations
      : ['Limitations were not declared for this run.'],
    qualityNotes,
    createdAt: new Date().toISOString(),
    language: 'Research observation. Requires professional interpretation.',
  };
}

export function evidenceNodesFromState({ hubItems, signals, geneticRecords, bloodTests, runs }) {
  const nodes = [];
  const edges = [];

  for (const h of hubItems) {
    nodes.push({ id: h.id, label: h.name || h.filename, kind: 'dataset', status: h.status });
  }
  for (const s of signals) {
    nodes.push({ id: s.id, label: s.typeLabel || s.type, kind: 'signal', status: s.dataClass });
  }
  for (const g of geneticRecords) {
    nodes.push({ id: g.id, label: `${g.gene} ${g.variant}`, kind: 'genetic' });
  }
  for (const b of bloodTests) {
    nodes.push({ id: b.id, label: b.name, kind: 'lab' });
  }
  for (const r of runs) {
    nodes.push({ id: r.id, label: r.title, kind: 'run' });
    for (const inputId of r.inputIds || []) {
      edges.push({ source: inputId, target: r.id, r: 0.4, relation: 'supports' });
    }
    for (const out of r.outputs || []) {
      if (out.nodeId) edges.push({ source: r.id, target: out.nodeId, r: 0.2, relation: 'produced' });
    }
  }

  for (const h of hubItems) {
    for (const sid of h.linked?.signalIds || []) edges.push({ source: h.id, target: sid, r: 0.5, relation: 'contains' });
    for (const gid of h.linked?.geneticIds || []) edges.push({ source: h.id, target: gid, r: 0.5, relation: 'contains' });
    for (const lid of h.linked?.labIds || []) edges.push({ source: h.id, target: lid, r: 0.5, relation: 'contains' });
  }

  return { nodes, edges };
}

export function describeEvidenceEdge(e) {
  return `${e.source} —${e.relation}→ ${e.target}`;
}

export { describeProvenance };

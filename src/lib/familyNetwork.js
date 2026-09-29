/**
 * Family bio-signal network and genome-to-signal research layer.
 *
 * Declared relationships are shown as stated. Inheritance and diagnoses
 * are never inferred.
 */

export const INFERENCE_BAN = 'Declared relationship only — inheritance is not inferred and no diagnosis is made.';

export function familyTreeFromSubjects(subjects, signals, geneticRecords) {
  const nodes = subjects.map((s) => ({
    id: s.id,
    label: s.label,
    relationship: s.relationship,
    cohort: s.cohort,
    signalCount: signals.filter((x) => x.subjectId === s.id).length,
    variantCount: geneticRecords.filter((g) => g.subjectId === s.id).length,
    note: s.note || INFERENCE_BAN,
  }));

  const edges = [];
  const byCohort = new Map();
  for (const n of nodes) {
    if (!byCohort.has(n.cohort)) byCohort.set(n.cohort, []);
    byCohort.get(n.cohort).push(n.id);
  }
  for (const [, ids] of byCohort) {
    const proband = nodes.find((n) => ids.includes(n.id) && /proband/i.test(n.relationship));
    for (const id of ids) {
      if (proband && id !== proband.id) {
        edges.push({ source: proband.id, target: id, r: 0.35, relation: 'declared-relative' });
      }
    }
  }
  return { nodes, edges, disclaimer: INFERENCE_BAN };
}

/**
 * Literature-style research overlays. These are catalogue hypotheses, not
 * findings computed from the user's data.
 */
export const GENOME_SIGNAL_MAP = [
  { gene: 'APOE', variant: 'rs429358', signalCategory: 'metabolic', note: 'Association reported in published lipid/metabolic research — not evaluated in this subject.' },
  { gene: 'MTHFR', variant: 'rs1801133', signalCategory: 'metabolic', note: 'Association reported in folate-metabolism literature — not a diagnosis.' },
  { gene: 'HFE', variant: 'rs1800562', signalCategory: 'metabolic', note: 'Association reported with iron handling in literature — not inferred here.' },
];

export function genomeSignalLayers({ geneticRecords, signals }) {
  const layers = GENOME_SIGNAL_MAP.map((link) => {
    const variants = geneticRecords.filter(
      (g) => g.gene === link.gene && (g.variant === link.variant || !link.variant),
    );
    const matchingSignals = signals.filter((s) => s.category === link.signalCategory);
    return {
      ...link,
      variantDetected: variants.length > 0,
      variantCount: variants.length,
      signalsPresent: matchingSignals.length > 0,
      signalCount: matchingSignals.length,
      conclusion: variants.length && matchingSignals.length
        ? 'Variant detected and matching-category signals are present. No causal link is inferred.'
        : 'Insufficient combined evidence to even describe co-occurrence.',
    };
  });
  return {
    layers,
    disclaimer: 'Multi-layer visualizer of catalogue research links. Inheritance and disease are not inferred.',
  };
}

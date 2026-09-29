/**
 * Expanded genetic variant model (research language only).
 *
 * Allowed claims: "Variant detected", "Association reported".
 * Forbidden: diagnosis, inheritance proof, pathogenicity as clinical fact.
 */

export const ZYGOSITY = ['Heterozygous', 'Homozygous alternate', 'Homozygous reference', 'Unknown'];

export const EVIDENCE_LEVELS = [
  'Not stated',
  'Reported in literature (unverified here)',
  'Dataset-provided annotation',
  'User-entered annotation',
];

export function normalizeVariant(input = {}) {
  const gene = String(input.gene ?? '').trim();
  const variant = String(input.variant ?? input.rsid ?? input.id ?? '').trim();
  return {
    gene: gene || 'Gene not stated',
    variant: variant || 'Variant identifier not stated',
    chromosome: String(input.chromosome ?? input.chrom ?? '').trim() || '—',
    position: String(input.position ?? input.pos ?? '').trim() || '—',
    reference: String(input.reference ?? input.ref ?? '').trim() || '—',
    alternate: String(input.alternate ?? input.alt ?? '').trim() || '—',
    zygosity: ZYGOSITY.includes(input.zygosity) ? input.zygosity : input.zygosity || 'Unknown',
    quality: input.quality ?? null,
    filter: input.filter ?? null,
    genotype: input.genotype ?? null,
    evidence: input.evidence || 'Not stated',
    evidenceLevel: EVIDENCE_LEVELS.includes(input.evidenceLevel) ? input.evidenceLevel : 'Not stated',
    associationReported: input.associationReported || null,
    classification: input.classification || 'Research-only variant',
    confidence: input.confidence || 'Not stated',
    source: input.source || 'Source not stated',
    researchLanguage: {
      detected: gene && variant ? 'Variant detected' : 'Insufficient identifiers to report a detection',
      association: input.associationReported
        ? `Association reported: ${input.associationReported}`
        : 'No association reported in this record',
    },
    notes: input.notes || '',
  };
}

export function variantDisplayLine(v) {
  return `${v.gene} ${v.variant} · chr${v.chromosome}:${v.position} ${v.reference}>${v.alternate} · ${v.zygosity}`;
}

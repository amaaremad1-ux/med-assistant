/**
 * Provenance metadata for every imported or computed research artifact.
 *
 * A record without a source is stored as "Source not stated" rather than
 * being given a plausible one. Sensitive values are never placed in URLs.
 */

export function makeId(prefix = 'prv') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createProvenance({
  origin = 'Source not stated',
  filename = null,
  format = null,
  parser = null,
  parserVersion = null,
  importedAt = null,
  subjectId = null,
  dataClass = 'unspecified',
  notes = [],
} = {}) {
  return {
    id: makeId('prv'),
    origin: String(origin || '').trim() || 'Source not stated',
    filename,
    format,
    parser,
    parserVersion,
    importedAt: importedAt ?? new Date().toISOString(),
    subjectId: subjectId || null,
    dataClass,
    notes: Array.isArray(notes) ? notes : [String(notes)],
    urlSafe: true,
  };
}

export function describeProvenance(p) {
  if (!p) return 'Provenance not recorded.';
  const bits = [p.origin];
  if (p.filename) bits.push(p.filename);
  if (p.format) bits.push(p.format);
  if (p.parser) bits.push(`parser ${p.parser}${p.parserVersion ? ` ${p.parserVersion}` : ''}`);
  if (p.importedAt) bits.push(p.importedAt.slice(0, 19).replace('T', ' ') + ' UTC');
  return bits.join(' · ');
}

/** Route params must stay opaque — never encode analyte names, genotypes, or values. */
export function assertOpaqueRouteParam(value) {
  const s = String(value ?? '');
  if (/[=:]/.test(s) || /\b(rs\d+|chr\d+|mg\/dL)\b/i.test(s)) {
    return { ok: false, reason: 'Sensitive health tokens must not appear in the URL.' };
  }
  return { ok: true };
}

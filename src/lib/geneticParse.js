/**
 * Parser for delimited genetic-variant reports.
 *
 * Understands an optional header row followed by rows of the form:
 *   GENE, rsID, chromosome, position, reference, alternate, zygosity[, classification[, confidence]]
 * Only rows with a gene and a variant identifier are returned; anything
 * unparseable is skipped rather than guessed. No values are invented.
 */
export function parseGeneticText(text) {
  const rows = [];
  const lines = String(text).split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const cells = line.split(/[,;\t]/).map((c) => c.trim());
    if (cells.length < 6) continue;
    if (/^gene$/i.test(cells[0])) continue; // header

    const [gene, variant, chromosome, position, reference, alternate, zygosity, classification, confidence] = cells;
    if (!gene || !variant) continue;
    if (!/^(rs|chr|c\.|n\.|p\.)?\w+/i.test(variant)) continue;

    rows.push({
      gene,
      variant,
      chromosome: chromosome || '—',
      position: position || '—',
      reference: reference || '—',
      alternate: alternate || '—',
      zygosity: zygosity || 'Unknown',
      classification: classification || 'Research-only variant',
      confidence: confidence || 'Not stated',
      evidenceLevel: 'User-entered annotation',
    });
  }

  return rows;
}

function zygosityFromGT(gt) {
  if (!gt || gt === '.' || gt === './.') return 'Unknown';
  const parts = String(gt).split(/[|/]/);
  if (parts.length < 2) return 'Unknown';
  if (parts[0] === '0' && parts[1] === '0') return 'Homozygous reference';
  if (parts[0] === parts[1] && parts[0] !== '0') return 'Homozygous alternate';
  if (parts[0] !== parts[1]) return 'Heterozygous';
  return 'Unknown';
}

/**
 * Parse VCF 4.x text. Header lines starting with ## are skipped.
 * Rows without CHROM and POS are skipped. INFO.GENE is used when present;
 * otherwise gene is recorded as "Gene not stated".
 */
export function parseVcfText(text) {
  const rows = [];
  const lines = String(text).split(/\r?\n/);
  let sampleName = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('##')) continue;
    if (line.startsWith('#CHROM') || line.startsWith('#chrom')) {
      const header = line.replace(/^#/, '').split('\t');
      sampleName = header[9] || null;
      continue;
    }
    if (line.startsWith('#')) continue;

    const cells = line.split('\t');
    if (cells.length < 5) continue;
    const [chrom, pos, id, ref, alt, qual, filter, info, format, sample] = cells;
    if (!chrom || !pos) continue;

    let gene = 'Gene not stated';
    const infoStr = info || '';
    const geneHit = infoStr.match(/(?:GENE|Gene|SYMBOL)=([^;]+)/);
    if (geneHit) gene = geneHit[1];

    let genotype = null;
    if (format && sample) {
      const keys = format.split(':');
      const vals = sample.split(':');
      const gi = keys.indexOf('GT');
      if (gi >= 0) genotype = vals[gi];
    }

    const variantId = id && id !== '.' ? id : `${chrom}:${pos}${ref}>${alt}`;
    rows.push({
      gene,
      variant: variantId,
      chromosome: chrom.replace(/^chr/i, ''),
      position: pos,
      reference: ref,
      alternate: alt,
      zygosity: zygosityFromGT(genotype),
      genotype,
      quality: qual && qual !== '.' ? qual : null,
      filter: filter && filter !== '.' ? filter : null,
      classification: 'Research-only variant',
      confidence: 'Not stated',
      evidenceLevel: 'Dataset-provided annotation',
      sampleName,
      researchLanguage: { detected: 'Variant detected', association: 'No association reported in this record' },
    });
  }

  return rows;
}

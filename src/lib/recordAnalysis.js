/**
 * Per-file AI analysis (#4).
 *
 * Produces the structured sections required for an uploaded record:
 * summary, important values, changes vs previous available records, values
 * outside laboratory-supplied ranges, missing information, research
 * observations, and questions to raise with a healthcare professional.
 *
 * Like the assistant, this is grounded retrieval: it only reports values that
 * exist on the record or in application state, and never diagnoses.
 */
import { evaluateAgainstRange, seriesFor, trendSummary } from './appDataSelectors.js';

const DISCLAIMER =
  'Prototype / Research System — Data shown in this application may be synthetic. AI-generated results are informational estimates and are not medical diagnoses.';

const block = (kind, text) => ({ kind, text });

function fmt(value, unit) {
  return unit ? `${value} ${unit}` : String(value);
}

export async function analyzeRecord(record, bloodTests = []) {
  // Brief, honest processing delay so the UI's analyzing state is visible.
  await new Promise((r) => setTimeout(r, 400));

  const blocks = [];
  const extracted = record?.extracted ?? [];
  const name = record?.displayName || record?.originalName || 'this file';

  // Summary
  if (!record) {
    return { blocks: [block('missing', 'Insufficient data available.'), block('disclaimer', DISCLAIMER)] };
  }
  blocks.push(
    block(
      'answer',
      `Analysis of "${name}" (${record.category ?? 'Other'}, .${record.fileType ?? '?'}), status ${record.status}.`,
    ),
  );

  if (!record.extractionAvailable) {
    blocks.push(
      block(
        'missing',
        record.extractionNote ||
          'File uploaded successfully. Automatic structured extraction is not available in this prototype.',
      ),
    );
    blocks.push(
      block('observation', 'The file is stored and can be viewed, but no structured values were extracted, so no value-level analysis is possible.'),
    );
    blocks.push(block('disclaimer', DISCLAIMER));
    return { blocks };
  }

  if (!extracted.length) {
    blocks.push(
      block('missing', 'The document parsed cleanly but contained no structured laboratory values.'),
    );
    blocks.push(block('disclaimer', DISCLAIMER));
    return { blocks };
  }

  // Important values found
  blocks.push(block('answer', `Important values found (${extracted.length}):`));
  for (const e of extracted) {
    blocks.push(block('available', `${e.name}: ${fmt(e.value, e.unit)}${e.referenceRange ? ` (reference ${e.referenceRange})` : ' (no reference range supplied)'}.`));
  }

  // Changes compared with previous available records
  const changes = [];
  for (const e of extracted) {
    const prior = seriesFor(bloodTests, e.name).filter((b) => b.id !== record.id);
    if (prior.length) {
      const t = trendSummary(prior);
      const delta = Math.round((e.value - t.current.value) * 100) / 100;
      changes.push(
        `${e.name}: previous available ${fmt(t.current.value, t.current.unit)} on ${t.current.date} → this file ${fmt(e.value, e.unit)}; change ${delta > 0 ? '+' : ''}${delta}.`,
      );
    }
  }
  if (changes.length) {
    blocks.push(block('answer', 'Changes compared with previous available records:'));
    changes.forEach((c) => blocks.push(block('available', c)));
  } else {
    blocks.push(block('missing', 'No earlier record of these analytes exists in the application, so no comparison is possible.'));
  }

  // Outside laboratory-supplied reference range
  const out = extracted
    .map((e) => ({ e, verdict: evaluateAgainstRange(e.value, e.referenceRange) }))
    .filter((x) => x.verdict === 'above' || x.verdict === 'below');
  if (out.length) {
    blocks.push(block('answer', 'Values outside the laboratory-provided reference range:'));
    out.forEach(({ e, verdict }) =>
      blocks.push(block('available', `${e.name}: ${fmt(e.value, e.unit)} is ${verdict} the supplied range ${e.referenceRange}.`)),
    );
  } else {
    const anyRange = extracted.some((e) => e.referenceRange);
    blocks.push(
      block(
        anyRange ? 'available' : 'missing',
        anyRange
          ? 'All extracted values that carry a supplied reference range fall within it.'
          : 'No laboratory-provided reference ranges were present, so out-of-range status cannot be determined.',
      ),
    );
  }

  // Missing information
  const missingBits = [];
  if (extracted.some((e) => !e.referenceRange)) missingBits.push('reference ranges for some values');
  if (extracted.some((e) => !e.unit)) missingBits.push('units for some values');
  if (!record.uploadedAt) missingBits.push('an upload timestamp');
  blocks.push(
    block(
      missingBits.length ? 'missing' : 'available',
      missingBits.length
        ? `Missing information: ${missingBits.join('; ')}.`
        : 'Missing information: none detected among the extracted fields.',
    ),
  );

  // Research observations
  blocks.push(
    block('observation', 'Values above are exactly as extracted from the file; they are research observations, not validated clinical measurements.'),
  );

  // Questions for a professional
  const questions = [];
  if (out.length) {
    questions.push(`Why is ${out.map((o) => o.e.name).join(', ')} outside the supplied reference range, and does it need repeating?`);
  }
  if (changes.length) {
    questions.push('Is the change from my previous result clinically meaningful?');
  }
  questions.push('Should any of these values be monitored over time, and how often?');
  blocks.push(block('answer', 'Questions you may want to ask a healthcare professional:'));
  questions.forEach((q) => blocks.push(block('observation', `• ${q}`)));

  blocks.push(block('disclaimer', DISCLAIMER));
  return { blocks };
}

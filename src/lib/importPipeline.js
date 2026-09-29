/**
 * Real data import pipeline: CSV, JSON, TXT, PDF, PNG/JPG, EDF/EDF+, WFDB, VCF.
 *
 * Unsupported or unimplemented parsers return
 * "Parser not configured for this format" and never a fake success.
 */

import { extensionOf, parseLabText, parseLabJson, readAsText, MAX_SIZE_BYTES } from './filePipeline.js';
import { parseGeneticText, parseVcfText } from './geneticParse.js';
import { normalizeVariant } from './geneticModel.js';
import { inferHubCategory, statusAfterParse } from './researchHub.js';
import { createProvenance } from './provenance.js';
import { normalizeSignal } from './signalModel.js';

export const IMPORT_FORMATS = [
  { ext: 'csv', parser: 'delimited-text', configured: true, domains: ['lab', 'genetic', 'bio-signals'] },
  { ext: 'json', parser: 'json', configured: true, domains: ['lab', 'bio-signals'] },
  { ext: 'txt', parser: 'delimited-text', configured: true, domains: ['lab', 'genetic'] },
  { ext: 'vcf', parser: 'vcf-4', configured: true, domains: ['genetic'] },
  { ext: 'edf', parser: 'edf-header+samples', configured: true, domains: ['bio-signals'] },
  { ext: 'hea', parser: 'wfdb-header', configured: true, domains: ['bio-signals'] },
  { ext: 'dat', parser: 'wfdb-samples', configured: true, domains: ['bio-signals'] },
  { ext: 'pdf', parser: null, configured: false, domains: ['medical-records'] },
  { ext: 'png', parser: null, configured: false, domains: ['medical-records'] },
  { ext: 'jpg', parser: null, configured: false, domains: ['medical-records'] },
  { ext: 'jpeg', parser: null, configured: false, domains: ['medical-records'] },
];

export const PARSER_NOT_CONFIGURED = 'Parser not configured for this format';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export function importFormatOf(filename) {
  const ext = extensionOf(filename);
  return IMPORT_FORMATS.find((f) => f.ext === ext) ?? null;
}

export async function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsArrayBuffer(file);
  });
}

function ascii(buf, start, len) {
  const bytes = new Uint8Array(buf, start, len);
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
  return s.trim();
}

/**
 * EDF / EDF+ header parser. Sample extraction is limited to the first signal
 * of the first data record so large files do not freeze the UI.
 */
export function parseEdfBuffer(buffer) {
  if (!buffer || buffer.byteLength < 256) {
    return { ok: false, error: 'EDF header is shorter than 256 bytes — parsing failed.' };
  }
  const version = ascii(buffer, 0, 8);
  const reserved = ascii(buffer, 192, 44);
  const isEdfPlus = /^EDF\+/.test(reserved) || /EDF\+/.test(version);
  const nBytesHeader = parseInt(ascii(buffer, 184, 8), 10);
  const nRecords = parseInt(ascii(buffer, 236, 8), 10);
  const recDuration = parseFloat(ascii(buffer, 244, 8));
  const nSignals = parseInt(ascii(buffer, 252, 4), 10);
  if (!Number.isFinite(nSignals) || nSignals < 1 || nSignals > 512) {
    return { ok: false, error: 'EDF signal count could not be read — parsing failed.' };
  }
  const hs = 256;
  const labels = [];
  for (let i = 0; i < nSignals; i += 1) labels.push(ascii(buffer, hs + i * 16, 16));
  const samplesPerRecord = [];
  const sprOffset = hs + nSignals * 216;
  for (let i = 0; i < nSignals; i += 1) {
    samplesPerRecord.push(parseInt(ascii(buffer, sprOffset + i * 8, 8), 10));
  }
  const headerBytes = Number.isFinite(nBytesHeader) ? nBytesHeader : 256 + nSignals * 256;
  const firstSpr = samplesPerRecord[0] || 0;
  const samplingRate = recDuration > 0 && firstSpr > 0 ? firstSpr / recDuration : null;
  const values = [];
  if (buffer.byteLength > headerBytes && firstSpr > 0) {
    const view = new DataView(buffer);
    const take = Math.min(firstSpr, 4000);
    for (let i = 0; i < take; i += 1) {
      const off = headerBytes + i * 2;
      if (off + 1 >= buffer.byteLength) break;
      values.push(view.getInt16(off, true));
    }
  }

  const durationSec = Number.isFinite(nRecords) && Number.isFinite(recDuration) ? nRecords * recDuration : null;
  return {
    ok: true,
    error: null,
    meta: {
      version: version || '0',
      edfPlus: isEdfPlus,
      patient: ascii(buffer, 8, 80),
      recording: ascii(buffer, 88, 80),
      startDate: ascii(buffer, 168, 8),
      startTime: ascii(buffer, 176, 8),
      nRecords,
      recDuration,
      nSignals,
      labels,
      samplingRate,
      durationSec,
    },
    values,
  };
}

/** WFDB .hea header. Binary .dat samples are 16-bit little-endian when present. */
export function parseWfdbHeader(text) {
  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  if (!lines.length) return { ok: false, error: 'WFDB header is empty — parsing failed.' };
  const first = lines[0].split(/\s+/);
  const recordName = first[0];
  const nSignals = parseInt(first[1], 10);
  const samplingRate = parseFloat(first[2]);
  const nSamples = first[3] ? parseInt(first[3], 10) : null;
  if (!recordName || !Number.isFinite(nSignals)) {
    return { ok: false, error: 'WFDB header record line could not be parsed — parsing failed.' };
  }
  const signals = [];
  for (let i = 1; i < lines.length && signals.length < nSignals; i += 1) {
    const p = lines[i].split(/\s+/);
    signals.push({ file: p[0], format: p[1], gain: p[2], units: p[7] || p[6] || null, label: p[p.length - 1] });
  }
  return {
    ok: true,
    error: null,
    meta: {
      recordName,
      nSignals,
      samplingRate: Number.isFinite(samplingRate) ? samplingRate : null,
      nSamples: Number.isFinite(nSamples) ? nSamples : null,
      signals,
    },
  };
}

export function parseWfdbSamples(buffer, maxPoints = 4000) {
  if (!buffer || buffer.byteLength < 2) {
    return { ok: false, error: 'WFDB sample file is empty — parsing failed.', values: [] };
  }
  const view = new DataView(buffer);
  const n = Math.min(Math.floor(buffer.byteLength / 2), maxPoints);
  const values = [];
  for (let i = 0; i < n; i += 1) values.push(view.getInt16(i * 2, true));
  return { ok: true, error: null, values };
}

function timeSeriesFromNumericColumns(text) {
  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  if (lines.length < 2) return { values: [], samplingRate: null, label: null };
  const header = lines[0].split(/[,;\t]/).map((c) => c.trim());
  const col = header.findIndex((h) => /value|signal|sample|ecg|eeg|amp/i.test(h));
  const idx = col >= 0 ? col : header.length > 1 ? 1 : 0;
  const values = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = lines[i].split(/[,;\t]/);
    const v = parseFloat(cells[idx]);
    values.push(Number.isFinite(v) ? v : NaN);
  }
  return { values, samplingRate: null, label: header[idx] || 'signal' };
}

/**
 * Run the research import for one File. Status callbacks receive hub statuses.
 */
export async function runResearchImport(file, { onStatus = () => {}, declaredCategory = null, subjectId = null } = {}) {
  const ext = extensionOf(file.name);
  const fmt = importFormatOf(file.name);
  const category = inferHubCategory({ format: ext, filename: file.name, declared: declaredCategory });

  onStatus('Uploaded');
  await delay(120);

  if (file.size === 0) {
    onStatus('Error');
    return fail(file, category, 'File is empty.', ext);
  }
  if (file.size > MAX_SIZE_BYTES * 4) {
    onStatus('Error');
    return fail(file, category, 'File exceeds the prototype size limit.', ext);
  }

  onStatus('Validating');
  await delay(80);

  if (!fmt) {
    onStatus('Error');
    return fail(file, category, PARSER_NOT_CONFIGURED, ext);
  }

  onStatus('Processing');
  await delay(80);

  try {
    if (!fmt.configured || !fmt.parser) {
      const outcome = statusAfterParse({ ok: false, extractedCount: 0, parserConfigured: false });
      onStatus(outcome.status);
      return pack(file, category, ext, {
        ...outcome,
        parserConfigured: false,
        labs: [],
        variants: [],
        signals: [],
      });
    }

    if (ext === 'vcf' || (ext === 'txt' && category === 'genetic') || (ext === 'csv' && category === 'genetic')) {
      const text = await readAsText(file);
      const raw = ext === 'vcf' || text.includes('##fileformat=VCF') ? parseVcfText(text) : parseGeneticText(text);
      const variants = raw.map((r) =>
        normalizeVariant({ ...r, source: `Uploaded: ${file.name}` }),
      );
      const outcome = statusAfterParse({
        ok: true,
        extractedCount: variants.length,
        parserConfigured: true,
      });
      onStatus(outcome.status);
      return pack(file, category, ext, { ...outcome, parserConfigured: true, labs: [], variants, signals: [] });
    }

    if (ext === 'edf') {
      const buf = await readAsArrayBuffer(file);
      const parsed = parseEdfBuffer(buf);
      if (!parsed.ok) {
        onStatus('Error');
        return fail(file, category, parsed.error, ext);
      }
      const signals = [
        normalizeSignal({
          type: guessSignalType(parsed.meta.labels[0]),
          subjectId,
          source: `Uploaded: ${file.name}`,
          sourceKind: 'uploaded-file',
          dataClass: 'real-user',
          device: parsed.meta.recording || 'EDF recording',
          samplingRate: parsed.meta.samplingRate,
          durationSec: parsed.meta.durationSec,
          channel: parsed.meta.labels[0] || null,
          valuesStorage: parsed.values.length ? 'inline' : 'not-stored',
          metadata: { edf: parsed.meta, clinicalMeaning: 'Research measurement. Not a diagnosis.' },
        }, { values: parsed.values }),
      ];
      const outcome = statusAfterParse({
        ok: true,
        extractedCount: parsed.values.length || parsed.meta.nSignals,
        parserConfigured: true,
      });
      onStatus(outcome.status);
      return pack(file, category, ext, { ...outcome, parserConfigured: true, labs: [], variants: [], signals, edf: parsed.meta });
    }

    if (ext === 'hea') {
      const text = await readAsText(file);
      const parsed = parseWfdbHeader(text);
      if (!parsed.ok) {
        onStatus('Error');
        return fail(file, category, parsed.error, ext);
      }
      const outcome = statusAfterParse({
        ok: true,
        extractedCount: parsed.meta.nSignals,
        parserConfigured: true,
      });
      onStatus(outcome.status);
      const signals = [
        normalizeSignal({
          type: guessSignalType(parsed.meta.signals[0]?.label),
          subjectId,
          source: `Uploaded: ${file.name}`,
          sourceKind: 'uploaded-file',
          dataClass: 'real-user',
          device: parsed.meta.recordName,
          samplingRate: parsed.meta.samplingRate,
          durationSec:
            parsed.meta.nSamples && parsed.meta.samplingRate
              ? parsed.meta.nSamples / parsed.meta.samplingRate
              : null,
          valuesStorage: 'file-reference',
          originalFilename: file.name,
          metadata: { wfdb: parsed.meta },
        }),
      ];
      return pack(file, category, ext, { ...outcome, parserConfigured: true, labs: [], variants: [], signals, wfdb: parsed.meta });
    }

    if (ext === 'dat') {
      const buf = await readAsArrayBuffer(file);
      const parsed = parseWfdbSamples(buf);
      if (!parsed.ok) {
        onStatus('Error');
        return fail(file, category, parsed.error, ext);
      }
      const signals = [
        normalizeSignal({
          type: 'ecg',
          subjectId,
          source: `Uploaded: ${file.name}`,
          sourceKind: 'uploaded-file',
          dataClass: 'real-user',
          valuesStorage: 'inline',
          metadata: { wfdbSamples: parsed.values.length },
        }, { values: parsed.values }),
      ];
      const outcome = statusAfterParse({ ok: true, extractedCount: parsed.values.length, parserConfigured: true });
      onStatus(outcome.status);
      return pack(file, category, ext, { ...outcome, parserConfigured: true, labs: [], variants: [], signals });
    }

    if (ext === 'json') {
      const text = await readAsText(file);
      const lab = parseLabJson(text);
      if (lab.parseError) {
        onStatus('Error');
        return fail(file, category, lab.parseError, ext);
      }
      const ts = parseJsonTimeSeries(text);
      const signals = ts
        ? [
            normalizeSignal({
              type: ts.type || 'heart-rate',
              subjectId,
              source: `Uploaded: ${file.name}`,
              sourceKind: 'uploaded-file',
              dataClass: 'real-user',
              samplingRate: ts.samplingRate,
              valuesStorage: 'inline',
            }, { values: ts.values }),
          ]
        : [];
      const extractedCount = lab.rows.length + signals.length;
      const outcome = statusAfterParse({ ok: true, extractedCount, parserConfigured: true });
      onStatus(outcome.status);
      return pack(file, category, ext, { ...outcome, parserConfigured: true, labs: lab.rows, variants: [], signals });
    }

    if (ext === 'csv' || ext === 'txt') {
      const text = await readAsText(file);
      const labs = parseLabText(text);
      const variants = category === 'genetic' ? parseGeneticText(text).map((r) => normalizeVariant({ ...r, source: `Uploaded: ${file.name}` })) : [];
      const ts = timeSeriesFromNumericColumns(text);
      const looksLikeSignal = ts.values.length > 20 && labs.length < ts.values.length / 2;
      const signals = looksLikeSignal
        ? [
            normalizeSignal({
              type: guessSignalType(ts.label),
              subjectId,
              source: `Uploaded: ${file.name}`,
              sourceKind: 'uploaded-file',
              dataClass: 'real-user',
              valuesStorage: 'inline',
            }, { values: ts.values }),
          ]
        : [];
      const extractedCount = labs.length + variants.length + signals.length;
      const outcome = statusAfterParse({ ok: true, extractedCount, parserConfigured: true });
      onStatus(outcome.status);
      return pack(file, category, ext, { ...outcome, parserConfigured: true, labs, variants, signals });
    }

    onStatus('Error');
    return fail(file, category, PARSER_NOT_CONFIGURED, ext);
  } catch (err) {
    onStatus('Error');
    return fail(file, category, err?.message || 'Parsing failed.', ext);
  }
}

function parseJsonTimeSeries(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  const values = data?.values || data?.samples || data?.signal;
  if (!Array.isArray(values) || values.length < 8) return null;
  const nums = values.map((v) => (typeof v === 'number' ? v : parseFloat(v.value ?? v)));
  if (nums.filter((n) => Number.isFinite(n)).length < 8) return null;
  return { values: nums, samplingRate: data.samplingRate ?? data.fs ?? null, type: data.type };
}

function guessSignalType(label) {
  const s = String(label || '').toLowerCase();
  if (/eeg/.test(s)) return 'eeg';
  if (/ppg/.test(s)) return 'ppg';
  if (/resp/.test(s)) return 'respiration-waveform';
  if (/eda|gsr/.test(s)) return 'eda-gsr';
  if (/hr|heart/.test(s)) return 'heart-rate';
  return 'ecg';
}

function fail(file, category, error, ext) {
  return pack(file, category, ext, {
    status: 'Error',
    note: error,
    parserConfigured: Boolean(importFormatOf(file.name)?.configured),
    labs: [],
    variants: [],
    signals: [],
  });
}

function pack(file, category, ext, extra) {
  return {
    filename: file.name,
    sizeBytes: file.size,
    format: ext,
    category,
    provenance: createProvenance({
      origin: 'Uploaded file',
      filename: file.name,
      format: ext,
      parser: importFormatOf(file.name)?.parser,
      parserVersion: '1.0.0',
      dataClass: 'real-user',
    }),
    ...extra,
  };
}

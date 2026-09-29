/**
 * Medical file upload → analysis pipeline (#3).
 *
 *   UPLOAD → VALIDATE → STORE → PROCESS → EXTRACT → DISPLAY → (AI)
 *
 * Extraction is REAL where it is genuinely implemented: delimited text
 * (CSV / TSV / TXT) is parsed line-by-line into structured laboratory values.
 * For PDF and image inputs no OCR / PDF parser is configured in this
 * prototype, so the pipeline reports `extractionAvailable: false` and the
 * honest message below instead of pretending parsing happened. Values are
 * never invented.
 */

export const ACCEPTED_EXTENSIONS = [
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'csv',
  'txt',
  'json',
  'vcf',
  'edf',
  'hea',
  'dat',
];

export const ACCEPTED_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/csv',
  'text/plain',
  'application/json',
];

export const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const NO_EXTRACTION_MESSAGE =
  'Parser not configured for this format. The file was stored; no structured values were extracted.';

export const FILE_CATEGORIES = [
  'Blood Test',
  'Medical Report',
  'Imaging Report',
  'Prescription',
  'DNA / Genetic Report',
  'Other',
];

export const FILE_STATUSES = [
  'idle',
  'uploading',
  'processing',
  'analyzing',
  'processed',
  'error',
];

export function extensionOf(filename) {
  const m = String(filename).toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

export function isTextType(ext) {
  return ext === 'csv' || ext === 'txt' || ext === 'json' || ext === 'vcf' || ext === 'hea';
}

/** Type + size validation. Returns { ok, reason }. */
export function validateFile(file) {
  const ext = extensionOf(file.name);
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    return {
      ok: false,
      reason: `Unsupported file type ".${ext || '?'}". Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}.`,
    };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { ok: false, reason: 'File exceeds the 10 MB prototype limit.' };
  }
  if (file.size === 0) {
    return { ok: false, reason: 'File is empty.' };
  }
  return { ok: true, reason: null };
}

export function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsText(file);
  });
}

const UNIT_PATTERN =
  /^(mg\/dL|g\/dL|g\/L|mmol\/L|mol\/L|mEq\/L|mmol\/mol|U\/L|IU\/L|ng\/mL|µg\/L|ug\/L|pg\/mL|fL|pL|pg|%|K\/µL|10\^3\/µL|10\^9\/L|cells\/µL|mm\/hg|kg\/m²|ng\/dL)$/i;

function looksLikeRange(token) {
  const t = token.trim();
  return /^([<>]?\s*[0-9.]+(\s*[-–—]\s*[0-9.]+)?)$/.test(t) && /[0-9]/.test(t);
}

/**
 * Parse delimited / labelled laboratory text into structured values.
 * Understands lines such as:
 *   Hemoglobin,13.5,g/dL,12-16
 *   Hemoglobin: 13.5 g/dL (ref 12-16)
 *   Glucose 112 mg/dL
 * Only rows with a parseable numeric value are returned; everything else is
 * skipped rather than guessed.
 */
export function parseLabText(text) {
  const extracted = [];
  const lines = String(text).split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // Delimited form first.
    const cells = line.split(/[,;\t]/).map((c) => c.trim()).filter((c) => c !== '');
    if (cells.length >= 2) {
      const [name, valueTok, unitTok, rangeTok] = cells;
      const value = parseFloat(valueTok);
      if (Number.isFinite(value) && name && !/^value$/i.test(name)) {
        extracted.push({
          name: cleanName(name),
          value,
          unit: unitTok && UNIT_PATTERN.test(unitTok) ? unitTok : unitTok || null,
          referenceRange: rangeTok && looksLikeRange(rangeTok) ? rangeTok : null,
        });
        continue;
      }
    }

    // Labelled form: "Name: 13.5 g/dL (ref 12-16)" or "Name 13.5 g/dL".
    const m = line.match(
      /^([A-Za-z][A-Za-z0-9 ()/-]{1,40}?)\s*[:=]?\s*(-?[0-9]+(?:\.[0-9]+)?)\s*([A-Za-z%/µ^0-9][A-Za-z%/µ^0-9·]*)?(?:\s*\(?(?:ref\.?|range)?\s*((?:[<>]?\s*[0-9.]+(?:\s*[-–—]\s*[0-9.]+)?)))?\)?$/i,
    );
    if (m) {
      const [, name, valueTok, unitTok, rangeTok] = m;
      extracted.push({
        name: cleanName(name),
        value: parseFloat(valueTok),
        unit: unitTok || null,
        referenceRange: rangeTok && looksLikeRange(rangeTok) ? rangeTok.trim() : null,
      });
    }
  }

  return extracted;
}

function cleanName(name) {
  return String(name).replace(/\s+/g, ' ').trim();
}

/**
 * Parse laboratory JSON. Accepts an array of objects or `{ tests: [...] }`.
 * Objects without a numeric `value` are skipped rather than guessed.
 */
export function parseLabJson(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { rows: [], parseError: 'JSON is not valid — parsing failed.' };
  }
  const list = Array.isArray(data) ? data : Array.isArray(data?.tests) ? data.tests : Array.isArray(data?.results) ? data.results : null;
  if (!list) {
    return { rows: [], parseError: null };
  }
  const rows = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const value = parseFloat(item.value ?? item.result);
    const name = item.name || item.analyte || item.test;
    if (!name || !Number.isFinite(value)) continue;
    rows.push({
      name: cleanName(name),
      value,
      unit: item.unit || null,
      referenceRange: item.referenceRange || item.range || null,
      panel: item.panel || null,
    });
  }
  return { rows, parseError: null };
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Run the full pipeline for one File. Reports status transitions through
 * onStatus and resolves with the extraction result. Never throws for
 * expected outcomes; resolves { error } for failures so the caller can set
 * the 'error' status.
 */
export async function runPipeline(file, { onStatus = () => {} } = {}) {
  const ext = extensionOf(file.name);

  onStatus('uploading');
  await delay(450);

  const check = validateFile(file);
  if (!check.ok) {
    onStatus('error');
    return { error: check.reason, extracted: [], extractionAvailable: false };
  }

  onStatus('processing');
  await delay(350);

  onStatus('analyzing');
  await delay(350);

  try {
    if (ext === 'json') {
      const text = await readAsText(file);
      const extracted = parseLabJson(text);
      if (extracted.parseError) {
        onStatus('error');
        return {
          error: extracted.parseError,
          extracted: [],
          extractionAvailable: false,
          textPreview: text.slice(0, 4000),
          extractionNote: extracted.parseError,
        };
      }
      onStatus(extracted.rows.length ? 'processed' : 'processed');
      return {
        error: null,
        extracted: extracted.rows,
        extractionAvailable: true,
        textPreview: text.slice(0, 4000),
        extractionNote: extracted.rows.length
          ? `Structured values parsed from JSON (${extracted.rows.length}).`
          : 'JSON parsed; no laboratory objects with a numeric value were found. Insufficient data.',
      };
    }

    if (ext === 'csv' || ext === 'txt') {
      const text = await readAsText(file);
      const extracted = parseLabText(text);
      onStatus('processed');
      return {
        error: null,
        extracted,
        extractionAvailable: true,
        textPreview: text.slice(0, 4000),
        extractionNote: extracted.length
          ? `Structured values parsed from the ${ext.toUpperCase()} text (${extracted.length} value${extracted.length === 1 ? '' : 's'}).`
          : 'Text parsed successfully; no structured laboratory values were found in the document.',
      };
    }

    // VCF / EDF / WFDB / PDF / images: this medical-record pipeline does not
    // claim to parse them. Dedicated importers handle VCF and EDF/WFDB.
    onStatus('processed');
    return {
      error: null,
      extracted: [],
      extractionAvailable: false,
      textPreview: null,
      extractionNote: NO_EXTRACTION_MESSAGE,
    };
  } catch (err) {
    onStatus('error');
    return {
      error: err?.message || 'Analysis failed.',
      extracted: [],
      extractionAvailable: false,
    };
  }
}

import { useEffect, useRef, useState } from 'react';
import Icon from '../components/icons.jsx';
import { Panel, Badge } from '../components/ui/index.js';
import FileDropzone from '../components/FileDropzone.jsx';
import PrivacyNotice from '../components/PrivacyNotice.jsx';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import AnswerBlocks from '../components/AnswerBlocks.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import {
  runPipeline,
  extensionOf,
  FILE_CATEGORIES,
  isTextType,
} from '../lib/filePipeline.js';
import { analyzeRecord } from '../lib/recordAnalysis.js';

const STATUS_TONE = {
  idle: 'neutral',
  uploading: 'info',
  processing: 'info',
  analyzing: 'info',
  processed: 'good',
  error: 'bad',
};

const TYPE_ICON = {
  pdf: 'file',
  png: 'eye',
  jpg: 'eye',
  jpeg: 'eye',
  csv: 'database',
  txt: 'file',
};

function guessCategory(filename, ext) {
  const n = String(filename).toLowerCase();
  if (/genetic|dna|genom/.test(n)) return 'DNA / Genetic Report';
  if (/xray|x-ray|mri|\bct\b|scan|imaging|ultrasound|radiolog/.test(n)) return 'Imaging Report';
  if (/prescription|\brx\b|medication|pharmacy/.test(n)) return 'Prescription';
  if (/blood|lipid|cbc|chem|lab|panel|glucose|a1c/.test(n) || ext === 'csv') return 'Blood Test';
  if (/report|note|summary|discharge/.test(n)) return 'Medical Report';
  return 'Other';
}

function formatBytes(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Medical Records — file-management centre (#2, #3, #4).
 * Upload → validate → store → process → extract → display → AI.
 */
export default function MedicalRecords() {
  const {
    medicalRecords,
    addMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord,
    bloodTests,
    addBloodTests,
  } = useAppData();

  const fileObjects = useRef(new Map());
  const objectUrls = useRef(new Map());
  const [previewId, setPreviewId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [analysis, setAnalysis] = useState({});

  useEffect(
    () => () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current.clear();
    },
    [],
  );

  const handleFiles = async (files) => {
    for (const file of files) {
      const ext = extensionOf(file.name);
      const record = addMedicalRecord({
        displayName: file.name,
        originalName: file.name,
        fileType: ext,
        category: guessCategory(file.name, ext),
        sizeBytes: file.size,
        source: 'User upload',
      });
      fileObjects.current.set(record.id, file);

      const result = await runPipeline(file, {
        onStatus: (status) => updateMedicalRecord(record.id, { status }),
      });

      if (result.error) {
        updateMedicalRecord(record.id, { status: 'error', extractionNote: result.error });
      } else {
        updateMedicalRecord(record.id, {
          status: 'processed',
          extracted: result.extracted,
          extractionAvailable: result.extractionAvailable,
          extractionNote: result.extractionNote,
          textPreview: result.textPreview,
        });
      }
    }
  };

  const openPreview = (record) => {
    if (previewId === record.id) {
      setPreviewId(null);
      setPreviewUrl(null);
      return;
    }
    // Create the object URL in the event handler (not during render).
    const file = fileObjects.current.get(record.id);
    if (file) {
      if (!objectUrls.current.has(record.id)) {
        objectUrls.current.set(record.id, URL.createObjectURL(file));
      }
      setPreviewUrl(objectUrls.current.get(record.id));
    } else {
      setPreviewUrl(null);
    }
    setPreviewId(record.id);
  };

  const handleRename = (record) => {
    const next = renameValue.trim();
    if (next) updateMedicalRecord(record.id, { displayName: next });
    setRenamingId(null);
    setRenameValue('');
  };

  const handleAnalyze = async (record) => {
    setAnalysis((prev) => ({ ...prev, [record.id]: { loading: true } }));
    try {
      const result = await analyzeRecord(record, bloodTests);
      setAnalysis((prev) => ({ ...prev, [record.id]: { loading: false, blocks: result.blocks } }));
    } catch (err) {
      setAnalysis((prev) => ({
        ...prev,
        [record.id]: { loading: false, error: err?.message || 'Analysis failed.' },
      }));
    }
  };

  const handleImport = (record) => {
    if (!record.extracted?.length) return;
    const date = (record.uploadedAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
    addBloodTests(
      record.extracted.map((e) => ({
        name: e.name,
        panel: 'Custom',
        value: e.value,
        unit: e.unit,
        referenceRange: e.referenceRange,
        referenceSource: e.referenceRange ? 'laboratory' : null,
        date,
        source: `Uploaded: ${record.displayName || record.originalName}`,
        notes: 'Imported from an uploaded file.',
      })),
    );
    updateMedicalRecord(record.id, { imported: true });
  };

  return (
    <>
      <PrivacyNotice />

      <Panel
        title="Upload medical records"
        subtitle="PDF, PNG, JPG, JPEG, CSV or TXT · stored locally in this browser only"
        aside={<Badge tone="proto">local only</Badge>}
      >
        <FileDropzone onFiles={handleFiles} />
      </Panel>

      <Panel
        title="Uploaded files"
        subtitle={`${medicalRecords.length} record${medicalRecords.length === 1 ? '' : 's'} · pipeline: upload → validate → store → process → extract → display`}
      >
        {medicalRecords.length === 0 ? (
          <p className="muted-small">No files uploaded yet.</p>
        ) : (
          <div className="record-list">
            {medicalRecords.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                analysis={analysis[record.id]}
                previewOpen={previewId === record.id}
                previewUrl={previewId === record.id ? previewUrl : null}
                renaming={renamingId === record.id}
                renameValue={renameValue}
                onRenameValue={setRenameValue}
                onPreview={() => openPreview(record)}
                onStartRename={() => {
                  setRenamingId(record.id);
                  setRenameValue(record.displayName || record.originalName);
                }}
                onCommitRename={() => handleRename(record)}
                onCancelRename={() => setRenamingId(null)}
                onCategory={(category) => updateMedicalRecord(record.id, { category })}
                onAnalyze={() => handleAnalyze(record)}
                onImport={() => handleImport(record)}
                onDelete={() => deleteMedicalRecord(record.id)}
              />
            ))}
          </div>
        )}
      </Panel>

      <MedicalDisclaimer />
    </>
  );
}

function RecordCard({
  record,
  analysis,
  previewOpen,
  previewUrl,
  renaming,
  renameValue,
  onRenameValue,
  onPreview,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onCategory,
  onAnalyze,
  onImport,
  onDelete,
}) {
  const busy = ['uploading', 'processing', 'analyzing'].includes(record.status);
  const isImage = ['png', 'jpg', 'jpeg'].includes(record.fileType);
  const isPdf = record.fileType === 'pdf';

  return (
    <article className="record-card">
      <div className="record-head">
        <span className={`record-type-icon ${record.fileType}`}>
          <Icon name={TYPE_ICON[record.fileType] ?? 'file'} size={18} />
        </span>
        <div className="record-title">
          {renaming ? (
            <span className="record-rename">
              <input
                value={renameValue}
                onChange={(e) => onRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onCommitRename();
                  if (e.key === 'Escape') onCancelRename();
                }}
                aria-label="Rename file"
                autoFocus
              />
              <button type="button" className="action-button secondary" onClick={onCommitRename}>
                Save
              </button>
              <button type="button" className="action-button secondary" onClick={onCancelRename}>
                Cancel
              </button>
            </span>
          ) : (
            <strong>{record.displayName || record.originalName}</strong>
          )}
          <p className="record-meta">
            .{record.fileType} · {formatBytes(record.sizeBytes)} · uploaded {formatDate(record.uploadedAt)} ·{' '}
            {record.source}
          </p>
        </div>
        <Badge tone={STATUS_TONE[record.status] ?? 'neutral'}>{record.status}</Badge>
      </div>

      <div className="record-controls">
        <label className="inline-select">
          <Icon name="clipboard" size={14} />
          <select
            value={record.category}
            onChange={(e) => onCategory(e.target.value)}
            aria-label="Category"
          >
            {FILE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <div className="record-actions">
          <button type="button" className="action-button secondary" onClick={onPreview}>
            <Icon name="eye" size={14} /> {previewOpen ? 'Close' : 'View'}
          </button>
          <button type="button" className="action-button secondary" onClick={onStartRename}>
            <Icon name="edit" size={14} /> Rename
          </button>
          <button type="button" className="action-button" onClick={onAnalyze} disabled={busy}>
            <Icon name="sparkles" size={14} /> Analyze with AI
          </button>
          {record.extracted?.length > 0 && !record.imported && (
            <button type="button" className="action-button secondary" onClick={onImport}>
              <Icon name="plus" size={14} /> Import values
            </button>
          )}
          <button type="button" className="action-button secondary danger" onClick={onDelete}>
            <Icon name="trash" size={14} /> Delete
          </button>
        </div>
      </div>

      {busy && (
        <p className="record-status-line">
          <span className="spinner" aria-hidden="true" /> {record.status}…
        </p>
      )}

      {record.status === 'processed' && record.extractionNote && (
        <p className="record-note">{record.extractionNote}</p>
      )}
      {record.status === 'error' && (
        <p className="record-note error">{record.extractionNote || 'Processing failed.'}</p>
      )}

      {record.extracted?.length > 0 && (
        <div className="mini-table-wrap record-extracted">
          <table className="data-table">
            <thead>
              <tr>
                <th>Analyte</th>
                <th>Value</th>
                <th>Unit</th>
                <th>Reference range</th>
              </tr>
            </thead>
            <tbody>
              {record.extracted.map((e, i) => (
                <tr key={i}>
                  <td>{e.name}</td>
                  <td className="num">{e.value}</td>
                  <td>{e.unit ?? '—'}</td>
                  <td>{e.referenceRange ?? 'not supplied'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {previewOpen && (
        <div className="record-preview">
          {isImage && previewUrl && <img src={previewUrl} alt={record.displayName} />}
          {isPdf && previewUrl && (
            <iframe title={record.displayName} src={previewUrl} className="record-preview-pdf" />
          )}
          {isTextType(record.fileType) && (
            <pre className="record-preview-text">
              {record.textPreview || '(no text content stored)'}
            </pre>
          )}
          {!isImage && !isPdf && !isTextType(record.fileType) && (
            <p className="muted-small">Preview not available for this type.</p>
          )}
          {isTextType(record.fileType) && !record.textPreview && previewUrl && (
            <p className="muted-small">Original file retained locally for re-processing.</p>
          )}
        </div>
      )}

      {analysis?.loading && (
        <p className="record-status-line">
          <span className="spinner" aria-hidden="true" /> analyzing…
        </p>
      )}
      {analysis?.error && <p className="record-note error">{analysis.error}</p>}
      {analysis?.blocks && <AnswerBlocks blocks={analysis.blocks} />}
    </article>
  );
}

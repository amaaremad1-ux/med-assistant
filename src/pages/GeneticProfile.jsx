import { useState } from 'react';
import Icon from '../components/icons.jsx';
import { Panel, Badge } from '../components/ui/index.js';
import FileDropzone from '../components/FileDropzone.jsx';
import PrivacyNotice from '../components/PrivacyNotice.jsx';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { DEMO_SOURCE_LABEL } from '../data/appDataSeed.js';
import { parseGeneticText } from '../lib/geneticParse.js';
import { extensionOf, isTextType, readAsText, NO_EXTRACTION_MESSAGE } from '../lib/filePipeline.js';

const EMPTY_FORM = {
  gene: '',
  variant: '',
  chromosome: '',
  position: '',
  reference: '',
  alternate: '',
  zygosity: 'Heterozygous',
  classification: 'Research-only variant',
  confidence: '',
};

/**
 * Genetic & DNA Profile (#7). Upload genetic reports (PDF/CSV/TXT) or add
 * variant rows manually. Demo rows are labelled "Synthetic Demo Data" and the
 * page never presents a variant as proof of disease.
 */
export default function GeneticProfile() {
  const { geneticRecords, addGeneticRecords, addGeneticRecord, deleteGeneticRecord } = useAppData();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [uploadNote, setUploadNote] = useState(null);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleFiles = async (files) => {
    for (const file of files) {
      const ext = extensionOf(file.name);
      if (ext === 'pdf' || !isTextType(ext)) {
        setUploadNote({ tone: 'warn', text: `${file.name}: ${NO_EXTRACTION_MESSAGE}` });
        continue;
      }
      try {
        const text = await readAsText(file);
        const rows = parseGeneticText(text);
        if (!rows.length) {
          setUploadNote({
            tone: 'warn',
            text: `${file.name}: parsed, but no genetic variant rows were found.`,
          });
          continue;
        }
        addGeneticRecords(
          rows.map((r) => ({ ...r, source: `Uploaded: ${file.name}` })),
        );
        setUploadNote({
          tone: 'good',
          text: `${file.name}: ${rows.length} variant row${rows.length === 1 ? '' : 's'} parsed and added.`,
        });
      } catch {
        setUploadNote({ tone: 'bad', text: `${file.name}: could not be read.` });
      }
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.gene.trim() || !form.variant.trim()) {
      setError('Gene and variant identifier are required.');
      return;
    }
    addGeneticRecord({
      gene: form.gene.trim(),
      variant: form.variant.trim(),
      chromosome: form.chromosome.trim() || '—',
      position: form.position.trim() || '—',
      reference: form.reference.trim() || '—',
      alternate: form.alternate.trim() || '—',
      zygosity: form.zygosity,
      classification: form.classification.trim() || 'Research-only variant',
      confidence: form.confidence.trim() || 'Not stated',
      source: 'Manual entry',
    });
    setError(null);
    setForm(EMPTY_FORM);
  };

  return (
    <>
      <PrivacyNotice />

      <Panel
        title="Upload a genetic report"
        subtitle="CSV or TXT are parsed into variant rows · PDF is stored without extraction"
        aside={<Badge tone="proto">local only</Badge>}
      >
        <FileDropzone onFiles={handleFiles} />
        {uploadNote && <p className={`record-note ${uploadNote.tone === 'bad' ? 'error' : ''}`}>{uploadNote.text}</p>}
      </Panel>

      <Panel title="Add a variant manually" subtitle="Research-only classification by default">
        <form className="lab-form" onSubmit={submit}>
          <div className="lab-form-grid">
            <label className="form-field">
              <span className="form-label">Gene</span>
              <input value={form.gene} onChange={(e) => set({ gene: e.target.value })} placeholder="e.g. APOE" />
            </label>
            <label className="form-field">
              <span className="form-label">Variant (rsID)</span>
              <input value={form.variant} onChange={(e) => set({ variant: e.target.value })} placeholder="e.g. rs429358" />
            </label>
            <label className="form-field">
              <span className="form-label">Chromosome</span>
              <input value={form.chromosome} onChange={(e) => set({ chromosome: e.target.value })} placeholder="e.g. 19" />
            </label>
            <label className="form-field">
              <span className="form-label">Position</span>
              <input value={form.position} onChange={(e) => set({ position: e.target.value })} placeholder="e.g. 44908684" />
            </label>
            <label className="form-field">
              <span className="form-label">Reference</span>
              <input value={form.reference} onChange={(e) => set({ reference: e.target.value })} placeholder="e.g. T" />
            </label>
            <label className="form-field">
              <span className="form-label">Alternate</span>
              <input value={form.alternate} onChange={(e) => set({ alternate: e.target.value })} placeholder="e.g. C" />
            </label>
            <label className="form-field">
              <span className="form-label">Zygosity</span>
              <select value={form.zygosity} onChange={(e) => set({ zygosity: e.target.value })}>
                <option>Heterozygous</option>
                <option>Homozygous alternate</option>
                <option>Homozygous reference</option>
                <option>Unknown</option>
              </select>
            </label>
            <label className="form-field">
              <span className="form-label">Classification</span>
              <input
                value={form.classification}
                onChange={(e) => set({ classification: e.target.value })}
                placeholder="Research-only variant"
              />
            </label>
            <label className="form-field span-2">
              <span className="form-label">Confidence</span>
              <input
                value={form.confidence}
                onChange={(e) => set({ confidence: e.target.value })}
                placeholder="e.g. assay confidence as reported"
              />
            </label>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="toolbar" style={{ marginTop: 12 }}>
            <button type="submit" className="action-button">
              <Icon name="plus" size={14} /> Add variant
            </button>
          </div>
        </form>
      </Panel>

      <Panel
        title="Genetic variant table"
        subtitle={`${geneticRecords.length} row${geneticRecords.length === 1 ? '' : 's'} · demo rows labelled below`}
        padded={false}
      >
        <div className="mini-table-wrap">
          <table className="data-table wide">
            <thead>
              <tr>
                <th>Gene</th>
                <th>Variant</th>
                <th>Chr</th>
                <th>Position</th>
                <th>Ref</th>
                <th>Alt</th>
                <th>Zygosity</th>
                <th>Source</th>
                <th>Classification</th>
                <th>Confidence</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {geneticRecords.length === 0 && (
                <tr>
                  <td colSpan={11}>
                    <span className="muted-small">No genetic records yet.</span>
                  </td>
                </tr>
              )}
              {geneticRecords.map((v) => (
                <tr key={v.id}>
                  <td>{v.gene}</td>
                  <td>{v.variant}</td>
                  <td className="num">{v.chromosome}</td>
                  <td className="num">{v.position}</td>
                  <td>{v.reference}</td>
                  <td>{v.alternate}</td>
                  <td>{v.zygosity}</td>
                  <td>
                    {v.source}
                    {v.source === DEMO_SOURCE_LABEL && (
                      <>
                        {' '}
                        <Badge tone="proto">Synthetic Demo Data</Badge>
                      </>
                    )}
                  </td>
                  <td>{v.classification}</td>
                  <td>{v.confidence}</td>
                  <td>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Delete ${v.gene} ${v.variant}`}
                      onClick={() => deleteGeneticRecord(v.id)}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="disclaimer" role="note">
        <span className="disclaimer-icon">
          <Icon name="dna" size={16} />
        </span>
        <span>
          Genetic rows in this prototype are research records. A gene or variant
          never proves that a person has or will develop a disease.
        </span>
      </div>

      <MedicalDisclaimer />
    </>
  );
}

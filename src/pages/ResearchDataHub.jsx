import { useMemo, useState } from 'react';
import Icon from '../components/icons.jsx';
import { Panel, Badge, StatCard } from '../components/ui/index.js';
import FileDropzone from '../components/FileDropzone.jsx';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import PrivacyNotice from '../components/PrivacyNotice.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import {
  HUB_CATEGORIES,
  HUB_STATUSES,
  STATUS_TONE,
  categoryLabel,
  hubCounts,
} from '../lib/researchHub.js';
import { IMPORT_FORMATS, PARSER_NOT_CONFIGURED } from '../lib/importPipeline.js';
import { describeProvenance } from '../lib/provenance.js';
import { DEMO_SUBJECTS } from '../data/researchSeeds.js';

/**
 * Research Data Hub — central catalogue + real data import.
 * Status is never marked Processed unless a parser actually succeeded.
 */
export default function ResearchDataHub() {
  const { hubItems, importResearchFile, deleteHubItem } = useAppData();
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [declaredCategory, setDeclaredCategory] = useState('');
  const [subjectId, setSubjectId] = useState(DEMO_SUBJECTS[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);

  const counts = useMemo(() => hubCounts(hubItems), [hubItems]);

  const visible = useMemo(() => {
    return hubItems.filter((h) => {
      if (filterCat !== 'all' && h.category !== filterCat) return false;
      if (filterStatus !== 'all' && h.status !== filterStatus) return false;
      return true;
    });
  }, [hubItems, filterCat, filterStatus]);

  const handleFiles = async (files) => {
    setBusy(true);
    setNote(null);
    try {
      for (const file of files) {
        const { result } = await importResearchFile(file, {
          declaredCategory: declaredCategory || null,
          subjectId: subjectId || null,
        });
        const extracted =
          (result.labs?.length || 0) +
          (result.variants?.length || 0) +
          (result.signals?.length || 0);
        if (result.status === 'Error') {
          setNote({
            tone: 'bad',
            text: `${file.name}: ${result.note || PARSER_NOT_CONFIGURED}`,
          });
        } else if (result.status === 'Insufficient data') {
          setNote({
            tone: 'warn',
            text: `${file.name}: ${result.note || 'Parser ran; no structured records were found.'}`,
          });
        } else {
          setNote({
            tone: 'good',
            text: `${file.name}: ${result.status} · ${extracted} structured item(s). Research observation only.`,
          });
        }
      }
    } catch (err) {
      setNote({ tone: 'bad', text: err?.message || 'Import failed.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PrivacyNotice />
      <MedicalDisclaimer />

      <div className="stat-grid">
        <StatCard
          label="Hub datasets"
          value={counts.total}
          note="Across all research categories"
          tone="info"
          icon={<Icon name="database" size={16} />}
        />
        <StatCard
          label="Processed"
          value={counts.byStatus.Processed || 0}
          note="Only when a parser succeeded"
          tone="good"
          icon={<Icon name="check" size={16} />}
        />
        <StatCard
          label="Error / insufficient"
          value={(counts.byStatus.Error || 0) + (counts.byStatus['Insufficient data'] || 0)}
          note="Never labelled as successful parses"
          tone="warn"
          icon={<Icon name="info" size={16} />}
        />
        <StatCard
          label="Bio-signal sets"
          value={counts.byCat['bio-signals'] || 0}
          note="Time-series catalogue entries"
          tone="neutral"
          icon={<Icon name="pulse" size={16} />}
        />
      </div>

      <Panel
        title="Real data import"
        subtitle="CSV, JSON, TXT, VCF, EDF/EDF+, WFDB · PDF/PNG/JPG stored with explicit parser-not-configured status"
        aside={<Badge tone="proto">honest pipeline</Badge>}
      >
        <div className="form-grid research-import-controls">
          <label>
            Declared category (optional)
            <select
              value={declaredCategory}
              onChange={(e) => setDeclaredCategory(e.target.value)}
            >
              <option value="">Infer from filename / format</option>
              {HUB_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Opaque subject code
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">None</option>
              {DEMO_SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <FileDropzone onFiles={handleFiles} disabled={busy} />
        {busy && <p className="muted-small">Validating / processing…</p>}
        {note && (
          <p className={`record-note ${note.tone === 'bad' ? 'error' : ''}`}>{note.text}</p>
        )}
        <div className="format-chip-row">
          {IMPORT_FORMATS.map((f) => (
            <span
              key={f.ext}
              className={`format-chip ${f.configured ? 'configured' : 'missing'}`}
              title={f.configured ? `Parser: ${f.parser}` : PARSER_NOT_CONFIGURED}
            >
              .{f.ext}
              {!f.configured && ' · not configured'}
            </span>
          ))}
        </div>
      </Panel>

      <Panel
        title="Research Data Hub"
        subtitle="Genetic · Lab · Bio-signals · Medical Records · Wearable · Sleep · Activity · Longitudinal · Research"
        aside={
          <div className="hub-filters">
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <option value="all">All categories</option>
              {HUB_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All statuses</option>
              {HUB_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="hub-category-grid">
          {HUB_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`hub-cat-card ${filterCat === c.id ? 'active' : ''}`}
              onClick={() => setFilterCat(c.id)}
            >
              <strong>{c.label}</strong>
              <span>{counts.byCat[c.id] || 0}</span>
              <em>{c.note}</em>
            </button>
          ))}
        </div>

        <div className="table-scroll">
          <table className="data-table wide">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Status</th>
                <th>Format</th>
                <th>Provenance</th>
                <th>Linked</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((h) => (
                <tr key={h.id}>
                  <td>
                    <strong>{h.name}</strong>
                    {h.note && <div className="muted-small">{h.note}</div>}
                  </td>
                  <td>{categoryLabel(h.category)}</td>
                  <td>
                    <Badge tone={STATUS_TONE[h.status] || 'neutral'}>{h.status}</Badge>
                  </td>
                  <td>{h.format || '—'}</td>
                  <td className="muted-small">{describeProvenance(h.provenance)}</td>
                  <td className="muted-small">
                    labs {h.linked?.labIds?.length || 0} · genes{' '}
                    {h.linked?.geneticIds?.length || 0} · signals{' '}
                    {h.linked?.signalIds?.length || 0}
                  </td>
                  <td>
                    {!String(h.id).startsWith('hub-seed') && (
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => deleteHubItem(h.id)}
                        aria-label="Remove hub item"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td colSpan={7} className="muted-small">
                    No hub items match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

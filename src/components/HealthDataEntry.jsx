import { useState } from 'react';
import { Panel, Tabs, Badge } from './ui/index.js';
import Icon from './icons.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { ANALYTE_MATCHERS, VITAL_FIELDS } from '../lib/healthAggregation.js';
import { ZYGOSITY } from '../lib/geneticModel.js';

const today = () => new Date().toISOString().slice(0, 10);

function RecordList({ kind, entries, onDelete }) {
  if (!entries?.length) return null;
  return (
    <ul className="record-list">
      {entries.map((e) => (
        <li key={e.id} className="record-card">
          <div className="record-head">
            <span className="record-title">
              {kind === 'labs' && `${e.name} · ${e.value} ${e.unit}${e.referenceRange ? ` (range ${e.referenceRange})` : ''}`}
              {kind === 'vitals' && `${VITAL_FIELDS.find((f) => f.id === e.field)?.label ?? e.field} · ${e.value}`}
              {kind === 'genes' && `${e.gene} ${e.variant} · ${e.zygosity}`}
              {kind === 'notes' && e.title}
            </span>
            <button type="button" className="action-button secondary" onClick={() => onDelete(e.id)}>
              Delete
            </button>
          </div>
          <p className="muted-small">
            {e.date ?? (e.createdAt ? e.createdAt.slice(0, 10) : 'no date')}
            {kind === 'labs' && e.panel ? ` · ${e.panel}` : ''}
            {kind === 'genes' && e.reference ? ` · ${e.reference}>${e.alternate}` : ''}
            {kind === 'notes' && e.text ? ` · ${String(e.text).slice(0, 120)}${String(e.text).length > 120 ? '…' : ''}` : ''}
          </p>
        </li>
      ))}
    </ul>
  );
}

/**
 * Data entry for the ACTIVE profile (labs / daily tracking / genetics / notes).
 *
 * This exists because the application-wide record pages always write to the
 * primary profile. Anything entered here is stored under the active profile
 * only, so a family member's dashboard never borrows the owner's records.
 */
export default function HealthDataEntry({ profile, records }) {
  const { addProfileRecord, deleteProfileRecord, clearProfileRecords } = useAppData();

  const [error, setError] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [lab, setLab] = useState({ key: 'hba1c', name: '', value: '', unit: '', date: today(), referenceRange: '', notes: '' });
  const [vital, setVital] = useState({ field: 'sleepHours', value: '', date: today() });
  const [gene, setGene] = useState({ gene: '', variant: '', zygosity: 'Heterozygous', reference: '', alternate: '' });
  const [note, setNote] = useState({ title: '', text: '', date: today() });

  if (!profile) return null;

  const labPreset = ANALYTE_MATCHERS.find((m) => m.key === lab.key) ?? null;
  const vitalMeta = VITAL_FIELDS.find((f) => f.id === vital.field) ?? null;

  const submitLab = (event) => {
    event.preventDefault();
    const name = (lab.name || labPreset?.label || '').trim();
    const value = parseFloat(lab.value);
    if (!name) return setError('An analyte name is required (choose a preset or type a name).');
    if (!Number.isFinite(value)) return setError('The laboratory value must be a number.');
    const unit = (lab.unit || labPreset?.unit || '').trim();
    if (!unit) return setError('A unit is required.');
    if (!lab.date) return setError('A date is required.');
    addProfileRecord(profile.id, 'labs', {
      name,
      value,
      unit,
      date: lab.date,
      panel: 'Entered on dashboard',
      referenceRange: lab.referenceRange.trim() || null,
      referenceSource: lab.referenceRange.trim() ? 'user-entered' : null,
      notes: lab.notes.trim(),
      source: 'Entered on dashboard',
    });
    setError(null);
    setLab((l) => ({ ...l, value: '', notes: '' }));
  };

  const submitVital = (event) => {
    event.preventDefault();
    const value = parseFloat(vital.value);
    if (!Number.isFinite(value)) return setError('The daily value must be a number.');
    if (!vital.date) return setError('A date is required.');
    addProfileRecord(profile.id, 'vitals', {
      field: vital.field,
      value,
      unit: vitalMeta?.unit ?? '',
      date: vital.date,
      source: 'Entered on dashboard',
    });
    setError(null);
    setVital((v) => ({ ...v, value: '' }));
  };

  const submitGene = (event) => {
    event.preventDefault();
    if (!gene.gene.trim() || !gene.variant.trim()) return setError('Both a gene symbol and a variant identifier are required.');
    addProfileRecord(profile.id, 'genes', {
      gene: gene.gene.trim(),
      variant: gene.variant.trim(),
      zygosity: gene.zygosity,
      reference: gene.reference.trim() || '—',
      alternate: gene.alternate.trim() || '—',
      classification: 'Research-only variant',
      confidence: 'User-entered (not clinically validated)',
      evidenceLevel: 'User-entered annotation',
      source: 'Entered on dashboard',
    });
    setError(null);
    setGene((g) => ({ ...g, gene: '', variant: '', reference: '', alternate: '' }));
  };

  const submitNote = (event) => {
    event.preventDefault();
    if (!note.text.trim()) return setError('A note or symptom description is required.');
    addProfileRecord(profile.id, 'notes', {
      title: note.title.trim() || 'Dashboard note',
      text: note.text.trim(),
      date: note.date,
      source: 'Entered on dashboard',
    });
    setError(null);
    setNote((n) => ({ ...n, title: '', text: '' }));
  };
  const totalEntries =
    (records?.labs?.length ?? 0) +
    (records?.vitals?.length ?? 0) +
    (records?.genes?.length ?? 0) +
    (records?.notes?.length ?? 0);

  return (
    <Panel
      title="Add health data"
      subtitle="Everything entered here is stored for the active profile only, and is used by the next analysis run."
      aside={<Badge tone="info">{profile.name}</Badge>}
    >
      {error && <p className="form-error">{error}</p>}

      <Tabs
        tabs={[
          { id: 'labs', label: `Lab result (${records?.labs?.length ?? 0})` },
          { id: 'vitals', label: `Daily tracking (${records?.vitals?.length ?? 0})` },
          { id: 'genes', label: `Genetic variant (${records?.genes?.length ?? 0})` },
          { id: 'notes', label: `Note / symptom (${records?.notes?.length ?? 0})` },
        ]}
      >
        {(tab) => (
          <>
            {tab?.id === 'labs' && (
              <>
                <form className="lab-form-grid" onSubmit={submitLab}>
                  <label className="form-field">
                    <span className="form-label">Analyte preset</span>
                    <select
                      value={lab.key}
                      onChange={(e) => {
                        const preset = ANALYTE_MATCHERS.find((m) => m.key === e.target.value);
                        setLab((l) => ({ ...l, key: e.target.value, name: '', unit: preset?.unit ?? '' }));
                      }}
                    >
                      {ANALYTE_MATCHERS.map((m) => (
                        <option key={m.key} value={m.key}>
                          {m.label}
                        </option>
                      ))}
                      <option value="custom">Custom (type a name)</option>
                    </select>
                  </label>
                  <label className="form-field">
                    <span className="form-label">Name{lab.key === 'custom' ? '' : ' (optional override)'}</span>
                    <input
                      value={lab.name}
                      onChange={(e) => setLab((l) => ({ ...l, name: e.target.value }))}
                      placeholder={labPreset?.label ?? 'e.g. Vitamin B12'}
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-label">Value</span>
                    <input
                      value={lab.value}
                      onChange={(e) => setLab((l) => ({ ...l, value: e.target.value }))}
                      inputMode="decimal"
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-label">Unit</span>
                    <input
                      value={lab.unit}
                      onChange={(e) => setLab((l) => ({ ...l, unit: e.target.value }))}
                      placeholder={labPreset?.unit ?? 'mg/dL'}
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-label">Date</span>
                    <input
                      type="date"
                      value={lab.date}
                      onChange={(e) => setLab((l) => ({ ...l, date: e.target.value }))}
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-label">Reference range (only if supplied)</span>
                    <input
                      value={lab.referenceRange}
                      onChange={(e) => setLab((l) => ({ ...l, referenceRange: e.target.value }))}
                      placeholder="e.g. 70–99"
                    />
                  </label>
                  <label className="form-field span-2">
                    <span className="form-label">Notes</span>
                    <input
                      value={lab.notes}
                      onChange={(e) => setLab((l) => ({ ...l, notes: e.target.value }))}
                    />
                  </label>
                  <div className="form-field">
                    <span className="form-label">&nbsp;</span>
                    <button type="submit" className="action-button">
                      Add lab result
                    </button>
                  </div>
                </form>
                <p className="fact-note">
                  <Icon name="info" size={13} /> A reference range is never pre-filled: if you do not supply one,
                  the dashboard will not judge the value against an invented range.
                </p>
                <RecordList kind="labs" entries={records?.labs} onDelete={(id) => deleteProfileRecord(profile.id, 'labs', id)} />
              </>
            )}

            {tab?.id === 'vitals' && (
              <>
                <form className="lab-form-grid" onSubmit={submitVital}>
                  <label className="form-field">
                    <span className="form-label">Measure</span>
                    <select value={vital.field} onChange={(e) => setVital((v) => ({ ...v, field: e.target.value }))}>
                      {VITAL_FIELDS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label} ({f.unit})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span className="form-label">Value {vitalMeta ? `(${vitalMeta.unit})` : ''}</span>
                    <input
                      value={vital.value}
                      onChange={(e) => setVital((v) => ({ ...v, value: e.target.value }))}
                      inputMode="decimal"
                      step={vitalMeta?.step}
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-label">Date</span>
                    <input
                      type="date"
                      value={vital.date}
                      onChange={(e) => setVital((v) => ({ ...v, date: e.target.value }))}
                    />
                  </label>
                  <div className="form-field">
                    <span className="form-label">&nbsp;</span>
                    <button type="submit" className="action-button">
                      Add daily entry
                    </button>
                  </div>
                </form>
                <p className="fact-note">
                  <Icon name="info" size={13} /> {vitalMeta?.hint} Averages are taken over your last 14 entries for this profile.
                </p>
                <RecordList kind="vitals" entries={records?.vitals} onDelete={(id) => deleteProfileRecord(profile.id, 'vitals', id)} />
              </>
            )}

            {tab?.id === 'genes' && (
              <>
                <form className="lab-form-grid" onSubmit={submitGene}>
                  <label className="form-field">
                    <span className="form-label">Gene symbol</span>
                    <input
                      value={gene.gene}
                      onChange={(e) => setGene((g) => ({ ...g, gene: e.target.value }))}
                      placeholder="e.g. BRCA1"
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-label">Variant identifier</span>
                    <input
                      value={gene.variant}
                      onChange={(e) => setGene((g) => ({ ...g, variant: e.target.value }))}
                      placeholder="e.g. rs80357906"
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-label">Zygosity</span>
                    <select
                      value={gene.zygosity}
                      onChange={(e) => setGene((g) => ({ ...g, zygosity: e.target.value }))}
                    >
                      {ZYGOSITY.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span className="form-label">Reference allele</span>
                    <input
                      value={gene.reference}
                      onChange={(e) => setGene((g) => ({ ...g, reference: e.target.value }))}
                      placeholder="e.g. T"
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-label">Alternate allele</span>
                    <input
                      value={gene.alternate}
                      onChange={(e) => setGene((g) => ({ ...g, alternate: e.target.value }))}
                      placeholder="e.g. C"
                    />
                  </label>
                  <div className="form-field">
                    <span className="form-label">&nbsp;</span>
                    <button type="submit" className="action-button">
                      Add variant
                    </button>
                  </div>
                </form>
                <p className="fact-note">
                  <Icon name="info" size={13} /> A variant only changes an estimate when an alternate allele is declared
                  and the zygosity is not "Homozygous reference". Everything added here is treated as a research-only
                  association, not a result.
                </p>
                <RecordList kind="genes" entries={records?.genes} onDelete={(id) => deleteProfileRecord(profile.id, 'genes', id)} />
              </>
            )}
            {tab?.id === 'notes' && (
              <>
                <form className="lab-form-grid" onSubmit={submitNote}>
                  <label className="form-field">
                    <span className="form-label">Title</span>
                    <input
                      value={note.title}
                      onChange={(e) => setNote((n) => ({ ...n, title: e.target.value }))}
                      placeholder="e.g. Symptoms this week"
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-label">Date</span>
                    <input
                      type="date"
                      value={note.date}
                      onChange={(e) => setNote((n) => ({ ...n, date: e.target.value }))}
                    />
                  </label>
                  <label className="form-field span-2">
                    <span className="form-label">What would you like the analysis to know?</span>
                    <textarea
                      rows={3}
                      value={note.text}
                      onChange={(e) => setNote((n) => ({ ...n, text: e.target.value }))}
                      placeholder="e.g. I have been very thirsty and tired for two weeks; my father has diabetes."
                    />
                  </label>
                  <div className="form-field">
                    <span className="form-label">&nbsp;</span>
                    <button type="submit" className="action-button">
                      Add note
                    </button>
                  </div>
                </form>
                <p className="fact-note">
                  <Icon name="info" size={13} /> Notes are scanned for a fixed keyword list and are reported as
                  self-reported statements. Nothing here is treated as a verified finding.
                </p>
                <RecordList kind="notes" entries={records?.notes} onDelete={(id) => deleteProfileRecord(profile.id, 'notes', id)} />
              </>
            )}
          </>
        )}
      </Tabs>

      {totalEntries > 0 && (
        <div className="toolbar" style={{ marginTop: 14 }}>
          <button
            type="button"
            className="action-button secondary danger"
            onClick={() => {
              if (!confirmClear) {
                setConfirmClear(true);
                return;
              }
              clearProfileRecords(profile.id);
              setConfirmClear(false);
            }}
          >
            {confirmClear ? `Confirm: delete all ${totalEntries} entries for ${profile.name}` : 'Clear all entries for this profile'}
          </button>
        </div>
      )}
    </Panel>
  );
}


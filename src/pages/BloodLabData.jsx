import { useMemo, useState } from 'react';
import Icon from '../components/icons.jsx';
import { Panel, Badge } from '../components/ui/index.js';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import {
  groupByPanel,
  seriesFor,
  trendSummary,
  evaluateAgainstRange,
} from '../lib/appDataSelectors.js';

/**
 * Preset analyte catalog per panel. Units are conventional display units only;
 * reference ranges are NEVER pre-filled — a range is recorded only when the
 * user supplies one (e.g. from their laboratory report).
 */
export const PANEL_PRESETS = {
  CBC: [
    { name: 'Hemoglobin', unit: 'g/dL' },
    { name: 'Hematocrit', unit: '%' },
    { name: 'RBC', unit: '10^6/µL' },
    { name: 'WBC', unit: '10^3/µL' },
    { name: 'Platelets', unit: '10^3/µL' },
    { name: 'MCV', unit: 'fL' },
    { name: 'MCH', unit: 'pg' },
    { name: 'MCHC', unit: 'g/dL' },
  ],
  Metabolic: [
    { name: 'Glucose (fasting)', unit: 'mg/dL' },
    { name: 'HbA1c', unit: '%' },
    { name: 'Creatinine', unit: 'mg/dL' },
    { name: 'eGFR', unit: 'mL/min/1.73m²' },
    { name: 'BUN/Urea', unit: 'mg/dL' },
    { name: 'ALT', unit: 'U/L' },
    { name: 'AST', unit: 'U/L' },
    { name: 'Sodium', unit: 'mmol/L' },
    { name: 'Potassium', unit: 'mmol/L' },
    { name: 'Calcium', unit: 'mg/dL' },
  ],
  Lipids: [
    { name: 'Total Cholesterol', unit: 'mg/dL' },
    { name: 'LDL cholesterol', unit: 'mg/dL' },
    { name: 'HDL cholesterol', unit: 'mg/dL' },
    { name: 'Triglycerides', unit: 'mg/dL' },
  ],
  Hormones: [
    { name: 'TSH', unit: 'mIU/L' },
    { name: 'Free T4', unit: 'ng/dL' },
    { name: 'Cortisol (AM)', unit: 'µg/dL' },
    { name: 'Insulin (fasting)', unit: 'µIU/mL' },
    { name: 'Vitamin D (25-OH)', unit: 'ng/mL' },
  ],
};

const EMPTY_FORM = {
  panel: 'Metabolic',
  name: '',
  value: '',
  unit: '',
  referenceRange: '',
  referenceSource: '',
  date: '',
  source: '',
  notes: '',
};

const TREND_LABEL = {
  increasing: 'Increasing',
  decreasing: 'Decreasing',
  stable: 'Stable',
  insufficient: 'Insufficient data',
};

/**
 * Blood & Laboratory Data (#5): manual entry of CBC / metabolic / lipid
 * panels plus custom biomarkers. Reference ranges are optional and, when
 * present, are labelled with where they came from.
 */
export default function BloodLabData() {
  const { bloodTests, addBloodTest, deleteBloodTest } = useAppData();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);

  const groups = useMemo(() => groupByPanel(bloodTests), [bloodTests]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const applyPreset = (presetName) => {
    for (const [panel, presets] of Object.entries(PANEL_PRESETS)) {
      const hit = presets.find((p) => p.name === presetName);
      if (hit) {
        set({ panel, name: hit.name, unit: hit.unit });
        return;
      }
    }
    set({ name: presetName });
  };

  const submit = (e) => {
    e.preventDefault();
    const value = parseFloat(form.value);
    if (!form.name.trim()) return setError('A biomarker name is required.');
    if (!Number.isFinite(value)) return setError('Value must be a number.');
    if (!form.unit.trim()) return setError('A unit is required.');
    if (!form.date) return setError('A date is required.');

    addBloodTest({
      name: form.name.trim(),
      panel: form.panel,
      value,
      unit: form.unit.trim(),
      referenceRange: form.referenceRange.trim() || null,
      referenceSource: form.referenceSource || null,
      date: form.date,
      source: form.source.trim() || 'Manual entry',
      notes: form.notes.trim(),
    });
    setError(null);
    setForm({ ...EMPTY_FORM, panel: form.panel });
    return null;
  };

  return (
    <>
      <Panel
        title="Add a laboratory value"
        subtitle="Manual entry · CBC, metabolic, lipids, hormones, or a custom biomarker"
      >
        <form className="lab-form" onSubmit={submit}>
          <div className="lab-form-grid">
            <label className="form-field">
              <span className="form-label">Panel</span>
              <select value={form.panel} onChange={(e) => set({ panel: e.target.value })}>
                {[...Object.keys(PANEL_PRESETS), 'Custom'].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span className="form-label">Analyte</span>
              <input
                list="analyte-presets"
                value={form.name}
                onChange={(e) => applyPresetSafe(e.target.value, set, applyPreset, form)}
                placeholder="e.g. Glucose (fasting)"
              />
              <datalist id="analyte-presets">
                {Object.values(PANEL_PRESETS)
                  .flat()
                  .map((p) => (
                    <option key={p.name} value={p.name} />
                  ))}
              </datalist>
            </label>

            <label className="form-field">
              <span className="form-label">Value</span>
              <input
                type="number"
                step="any"
                value={form.value}
                onChange={(e) => set({ value: e.target.value })}
                placeholder="e.g. 104"
              />
            </label>

            <label className="form-field">
              <span className="form-label">Unit</span>
              <input
                value={form.unit}
                onChange={(e) => set({ unit: e.target.value })}
                placeholder="e.g. mg/dL"
              />
            </label>

            <label className="form-field">
              <span className="form-label">Reference range (optional)</span>
              <input
                value={form.referenceRange}
                onChange={(e) => set({ referenceRange: e.target.value })}
                placeholder="e.g. 70–99 or <5.7"
              />
            </label>

            <label className="form-field">
              <span className="form-label">Range source</span>
              <select
                value={form.referenceSource}
                onChange={(e) => set({ referenceSource: e.target.value })}
              >
                <option value="">— none / Unavailable —</option>
                <option value="laboratory">Lab-provided</option>
                <option value="dataset-provided">Dataset-provided</option>
                <option value="manual">Entered manually</option>
              </select>
            </label>

            <label className="form-field">
              <span className="form-label">Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set({ date: e.target.value })}
              />
            </label>

            <label className="form-field">
              <span className="form-label">Source</span>
              <input
                value={form.source}
                onChange={(e) => set({ source: e.target.value })}
                placeholder="e.g. Northside Lab / uploaded report"
              />
            </label>

            <label className="form-field span-2">
              <span className="form-label">Notes</span>
              <input
                value={form.notes}
                onChange={(e) => set({ notes: e.target.value })}
                placeholder="Optional context (fasting, repeat draw…)"
              />
            </label>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="toolbar" style={{ marginTop: 12 }}>
            <button type="submit" className="action-button">
              <Icon name="plus" size={14} /> Add entry
            </button>
            <button
              type="button"
              className="action-button secondary"
              onClick={() => {
                setForm(EMPTY_FORM);
                setError(null);
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </Panel>

      {groups.map(({ panel, entries }) => (
        <Panel
          key={panel}
          title={`${panel} panel`}
          subtitle={`${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`}
          aside={<Badge tone="neutral">{panel === 'Custom' ? 'custom biomarkers' : 'preset panel'}</Badge>}
        >
          <div className="mini-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Analyte</th>
                  <th>Value</th>
                  <th>Reference range</th>
                  <th>Date</th>
                  <th>Source</th>
                  <th>Trend</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {entries.map((b) => {
                  const verdict = evaluateAgainstRange(b.value, b.referenceRange);
                  const trend = trendSummary(seriesFor(bloodTests, b.name));
                  return (
                    <tr key={b.id}>
                      <td>
                        {b.name}
                        {b.notes && <p className="muted-small">{b.notes}</p>}
                      </td>
                      <td className="num">
                        {b.value} {b.unit}
                      </td>
                      <td>
                        {b.referenceRange ? (
                          <>
                            <Badge tone={verdict === 'within' ? 'good' : verdict ? 'warn' : 'neutral'}>
                              {b.referenceRange}
                            </Badge>
                            {b.referenceSource === 'laboratory' && (
                              <p className="muted-small">Reference range supplied by the laboratory.</p>
                            )}
                          </>
                        ) : (
                          <span className="muted-small">not supplied</span>
                        )}
                      </td>
                      <td>{b.date}</td>
                      <td>{b.source}</td>
                      <td>
                        <Badge tone={trend.direction === 'insufficient' ? 'neutral' : 'info'}>
                          {TREND_LABEL[trend.direction]}
                        </Badge>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Delete ${b.name} ${b.date}`}
                          onClick={() => deleteBloodTest(b.id)}
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}

      <MedicalDisclaimer />
    </>
  );
}

/**
 * Only snap to a preset (and its unit) when the typed text exactly matches a
 * known analyte; otherwise keep free typing so custom biomarkers work.
 */
function applyPresetSafe(value, set, applyPreset, form) {
  set({ name: value });
  const exact = Object.values(PANEL_PRESETS)
    .flat()
    .find((p) => p.name.toLowerCase() === value.toLowerCase());
  if (exact && exact.name !== form.name) applyPreset(exact.name);
}

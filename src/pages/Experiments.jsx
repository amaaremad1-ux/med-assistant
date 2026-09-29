import { useEffect, useState } from 'react';
import { Panel, Badge, ProtoTag, StatCard } from '../components/ui/index.js';
import GroupedBarChart from '../components/charts/GroupedBarChart.jsx';
import {
  EXPERIMENT_DATASETS,
  HORIZONS,
  EXPERIMENT_BIOMARKERS,
  MODEL_CATALOG,
} from '../data/syntheticData.js';
import {
  simulateMetrics,
  compareModels,
  listExperiments,
  saveExperiment,
  deleteExperiment,
  clearExperiments,
} from '../lib/experimentStore.js';
import { logEvent } from '../lib/audit.js';

const DATASET_LABEL = Object.fromEntries(EXPERIMENT_DATASETS.map((d) => [d.id, d.label]));
const MODEL_LABEL = Object.fromEntries(MODEL_CATALOG.map((m) => [m.id, m.name]));
const HORIZON_LABEL = Object.fromEntries(HORIZONS.map((h) => [h.id, h.label]));

/**
 * Research Experiment Center (module #20).
 * Configure a simulated cohort experiment, run it against the demo model
 * catalog, and keep a local log of saved runs. Every metric produced here
 * is a deterministic SIMULATED placeholder — nothing is validated.
 */
export default function Experiments() {
  const [dataset, setDataset] = useState('ds-p');
  const [model, setModel] = useState('xgb');
  const [horizon, setHorizon] = useState('h12');
  const [biomarkers, setBiomarkers] = useState([...EXPERIMENT_BIOMARKERS]);
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState([]);

  useEffect(() => {
    setSaved(listExperiments());
  }, []);

  const params = { dataset, biomarkers, model, horizon };

  function toggleMarker(name) {
    setBiomarkers((prev) =>
      prev.includes(name) ? prev.filter((b) => b !== name) : [...prev, name],
    );
  }

  function runExperiment() {
    if (biomarkers.length === 0) return;
    const metrics = simulateMetrics(params);
    setResult(metrics);
    logEvent(
      'EXPERIMENT_EXECUTED',
      `Experiment run — ${DATASET_LABEL[dataset]} · ${MODEL_LABEL[model]} · ${HORIZON_LABEL[horizon]} · ${biomarkers.length} biomarkers (simulated AUC ${metrics.auc})`,
    );
  }

  function saveRun() {
    if (!result) return;
    saveExperiment({
      name: `${DATASET_LABEL[dataset]} · ${MODEL_LABEL[model]} · ${HORIZON_LABEL[horizon]}`,
      dataset,
      model,
      horizon,
      biomarkers: [...biomarkers],
      auc: result.auc,
      sensitivity: result.sensitivity,
      specificity: result.specificity,
      brier: result.brier,
    });
    setSaved(listExperiments());
  }

  function removeRun(id) {
    deleteExperiment(id);
    setSaved(listExperiments());
  }

  function clearRuns() {
    clearExperiments();
    setSaved([]);
  }

  const comparison = result ? compareModels(params) : null;

  return (
    <>
      <Panel
        title="Experiment configuration"
        subtitle="Design a simulated research run — synthetic cohort, demo model, prediction horizon, feature set"
        aside={<ProtoTag compact />}
      >
        <ul className="plain-list" style={{ maxWidth: 560 }}>
          <li>
            <span>Synthetic dataset</span>
            <span className="inline-select">
              <select value={dataset} onChange={(e) => setDataset(e.target.value)}>
                {EXPERIMENT_DATASETS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label} · n={d.n} · {d.kind}
                  </option>
                ))}
              </select>
            </span>
          </li>
          <li>
            <span>Demo model</span>
            <span className="inline-select">
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                {MODEL_CATALOG.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.version})
                  </option>
                ))}
              </select>
            </span>
          </li>
          <li>
            <span>Prediction horizon</span>
            <span className="inline-select">
              <select value={horizon} onChange={(e) => setHorizon(e.target.value)}>
                {HORIZONS.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.label}
                  </option>
                ))}
              </select>
            </span>
          </li>
        </ul>

        <div className="form-block">
          <span className="form-label">Biomarker feature set ({biomarkers.length} selected)</span>
          <div className="check-grid">
            {EXPERIMENT_BIOMARKERS.map((b) => (
              <label key={b} className={`check-item ${biomarkers.includes(b) ? 'on' : ''}`}>
                <input
                  type="checkbox"
                  checked={biomarkers.includes(b)}
                  onChange={() => toggleMarker(b)}
                />
                {b}
              </label>
            ))}
          </div>
        </div>

        <div className="toolbar" style={{ marginTop: 16 }}>
          <button
            className="action-button"
            onClick={runExperiment}
            disabled={biomarkers.length === 0}
          >
            Run experiment (simulated)
          </button>
          {result && (
            <button className="action-button secondary" onClick={saveRun}>
              Save this run
            </button>
          )}
          {biomarkers.length === 0 && (
            <span className="fact-note">Select at least one biomarker to run.</span>
          )}
        </div>
      </Panel>

      {result && (
        <Panel
          title={`Simulated results — ${MODEL_LABEL[model]} · ${DATASET_LABEL[dataset]}`}
          subtitle="Deterministic placeholder metrics derived from the configuration above"
          aside={<Badge tone="proto">Simulated · not validated</Badge>}
        >
          <div className="stat-grid">
            <StatCard
              label="Demo AUC"
              value={result.auc}
              note="Simulated discrimination — no real validation"
              tone="info"
            />
            <StatCard label="Sensitivity (simulated)" value={result.sensitivity} note="Placeholder value" />
            <StatCard label="Specificity (simulated)" value={result.specificity} note="Placeholder value" />
            <StatCard label="Brier score (simulated)" value={result.brier} note="Lower is better — placeholder" />
          </div>

          <GroupedBarChart
            categories={result.calibration.map((c) => String(c.decile))}
            series={[
              { id: 'pred', label: 'Mean predicted risk', color: 'var(--ink-400)', values: result.calibration.map((c) => c.predicted / 100) },
              { id: 'obs', label: 'Observed event rate (simulated)', color: 'var(--primary)', values: result.calibration.map((c) => c.observed / 100) },
            ]}
            yMax={1}
            yLabel="Proportion"
            height={230}
            formatY={(v) => `${Math.round(v * 100)}%`}
          />
          <p className="fact-note" style={{ marginTop: 10 }}>
            Calibration curve across predicted-risk deciles. Both series are synthetic
            placeholders — the observed rates are generated, not measured.
          </p>
        </Panel>
      )}

      {comparison && (
        <Panel
          title="Demo model comparison — same configuration"
          subtitle="All four catalog models evaluated on the selected dataset, features and horizon (simulated)"
          aside={<Badge tone="proto">Simulated</Badge>}
        >
          <GroupedBarChart
            categories={comparison.map((c) => c.model)}
            series={[
              { id: 'auc', label: 'AUC', color: 'var(--primary)', values: comparison.map((c) => c.auc) },
              { id: 'sens', label: 'Sensitivity', color: 'var(--good)', values: comparison.map((c) => c.sensitivity) },
              { id: 'spec', label: 'Specificity', color: 'var(--warn)', values: comparison.map((c) => c.specificity) },
            ]}
            yMax={1}
            yLabel="Score"
            height={230}
            formatY={(v) => `${Math.round(v * 100)}%`}
          />
          <p className="fact-note" style={{ marginTop: 10 }}>
            Ranking differences are generated from the configuration hash — they demonstrate
            the comparison workflow, not model performance.
          </p>
        </Panel>
      )}

      <Panel
        title={`Saved runs (${saved.length})`}
        subtitle="Stored locally in this browser only — nothing is uploaded anywhere"
      >
        {saved.length === 0 ? (
          <p className="fact-note">
            No saved runs yet. Configure an experiment above and use “Save this run”.
          </p>
        ) : (
          <>
            <div className="mini-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Configuration</th>
                    <th>Features</th>
                    <th className="num">AUC (sim.)</th>
                    <th className="num">Brier (sim.)</th>
                    <th>Saved</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {saved.map((e) => (
                    <tr key={e.id}>
                      <td>{e.name}</td>
                      <td className="table-flag">{e.biomarkers.length} biomarkers</td>
                      <td className="num">{e.auc}</td>
                      <td className="num">{e.brier}</td>
                      <td>{new Date(e.savedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        <button className="action-button secondary" onClick={() => removeRun(e.id)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="toolbar" style={{ marginTop: 12 }}>
              <button className="action-button secondary" onClick={clearRuns}>
                Clear all saved runs
              </button>
            </div>
          </>
        )}
      </Panel>
    </>
  );
}

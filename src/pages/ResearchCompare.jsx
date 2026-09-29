import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Panel, Badge, Meter } from '../components/ui/index.js';
import GroupedBarChart from '../components/charts/GroupedBarChart.jsx';
import { MONTHLY } from '../data/syntheticData.js';
import { patient } from '../data/patientData.js';
import {
  HEART_CASES,
  HEART_DATASET,
  heartCaseLabel,
  formatHeartValue,
  heartFeature,
} from '../data/heartDisease.js';
import { heartCohortValues, percentileRank } from '../lib/heartStats.js';

const SYN_FEATURES = [
  { id: 'glucose', label: 'Fasting glucose', unit: 'mg/dL' },
  { id: 'hba1c', label: 'HbA1c', unit: '%' },
  { id: 'bmi', label: 'BMI', unit: 'kg/m²' },
  { id: 'activity', label: 'Physical activity', unit: 'min/wk' },
  { id: 'sleep', label: 'Sleep duration', unit: 'h' },
  { id: 'triglycerides', label: 'Triglycerides', unit: 'mg/dL' },
  { id: 'ldl', label: 'LDL cholesterol', unit: 'mg/dL' },
  { id: 'systolic', label: 'Systolic BP', unit: 'mmHg' },
];

const REAL_NUMERIC = ['age', 'trestbps', 'chol', 'thalach', 'oldpeak', 'ca'];
const REAL_CATEGORICAL = ['sex', 'cp', 'fbs', 'restecg', 'exang', 'slope', 'thal'];

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const NOT_MEASURED = '— not measured in this dataset';

/**
 * Real vs Synthetic comparison. One synthetic snapshot (from the synthetic
 * T2D panel) beside one real de-identified UCI research case. The two
 * sources are always visually and verbally distinguished.
 */
export default function ResearchCompare() {
  const [synIdx, setSynIdx] = useState(MONTHLY.length - 1);
  const [realId, setRealId] = useState(1);

  const syn = MONTHLY[synIdx];
  const real = HEART_CASES.find((c) => c.id === Number(realId)) ?? HEART_CASES[0];

  const synCohort = useMemo(
    () => Object.fromEntries(SYN_FEATURES.map((f) => [f.id, MONTHLY.map((m) => m[f.id])])),
    []
  );
  const realCohort = useMemo(
    () => Object.fromEntries(REAL_NUMERIC.map((k) => [k, heartCohortValues(k)])),
    []
  );

  const cohortMeans = useMemo(() => {
    const mean = (vals) => {
      const v = vals.filter((x) => x !== null && x !== undefined);
      return v.reduce((s, x) => s + x, 0) / v.length;
    };
    return {
      synAge: patient.age,
      synBp: mean(MONTHLY.map((m) => m.systolic)),
      realAge: mean(HEART_CASES.map((c) => c.age)),
      realBp: mean(HEART_CASES.map((c) => c.trestbps)),
    };
  }, []);

  const rows = [
    { group: 'Demographics', label: 'Age', syn: `${patient.age} years`, real: `${real.age} years` },
    { group: 'Demographics', label: 'Sex', syn: patient.sex, real: formatHeartValue(heartFeature('sex'), real.sex) },
    { group: 'Cardiovascular (real dataset)', label: 'Resting blood pressure', syn: `${syn.systolic} mmHg (systolic)`, real: formatHeartValue(heartFeature('trestbps'), real.trestbps) },
    { group: 'Cardiovascular (real dataset)', label: 'Maximum heart rate', syn: NOT_MEASURED, real: formatHeartValue(heartFeature('thalach'), real.thalach) },
    { group: 'Cardiovascular (real dataset)', label: 'Chest pain type', syn: NOT_MEASURED, real: formatHeartValue(heartFeature('cp'), real.cp) },
    { group: 'Cardiovascular (real dataset)', label: 'Exercise-induced angina', syn: NOT_MEASURED, real: formatHeartValue(heartFeature('exang'), real.exang) },
    { group: 'Cardiovascular (real dataset)', label: 'ST depression', syn: NOT_MEASURED, real: formatHeartValue(heartFeature('oldpeak'), real.oldpeak) },
    { group: 'Cardiovascular (real dataset)', label: 'ST slope', syn: NOT_MEASURED, real: formatHeartValue(heartFeature('slope'), real.slope) },
    { group: 'Cardiovascular (real dataset)', label: 'Major vessels (fluoroscopy)', syn: NOT_MEASURED, real: formatHeartValue(heartFeature('ca'), real.ca) },
    { group: 'Cardiovascular (real dataset)', label: 'Thalassemia indicator', syn: NOT_MEASURED, real: formatHeartValue(heartFeature('thal'), real.thal) },
    { group: 'Cardiovascular (real dataset)', label: 'Resting ECG', syn: NOT_MEASURED, real: formatHeartValue(heartFeature('restecg'), real.restecg) },
    { group: 'Cardiovascular (real dataset)', label: 'Dataset outcome', syn: NOT_MEASURED, real: real.outcome === 1 ? 'Heart disease present' : 'No heart disease' },
    ...SYN_FEATURES.map((f) => ({
      group: 'Metabolic panel (synthetic)',
      label: f.label,
      syn: `${syn[f.id]} ${f.unit}`,
      real: NOT_MEASURED,
    })),
  ];

  let lastGroup = null;

  return (
    <>
      <Panel
        title="Real vs Synthetic"
        subtitle="One synthetic panel snapshot beside one real de-identified research case"
        aside={
          <>
            <Badge tone="proto">Synthetic / Simulated</Badge>
            <Badge tone="info">Real-world de-identified research data</Badge>
          </>
        }
      >
        <div className="event-item tone-warn">
          <p>
            The two records below come from fundamentally different sources: a{' '}
            <strong>generated synthetic patient</strong> (Type-2-Diabetes research demo) and a{' '}
            <strong>historical de-identified research record</strong> (UCI Heart Disease
            dataset). The comparison illustrates how the prototype presents different data
            provenance side by side — it is not a clinical benchmark and not a diagnosis.
          </p>
        </div>

        <div className="toolbar">
          <div className="form-block">
            <span className="form-label">Synthetic case</span>
            <div className="inline-select">
              <select value={synIdx} onChange={(e) => setSynIdx(Number(e.target.value))} aria-label="Select synthetic snapshot">
                {MONTHLY.map((m) => (
                  <option key={m.i} value={m.i}>
                    Synthetic snapshot · {m.label} · {m.date}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-block">
            <span className="form-label">Real research case</span>
            <div className="inline-select">
              <select value={realId} onChange={(e) => setRealId(Number(e.target.value))} aria-label="Select real research case">
                {HEART_CASES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {heartCaseLabel(c.id)} · {c.age}y · {c.sex === 1 ? 'Male' : 'Female'} ·{' '}
                    {c.outcome === 1 ? 'disease' : 'no disease'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Panel>

      <div className="compare-grid">
        <Panel
          title="Synthetic case"
          subtitle={`Synthetic patient ${patient.id} · ${patient.age}y ${patient.sex} · snapshot ${syn.date}`}
          aside={<Badge tone="proto">Synthetic / Simulated</Badge>}
        >
          <ul className="plain-list">
            {SYN_FEATURES.map((f) => (
              <li key={f.id}>
                <span>{f.label}</span>
                <strong>
                  {syn[f.id]} {f.unit}
                </strong>
              </li>
            ))}
          </ul>
          <p className="fact-note">
            Generated data from the synthetic longitudinal panel. Demo risk estimates for this
            synthetic patient live on the <Link to="/risk">Risk Intelligence</Link> page.
          </p>
        </Panel>

        <Panel
          title={heartCaseLabel(real.id)}
          subtitle={`${HEART_DATASET.shortName} · anonymous research record`}
          aside={<Badge tone="info">Real-world de-identified</Badge>}
        >
          <ul className="plain-list">
            {REAL_NUMERIC.map((k) => {
              const def = heartFeature(k);
              return (
                <li key={k}>
                  <span>{def.label}</span>
                  <strong>{formatHeartValue(def, real[k])}</strong>
                </li>
              );
            })}
            {REAL_CATEGORICAL.map((k) => {
              const def = heartFeature(k);
              return (
                <li key={k}>
                  <span>{def.label}</span>
                  <strong>{formatHeartValue(def, real[k])}</strong>
                </li>
              );
            })}
            <li>
              <span>Dataset outcome</span>
              <strong>{real.outcome === 1 ? 'Heart disease present' : 'No heart disease'}</strong>
            </li>
          </ul>
          <p className="fact-note">
            Historical de-identified research data.{' '}
            <Link to={`/research-cases/${real.id}`}>Open full case detail →</Link>
          </p>
        </Panel>
      </div>

      <Panel
        title="Side-by-side features"
        subtitle="Values shown only where the respective dataset measures the feature"
        padded={false}
      >
        <div className="mini-table-wrap">
          <table className="data-table compare-table wide">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Synthetic / Simulated</th>
                <th>Real-world de-identified</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const header = r.group !== lastGroup ? r.group : null;
                lastGroup = r.group;
                return (
                  <Fragment key={`${r.group}-${r.label}`}>
                    {header && (
                      <tr className="group-row">
                        <td colSpan={3}>{header}</td>
                      </tr>
                    )}
                    <tr>
                      <td>{r.label}</td>
                      <td>{r.syn}</td>
                      <td>{r.real}</td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="compare-grid">
        <Panel
          title="Synthetic case — position in its own cohort"
          subtitle={`Percentile within the ${MONTHLY.length}-point synthetic panel`}
        >
          {SYN_FEATURES.filter((f) => f.id !== 'activity' || !syn.missingActivity).map((f) => {
            const pct = percentileRank(synCohort[f.id], syn[f.id]);
            return (
              <Meter
                key={f.id}
                label={`${f.label} — ${syn[f.id]} ${f.unit}`}
                value={pct ?? 0}
                tone="info"
                showValue={false}
                hint={pct === null ? 'Not available' : `${ordinal(pct.toFixed(0))} percentile of the synthetic panel`}
              />
            );
          })}
        </Panel>

        <Panel
          title="Real case — position in its own cohort"
          subtitle={`Percentile within the ${HEART_CASES.length}-case research cohort`}
        >
          {REAL_NUMERIC.map((k) => {
            const def = heartFeature(k);
            const pct = percentileRank(realCohort[k], real[k]);
            return (
              <Meter
                key={k}
                label={`${def.label} — ${formatHeartValue(def, real[k])}`}
                value={pct ?? 0}
                tone="info"
                showValue={false}
                hint={pct === null ? 'Not recorded' : `${ordinal(pct.toFixed(0))} percentile of the research cohort`}
              />
            );
          })}
          <p className="fact-note">
            Each case is normalized within its own cohort — the two cohorts differ in size,
            scope and era, so cross-cohort bar lengths are not directly comparable.
          </p>
        </Panel>
      </div>

      <Panel
        title="Cohort means — resting BP and age"
        subtitle="Illustrative only: the cohorts are different populations from different eras"
      >
        <GroupedBarChart
          categories={['Age (years)', 'Resting systolic BP (mmHg)']}
          series={[
            { id: 'syn', label: 'Synthetic panel (n=18 snapshots)', color: 'var(--ink-400)', values: [cohortMeans.synAge, cohortMeans.synBp] },
            { id: 'real', label: `Real research cohort (n=${HEART_CASES.length})`, color: 'var(--primary)', values: [+cohortMeans.realAge.toFixed(1), +cohortMeans.realBp.toFixed(1)] },
          ]}
          yLabel="Mean value"
          height={240}
        />
        <p className="fact-note">
          Synthetic mean BP is the average of 18 monthly systolic readings of the generated
          patient; the real value is the cohort mean of resting blood pressure on admission
          (historical data, 1980s). Shown for interface demonstration, not for clinical
          comparison.
        </p>
      </Panel>
    </>
  );
}

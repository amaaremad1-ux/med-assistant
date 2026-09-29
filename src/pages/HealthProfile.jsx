import { useState } from 'react';
import { Panel, Tabs, Badge, ProtoTag, Meter } from '../components/ui/index.js';
import LineChart from '../components/charts/LineChart.jsx';
import Icon from '../components/icons.jsx';
import { patient } from '../data/patientData.js';
import { MONTHLY, POPULATION } from '../data/syntheticData.js';
import {
  BIOMARKER_LABELS,
  BASELINE,
  populationComparison,
  anomalyReport,
  riskTrajectory,
  latestRisk,
  dataQualityReport,
  latestPoint,
} from '../lib/engine.js';

const SERIES_KEYS = ['glucose', 'hba1c', 'bmi', 'activity', 'sleep', 'triglycerides', 'ldl', 'systolic'];
const CHART_COLORS = {
  glucose: 'var(--primary)',
  hba1c: 'var(--bad)',
  bmi: 'var(--warn)',
  activity: 'var(--good)',
  sleep: 'var(--primary)',
  triglycerides: 'var(--warn)',
  ldl: 'var(--bad)',
  systolic: 'var(--primary)',
};

/**
 * Personalized Digital Health Profile (module #19) — one unified record:
 * measurements, baseline, trends, anomalies, risk, uncertainty, quality.
 */
export default function HealthProfile() {
  const [chartKey, setChartKey] = useState('glucose');

  const series = [
    {
      id: chartKey,
      label: `${BIOMARKER_LABELS[chartKey]} (observed)`,
      color: CHART_COLORS[chartKey],
      points: MONTHLY.filter((p) => !p.missingActivity || chartKey !== 'activity').map((p) => ({
        x: p.i,
        y: p[chartKey],
      })),
    },
    {
      id: `${chartKey}-baseline`,
      label: 'Personal baseline trend',
      color: 'var(--ink-400)',
      dashed: true,
      points: MONTHLY.map((p) => ({
        x: p.i,
        y: +(BASELINE[chartKey].intercept + BASELINE[chartKey].slope * p.i).toFixed(2),
      })),
    },
  ];

  return (
    <>
      <Panel
        title="Personalized digital health profile"
        subtitle={`Unified research record · ${patient.name} (${patient.id}) · synthetic subject`}
        aside={<ProtoTag compact />}
      >
        <div className="profile-summary">
          <div className="profile-facts">
            <div>
              <span className="fact-label">Subject</span>
              <span className="fact-value">{patient.name}</span>
            </div>
            <div>
              <span className="fact-label">Demographics</span>
              <span className="fact-value">
                {patient.age} y · {patient.sex} · {patient.ethnicity}
              </span>
            </div>
            <div>
              <span className="fact-label">Panel coverage</span>
              <span className="fact-value">18 months · 123 measurements · 8 biomarkers</span>
            </div>
            <div>
              <span className="fact-label">Data basis</span>
              <span className="fact-value">100% synthetic — no real patient data</span>
            </div>
          </div>
          <div className="profile-risk">
            <span className="fact-label">Current T2D estimate</span>
            <span className="profile-risk-value tone-text warn">{latestRisk.risk}%</span>
            <span className="fact-note">
              interval {latestRisk.lo}–{latestRisk.hi}% · {latestRisk.horizon} horizon
            </span>
          </div>
        </div>
      </Panel>

      <Tabs
        tabs={[
          { id: 'measurements', label: 'Measurements' },
          { id: 'baseline', label: 'Personal baseline' },
          { id: 'trends', label: 'Trends' },
          { id: 'anomalies', label: 'Anomalies' },
          { id: 'quality', label: 'Data quality' },
        ]}
      >
        {(tab) => (
          <>
            {tab.id === 'measurements' && (
              <Panel title="Latest measurements" subtitle={`Snapshot at ${latestPoint.date} (synthetic)`}>
                <div className="mini-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Biomarker</th>
                        <th>Latest</th>
                        <th>Personal baseline trend</th>
                        <th>Deviation vs baseline</th>
                      </tr>
                    </thead>
                    <tbody>
                      {populationComparison.map((row) => (
                        <tr key={row.id}>
                          <td>{row.label}</td>
                          <td className="num">{row.value}</td>
                          <td className="num">
                            {+(BASELINE[row.id].intercept + BASELINE[row.id].slope * 17).toFixed(1)}
                          </td>
                          <td>
                            <Badge
                              tone={
                                Math.abs(row.personalZ) > 2
                                  ? 'bad'
                                  : Math.abs(row.personalZ) > 1
                                    ? 'warn'
                                    : 'good'
                              }
                            >
                              z {row.personalZ > 0 ? '+' : ''}
                              {row.personalZ} σ
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="muted-small" style={{ marginTop: 10 }}>
                  Deviations are computed against the subject's own baseline trend —
                  not population references. See the Experiments &amp; research notes
                  for why personal baselines reduce false alarms.
                </p>
              </Panel>
            )}

            {tab.id === 'baseline' && (
              <Panel
                title="Personal baseline"
                subtitle={`Least-squares trend over ${BASELINE.glucose.window}`}
              >
                <div className="mini-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Biomarker</th>
                        <th>Mean (window)</th>
                        <th>Trend / month</th>
                        <th>Residual σ</th>
                        <th>Fit R²</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SERIES_KEYS.map((k) => (
                        <tr key={k}>
                          <td>{BIOMARKER_LABELS[k]}</td>
                          <td className="num">{BASELINE[k].mean}</td>
                          <td className="num">{BASELINE[k].slope}</td>
                          <td className="num">{BASELINE[k].residSd}</td>
                          <td className="num">{BASELINE[k].fit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="muted-small" style={{ marginTop: 10 }}>
                  The baseline is deliberately learned from the subject's early,
                  stable months so later deviations represent a change in the
                  subject, not a change in the population.
                </p>
              </Panel>
            )}

            {tab.id === 'trends' && (
              <Panel
                title="Longitudinal trends"
                subtitle="Observed values against the personal baseline trend"
                aside={
                  <label className="inline-select">
                    <Icon name="gauge" size={14} />
                    <select
                      value={chartKey}
                      onChange={(e) => setChartKey(e.target.value)}
                      aria-label="Biomarker"
                    >
                      {SERIES_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {BIOMARKER_LABELS[k]}
                        </option>
                      ))}
                    </select>
                  </label>
                }
              >
                <LineChart
                  series={series}
                  height={240}
                  yLabel={BIOMARKER_LABELS[chartKey]}
                  formatX={(i) => MONTHLY[Math.round(i)]?.label ?? ''}
                  formatY={(v) => +v.toFixed(1)}
                />
                {chartKey === 'activity' && (
                  <p className="muted-small" style={{ marginTop: 8 }}>
                    Activity has three gap months (Jul, Dec 2025 · Apr 2026) where the
                    sensor did not report — the data-quality engine tracks these.
                  </p>
                )}
              </Panel>
            )}

            {tab.id === 'anomalies' && (
              <>
                <Panel
                  title="Anomaly status"
                  subtitle="Pattern-level deviations from the personal baseline"
                  aside={
                    <Badge tone={anomalyReport.status}>
                      {anomalyReport.statusLabel}
                    </Badge>
                  }
                >
                  <ul className="event-list">
                    {anomalyReport.events.map((ev) => (
                      <li key={ev.w} className={`event-item tone-${ev.kind === 'multi' ? 'bad' : 'warn'}`}>
                        <div className="event-head">
                          <strong>Week of {ev.label}</strong>
                          <span className="event-kind">
                            {ev.kind === 'multi' ? 'Multi-biomarker pattern' : 'Single excursion'}
                          </span>
                        </div>
                        <p>{ev.note}</p>
                        <p className="muted-small">
                          {ev.biomarkers
                            .map((b) => `${b.label}: z = ${b.z > 0 ? '+' : ''}${b.z}`)
                            .join(' · ')}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <p className="muted-small" style={{ marginTop: 10 }}>
                    {anomalyReport.method}
                  </p>
                </Panel>
                <Panel title="Expected variation" subtitle="Movements inside the normal band — not flagged">
                  <ul className="event-list">
                    {anomalyReport.normalVariations.slice(0, 4).map((v) => (
                      <li key={v.w} className="event-item tone-good">
                        <div className="event-head">
                          <strong>Week of {v.label}</strong>
                          <span className="event-kind">Within ±1.5σ</span>
                        </div>
                        <p className="muted-small">
                          Max |z| = {v.maxAbs} across tracked biomarkers — classified as
                          expected biological variation.
                        </p>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </>
            )}

            {tab.id === 'quality' && (
              <Panel
                title="Data quality"
                subtitle="Composite engine output for the current record"
                aside={<Badge tone={dataQualityReport.level}>Score {dataQualityReport.score}/100</Badge>}
              >
                {dataQualityReport.breakdown.map((b) => (
                  <div key={b.label} className="meter-stack-item">
                    <Meter
                      label={`${b.label} — ${b.detail}`}
                      value={b.value}
                      tone={b.tone === 'proto' ? 'info' : b.tone}
                      suffix="%"
                    />
                  </div>
                ))}
                <p className="muted-small" style={{ marginTop: 12 }}>
                  {dataQualityReport.method}
                </p>
              </Panel>
            )}
          </>
        )}
      </Tabs>

      <Panel title="Population vs personal comparison" subtitle={`${POPULATION.n} synthetic reference records — not medically representative`}>
        <div className="mini-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Biomarker</th>
                <th>Latest</th>
                <th>vs personal baseline (σ)</th>
                <th>vs synthetic population (σ)</th>
              </tr>
            </thead>
            <tbody>
              {populationComparison.map((row) => (
                <tr key={row.id}>
                  <td>{row.label}</td>
                  <td className="num">{row.value}</td>
                  <td className="num">
                    {row.personalZ > 0 ? '+' : ''}
                    {row.personalZ}
                  </td>
                  <td className="num">
                    {row.popZ > 0 ? '+' : ''}
                    {row.popZ}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted-small" style={{ marginTop: 10 }}>
          {POPULATION.note} The synthetic cohort exists only so the comparison
          methodology can be demonstrated end-to-end.
        </p>
      </Panel>

      <Panel title="Risk & uncertainty summary" aside={<ProtoTag compact />}>
        <LineChart
          series={[
            {
              id: 'risk',
              label: 'T2D risk estimate',
              color: 'var(--primary)',
              points: riskTrajectory.map((p) => ({ x: p.i, y: p.risk, lo: p.lo, hi: p.hi })),
            },
          ]}
          height={200}
          yMin={0}
          yMax={100}
          yLabel="Risk estimate (%)"
          formatX={(i) => MONTHLY[Math.round(i)]?.label ?? ''}
          formatY={(v) => `${Math.round(v)}`}
        />
        <ul className="plain-list" style={{ marginTop: 12 }}>
          <li>
            <span>Model version</span>
            <strong>{latestRisk.modelVersion}</strong>
          </li>
          <li>
            <span>Measurements behind estimate</span>
            <strong>{latestRisk.n}</strong>
          </li>
          <li>
            <span>Data completeness</span>
            <strong>{Math.round(latestRisk.completeness * 100)}%</strong>
          </li>
          <li>
            <span>Interval</span>
            <strong>
              {latestRisk.lo}–{latestRisk.hi}%
            </strong>
          </li>
        </ul>
        <p className="muted-small" style={{ marginTop: 8 }}>
          {latestRisk.disclaimer}
        </p>
      </Panel>
    </>
  );
}

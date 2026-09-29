import { useState } from 'react';
import Icon from '../components/icons.jsx';
import { Panel, Badge, ProtoTag } from '../components/ui/index.js';
import LineChart from '../components/charts/LineChart.jsx';
import { MONTHLY, POPULATION } from '../data/syntheticData.js';
import {
  BIOMARKER_LABELS,
  BASELINE,
  temporalReport,
  populationComparison,
  predictedAt,
  riskTrajectory,
} from '../lib/engine.js';
import { useAppData } from '../context/AppDataContext.jsx';
import {
  distinctAnalytes,
  seriesFor,
  trendSummary,
} from '../lib/appDataSelectors.js';

const TREND_LABEL = {
  increasing: 'Increasing',
  decreasing: 'Decreasing',
  stable: 'Stable',
  insufficient: 'Insufficient data',
};

const KEYS = ['glucose', 'hba1c', 'bmi', 'activity', 'sleep', 'triglycerides', 'ldl', 'systolic'];
const COLORS = {
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
 * Longitudinal AI (modules #2, #3, #24, #25): multi-timepoint analysis,
 * personal baseline, temporal patterns, population vs personal framing.
 */
export default function LongitudinalAnalysis() {
  const [key, setKey] = useState('glucose');
  const { bloodTests } = useAppData();

  // Trends computed from ACTUAL recorded application data (manual entries +
  // imported uploads), using neutral direction language only.
  const recordedTrends = distinctAnalytes(bloodTests).map((name) => ({
    name,
    ...trendSummary(seriesFor(bloodTests, name)),
  }));

  const observed = MONTHLY.filter((p) => !(p.missingActivity && key === 'activity')).map(
    (p) => ({ x: p.i, y: p[key] }),
  );
  const baselineSeries = MONTHLY.map((p) => ({ x: p.i, y: +predictedAt(key, p.i).toFixed(2) }));
  const latest = MONTHLY[MONTHLY.length - 1];
  const predicted = predictedAt(key, 17);
  const zScore = ((latest[key] - predicted) / Math.max(BASELINE[key].residSd, 0.001)).toFixed(1);

  return (
    <>
      <Panel
        title="Recorded laboratory trends"
        subtitle="Current vs previous value per analyte, from data actually stored in this application"
        aside={<Badge tone="info">{recordedTrends.length} analyte{recordedTrends.length === 1 ? '' : 's'}</Badge>}
      >
        {recordedTrends.length === 0 ? (
          <p className="muted-small">
            Insufficient data — no laboratory entries recorded yet. Add values under
            Blood &amp; Laboratory Data to see trends here.
          </p>
        ) : (
          <div className="mini-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Analyte</th>
                  <th>Current</th>
                  <th>Previous</th>
                  <th>Change</th>
                  <th>Trend</th>
                  <th>Measurements</th>
                  <th>Completeness</th>
                </tr>
              </thead>
              <tbody>
                {recordedTrends.map((t) => (
                  <tr key={t.name}>
                    <td>{t.name}</td>
                    <td className="num">
                      {t.current ? `${t.current.value} ${t.current.unit ?? ''}` : '—'}
                    </td>
                    <td className="num">
                      {t.previous ? `${t.previous.value} ${t.previous.unit ?? ''}` : '—'}
                    </td>
                    <td className="num">
                      {t.change == null ? '—' : `${t.change > 0 ? '+' : ''}${t.change}`}
                    </td>
                    <td>
                      <Badge tone={t.direction === 'insufficient' ? 'neutral' : 'info'}>
                        {TREND_LABEL[t.direction]}
                      </Badge>
                    </td>
                    <td className="num">{t.count}</td>
                    <td className="num">{Math.round(t.completeness * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted-small" style={{ marginTop: 10 }}>
          Trend labels are neutral descriptors (increasing / decreasing / stable /
          insufficient data), not clinical interpretations.
        </p>
      </Panel>

      <Panel
        title="Multi-timepoint trajectory"
        subtitle={`18 monthly synthetic observations · ${BIOMARKER_LABELS[key]} vs personal baseline trend`}
        aside={
          <label className="inline-select">
            <Icon name="gauge" size={14} />
            <select value={key} onChange={(e) => setKey(e.target.value)} aria-label="Biomarker">
              {KEYS.map((k) => (
                <option key={k} value={k}>
                  {BIOMARKER_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
        }
      >
        <LineChart
          series={[
            { id: 'obs', label: 'Observed', color: COLORS[key], points: observed },
            {
              id: 'base',
              label: 'Personal baseline (fit on months 0–5)',
              color: 'var(--ink-400)',
              dashed: true,
              points: baselineSeries,
            },
          ]}
          height={250}
          yLabel={BIOMARKER_LABELS[key]}
          formatX={(i) => MONTHLY[Math.round(i)]?.label ?? ''}
          formatY={(v) => +v.toFixed(1)}
        />
        <ul className="plain-list" style={{ marginTop: 12 }}>
          <li>
            <span>Latest ({latest.label})</span>
            <strong>{latest[key]}</strong>
          </li>
          <li>
            <span>Baseline prediction at month 17</span>
            <strong>{predicted.toFixed(1)}</strong>
          </li>
          <li>
            <span>Deviation from own baseline</span>
            <strong className={`tone-text ${Math.abs(zScore) > 2 ? 'bad' : Math.abs(zScore) > 1 ? 'warn' : 'good'}`}>
              {zScore > 0 ? '+' : ''}
              {zScore} σ
            </strong>
          </li>
          <li>
            <span>Baseline trend</span>
            <strong>
              {BASELINE[key].slope > 0 ? '+' : ''}
              {BASELINE[key].slope} per month
            </strong>
          </li>
        </ul>
      </Panel>

      <div className="dashboard-row">
        <Panel
          title="Temporal pattern detection"
          subtitle="Trends, sudden changes, seasonality and repeating cycles (module #24)"
        >
          <PatternGroup title="Sustained trends" items={temporalReport.trends} />
          <PatternGroup title="Sudden changes" items={temporalReport.sudden} />
          <PatternGroup title="Seasonal patterns" items={temporalReport.seasonal} />
          <PatternGroup title="Repeated / cyclical patterns" items={temporalReport.repeated} />
        </Panel>

        <Panel
          title="Population vs personal"
          subtitle={`Reference: ${POPULATION.n}-record synthetic cohort — not medically representative`}
          aside={<Badge tone="warn">non-representative</Badge>}
        >
          <p className="muted-small" style={{ marginBottom: 10 }}>
            {POPULATION.note}
          </p>
          <div className="mini-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Biomarker</th>
                  <th>Latest</th>
                  <th>Personal σ</th>
                  <th>Synthetic-pop. σ</th>
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
            The system anchors on the <strong>personal</strong> column: a biomarker can
            sit comfortably inside the synthetic population while still deviating
            sharply from the subject's own baseline — that personal signal is what
            early-deviation detection acts on.
          </p>
        </Panel>
      </div>

      <Panel
        title="Risk trajectory across the panel"
        subtitle="What the demo model would have estimated at each historical time point"
        aside={<ProtoTag compact />}
      >
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
        <p className="muted-small" style={{ marginTop: 10 }}>
          Each point uses only the measurements available up to that month
          (no look-ahead), so early estimates carry wider intervals. This is a
          demonstration of longitudinal modeling, not a validated forecast.
        </p>
      </Panel>
    </>
  );
}

function PatternGroup({ title, items }) {
  return (
    <div className="pattern-group">
      <h3 className="pattern-title">{title}</h3>
      <ul className="event-list">
        {items.map((item, i) => (
          <li key={i} className={`event-item tone-${item.tone ?? 'info'}`}>
            <div className="event-head">
              <strong>{item.label}</strong>
              {item.direction && <span className="event-kind">{item.direction}</span>}
              {item.when && <span className="event-kind">{item.when}</span>}
            </div>
            <p className="muted-small">{item.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { useMemo } from 'react';
import Panel from '../components/ui/Panel.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import ProtoTag from '../components/ui/ProtoTag.jsx';
import Badge from '../components/ui/Badge.jsx';
import GroupedBarChart from '../components/charts/GroupedBarChart.jsx';
import Icon from '../components/icons.jsx';
import { HEART_CASES, HEART_DATASET } from '../data/heartDisease.js';
import {
  HEART_COHORT,
  AGE_BINS,
  CHOL_BINS,
  TRESTBPS_BINS,
  THALACH_BINS,
  histogram,
  correlationMatrix,
  outcomeByCategory,
  summaryStats,
} from '../lib/heartStats.js';

function HistogramChart({ title, bins, note }) {
  const categories = bins.map((b) => b.label);
  const series = [
    {
      name: title,
      color: 'var(--primary)',
      values: bins.map((b) => b.count),
    },
  ];
  return (
    <div className="mini-table-wrap">
      <GroupedBarChart categories={categories} series={series} height={180} />
      {note && <p className="fact-note">{note}</p>}
    </div>
  );
}

export default function ResearchAnalytics() {
  const outcome = useMemo(
    () => [
      { label: 'Heart disease present', value: HEART_COHORT.disease, tone: 'bad' },
      { label: 'No heart disease', value: HEART_COHORT.noDisease, tone: 'good' },
    ],
    []
  );

  const ageHist = useMemo(() => histogram(HEART_CASES, 'age', AGE_BINS), []);
  const cholHist = useMemo(() => histogram(HEART_CASES, 'chol', CHOL_BINS), []);
  const bpHist = useMemo(() => histogram(HEART_CASES, 'trestbps', TRESTBPS_BINS), []);
  const hrHist = useMemo(() => histogram(HEART_CASES, 'thalach', THALACH_BINS), []);

  const corr = useMemo(
    () =>
      correlationMatrix(HEART_CASES, [
        'age',
        'trestbps',
        'chol',
        'thalach',
        'oldpeak',
        'ca',
        'outcome',
      ]),
    []
  );

  const subgroups = useMemo(
    () => ({
      cp: outcomeByCategory(HEART_CASES, 'cp'),
      sex: outcomeByCategory(HEART_CASES, 'sex'),
      exang: outcomeByCategory(HEART_CASES, 'exang'),
    }),
    []
  );

  const stats = useMemo(
    () => ({
      age: summaryStats(HEART_CASES.map((c) => c.age)),
      chol: summaryStats(HEART_CASES.map((c) => c.chol)),
      bp: summaryStats(HEART_CASES.map((c) => c.trestbps)),
      hr: summaryStats(HEART_CASES.map((c) => c.thalach)),
    }),
    []
  );

  const corrMinMax = useMemo(() => {
    let min = 0;
    let max = 0;
    corr.rows.forEach((row) =>
      row.forEach((v) => {
        if (v == null) return;
        if (v < min) min = v;
        if (v > max) max = v;
      })
    );
    return { min, max };
  }, [corr]);

  const corrTone = (v) => {
    if (v == null) return 'neutral';
    if (v >= 0.3) return 'bad';
    if (v <= -0.3) return 'info';
    if (v >= 0.15 || v <= -0.15) return 'warn';
    return 'neutral';
  };

  return (
    <div className="page-stack">
      <Panel
        title="Real Dataset Analytics"
        subtitle="Computed directly from the 303 de-identified records in the UCI Heart Disease dataset (Cleveland subset). Every figure below is a descriptive statistic of this dataset — not a model output and not a medical conclusion."
        aside={
          <>
            <Badge tone="info">Real-world de-identified research data</Badge>
            <Badge tone="warn">Research prototype — not a medical diagnosis</Badge>
          </>
        }
      >
        <div className="event-item tone-info">
          <Icon name="info" size={16} />
          <div>
            These are summary statistics of one historical research cohort (collected
            1981–1984 in Cleveland). They describe this dataset only and must not be
            read as prevalence estimates or risk guidance for any other population.
          </div>
        </div>
        <p className="attribution">
          Source: {HEART_DATASET.source} · DOI {HEART_DATASET.doi} · License{' '}
          {HEART_DATASET.license}
        </p>
        <ProtoTag />
      </Panel>

      <div className="stat-grid">
        <StatCard
          label="Cases in dataset"
          value={HEART_COHORT.total}
          note="Cleveland subset of the UCI Heart Disease dataset"
        />
        <StatCard
          label="Heart disease present"
          value={HEART_COHORT.disease}
          tone="bad"
          note={`${Math.round((HEART_COHORT.disease / HEART_COHORT.total) * 100)}% of records`}
        />
        <StatCard
          label="No heart disease"
          value={HEART_COHORT.noDisease}
          tone="good"
          note={`${Math.round((HEART_COHORT.noDisease / HEART_COHORT.total) * 100)}% of records`}
        />
        <StatCard
          label="Records with missing values"
          value={HEART_COHORT.withMissing}
          tone="warn"
          note="Shown as “Not recorded” — never imputed"
        />
      </div>

      <Panel
        title="Feature distributions"
        subtitle="Distribution of the four main continuous measurements across all 303 records."
      >
        <div className="info-grid two-col">
          <div className="info-card">
            <div className="info-card-head">
              <h4>Age distribution</h4>
              <span className="info-card-meta">
                mean {stats.age.mean.toFixed(1)} yrs · range {stats.age.min}–{stats.age.max}
              </span>
            </div>
            <HistogramChart title="Cases" bins={ageHist} />
          </div>
          <div className="info-card">
            <div className="info-card-head">
              <h4>Cholesterol distribution</h4>
              <span className="info-card-meta">
                mean {stats.chol.mean.toFixed(1)} mg/dL · range {stats.chol.min}–{stats.chol.max}
              </span>
            </div>
            <HistogramChart
              title="Cases"
              bins={cholHist}
              note="Serum cholesterol in mg/dL as recorded in 1980s assays."
            />
          </div>
          <div className="info-card">
            <div className="info-card-head">
              <h4>Resting blood pressure distribution</h4>
              <span className="info-card-meta">
                mean {stats.bp.mean.toFixed(1)} mmHg · range {stats.bp.min}–{stats.bp.max}
              </span>
            </div>
            <HistogramChart title="Cases" bins={bpHist} note="Resting systolic blood pressure on admission." />
          </div>
          <div className="info-card">
            <div className="info-card-head">
              <h4>Maximum heart rate distribution</h4>
              <span className="info-card-meta">
                mean {stats.hr.mean.toFixed(1)} bpm · range {stats.hr.min}–{stats.hr.max}
              </span>
            </div>
            <HistogramChart
              title="Cases"
              bins={hrHist}
              note="Maximum heart rate achieved during the exercise test (thalach)."
            />
          </div>
        </div>
      </Panel>

      <Panel
        title="Outcome distribution"
        subtitle="The dataset’s recorded diagnosis variable (num), which indicates heart-disease presence as determined by the original investigators’ clinical assessment."
      >
        <div className="mini-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Recorded outcome</th>
                <th>Records</th>
                <th>Share of dataset</th>
              </tr>
            </thead>
            <tbody>
              {outcome.map((o) => (
                <tr key={o.label}>
                  <td>{o.label}</td>
                  <td>{o.value}</td>
                  <td>
                    <Badge tone={o.tone}>
                      {Math.round((o.value / HEART_COHORT.total) * 100)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fact-note">
          Counts of records by the dataset’s outcome variable. This is the recorded
          research outcome, not a prediction.
        </p>
      </Panel>

      <Panel
        title="Correlation overview"
        subtitle="Pairwise Pearson correlation between continuous features and the dataset outcome (computed on records where both values are present)."
      >
        <div className="event-item tone-info">
          <Icon name="info" size={16} />
          <div>
            Correlation describes linear association within this dataset only. A strong
            correlation here is not evidence of causation and not a risk model.
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table heatmap">
            <thead>
              <tr>
                <th></th>
                {corr.labels.map((l) => (
                  <th key={l}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {corr.rows.map((row, i) => (
                <tr key={corr.ids[i]}>
                  <th>{corr.labels[i]}</th>
                  {row.map((v, j) => (
                    <td key={`${corr.ids[i]}-${corr.ids[j]}`}>
                      {i === j ? (
                        <span className="chip">1.00</span>
                      ) : v == null ? (
                        <span className="chip">—</span>
                      ) : (
                        <span className={`chip tone-${corrTone(v)}`}>{v.toFixed(2)}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fact-note">
          Observed range in this matrix: {corrMinMax.min.toFixed(2)} to{' '}
          {corrMinMax.max.toFixed(2)}. Positive values (warmer tones) rise together with
          the outcome code; negative values (cooler tones) fall as it rises. Diagonal
          cells are self-correlations (1.00).
        </p>
      </Panel>

      <Panel
        title="Research Analysis"
        subtitle="Descriptive subgroup breakdowns of the recorded outcome — computed directly from the dataset, with no predictive model involved."
        aside={<Badge tone="proto">Descriptive only · no model</Badge>}
      >
        <div className="event-item tone-warn">
          <Icon name="info" size={16} />
          <div>
            No validated heart-disease model exists in this prototype, so no predictions
            or probabilities are shown here — on purpose. The tables below only count
            how the recorded outcome is distributed across subgroups of this dataset.
          </div>
        </div>

        <p className="subsection-label">Recorded outcome by chest-pain type</p>
        <div className="mini-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Chest pain type</th>
                <th>Records</th>
                <th>Heart disease present</th>
                <th>Share with disease</th>
              </tr>
            </thead>
            <tbody>
              {subgroups.cp.map((r) => (
                <tr key={r.value}>
                  <td>{r.label}</td>
                  <td>{r.n}</td>
                  <td>{r.disease}</td>
                  <td>
                    <Badge
                      tone={r.rate >= 0.6 ? 'bad' : r.rate >= 0.35 ? 'warn' : 'good'}
                    >
                      {Math.round(r.rate * 100)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="subsection-label">Recorded outcome by sex</p>
        <div className="mini-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sex</th>
                <th>Records</th>
                <th>Heart disease present</th>
                <th>Share with disease</th>
              </tr>
            </thead>
            <tbody>
              {subgroups.sex.map((r) => (
                <tr key={r.value}>
                  <td>{r.label}</td>
                  <td>{r.n}</td>
                  <td>{r.disease}</td>
                  <td>
                    <Badge
                      tone={r.rate >= 0.6 ? 'bad' : r.rate >= 0.35 ? 'warn' : 'good'}
                    >
                      {Math.round(r.rate * 100)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="subsection-label">Recorded outcome by exercise-induced angina</p>
        <div className="mini-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Exercise-induced angina</th>
                <th>Records</th>
                <th>Heart disease present</th>
                <th>Share with disease</th>
              </tr>
            </thead>
            <tbody>
              {subgroups.exang.map((r) => (
                <tr key={r.value}>
                  <td>{r.label}</td>
                  <td>{r.n}</td>
                  <td>{r.disease}</td>
                  <td>
                    <Badge
                      tone={r.rate >= 0.6 ? 'bad' : r.rate >= 0.35 ? 'warn' : 'good'}
                    >
                      {Math.round(r.rate * 100)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="fact-note">
          Subgroup counts are properties of this specific 1980s Cleveland cohort. They
          are shown for data exploration only and carry no diagnostic meaning.
        </p>
      </Panel>
    </div>
  );
}

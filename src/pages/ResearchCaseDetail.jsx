import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Panel, Badge } from '../components/ui/index.js';
import {
  HEART_CASES,
  HEART_DATASET,
  HEART_FEATURE_DEFS,
  HEART_OUTCOME_LABELS,
  heartCaseLabel,
  formatHeartValue,
} from '../data/heartDisease.js';
import {
  HEART_COHORT,
  heartCohortValues,
  outcomeByCategory,
  percentileRank,
} from '../lib/heartStats.js';

const NUMERIC_CONTEXT = ['age', 'trestbps', 'chol', 'thalach', 'oldpeak'];
const CATEGORY_CONTEXT = ['cp', 'exang', 'thal', 'slope'];

/**
 * Detail view for one de-identified UCI research record. Shows clinical
 * features, the dataset outcome, feature explanations, and a descriptive
 * research analysis — never a diagnosis and never a model prediction.
 */
export default function ResearchCaseDetail() {
  const { id } = useParams();
  const caseData = HEART_CASES.find((c) => c.id === Number(id));

  const context = useMemo(() => {
    if (!caseData) return null;
    const percentiles = NUMERIC_CONTEXT.map((key) => ({
      key,
      label: HEART_FEATURE_DEFS.find((d) => d.id === key).label,
      value: caseData[key],
      pct: percentileRank(heartCohortValues(key), caseData[key]),
    }));
    const categories = CATEGORY_CONTEXT.map((key) => {
      const def = HEART_FEATURE_DEFS.find((d) => d.id === key);
      const groups = outcomeByCategory(HEART_CASES, key);
      const mine = groups.find((g) => g.value === caseData[key]);
      return { key, label: def.label, mine };
    }).filter((c) => c.mine);
    return { percentiles, categories };
  }, [caseData]);

  if (!caseData) return <Navigate to="/research-cases" replace />;

  const outcome = HEART_OUTCOME_LABELS[caseData.outcome];

  return (
    <>
      <Panel
        title={heartCaseLabel(caseData.id)}
        subtitle={`${HEART_DATASET.shortName} · anonymous research record · no identifying information exists or is displayed`}
        aside={
          <>
            <Badge tone="info">Real-world de-identified research data</Badge>
            <Badge tone="warn">Research prototype — not a medical diagnosis</Badge>
          </>
        }
      >
        <div className={`event-item tone-${caseData.outcome === 1 ? 'bad' : 'good'}`}>
          <p>
            <strong>Dataset outcome: {outcome.short}.</strong> {outcome.detail} This is the
            historical angiographic result recorded in the research dataset — it is shown for
            research inspection only and is not a diagnosis of anyone.
          </p>
        </div>

        <h3 className="subsection-label">Clinical features (as recorded in the dataset)</h3>
        <div className="info-grid">
          {HEART_FEATURE_DEFS.filter((d) => d.id !== 'num').map((def) => (
            <div className="info-card" key={def.id}>
              <div className="info-card-head">
                <strong>{def.label}</strong>
              </div>
              <p>
                <Badge tone="neutral">{formatHeartValue(def, caseData[def.id])}</Badge>
              </p>
              <div className="info-card-meta">{def.description}</div>
            </div>
          ))}
          <div className="info-card">
            <div className="info-card-head">
              <strong>{heartCaseLabel(caseData.id)}</strong>
            </div>
            <p>
              <Badge tone="neutral">Anonymous research label</Badge>
            </p>
            <div className="info-card-meta">
              Records in this dataset carry no names, IDs, addresses or dates of birth. Cases
              are numbered by row position in the published file.
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        title="Research Analysis"
        subtitle="Descriptive statistics computed from the 303 dataset records — not a model prediction"
        aside={<Badge tone="proto">Descriptive only</Badge>}
      >
        <div className="event-item tone-warn">
          <p>
            <strong>No model output is shown for this case, on purpose.</strong> This project
            contains no validated heart-disease model — the demo scorer elsewhere in the app is
            Type-2-Diabetes-specific and cannot process these features. The figures below are
            descriptive statistics computed directly from the dataset's recorded outcomes. They
            are not predictions, not probabilities, and not a diagnosis.
          </p>
        </div>

        <h3 className="subsection-label">
          Position within the {HEART_COHORT.total}-case cohort (percentile)
        </h3>
        <div className="mini-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>This case</th>
                <th>Cohort percentile</th>
              </tr>
            </thead>
            <tbody>
              {context.percentiles.map((p) => (
                <tr key={p.key}>
                  <td>{p.label}</td>
                  <td className="num">
                    {formatHeartValue(HEART_FEATURE_DEFS.find((d) => d.id === p.key), p.value)}
                  </td>
                  <td className="num">
                    {p.pct === null ? '—' : `${p.pct.toFixed(0)}th percentile`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="subsection-label">
          Dataset outcome rates for this case's categories (descriptive)
        </h3>
        <div className="mini-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>This case's group</th>
                <th>Cases in group</th>
                <th>With disease</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {context.categories.map((c) => (
                <tr key={c.key}>
                  <td>{c.label}</td>
                  <td>{c.mine.label}</td>
                  <td className="num">{c.mine.n}</td>
                  <td className="num">{c.mine.disease}</td>
                  <td className="num">{Math.round(c.mine.rate * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fact-note">
          Group rates describe the historical dataset only. They say nothing about any
          individual's current or future health.
        </p>
      </Panel>

      <Panel title="Source & license">
        <ul className="plain-list">
          <li>
            <span>Source</span>
            <strong>{HEART_DATASET.source}</strong>
          </li>
          <li>
            <span>DOI</span>
            <strong>{HEART_DATASET.doi}</strong>
          </li>
          <li>
            <span>License</span>
            <strong>{HEART_DATASET.license}</strong>
          </li>
          <li>
            <span>De-identification</span>
            <strong>{HEART_DATASET.deidentification}</strong>
          </li>
        </ul>
        <p className="attribution">
          See <Link to="/research-methodology">Data &amp; Methodology</Link> for how this
          dataset is handled, or <Link to="/research-cases">return to the case library</Link>.
        </p>
      </Panel>
    </>
  );
}

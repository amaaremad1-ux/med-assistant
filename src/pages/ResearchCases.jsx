import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel, Badge } from '../components/ui/index.js';
import Icon from '../components/icons.jsx';
import {
  HEART_CASES,
  HEART_DATASET,
  heartCaseLabel,
  formatHeartValue,
  heartFeature,
} from '../data/heartDisease.js';
import { filterHeartCases, HEART_AGE_BANDS, HEART_COHORT } from '../lib/heartStats.js';

const PAGE_SIZE = 25;

const F = {
  sex: heartFeature('sex'),
  cp: heartFeature('cp'),
  trestbps: heartFeature('trestbps'),
  chol: heartFeature('chol'),
  thalach: heartFeature('thalach'),
  exang: heartFeature('exang'),
  ca: heartFeature('ca'),
};

/**
 * Real Research Case Library — the UCI Heart Disease dataset (Cleveland
 * processed subset). Every record is real-world de-identified research
 * data shown without any identifying information.
 */
export default function ResearchCases() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [outcome, setOutcome] = useState('all');
  const [sex, setSex] = useState('all');
  const [ageBand, setAgeBand] = useState('all');
  const [page, setPage] = useState(0);

  const filtered = useMemo(
    () => filterHeartCases(HEART_CASES, { query, outcome, sex, ageBand }),
    [query, outcome, sex, ageBand]
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const setFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(0);
  };

  return (
    <>
      <Panel
        title="Real Research Case Library"
        subtitle={`${HEART_DATASET.shortName} · ${HEART_COHORT.total} de-identified historical research records`}
        aside={
          <>
            <Badge tone="info">Real-world de-identified research data</Badge>
            <Badge tone="warn">Research prototype — not a medical diagnosis</Badge>
          </>
        }
      >
        <div className="event-item tone-info">
          <p>
            Unlike the rest of this prototype, the records below are <strong>real</strong> —
            historical clinical research data published by the UCI Machine Learning Repository.
            They are de-identified: the dataset donor removed patient names and Social Security
            numbers before publication, and this app displays only anonymous research case
            numbers. These are not current patients.
          </p>
        </div>
        <p className="attribution">
          Source: UCI Machine Learning Repository — Heart Disease Dataset · DOI{' '}
          {HEART_DATASET.doi} · License {HEART_DATASET.license}
        </p>
      </Panel>

      <Panel
        title="Browse cases"
        subtitle="Search by case number, or filter by outcome, sex and age band"
        padded={false}
      >
        <div className="panel-body">
          <div className="toolbar">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="search"
                placeholder="Search case number… (e.g. 042)"
                aria-label="Search cases"
                value={query}
                onChange={setFilter(setQuery)}
              />
            </div>
            <div className="form-block">
              <span className="form-label">Outcome</span>
              <div className="inline-select">
                <select value={outcome} onChange={setFilter(setOutcome)} aria-label="Filter by outcome">
                  <option value="all">All outcomes</option>
                  <option value="1">Heart disease present</option>
                  <option value="0">No heart disease</option>
                </select>
              </div>
            </div>
            <div className="form-block">
              <span className="form-label">Sex</span>
              <div className="inline-select">
                <select value={sex} onChange={setFilter(setSex)} aria-label="Filter by sex">
                  <option value="all">All</option>
                  <option value="1">Male</option>
                  <option value="0">Female</option>
                </select>
              </div>
            </div>
            <div className="form-block">
              <span className="form-label">Age band</span>
              <div className="inline-select">
                <select value={ageBand} onChange={setFilter(setAgeBand)} aria-label="Filter by age band">
                  {HEART_AGE_BANDS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <p className="fact-note">
            Showing {filtered.length} of {HEART_COHORT.total} cases
            {HEART_COHORT.withMissing > 0 &&
              ` · ${HEART_COHORT.withMissing} records have a missing value (shown as “Not recorded”)`}
          </p>
        </div>

        <div className="mini-table-wrap">
          <table className="data-table wide">
            <thead>
              <tr>
                <th>Case</th>
                <th>Age</th>
                <th>Sex</th>
                <th>Chest pain</th>
                <th>Resting BP</th>
                <th>Cholesterol</th>
                <th>Max HR</th>
                <th>Ex. angina</th>
                <th>Vessels</th>
                <th>Dataset outcome</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  className="clickable-row"
                  onClick={() => navigate(`/research-cases/${c.id}`)}
                >
                  <td>
                    <strong>{heartCaseLabel(c.id)}</strong>
                  </td>
                  <td className="num">{c.age}</td>
                  <td>{formatHeartValue(F.sex, c.sex)}</td>
                  <td>{formatHeartValue(F.cp, c.cp)}</td>
                  <td className="num">{formatHeartValue(F.trestbps, c.trestbps)}</td>
                  <td className="num">{formatHeartValue(F.chol, c.chol)}</td>
                  <td className="num">{formatHeartValue(F.thalach, c.thalach)}</td>
                  <td>{formatHeartValue(F.exang, c.exang)}</td>
                  <td className="num">{formatHeartValue(F.ca, c.ca)}</td>
                  <td>
                    <Badge tone={c.outcome === 1 ? 'bad' : 'good'}>
                      {c.outcome === 1 ? 'Disease present' : 'No disease'}
                    </Badge>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10}>No cases match the current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="panel-body">
          <div className="pager">
            <button
              type="button"
              className="action-button secondary"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              ← Previous
            </button>
            <span className="fact-note">
              Page {safePage + 1} of {pageCount}
            </span>
            <button
              type="button"
              className="action-button secondary"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      </Panel>
    </>
  );
}

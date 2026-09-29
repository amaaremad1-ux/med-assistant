import Panel from '../components/ui/Panel.jsx';
import ProtoTag from '../components/ui/ProtoTag.jsx';
import Badge from '../components/ui/Badge.jsx';
import Icon from '../components/icons.jsx';
import { HEART_DATASET, HEART_CASES } from '../data/heartDisease.js';
import { Link } from 'react-router-dom';

export default function ResearchMethodology() {
  const investigators = HEART_DATASET.investigators.join(' · ');

  return (
    <div className="page-stack">
      <Panel
        title="Data & Methodology"
        subtitle="How the real research data in this prototype was obtained, what it is, and — just as importantly — what it is not."
        aside={
          <>
            <Badge tone="info">Real-world de-identified research data</Badge>
            <Badge tone="warn">Research prototype — not a medical diagnosis</Badge>
          </>
        }
      >
        <ProtoTag />
      </Panel>

      <Panel title="The dataset" subtitle="Facts about the data source.">
        <div className="info-grid two-col">
          <div className="info-card">
            <div className="info-card-head">
              <h4>Source</h4>
            </div>
            <ul className="plain-list">
              <li>
                <strong>Dataset:</strong> {HEART_DATASET.source}
              </li>
              <li>
                <strong>DOI:</strong> {HEART_DATASET.doi}
              </li>
              <li>
                <strong>License:</strong> {HEART_DATASET.license}
              </li>
              <li>
                <strong>Institution:</strong> {HEART_DATASET.institution}
              </li>
              <li>
                <strong>Donated:</strong> {HEART_DATASET.donated}
              </li>
              <li>
                <strong>Records used:</strong> {HEART_CASES.length} instances,{' '}
                {HEART_DATASET.features} clinical features each
              </li>
            </ul>
          </div>
          <div className="info-card">
            <div className="info-card-head">
              <h4>Credit</h4>
            </div>
            <p className="fact-note" style={{ marginTop: 0 }}>
              The heart-disease data was collected by the following investigators of the
              Cleveland Clinic Foundation: {investigators}. We thank them for making
              this de-identified research data publicly available.
            </p>
          </div>
        </div>
        <p className="attribution">
          Source: {HEART_DATASET.source} · DOI {HEART_DATASET.doi} · License{' '}
          {HEART_DATASET.license}
        </p>
      </Panel>

      <Panel title="What this data is" subtitle="Properties of the records shown in this prototype.">
        <ul className="plain-list">
          <li>
            <strong>Real research data.</strong> These are genuine clinical measurements
            from a published, publicly available research dataset — not synthetic
            numbers.
          </li>
          <li>
            <strong>De-identified.</strong> {HEART_DATASET.deidentification}
          </li>
          <li>
            <strong>Historical.</strong> The records were collected in the early 1980s
            and donated to the UCI repository in 1988. They describe patients from that
            era, not current patients of any clinic.
          </li>
          <li>
            <strong>Bundled locally.</strong> The dataset is stored as a static file
            inside this project (<code>src/data/heartDisease.js</code>). No requests are
            made to UCI or any external service at runtime.
          </li>
        </ul>
      </Panel>

      <Panel
        title="What this data is NOT"
        subtitle="Limits that apply to every page in the Real Research Cases section."
      >
        <div className="event-item tone-warn">
          <Icon name="info" size={16} />
          <div>
            These records must never be treated as current patients, and nothing derived
            from them in this prototype is a medical assessment.
          </div>
        </div>
        <ul className="plain-list">
          <li>
            <strong>Not a live hospital database.</strong> There is no connection to any
            medical record system, and no real-time or real-patient data flows into this
            prototype.
          </li>
          <li>
            <strong>Not a diagnostic tool.</strong> No page in this section produces a
            diagnosis. Where a case’s outcome is shown, it is the outcome recorded in
            the dataset by the original investigators — restated, never re-derived.
          </li>
          <li>
            <strong>Not a representative population.</strong> This is a single-site
            cohort from the 1980s. Its distributions (for example the outcome split or
            average cholesterol) describe this dataset only and cannot be generalized to
            any present-day population.
          </li>
          <li>
            <strong>Not a validated model.</strong> The prototype does not train or run
            a heart-disease classifier. All analytics are descriptive statistics of the
            dataset itself.
          </li>
        </ul>
      </Panel>

      <Panel
        title="How the data is handled in this prototype"
        subtitle="Transformations applied between the public dataset and what you see on screen."
      >
        <ul className="plain-list">
          <li>
            <strong>Anonymous labels only.</strong> Records are displayed as
            “Research Case #001”…“Research Case #303”. No names, record numbers, dates
            of birth, or any other identifying fields exist in the public dataset or in
            this application.
          </li>
          <li>
            <strong>No imputation.</strong> {HEART_DATASET.missingData}{' '}
            Values missing in the original file (encoded as “?”) are preserved as
            “Not recorded” and are excluded from statistics that require a value.
          </li>
          <li>
            <strong>No external calls.</strong> Everything is computed in the browser
            from the bundled static copy.
          </li>
          <li>
            <strong>Kept separate from synthetic data.</strong> The Real Research Cases
            section and the synthetic demo patient are always labeled differently
            (“Real-world de-identified research data” vs “Synthetic / Simulated”) and
            are never mixed in a single view without that distinction being shown.
          </li>
        </ul>
      </Panel>

      <Panel title="About this prototype" subtitle="Purpose and scope of the whole application.">
        <p className="fact-note" style={{ marginTop: 0 }}>
          This application is an educational research prototype that explores how an
          adaptive preventive-health dashboard could present biomarkers, trends, and
          risk estimates. Its synthetic sections use computer-generated demo data; its
          real-data section uses the de-identified UCI Heart Disease dataset described
          above. Nothing in this application provides medical advice, diagnosis, or
          treatment recommendations, and none of its outputs have been clinically
          validated.
        </p>
        <div className="fact-actions">
          <Link to="/research-cases" className="action-button">
            Browse the case library
          </Link>
          <Link to="/research-compare" className="action-button secondary">
            Compare real vs synthetic
          </Link>
        </div>
      </Panel>
    </div>
  );
}

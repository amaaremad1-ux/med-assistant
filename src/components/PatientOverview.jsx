import SectionHeader from './SectionHeader.jsx';
import { patient } from '../data/patientData.js';

function Stat({ label, value, tone }) {
  return (
    <div className="po-stat">
      <dt>{label}</dt>
      <dd>
        {value}
        {tone && <span className={`tone-text ${tone}`}>{tone}</span>}
      </dd>
    </div>
  );
}

export default function PatientOverview() {
  return (
    <section className="panel card patient-overview">
      <SectionHeader
        title="Patient Overview"
        subtitle="Demographics and care context"
        aside={
          <span className="muted-small">Record last updated {patient.lastVisit}</span>
        }
      />

      <div className="po-body">
        <div className="po-identity">
          <span className="po-avatar">{patient.initials}</span>
          <div>
            <h3 className="po-name">{patient.name}</h3>
            <p className="po-meta">
              {patient.sex} · {patient.age} yrs · {patient.ethnicity} ·{' '}
              <span className="po-id">{patient.id}</span>
            </p>
            <ul className="po-flags">
              {patient.flags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="po-divider" />

        <dl className="po-stats">
          <Stat label="Height" value={patient.height} />
          <Stat label="Weight" value={patient.weight} />
          <Stat label="BMI" value={patient.bmi} tone={patient.bmiCategory} />
          <Stat label="Last visit" value={patient.lastVisit} />
          <Stat label="Next visit" value={patient.nextVisit} />
          <Stat label="Physician" value={patient.physician} />
        </dl>
      </div>
    </section>
  );
}

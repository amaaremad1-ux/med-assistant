import SectionHeader from './SectionHeader.jsx';
import { measurements, statusMeta } from '../data/patientData.js';

export default function MeasurementsTimeline() {
  return (
    <section className="panel card measurements">
      <SectionHeader
        title="Recent Measurements"
        subtitle="Chronological lab and vitals history"
        aside={<span className="muted-small">Last 4 months</span>}
      />

      <ol className="timeline">
        {measurements.map((entry) => {
          const meta = statusMeta[entry.status];
          return (
            <li className="timeline-item" key={`${entry.date}-${entry.type}`}>
              <span className={`timeline-dot tone-${meta.tone}`} />
              <div className="timeline-content">
                <div className="timeline-title-row">
                  <span className="timeline-type">{entry.type}</span>
                  <span className={`badge tone-${meta.tone}`}>{meta.label}</span>
                </div>
                <p className="timeline-value">{entry.value}</p>
                <p className="timeline-note">{entry.note}</p>
                <p className="timeline-date">{entry.date}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

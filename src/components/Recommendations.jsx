import Icon from './icons.jsx';
import SectionHeader from './SectionHeader.jsx';
import { recommendations } from '../data/patientData.js';

const priorityMeta = {
  high: { label: 'High priority', tone: 'bad' },
  medium: { label: 'Medium priority', tone: 'warn' },
  low: { label: 'Low priority', tone: 'good' },
};

export default function Recommendations() {
  return (
    <section className="panel card recommendations">
      <SectionHeader
        title="Prevention Recommendations"
        subtitle="Suggested actions to reduce estimated risk"
        aside={<span className="muted-small">General guidance · demo</span>}
      />

      <ul className="rec-list">
        {recommendations.map((rec) => {
          const priority = priorityMeta[rec.priority];
          return (
            <li className="rec-item" key={rec.id}>
              <span className={`rec-icon tone-${priority.tone}`}>
                <Icon name={rec.icon} size={18} />
              </span>
              <div className="rec-body">
                <div className="rec-title-row">
                  <h3>{rec.title}</h3>
                  <span className={`badge tone-${priority.tone}`}>
                    {priority.label}
                  </span>
                </div>
                <p>{rec.detail}</p>
                <span className="rec-category">{rec.category}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="rec-footnote">
        Educational suggestions only — final clinical decisions belong to the
        care team.
      </p>
    </section>
  );
}

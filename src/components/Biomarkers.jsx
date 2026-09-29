import Icon from './icons.jsx';
import SectionHeader from './SectionHeader.jsx';
import Sparkline from './Sparkline.jsx';
import { biomarkers, statusMeta } from '../data/patientData.js';

function BiomarkerCard({ biomarker }) {
  const meta = statusMeta[biomarker.status];
  return (
    <article className={`card biomarker tone-${meta.tone}`}>
      <div className="bio-head">
        <span className="bio-icon">
          <Icon name={biomarker.icon} size={18} />
        </span>
        <span className={`badge tone-${meta.tone}`}>{meta.label}</span>
      </div>
      <h3 className="bio-name">{biomarker.name}</h3>
      <p className="bio-value">
        {biomarker.value} <span className="bio-unit">{biomarker.unit}</span>
      </p>
      <p className="bio-reference">Ref: {biomarker.reference}</p>
      <Sparkline data={biomarker.trend} tone={meta.tone} />
      <p className="bio-trend-note">{biomarker.trendNote}</p>
    </article>
  );
}

export default function Biomarkers() {
  return (
    <section className="panel biomarkers">
      <SectionHeader
        title="Biomarkers"
        subtitle="Latest values with 12-month trend"
        aside={<span className="muted-small">Demo lab panel · Sep 12, 2026</span>}
      />
      <div className="biomarker-grid">
        {biomarkers.map((biomarker) => (
          <BiomarkerCard key={biomarker.id} biomarker={biomarker} />
        ))}
      </div>
    </section>
  );
}

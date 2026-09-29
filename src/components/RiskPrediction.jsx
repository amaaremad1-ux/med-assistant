import Icon from './icons.jsx';
import SectionHeader from './SectionHeader.jsx';
import RiskGauge from './RiskGauge.jsx';
import { riskAssessment } from '../data/patientData.js';

export default function RiskPrediction() {
  return (
    <section className="panel card risk-prediction">
      <SectionHeader
        title="Risk Prediction"
        subtitle={`Type 2 Diabetes · ${riskAssessment.horizon} horizon`}
        aside={<span className="badge proto">Estimate</span>}
      />

      <div className="risk-body">
        <RiskGauge
          score={riskAssessment.score}
          populationAverage={riskAssessment.populationAverage}
        />

        <div className="risk-details">
          <span className="risk-category tone-warn">
            {riskAssessment.category} risk
          </span>
          <p className="risk-category-note">{riskAssessment.categoryNote}</p>

          <ul className="risk-meta">
            <li>
              <span>Confidence</span>
              <strong>{riskAssessment.confidence}</strong>
            </li>
            <li>
              <span>Population</span>
              <strong>{riskAssessment.comparison}</strong>
            </li>
            <li>
              <span>Model</span>
              <strong>{riskAssessment.model}</strong>
            </li>
            <li>
              <span>Last computed</span>
              <strong>{riskAssessment.lastComputed}</strong>
            </li>
          </ul>
        </div>
      </div>

      <div className="disclaimer" role="note">
        <span className="disclaimer-icon">
          <Icon name="info" size={16} />
        </span>
        <p>{riskAssessment.disclaimer}</p>
      </div>
    </section>
  );
}

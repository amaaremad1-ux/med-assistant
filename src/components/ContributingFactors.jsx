import SectionHeader from './SectionHeader.jsx';
import { contributingFactors } from '../data/patientData.js';

export default function ContributingFactors() {
  const maxWeight = Math.max(...contributingFactors.map((f) => f.weight));

  return (
    <section className="panel card contributing-factors">
      <SectionHeader
        title="Contributing Factors"
        subtitle="Relative contribution to the estimated risk score"
        aside={<span className="muted-small">Illustrative weights · demo</span>}
      />

      <ul className="factor-list">
        {contributingFactors.map((factor) => (
          <li className="factor-row" key={factor.factor}>
            <div className="factor-info">
              <p className="factor-name">{factor.factor}</p>
              <p className="factor-detail">{factor.detail}</p>
            </div>
            <div
              className="factor-bar"
              role="img"
              aria-label={`${factor.factor}: ${factor.weight} percent relative contribution`}
            >
              <span
                className={`factor-bar-fill ${
                  factor.weight === maxWeight ? 'leading' : ''
                }`}
                style={{ width: `${(factor.weight / maxWeight) * 100}%` }}
              />
            </div>
            <span className="factor-weight">{factor.weight}%</span>
          </li>
        ))}
      </ul>

      <p className="factor-footnote">
        Weights are illustrative placeholders for the prototype UI — they do not
        come from a validated model.
      </p>
    </section>
  );
}

import Badge from './ui/Badge.jsx';
import Meter from './ui/Meter.jsx';
import Icon from './icons.jsx';

/**
 * One disease-risk card for the Unified Health & Risk dashboard.
 *
 * Everything on the card is read from the assessment result — the estimate,
 * its band, the expected onset window, how many of the model's inputs are
 * present, and how many inputs pushed the estimate up or down. A disease whose
 * model does not apply to this profile renders an explicit "not run" card
 * instead of a number.
 *
 * Every list is defaulted and every nested field is optional-chained: a result
 * that is missing a band, a horizon or a contributor array still renders a card
 * that says what is unknown instead of throwing and blanking the page.
 */
export default function DiseaseRiskCard({ result, onOpen }) {
  if (!result) return null;

  const icon = result.icon ?? 'shield';
  const label = result.label ?? result.id ?? 'Unnamed model';
  const category = result.category ?? 'category not stated';

  if (!result.applies) {
    return (
      <article className="risk-card not-applicable">
        <header className="risk-card-head">
          <span className="risk-card-icon">
            <Icon name={icon} size={18} />
          </span>
          <div className="risk-card-title">
            <h3>{label}</h3>
            <p className="risk-card-category">{category} · model not run</p>
          </div>
          <Badge tone="neutral">Not applicable</Badge>
        </header>
        <p className="muted-small">
          {result.notApplicable ?? 'This model does not apply to this profile.'}
        </p>
      </article>
    );
  }

  const band = result.band ?? { tone: 'neutral', label: 'unrated' };
  const horizon = result.horizon ?? {
    basis: 'horizon not declared',
    label: 'No horizon declared',
    note: 'This estimate has no time window attached to it.',
  };
  const coverage = result.coverage ?? { withData: 0, factors: 0 };
  const drivers = result.drivers ?? [];
  const protective = result.protective ?? [];
  const plan = result.plan ?? [];
  const gaps = result.gaps ?? [];
  const missingInputs = result.missingInputs ?? [];
  const redFlags = result.redFlags ?? [];

  const topDriver = drivers[0] ?? null;
  const topProtective = protective[0] ?? null;
  const planHigh = plan.filter((p) => p?.priority === 'high').length;
  const risk = typeof result.risk === 'number' && Number.isFinite(result.risk) ? result.risk : null;

  return (
    <article className={`risk-card tone-border-${band.tone ?? 'neutral'}`}>
      <header className="risk-card-head">
        <span className={`risk-card-icon tone-${band.tone ?? 'neutral'}`}>
          <Icon name={icon} size={18} />
        </span>
        <div className="risk-card-title">
          <h3>{label}</h3>
          <p className="risk-card-category">
            {category} · {horizon.basis ?? 'horizon not declared'}
          </p>
        </div>
        <Badge tone={band.tone ?? 'neutral'}>{band.label ?? 'unrated'}</Badge>
      </header>

      <div className="risk-card-value-row">
        <span className={`risk-card-value tone-text ${band.tone ?? 'neutral'}`}>
          {risk == null ? '—' : Math.round(risk)}
          <span className="risk-card-value-unit">{risk == null ? '' : '%'}</span>
        </span>
        <div className="risk-card-value-meta">
          <span className="risk-card-horizon">{horizon.label ?? 'No horizon declared'}</span>
          <span className="muted-small">{horizon.note ?? ''}</span>
        </div>
      </div>

      <Meter
        value={risk ?? 0}
        tone={band.tone ?? 'neutral'}
        label={`Estimate · ${coverage.withData ?? 0}/${coverage.factors ?? 0} inputs present`}
        showValue={false}
      />

      <ul className="risk-card-facts">
        <li>
          <span>Raising the estimate</span>
          <strong>{drivers.length}</strong>
        </li>
        <li>
          <span>Lowering the estimate</span>
          <strong>{protective.length}</strong>
        </li>
        <li>
          <span>Missing inputs</span>
          <strong>{missingInputs.length + gaps.length}</strong>
        </li>
        <li>
          <span>Prevention steps</span>
          <strong>
            {plan.length}
            {planHigh ? ` (${planHigh} priority)` : ''}
          </strong>
        </li>
      </ul>

      {topDriver && (
        <p className="risk-card-topdriver">
          <strong>Strongest input:</strong> {topDriver.label ?? 'unlabelled input'} ·{' '}
          {topDriver.valueText ?? '—'} ({topDriver.points > 0 ? '+' : ''}
          {topDriver.points ?? 0} pts · {topDriver.domain ?? 'domain not stated'})
        </p>
      )}
      {topProtective && (
        <p className="risk-card-topdriver tone-text good">
          <strong>Protective input:</strong> {topProtective.label ?? 'unlabelled input'} ·{' '}
          {topProtective.valueText ?? '—'} ({topProtective.points ?? 0} pts)
        </p>
      )}

      {redFlags.length > 0 && (
        <p className="risk-card-flag">
          <Icon name="info" size={14} /> {redFlags.length} self-reported symptom
          {redFlags.length === 1 ? '' : 's'} attached to this condition — see the detail view; symptoms may need
          clinical assessment.
        </p>
      )}

      <footer className="risk-card-foot">
        <span className="muted-small">{result.confidenceNote ?? 'No confidence note was recorded for this estimate.'}</span>
        <button type="button" className="action-button secondary" onClick={() => onOpen?.(result.id)}>
          Reasons &amp; prevention
        </button>
      </footer>
    </article>
  );
}

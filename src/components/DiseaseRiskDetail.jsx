import { useEffect } from 'react';
import Badge from './ui/Badge.jsx';
import Meter from './ui/Meter.jsx';
import Icon from './icons.jsx';
import HBarList from './charts/HBarList.jsx';

/**
 * Full explanation + prevention view for one disease estimate.
 *
 * The modal is deliberately built as an evidence ladder: base rate → the
 * inputs that raised it → the inputs that lowered it → what is missing →
 * what to do about it. Every row names its source, and the closing note
 * repeats that the whole thing is an unvalidated demo estimate.
 */
export default function DiseaseRiskDetail({ result, onClose, modelVersion }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!result || !result.applies) return null;

  // Normalized reads — a result missing a band, a horizon or one of the arrays
  // still renders, with the unknown part labelled instead of crashing the page.
  const band = result.band ?? { tone: 'neutral', label: 'unrated' };
  const horizon = result.horizon ?? {
    basis: 'horizon not declared',
    label: 'No horizon declared',
    note: 'This estimate has no time window attached to it.',
  };
  const coverage = result.coverage ?? { withData: 0, factors: 0 };
  const base = result.base ?? { points: 0, why: 'No baseline was recorded for this model.' };
  const redFlags = result.redFlags ?? [];
  const gaps = result.gaps ?? [];
  const missingInputs = result.missingInputs ?? [];
  const plan = result.plan ?? [];
  const risk = typeof result.risk === 'number' && Number.isFinite(result.risk) ? result.risk : null;

  const contributions = [...(result.contributors ?? [])]
    .filter((c) => (c?.points ?? 0) !== 0)
    .sort((a, b) => Math.abs(b?.points ?? 0) - Math.abs(a?.points ?? 0));

  return (
    <div className="camera-overlay" role="dialog" aria-modal="true" aria-label={`${result.label ?? 'Estimate'} detail`}>
      <div className="camera-modal risk-modal">
        <header className="camera-head">
          <div className="risk-modal-title">
            <h3>
              <Icon name={result.icon ?? 'shield'} size={16} /> {result.label ?? result.id ?? 'Unnamed model'}
            </h3>
            <p className="muted-small">
              {result.category ?? 'category not stated'} · model {modelVersion ?? 'version unavailable'} ·{' '}
              {horizon.basis ?? 'horizon not declared'}
            </p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close detail view">
            <Icon name="x" size={16} />
          </button>
        </header>

        <div className="risk-modal-body">
          <section className="risk-modal-hero">
            <div>
              <span className={`risk-modal-value tone-text ${band.tone ?? 'neutral'}`}>
                {risk == null ? '—' : `${Math.round(risk)}%`}
              </span>
              <Badge tone={band.tone ?? 'neutral'}>{band.label ?? 'unrated'}</Badge>
            </div>
            <div className="risk-modal-hero-meta">
              <strong>{horizon.label ?? 'No horizon declared'}</strong>
              <p className="muted-small">{horizon.note ?? ''}</p>
              <Meter
                value={risk ?? 0}
                tone={band.tone ?? 'neutral'}
                label={`Inputs present ${coverage.withData ?? 0}/${coverage.factors ?? 0}`}
                suffix="%"
              />
            </div>
          </section>

          {redFlags.length > 0 && (
            <section className="risk-modal-block risk-modal-flag">
              <h4>
                <Icon name="info" size={14} /> Reported symptoms linked to this condition
              </h4>
              {redFlags.map((f, i) => (
                <div key={f?.id ?? `flag-${i}`} className="risk-modal-flag-item">
                  <p>
                    <strong>{f?.label ?? 'Reported statement'}</strong> — {f?.valueText ?? '—'}
                  </p>
                  <p className="muted-small">{f?.why ?? ''}</p>
                  {f?.evidence && <p className="muted-small">Source: {f.evidence}</p>}
                </div>
              ))}
              <p className="muted-small">
                These are self-reported statements from the AI chat or your own notes. They are not findings, and this
                dashboard cannot rule anything out — if they are new or worsening, seek clinical advice.
              </p>
            </section>
          )}

          <section className="risk-modal-block">
            <h4>1 · Where the estimate starts</h4>
            <ul className="risk-modal-ladder">
              <li>
                <span className="risk-modal-pts">+{base.points ?? 0}</span>
                <div>
                  <strong>Age / sex baseline</strong>
                  <p className="muted-small">{base.why ?? 'No baseline explanation was recorded.'}</p>
                </div>
              </li>
            </ul>
            <p className="muted-small">
              The baseline is an illustrative demo constant, not a calibrated cohort risk equation. Every point value
              below is added to it in the order shown.
            </p>
          </section>

          <section className="risk-modal-block">
            <h4>2 · What moved the estimate ({contributions.length} inputs)</h4>
            {contributions.length === 0 ? (
              <p className="muted-small">
                No measured input is available for this condition yet, so the number shown is the baseline alone.
              </p>
            ) : (
              <HBarList
                items={contributions.map((c, i) => ({
                  label: `${c?.label ?? 'unlabelled input'} · ${c?.valueText ?? '—'}`,
                  value: c?.points ?? 0,
                  note: `${c?.domain ?? 'domain not stated'} — ${c?.sourceLabel ?? 'source not stated'}`,
                  tone: (c?.points ?? 0) > 0 ? 'bad' : 'good',
                  key: c?.id ?? `contrib-${i}`,
                }))}
                formatValue={(v) => `${v} pts`}
                caption="Right (red) = pushed the estimate up. Left (green) = pulled it down. Values are percentage points added to the baseline for each input."
              />
            )}

            <div className="risk-modal-reasons">
              {contributions.map((c, i) => (
                <details key={c?.id ?? `reason-${i}`} className="risk-modal-reason">
                  <summary>
                    <span className={`badge tone-${(c?.points ?? 0) > 0 ? 'bad' : 'good'}`}>
                      {(c?.points ?? 0) > 0 ? '+' : ''}
                      {c?.points ?? 0} pts
                    </span>
                    <strong>{c?.label ?? 'unlabelled input'}</strong>
                    <span className="muted-small">{c?.valueText ?? '—'}</span>
                    <span className="muted-small">{c?.domain ?? 'domain not stated'}</span>
                  </summary>
                  <p>{c?.why ?? 'No explanation was recorded for this input.'}</p>
                  {c?.detail && <p className="muted-small">{c.detail}</p>}
                  {c?.evidence && (
                    <p className="muted-small">
                      <em>Evidence source:</em> {c.evidence}
                    </p>
                  )}
                </details>
              ))}
            </div>
          </section>

          <section className="risk-modal-block">
            <h4>3 · What is missing from this estimate</h4>
            {gaps.length === 0 && missingInputs.length === 0 ? (
              <p className="muted-small">All inputs this model declares are present for this profile.</p>
            ) : (
              <>
                {gaps.length > 0 && (
                  <ul className="risk-modal-gaps">
                    {gaps.map((g, i) => (
                      <li key={typeof g === 'string' ? g : `gap-${i}`}>{g}</li>
                    ))}
                  </ul>
                )}
                {missingInputs.length > 0 && (
                  <div className="chip-row">
                    {missingInputs.map((m, i) => (
                      <span className="chip" key={m?.id ?? `missing-${i}`}>
                        missing: {m?.label ?? 'unlabelled input'} ({m?.sourceLabel ?? 'source not stated'})
                      </span>
                    ))}
                  </div>
                )}
                <p className="muted-small">
                  Missing inputs are never estimated. Adding them from the matching page (or the "Add health data" tab)
                  changes this estimate the next time the analysis runs.
                </p>
              </>
            )}
          </section>

          <section className="risk-modal-block">
            <h4>4 · Personalized prevention plan ({plan.length} steps)</h4>
            {plan.length === 0 ? (
              <p className="muted-small">
                No prevention step is linked to the inputs present for this profile. Steps appear once the data they
                depend on is recorded — nothing generic is padded in.
              </p>
            ) : (
              <ol className="risk-modal-plan">
                {plan.map((p, i) => {
                  const triggeredBy = p?.triggeredBy ?? [];
                  return (
                    <li key={p?.id ?? `plan-${i}`} className={`risk-modal-plan-item priority-${p?.priority ?? 'medium'}`}>
                      <div className="risk-modal-plan-head">
                        <strong>{p?.title ?? 'Untitled step'}</strong>
                        <span className="risk-modal-plan-badges">
                          <Badge tone={p?.priority === 'high' ? 'bad' : p?.priority === 'medium' ? 'warn' : 'info'}>
                            {p?.priority ?? 'medium'} priority
                          </Badge>
                          {p?.cadence && <Badge tone="neutral">{p.cadence}</Badge>}
                        </span>
                      </div>
                      <p>{p?.detail ?? ''}</p>
                      {triggeredBy.length > 0 ? (
                        <p className="muted-small">
                          <em>Because your data shows:</em>{' '}
                          {triggeredBy
                            .map((t) => `${t?.label ?? 'input'}${t?.valueText ? ` (${t.valueText})` : ''}`)
                            .join(', ')}
                        </p>
                      ) : (
                        <p className="muted-small">
                          <em>Standard step</em> for this condition, included regardless of the current inputs.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <p className="disclaimer" role="note">
            <span className="disclaimer-icon">
              <Icon name="info" size={14} />
            </span>
            <span>
              {result.disclaimer ??
                'Unvalidated demo estimate. Not a diagnosis and not a substitute for professional medical advice.'}
            </span>
          </p>
        </div>

        <footer className="camera-actions">
          <button type="button" className="action-button" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

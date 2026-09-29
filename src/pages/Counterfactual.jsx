import { useMemo, useState } from 'react';
import { Panel, Slider, Badge, ProtoTag } from '../components/ui/index.js';
import HBarList from '../components/charts/HBarList.jsx';
import { currentRisk, demoRisk, latestPoint } from '../lib/engine.js';

const CONTROLS = [
  { id: 'glucose', label: 'Fasting glucose', min: 70, max: 180, step: 1, unit: 'mg/dL', ref: 95 },
  { id: 'hba1c', label: 'HbA1c', min: 4.5, max: 8, step: 0.05, unit: '%', ref: 5.7 },
  { id: 'bmi', label: 'BMI', min: 18, max: 40, step: 0.1, unit: 'kg/m²', ref: 23.5 },
  { id: 'activity', label: 'Physical activity', min: 0, max: 420, step: 5, unit: 'min/wk', ref: 160 },
  { id: 'sleep', label: 'Sleep duration', min: 4, max: 10, step: 0.25, unit: 'h', ref: 7.5 },
  { id: 'triglycerides', label: 'Triglycerides', min: 50, max: 400, step: 5, unit: 'mg/dL', ref: 120 },
];

/**
 * Counterfactual Simulation (module #15) — modify synthetic factors and watch
 * the demo model respond. This is a what-the-model-would-say exercise on
 * synthetic inputs: it is NOT a prediction of real health outcomes.
 */
export default function Counterfactual() {
  const [values, setValues] = useState(() => ({
    glucose: latestPoint.glucose,
    hba1c: latestPoint.hba1c,
    bmi: latestPoint.bmi,
    activity: latestPoint.activity,
    sleep: latestPoint.sleep,
    triglycerides: latestPoint.triglycerides,
    familyHistory: true,
  }));

  const observed = currentRisk;
  const simulated = useMemo(() => demoRisk(values), [values]);
  const delta = Math.round(simulated.score - observed.score);
  const dirty = CONTROLS.some((c) => Math.abs(values[c.id] - latestPoint[c.id]) > 1e-9);

  const byId = Object.fromEntries(observed.contributions.map((c) => [c.id, c]));
  const deltas = simulated.contributions
    .map((c) => ({
      label: c.label,
      value: +(c.contribution - byId[c.id].contribution).toFixed(2),
      note: `${byId[c.id].value}${c.unit ? ' ' + c.unit : ''} → ${c.value}${c.unit ? ' ' + c.unit : ''}`,
    }))
    .filter((d) => Math.abs(d.value) > 0.005)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  return (
    <>
      <Panel
        title="Counterfactual simulation"
        subtitle="Adjust synthetic biomarkers and observe how the demo model responds"
        aside={<ProtoTag extra="Simulation" />}
      >
        <div className="cf-hero">
          <div className="cf-block">
            <span className="fact-label">Observed estimate (Sep 2026)</span>
            <span className="cf-number">{Math.round(observed.score)}%</span>
          </div>
          <span className={`cf-delta tone-text ${delta > 0 ? 'bad' : delta < 0 ? 'good' : 'neutral'}`}>
            {delta > 0 ? '+' : ''}
            {delta} pts
          </span>
          <div className="cf-block">
            <span className="fact-label">Simulated estimate</span>
            <span className="cf-number tone-text info">{Math.round(simulated.score)}%</span>
          </div>
          <button
            type="button"
            className="action-button secondary"
            onClick={() =>
              setValues({
                glucose: latestPoint.glucose,
                hba1c: latestPoint.hba1c,
                bmi: latestPoint.bmi,
                activity: latestPoint.activity,
                sleep: latestPoint.sleep,
                triglycerides: latestPoint.triglycerides,
                familyHistory: true,
              })
            }
            disabled={!dirty}
          >
            Reset to observed
          </button>
        </div>
        <p className="muted-small" style={{ marginTop: 10 }}>
          This is a simulation of the demo scorer's behavior on hypothetical inputs —
          it is not a guaranteed medical outcome, not advice, and not a forecast of
          what would happen if these values changed in reality.
        </p>
      </Panel>

      <div className="dashboard-row">
        <Panel title="Synthetic factor controls" subtitle="Baseline values are the subject's latest synthetic measurements">
          <div className="slider-stack">
            {CONTROLS.map((c) => (
              <div key={c.id} className="meter-stack-item">
                <Slider
                  label={c.label}
                  value={values[c.id]}
                  min={c.min}
                  max={c.max}
                  step={c.step}
                  unit={c.unit}
                  reference={c.ref}
                  onChange={(v) => setValues((prev) => ({ ...prev, [c.id]: v }))}
                />
              </div>
            ))}
            <label className="cf-toggle">
              <input
                type="checkbox"
                checked={values.familyHistory}
                onChange={(e) => setValues((prev) => ({ ...prev, familyHistory: e.target.checked }))}
              />
              Family history of T2D present
            </label>
          </div>
        </Panel>

        <Panel
          title="How the estimate responds"
          subtitle="Change in each factor's weighted contribution"
          aside={deltas.length ? <Badge tone={delta > 0 ? 'bad' : 'good'}>{delta > 0 ? 'Higher' : 'Lower'} than observed</Badge> : <Badge tone="neutral">no changes yet</Badge>}
        >
          {deltas.length ? (
            <HBarList
              items={deltas}
              formatValue={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`}
              caption="Green bars pull the simulated estimate below the observed one; red bars push it above."
            />
          ) : (
            <p className="muted-small">
              Move any slider to see how the demo scorer decomposes the difference —
              every term stays fully visible.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}

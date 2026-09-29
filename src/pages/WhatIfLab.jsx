import { useState } from 'react';
import Icon from '../components/icons.jsx';
import { Panel, Slider, Badge, ProtoTag } from '../components/ui/index.js';
import HBarList from '../components/charts/HBarList.jsx';
import { currentRisk, demoRisk, latestPoint } from '../lib/engine.js';
import { logEvent } from '../lib/audit.js';

const BASE = {
  glucose: latestPoint.glucose,
  hba1c: latestPoint.hba1c,
  bmi: latestPoint.bmi,
  activity: latestPoint.activity,
  sleep: latestPoint.sleep,
  triglycerides: latestPoint.triglycerides,
  familyHistory: true,
};

const PRESETS = [
  {
    id: 'activity',
    name: 'Activity ramp-up',
    description: 'Activity to 240 min/wk (+75) over six months — the single most elastic factor.',
    patch: { activity: 240 },
  },
  {
    id: 'weight',
    name: 'Weight normalization',
    description: 'BMI to 24.9 — the standard overweight threshold, diet-driven.',
    patch: { bmi: 24.9 },
  },
  {
    id: 'metabolic',
    name: 'Metabolic management',
    description: 'HbA1c to 5.6%, glucose to 96 mg/dL — aggressive but plausible targets.',
    patch: { hba1c: 5.6, glucose: 96 },
  },
  {
    id: 'combined',
    name: 'Combined program',
    description: 'Activity 240, sleep 7.5 h, BMI 26.5 — a realistic multi-factor plan.',
    patch: { activity: 240, sleep: 7.5, bmi: 26.5 },
  },
];

/**
 * What-If Lab (module #29) — a sandbox separate from the Counterfactual
 * page: preset research scenarios, editable assumptions, and a run log.
 * Everything is a synthetic simulation of the demo scorer.
 */
export default function WhatIfLab() {
  const [values, setValues] = useState({ ...BASE });
  const [scenarioName, setScenarioName] = useState('Custom scenario');
  const [runs, setRuns] = useState([]);

  const observed = currentRisk;
  const simulated = demoRisk(values);
  const delta = Math.round(simulated.score - observed.score);

  const applyPreset = (preset) => {
    setValues((prev) => ({ ...prev, ...preset.patch }));
    setScenarioName(preset.name);
  };

  const runScenario = () => {
    const entry = {
      id: `${Date.now()}`,
      name: scenarioName,
      score: Math.round(simulated.score),
      delta,
      when: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    setRuns((prev) => [entry, ...prev].slice(0, 6));
    logEvent(
      'MODEL_EXECUTED',
      `What-If Lab ran "${scenarioName}" — simulated estimate ${entry.score}% (${entry.delta >= 0 ? '+' : ''}${entry.delta} vs observed).`,
      { scenario: scenarioName, simulated: entry.score },
    );
  };

  const byId = Object.fromEntries(observed.contributions.map((c) => [c.id, c]));
  const deltas = simulated.contributions
    .map((c) => ({
      label: c.label,
      value: +(c.contribution - byId[c.id].contribution).toFixed(2),
    }))
    .filter((d) => Math.abs(d.value) > 0.005)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  return (
    <>
      <Panel
        title="What-If Lab"
        subtitle="Sandbox for exploring hypothetical scenarios — entirely synthetic, no persistence beyond this browser"
        aside={<ProtoTag extra="Sandbox" />}
      >
        <div className="preset-row">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`preset-card ${scenarioName === p.name ? 'active' : ''}`}
              onClick={() => applyPreset(p)}
            >
              <strong>{p.name}</strong>
              <span>{p.description}</span>
            </button>
          ))}
        </div>
      </Panel>

      <div className="dashboard-row">
        <Panel
          title="Scenario assumptions"
          subtitle="Start from presets or adjust individual factors"
          aside={<Badge tone="neutral">{scenarioName}</Badge>}
        >
          <div className="slider-stack">
            <div className="meter-stack-item">
              <Slider
                label="Fasting glucose"
                value={values.glucose}
                min={70}
                max={180}
                unit="mg/dL"
                reference={BASE.glucose}
                onChange={(v) => {
                  setValues((prev) => ({ ...prev, glucose: v }));
                  setScenarioName('Custom scenario');
                }}
              />
            </div>
            <div className="meter-stack-item">
              <Slider
                label="HbA1c"
                value={values.hba1c}
                min={4.5}
                max={8}
                step={0.05}
                unit="%"
                reference={BASE.hba1c}
                onChange={(v) => {
                  setValues((prev) => ({ ...prev, hba1c: v }));
                  setScenarioName('Custom scenario');
                }}
              />
            </div>
            <div className="meter-stack-item">
              <Slider
                label="BMI"
                value={values.bmi}
                min={18}
                max={40}
                step={0.1}
                unit="kg/m²"
                reference={BASE.bmi}
                onChange={(v) => {
                  setValues((prev) => ({ ...prev, bmi: v }));
                  setScenarioName('Custom scenario');
                }}
              />
            </div>
            <div className="meter-stack-item">
              <Slider
                label="Physical activity"
                value={values.activity}
                min={0}
                max={420}
                step={5}
                unit="min/wk"
                reference={BASE.activity}
                onChange={(v) => {
                  setValues((prev) => ({ ...prev, activity: v }));
                  setScenarioName('Custom scenario');
                }}
              />
            </div>
            <div className="meter-stack-item">
              <Slider
                label="Sleep duration"
                value={values.sleep}
                min={4}
                max={10}
                step={0.25}
                unit="h"
                reference={BASE.sleep}
                onChange={(v) => {
                  setValues((prev) => ({ ...prev, sleep: v }));
                  setScenarioName('Custom scenario');
                }}
              />
            </div>
            <div className="meter-stack-item">
              <Slider
                label="Triglycerides"
                value={values.triglycerides}
                min={50}
                max={400}
                step={5}
                unit="mg/dL"
                reference={BASE.triglycerides}
                onChange={(v) => {
                  setValues((prev) => ({ ...prev, triglycerides: v }));
                  setScenarioName('Custom scenario');
                }}
              />
            </div>
          </div>
        </Panel>

        <Panel
          title="Scenario output"
          subtitle="Demo scorer response to the current assumptions"
          aside={
            <button type="button" className="action-button" onClick={runScenario}>
              <Icon name="flask" size={14} /> Run scenario
            </button>
          }
        >
          <div className="cf-hero">
            <div className="cf-block">
              <span className="fact-label">Observed</span>
              <span className="cf-number">{Math.round(observed.score)}%</span>
            </div>
            <span className={`cf-delta tone-text ${delta > 0 ? 'bad' : delta < 0 ? 'good' : 'neutral'}`}>
              {delta > 0 ? '+' : ''}
              {delta} pts
            </span>
            <div className="cf-block">
              <span className="fact-label">Simulated</span>
              <span className="cf-number tone-text info">{Math.round(simulated.score)}%</span>
            </div>
          </div>

          {deltas.length ? (
            <HBarList
              items={deltas}
              formatValue={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`}
              caption="Weighted contribution deltas driven by the current assumptions."
            />
          ) : (
            <p className="muted-small" style={{ marginTop: 10 }}>
              Apply a preset or move a slider to explore. Every run is logged to the
              local audit trail as a MODEL_EXECUTED event.
            </p>
          )}

          <p className="muted-small" style={{ marginTop: 10 }}>
            Simulated results show how the demo model reacts to hypothetical inputs.
            They are not medical advice, not a guaranteed outcome, and not based on any
            validated intervention evidence.
          </p>
        </Panel>
      </div>

      <Panel title="Run log" subtitle="Scenarios executed in this session">
        {runs.length ? (
          <div className="mini-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Simulated estimate</th>
                  <th>Δ vs observed</th>
                  <th>Run at</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="num">{r.score}%</td>
                    <td className="num">
                      <span className={`tone-text ${r.delta > 0 ? 'bad' : r.delta < 0 ? 'good' : 'neutral'}`}>
                        {r.delta > 0 ? '+' : ''}
                        {r.delta} pts
                      </span>
                    </td>
                    <td>{r.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted-small">No scenarios run yet — press “Run scenario” to record one.</p>
        )}
      </Panel>
    </>
  );
}

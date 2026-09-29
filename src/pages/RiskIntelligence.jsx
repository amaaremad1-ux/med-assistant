import { useMemo, useState } from 'react';
import { Panel, Tabs, Badge, ProtoTag } from '../components/ui/index.js';
import LineChart from '../components/charts/LineChart.jsx';
import HBarList from '../components/charts/HBarList.jsx';
import { MONTHLY } from '../data/syntheticData.js';
import {
  riskTrajectory,
  latestRisk,
  currentContributions,
  FEATURE_DEFS,
  whyChanged,
  multiModelScores,
  latestPoint,
} from '../lib/engine.js';

/**
 * Risk Intelligence (modules #5, #10, #11, #12, #16, plus multi-model
 * agreement from #6): trajectory, explainable contributions, feature
 * weighting, two-timepoint change analysis, and uncertainty disclosure.
 */
export default function RiskIntelligence() {
  const [i1, setI1] = useState(9);
  const [i2, setI2] = useState(17);

  const change = useMemo(() => whyChanged(i1, i2), [i1, i2]);
  const models = useMemo(() => multiModelScores(latestPoint), []);

  const monthOptions = MONTHLY.map((m) => (
    <option key={m.i} value={m.i}>
      {m.label} · {m.date}
    </option>
  ));

  return (
    <>
      <Panel
        title="Current estimate & uncertainty"
        subtitle={`${latestRisk.horizon} T2D estimate · model ${latestRisk.modelVersion} · computed ${latestRisk.computedAt}`}
        aside={<ProtoTag />}
      >
        <div className="risk-intel-hero">
          <div className="risk-intel-value">
            <span className="risk-intel-number tone-text warn">{latestRisk.risk}%</span>
            <span className="fact-note">
              interval {latestRisk.lo}–{latestRisk.hi}% · ±{Math.round((latestRisk.hi - latestRisk.lo) / 2)} pts
            </span>
          </div>
          <ul className="plain-list uncertainty-list">
            <li>
              <span>Measurements behind estimate</span>
              <strong>{latestRisk.n}</strong>
            </li>
            <li>
              <span>Data completeness</span>
              <strong>{Math.round(latestRisk.completeness * 100)}%</strong>
            </li>
            <li>
              <span>Model version</span>
              <strong>{latestRisk.modelVersion}</strong>
            </li>
            <li>
              <span>Computed at</span>
              <strong>{latestRisk.computedAt}</strong>
            </li>
          </ul>
        </div>
        <p className="muted-small" style={{ marginTop: 10 }}>
          {latestRisk.disclaimer}
        </p>
      </Panel>

      <Tabs
        tabs={[
          { id: 'trajectory', label: 'Trajectory' },
          { id: 'explanation', label: 'Explanation' },
          { id: 'weights', label: 'Feature weighting' },
          { id: 'change', label: 'Why did it change?' },
          { id: 'models', label: 'Model agreement' },
        ]}
      >
        {(tab) => (
          <>
            {tab.id === 'trajectory' && (
              <Panel title="Risk trajectory" subtitle="Estimate at each historical time point with evolving uncertainty">
                <LineChart
                  series={[
                    {
                      id: 'risk',
                      label: 'T2D risk estimate',
                      color: 'var(--primary)',
                      points: riskTrajectory.map((p) => ({ x: p.i, y: p.risk, lo: p.lo, hi: p.hi })),
                    },
                  ]}
                  height={240}
                  yMin={0}
                  yMax={100}
                  yLabel="Risk estimate (%)"
                  formatX={(i) => MONTHLY[Math.round(i)]?.label ?? ''}
                  formatY={(v) => `${Math.round(v)}`}
                />
                <div className="mini-table-wrap" style={{ marginTop: 12 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Estimate</th>
                        <th>Interval</th>
                        <th>Measurements</th>
                        <th>Completeness</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskTrajectory.map((p) => (
                        <tr key={p.i}>
                          <td>{p.label}</td>
                          <td className="num">{p.risk}%</td>
                          <td className="num">
                            {p.lo}–{p.hi}%
                          </td>
                          <td className="num">{p.n}</td>
                          <td className="num">{Math.round(p.completeness * 100)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="muted-small" style={{ marginTop: 10 }}>
                  Each estimate is computed only from data available at that time — no
                  look-ahead. Intervals widen when measurements are sparse or fields
                  are missing. This is a simulated trajectory, not a validated forecast.
                </p>
              </Panel>
            )}

            {tab.id === 'explanation' && (
              <Panel
                title="Contributing factors"
                subtitle="Direction and magnitude of each feature's influence on the current estimate"
                aside={<ProtoTag compact />}
              >
                <HBarList
                  items={currentContributions.map((c) => ({
                    label: c.label,
                    value: c.contribution,
                    note: `${c.value}${c.unit ? ' ' + c.unit : ''} · weight ${c.weight}`,
                  }))}
                  formatValue={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`}
                  caption="Positive bars push the estimate up; negative bars pull it down. Units are weighted z-contributions to the demo scorer — not clinical effect sizes."
                />
                <div className="mini-table-wrap" style={{ marginTop: 14 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Factor</th>
                        <th>Value</th>
                        <th>Normalized (x)</th>
                        <th>Weight</th>
                        <th>Contribution</th>
                        <th>Direction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentContributions.map((c) => (
                        <tr key={c.id}>
                          <td>{c.label}</td>
                          <td className="num">
                            {c.value}
                            {c.unit && ` ${c.unit}`}
                          </td>
                          <td className="num">{c.x}</td>
                          <td className="num">{c.weight}</td>
                          <td className="num">
                            {c.contribution > 0 ? '+' : ''}
                            {c.contribution}
                          </td>
                          <td>
                            <Badge
                              tone={
                                c.dirLabel === 'Increases estimate'
                                  ? 'bad'
                                  : c.dirLabel === 'Decreases estimate'
                                    ? 'good'
                                    : 'neutral'
                              }
                            >
                              {c.dirLabel}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="muted-small" style={{ marginTop: 10 }}>
                  The demo scorer is a transparent weighted logistic function — every
                  term is visible here by design. A validated model would expose the
                  same interface (factor, direction, magnitude) through SHAP-style
                  attributions.
                </p>
              </Panel>
            )}

            {tab.id === 'weights' && (
              <Panel
                title="Personalized feature weighting"
                subtitle="Weights currently active for this subject's T2D module"
              >
                <HBarList
                  items={FEATURE_DEFS.map((f) => ({
                    label: f.label,
                    value: f.weight,
                    tone: 'info',
                    note: f.protective ? 'Protective orientation' : f.fixed ? 'Fixed binary feature' : 'Risk orientation',
                  }))}
                  formatValue={(v) => v.toFixed(2)}
                  caption="Protective features (activity, sleep) are oriented so that higher-than-reference values pull the estimate down."
                />
                <p className="muted-small" style={{ marginTop: 10 }}>
                  Weights are author-assigned demo constants — they were not learned
                  from any cohort. In the research design, weights would be
                  personalized per subject and re-fit as new evidence arrives; this
                  page demonstrates that interface.
                </p>
              </Panel>
            )}

            {tab.id === 'change' && (
              <Panel
                title="Why did my risk change?"
                subtitle="Compare any two time points and decompose the difference"
                aside={
                  <div className="compare-selects">
                    <label className="inline-select">
                      From
                      <select value={i1} onChange={(e) => setI1(Number(e.target.value))}>
                        {monthOptions}
                      </select>
                    </label>
                    <label className="inline-select">
                      To
                      <select value={i2} onChange={(e) => setI2(Number(e.target.value))}>
                        {monthOptions}
                      </select>
                    </label>
                  </div>
                }
              >
                <div className="compare-hero">
                  <div>
                    <span className="fact-label">{change.from.label}</span>
                    <span className="compare-value">{change.from.risk}%</span>
                  </div>
                  <span className={`compare-delta tone-text ${change.delta >= 0 ? 'bad' : 'good'}`}>
                    {change.delta >= 0 ? '+' : ''}
                    {change.delta} pts
                  </span>
                  <div>
                    <span className="fact-label">{change.to.label}</span>
                    <span className="compare-value">{change.to.risk}%</span>
                  </div>
                </div>
                <HBarList
                  items={change.factors
                    .filter((f) => Math.abs(f.delta) > 0.005)
                    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
                    .map((f) => ({
                      label: f.label,
                      value: f.delta,
                      note: `${f.valueFrom}${f.unit ? ' ' + f.unit : ''} → ${f.valueTo}${f.unit ? ' ' + f.unit : ''}`,
                    }))}
                  formatValue={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`}
                  caption="Change in weighted contribution between the two selected months. Green = pulled the estimate down, red = pushed it up."
                />
                <ul className="event-list" style={{ marginTop: 14 }}>
                  {change.notes.map((n, idx) => (
                    <li key={idx} className="event-item tone-info">
                      <p className="muted-small">{n}</p>
                    </li>
                  ))}
                </ul>
                <p className="muted-small" style={{ marginTop: 10 }}>
                  Values in this comparison are synthetic, and the decomposition reflects
                  the demo scorer's additive structure — it is an explanation of the
                  simulation, not of medical causation.
                </p>
              </Panel>
            )}

            {tab.id === 'models' && (
              <Panel
                title="Multi-model agreement"
                subtitle="What each demo model would currently estimate (module #6 preview — full registry on the Model Registry page)"
              >
                <HBarList
                  items={models.map((m) => ({
                    label: m.name,
                    value: m.score,
                    tone: 'info',
                    note: `${m.version} · interval ${m.lo}–${m.hi}%`,
                  }))}
                  formatValue={(v) => `${Math.round(v)}%`}
                />
                <p className="muted-small" style={{ marginTop: 10 }}>
                  Scores differ because each placeholder model applies a fixed transform
                  to the shared demo score — this visualizes model spread as a component
                  of uncertainty. None of these models has been validated, and the
                  spread shown is illustrative only.
                </p>
              </Panel>
            )}
          </>
        )}
      </Tabs>
    </>
  );
}

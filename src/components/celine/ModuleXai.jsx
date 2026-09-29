/** Module 1 — XAI Explainable Clinical Risk Engine. Attributable waterfall over
 * the composite estimate. Teaching rules, not fitted SHAP coefficients. */
import { useMemo, useState } from 'react';
import { Panel, StatCard, Badge, Slider, ProtoTag } from '../ui/index.js';
import { calculateXaiDecomposition } from '../../lib/celineClinicalEngine.js';
import { logEvent } from '../../lib/audit.js';

export default function ModuleXai({ profile, live }) {
  const [hba1c, setHba1c] = useState(7.6);
  const [sbp, setSbp] = useState(() => Math.round(live?.systolic ?? 142));
  const [meds, setMeds] = useState(7);
  const [egfr, setEgfr] = useState(58);
  const [followup, setFollowup] = useState(true);
  const [exercise, setExercise] = useState(false);
  const xai = useMemo(() => calculateXaiDecomposition({
    baseRisk: 12, hba1c, systolicBp: sbp, polypharmacyCount: meds,
    renalEgfr: egfr, hasSpecialistFollowup: followup, dailyExercise: exercise,
  }), [hba1c, sbp, meds, egfr, followup, exercise]);
  const drivers = xai.factors.filter((f) => f.direction === 'risk');
  const shields = xai.factors.filter((f) => f.direction === 'protective');
  const top = [...drivers].sort((a, b) => b.delta - a.delta)[0] || null;
  const tone = xai.finalRiskScore >= 60 ? 'bad' : xai.finalRiskScore >= 35 ? 'warn' : 'good';
  return (
    <div className="celine-module">
      <div className="page-header" style={{ marginBottom: 4 }}>
        <div>
          <h2 className="page-title">01 · Explainable Risk Engine</h2>
          <p className="page-subtitle">Black-box score → attributed breakdown for {profile?.name ?? 'the subject'}.</p>
        </div>
        <ProtoTag compact />
      </div>
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <StatCard label="Risk Estimate" value={`${xai.finalRiskScore}%`} unit="composite" tone={tone} note={`From ${xai.baseRisk}% baseline`} />
        <StatCard label="Drivers" value={drivers.length} unit="factors" tone={drivers.length ? 'bad' : 'good'} note="Pushing the score up" />
        <StatCard label="Protective" value={shields.length} unit="factors" tone={shields.length ? 'good' : 'neutral'} note="Pulling the score down" />
        <StatCard label="Top Share" value={top ? top.pctContribution : '—'} unit="of risk" tone="info" note={top ? top.name : 'Flat profile'} />
      </div>
      <div className="celine-grid-2" style={{ marginBottom: 16 }}>
        <Panel title="Attribution Inputs" subtitle="Move a driver — the waterfall re-attributes">
          <Slider label="HbA1c" value={hba1c} min={5} max={11} step={0.1} unit="%" onChange={setHba1c} />
          <Slider label="Systolic BP" value={sbp} min={95} max={210} step={1} unit="mmHg" onChange={setSbp} />
          <Slider label="Medications" value={meds} min={0} max={14} step={1} unit="drugs" onChange={setMeds} />
          <Slider label="eGFR" value={egfr} min={15} max={120} step={1} unit="mL/min" onChange={setEgfr} />
          <div className="chip-row" style={{ marginTop: 8 }}>
            <button type="button" className={`chip${followup ? ' chip-on' : ''}`} aria-pressed={followup} onClick={() => setFollowup((v) => !v)}>Specialist follow-up</button>
            <button type="button" className={`chip${exercise ? ' chip-on' : ''}`} aria-pressed={exercise} onClick={() => setExercise((v) => !v)}>Exercise plan</button>
          </div>
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn" onClick={() => logEvent('MODEL_EXECUTED', `XAI explainer: ${xai.finalRiskScore}% across ${xai.factors.length} factors.`, { score: xai.finalRiskScore })}>Log explainer run</button>
          </div>
        </Panel>
        <Panel title="Risk Waterfall" subtitle="Red adds risk · green protects" aside={<Badge tone={tone}>{xai.finalRiskScore}%</Badge>}>
          <div className="celine-waterfall" role="img" aria-label={`Waterfall to ${xai.finalRiskScore} percent`}>
            {xai.waterfallSteps.map((s, i) => {
              const prev = i === 0 ? 0 : xai.waterfallSteps[i - 1].running;
              const left = Math.max(0, Math.min(100, Math.min(prev, s.running)));
              const width = Math.max(1.5, Math.min(100 - left, Math.abs(s.running - prev)));
              return (
                <div className="celine-wf-row" key={`${s.name}-${i}`}>
                  <span className="celine-wf-name" title={s.name}>{i === 0 ? 'Baseline population risk' : s.name}</span>
                  <span className="celine-wf-track"><span className={`celine-wf-bar wf-${s.type}`} style={{ left: `${left}%`, width: `${width}%` }} /></span>
                  <span className={`celine-wf-delta${s.delta >= 0 ? ' up' : ' down'}`}>{s.delta >= 0 ? '+' : ''}{s.delta}</span>
                  <span className="celine-wf-run">{s.running}%</span>
                </div>
              );
            })}
          </div>
          <p className="celine-rec">{xai.clinicalRecommendation}</p>
        </Panel>
      </div>
      <Panel title="Factor Table" subtitle="Signed delta, category, share of risk-side move">
        <div className="mini-table-wrap">
          <table className="data-table wide">
            <thead><tr><th>Factor</th><th>Category</th><th className="num">Δ</th><th>Share</th></tr></thead>
            <tbody>
              {xai.factors.map((f) => (
                <tr key={f.name}>
                  <td title={f.why}>{f.name}<div className="celine-why">{f.why}</div></td>
                  <td><Badge tone={f.direction === 'risk' ? 'bad' : 'good'}>{f.category}</Badge></td>
                  <td className="num">{f.delta >= 0 ? '+' : ''}{f.delta}</td>
                  <td>{f.pctContribution}</td>
                </tr>
              ))}
              {!xai.factors.length && (<tr><td colSpan={4}>No active drivers at these inputs.</td></tr>)}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

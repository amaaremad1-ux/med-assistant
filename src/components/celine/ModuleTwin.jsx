/** Module 2 — Digital Twin & Physiometric Simulator. What-if sliders project a
 * 24–48h organ-failure trajectory via simulateDigitalTwin. Deterministic
 * teaching simulation over synthetic state — not a triage signal. */
import { useMemo, useState } from 'react';
import { Panel, StatCard, Badge, Slider, ProtoTag } from '../ui/index.js';
import LineChart from '../charts/LineChart.jsx';
import EcgStrip from '../EcgStrip.jsx';
import { simulateDigitalTwin } from '../../lib/celineClinicalEngine.js';
import { logEvent } from '../../lib/audit.js';

export default function ModuleTwin({ profile, live }) {
  const [sbp, setSbp] = useState(() => Math.round(live?.systolic ?? 140));
  const [dbp, setDbp] = useState(() => Math.round(live?.diastolic ?? 86));
  const [dosePct, setDosePct] = useState(100);
  const [creatinine, setCreatinine] = useState(1.1);
  const twin = useMemo(() => simulateDigitalTwin({
    systolicBp: sbp, diastolicBp: dbp, drugDosePct: dosePct,
    baselineHr: live?.hr ?? 72, baselineCreatinine: creatinine, baselineSpO2: live?.spo2 ?? 98,
  }), [sbp, dbp, dosePct, creatinine, live?.hr, live?.spo2]);
  const traj = useMemo(() => [
    { id: 'risk', label: 'Organ-failure risk %', color: 'var(--bad)', points: twin.trajectorySeries.map((p, i) => ({ x: i * 12, y: p.risk, label: p.hour })) },
    { id: 'cardiac', label: 'Cardiac strain', color: 'var(--warn)', points: twin.trajectorySeries.map((p, i) => ({ x: i * 12, y: p.cardiac, label: p.hour })) },
    { id: 'renal', label: 'Renal burden', color: 'var(--primary)', points: twin.trajectorySeries.map((p, i) => ({ x: i * 12, y: p.renal, label: p.hour })) },
  ], [twin]);
  const tone = twin.organFailureRisk24h >= 60 ? 'bad' : twin.organFailureRisk24h >= 30 ? 'warn' : 'good';
  return (
    <div className="celine-module">
      <div className="page-header" style={{ marginBottom: 4 }}>
        <div>
          <h2 className="page-title">02 · Digital Twin &amp; Physiometric Simulator</h2>
          <p className="page-subtitle">A what-if double of {profile?.name ?? 'the subject'} — test the intervention before it is applied.</p>
        </div>
        <ProtoTag compact />
      </div>
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <StatCard label="Projected HR" value={twin.projectedHr} unit="bpm" tone="info" note={`Cardiac strain ${twin.cardiacStrain}/100`} />
        <StatCard label="Organ-failure risk · 24h" value={`${twin.organFailureRisk24h}%`} unit="model" tone={tone} note={`48h: ${twin.organFailureRisk48h}%`} />
        <StatCard label="Renal perfusion" value={twin.renalPerfusionScore} unit="/100" tone={twin.renalPerfusionScore >= 70 ? 'good' : 'warn'} note={`Creatinine → ${twin.projectedCreatinine} mg/dL`} />
        <StatCard label="Recovery probability" value={`${twin.recoveryProbability}%`} unit="model" tone="good" note={`SpO₂ → ${twin.projectedSpO2}%`} />
      </div>
      <div className="celine-grid-2" style={{ marginBottom: 16 }}>
        <Panel title="Intervention Sliders" subtitle="Drag vitals or dose intensity — the twin re-projects instantly">
          <Slider label="Systolic BP (simulated)" value={sbp} min={80} max={220} step={1} unit="mmHg" onChange={setSbp} />
          <Slider label="Diastolic BP (simulated)" value={dbp} min={40} max={130} step={1} unit="mmHg" onChange={setDbp} />
          <Slider label="Dose intensity" value={dosePct} min={0} max={200} step={5} unit="% of standard" onChange={setDosePct} />
          <Slider label="Baseline creatinine" value={creatinine} min={0.5} max={3} step={0.1} unit="mg/dL" onChange={setCreatinine} />
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn" onClick={() => logEvent('MODEL_EXECUTED', `Digital twin for ${profile?.name ?? 'subject'}: SBP ${sbp}/${dbp}, dose ${dosePct}%, 24h risk ${twin.organFailureRisk24h}%.`, { twin24h: twin.organFailureRisk24h })}>Log simulation run</button>
          </div>
        </Panel>
        <Panel title="48h Predictive Trajectory" subtitle="Failure risk vs cardiac and renal burden" aside={<Badge tone={tone}>{twin.organFailureRisk24h}% @24h</Badge>}>
          <LineChart series={traj} height={230} yMin={0} yMax={100} yLabel="Risk / burden (0–100)" xLabel="Hours from now" formatX={(v) => `${v}h`} formatY={(v) => `${v}`} />
        </Panel>
      </div>
      <Panel title="Twin ECG Context" subtitle="Synthesised demo waveform — decorative, never a finding">
        <EcgStrip profile={profile} bpm={twin.projectedHr} seconds={6} height={64} tone={tone} />
      </Panel>
    </div>
  );
}

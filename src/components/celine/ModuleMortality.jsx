/** Module 10 — SOFA / qSOFA / APACHE II / mNEWS2 multi-score engine with a
 * 6-hour septic-shock trajectory. Scores derive from the live feed + two
 * ICU context toggles. Teaching model, not a triage signal. */
import { useMemo, useState } from 'react';
import { Panel, StatCard, Badge, Slider, ProtoTag } from '../ui/index.js';
import LineChart from '../charts/LineChart.jsx';
import { calculateMnews2AndQsofa, calculateCompositeMortality } from '../../lib/celineClinicalEngine.js';
import { logEvent } from '../../lib/audit.js';

export default function ModuleMortality({ profile, live }) {
  const [vent, setVent] = useState(false);
  const [presso, setPresso] = useState(false);
  const [apache, setApache] = useState(14);
  const ews = useMemo(() => calculateMnews2AndQsofa({
    rr: live?.respiratoryRate ?? 18, spo2: live?.spo2 ?? 98, onAir: true,
    sbp: Math.round(live?.systolic ?? 120), hr: live?.hr ?? 75,
    temp: live?.temperature ?? 37, consciousness: 'Alert', hasArrhythmia: false,
  }), [live]);
  const sofa = (live?.spo2 ?? 98) < 92 ? 3 : (live?.spo2 ?? 98) < 95 ? 2 : 1;
  const sofaAdj = sofa + (vent ? 2 : 0) + (presso ? 2 : 0);
  const out = useMemo(() => calculateCompositeMortality({ sofaScore: sofaAdj, qSofaScore: ews.qSofaScore, apacheScore: apache, mnews2Score: ews.newsScore }), [sofaAdj, ews, apache]);
  const traj = useMemo(() => [{ id: 'shock', label: 'Septic-shock probability %', color: 'var(--bad)', points: out.septicShock6hTrajectory.map((p, i) => ({ x: i, y: p.probability, label: p.hour })) }], [out]);
  return (
    <div className="celine-module">
      <div className="page-header" style={{ marginBottom: 4 }}>
        <div><h2 className="page-title">10 · Mortality Multi-Score Engine</h2>
        <p className="page-subtitle">SOFA + qSOFA + APACHE II + mNEWS2 for {profile?.name ?? 'the subject'}.</p></div>
        <ProtoTag compact />
      </div>
      {Number(String(out.compositeMortality).replace('%', '')) >= 50 && (
        <div className="celine-alert celine-alert-bad" role="alert"><strong>HIGH PREDICTED MORTALITY ({out.compositeMortality}):</strong> senior intensivist review + goals-of-care conversation now.</div>
      )}
      <div className="stat-grid" style={{ marginBottom: 16, marginTop: 16 }}>
        <StatCard label="Composite Mortality" value={out.compositeMortality} unit="model" tone={out.mortalityTone} note={`SOFA ${out.sofaMortality} · APACHE ${out.apacheMortality}`} />
        <StatCard label="SOFA" value={out.sofaScore} unit="points" tone={out.sofaScore >= 8 ? 'bad' : out.sofaScore >= 4 ? 'warn' : 'good'} note="live-derived" />
        <StatCard label="qSOFA / NEWS2" value={`${out.qSofaScore} / ${out.mnews2Score}`} unit="points" tone={ews.alertTone} note="from live feed" />
        <StatCard label="APACHE II" value={out.apacheScore} unit="points" tone={out.apacheScore >= 20 ? 'bad' : 'warn'} note="manual context" />
      </div>
      <div className="celine-grid-2" style={{ marginBottom: 16 }}>
        <Panel title="ICU Context" subtitle="Two toggles + APACHE — the rest streams live">
          <Slider label="APACHE II" value={apache} min={0} max={40} step={1} unit="pts" onChange={setApache} />
          <div className="chip-row" style={{ marginTop: 8 }}>
            <button type="button" className={`chip${vent ? ' chip-on' : ''}`} onClick={() => setVent((v) => !v)}>Ventilated</button>
            <button type="button" className={`chip${presso ? ' chip-on' : ''}`} onClick={() => setPresso((v) => !v)}>Vasopressors</button>
          </div>
          <div style={{ marginTop: 12 }}><button type="button" className="btn" onClick={() => logEvent('MODEL_EXECUTED', `Mortality bundle: SOFA ${out.sofaScore}, APACHE ${out.apacheScore}, composite ${out.compositeMortality}.`, {})}>Log score bundle</button></div>
        </Panel>
        <Panel title="6h Septic-Shock Trajectory" subtitle="Cumulative probability curve" aside={<Badge tone={out.mortalityTone}>{out.compositeMortality}</Badge>}>
          <LineChart series={traj} height={230} yMin={0} yMax={100} yLabel="Probability %" xLabel="Hours" formatX={(v) => ['0h', '+1h', '+2h', '+3h', '+4h', '+5h', '+6h'][v] ?? v} formatY={(v) => `${v}%`} />
        </Panel>
      </div>
    </div>
  );
}

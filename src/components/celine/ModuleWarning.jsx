/** Module 5 — Stroke & Sepsis Early Warning (mNEWS2 + qSOFA). Scores the live
 * telemetry feed each render; a flashing banner fires on critical thresholds
 * with the response protocol. Teaching thresholds — not a monitor. */
import { useMemo, useState } from 'react';
import { Panel, StatCard, Badge, Slider, ProtoTag } from '../ui/index.js';
import EcgStrip from '../EcgStrip.jsx';
import { calculateMnews2AndQsofa } from '../../lib/celineClinicalEngine.js';

export default function ModuleWarning({ profile, live }) {
  const [onAir, setOnAir] = useState(true);
  const [consciousness, setConsciousness] = useState('Alert');
  const [arrhythmia, setArrhythmia] = useState(false);
  const ews = useMemo(() => calculateMnews2AndQsofa({
    rr: live?.respiratoryRate ?? 18, spo2: live?.spo2 ?? 98, onAir,
    sbp: Math.round(live?.systolic ?? 120), hr: live?.hr ?? 75,
    temp: live?.temperature ?? 37, consciousness, hasArrhythmia: arrhythmia,
  }), [live, onAir, consciousness, arrhythmia]);
  const critical = ews.alertTone === 'bad';
  return (
    <div className="celine-module">
      <div className="page-header" style={{ marginBottom: 4 }}>
        <div>
          <h2 className="page-title">05 · Stroke &amp; Sepsis Early Warning</h2>
          <p className="page-subtitle">mNEWS2 + qSOFA over the live feed for {profile?.name ?? 'the subject'}.</p>
        </div>
        <ProtoTag compact />
      </div>
      {critical && (
        <div className="celine-alert celine-alert-bad" role="alert">
          <strong>CRITICAL — MET / Sepsis-Stroke Code:</strong> {ews.protocol}
          {ews.strokeAlert && (<span> Stroke path flagged ({ews.strokeRisk}).</span>)}
        </div>
      )}
      {!critical && (
        <div className={`celine-alert celine-alert-${ews.alertTone}`} role="status">
          <strong>NEWS2 {ews.newsScore} · qSOFA {ews.qSofaScore}:</strong> {ews.protocol}
        </div>
      )}
      <div className="stat-grid" style={{ marginBottom: 16, marginTop: 16 }}>
        <StatCard label="mNEWS2" value={ews.newsScore} unit="points" tone={ews.newsScore >= 7 ? 'bad' : ews.newsScore >= 5 ? 'warn' : 'good'} note="≥7 = emergency review" />
        <StatCard label="qSOFA" value={ews.qSofaScore} unit="/3" tone={ews.qSofaScore >= 2 ? 'bad' : ews.qSofaScore === 1 ? 'warn' : 'good'} note="≥2 = sepsis likely" />
        <StatCard label="Stroke Path" value={ews.strokeAlert ? 'FLAGGED' : 'Low'} unit="risk" tone={ews.strokeAlert ? 'bad' : 'good'} note={ews.strokeRisk} />
        <StatCard label="Feed" value={`${live?.hr ?? '—'}`} unit="bpm" tone="info" note={`SpO₂ ${live?.spo2 ?? '—'}% · RR ${live?.respiratoryRate ?? '—'}`} />
      </div>
      <div className="celine-grid-2">
        <Panel title="Score Inputs" subtitle="Vitals stream live — context toggles are manual">
          <Slider label="Respiratory rate (live)" value={Math.round(live?.respiratoryRate ?? 18)} min={6} max={36} step={1} unit="/min" onChange={() => {}} disabled />
          <Slider label="SpO₂ (live)" value={Math.round(live?.spo2 ?? 98)} min={80} max={100} step={1} unit="%" onChange={() => {}} disabled />
          <div className="chip-row" style={{ marginTop: 8 }}>
            <button type="button" className={`chip${onAir ? ' chip-on' : ''}`} aria-pressed={onAir} onClick={() => setOnAir((v) => !v)}>Breathing room air</button>
            <button type="button" className={`chip${arrhythmia ? ' chip-on' : ''}`} aria-pressed={arrhythmia} onClick={() => setArrhythmia((v) => !v)}>Arrhythmia on ECG</button>
            {['Alert', 'Voice', 'Pain', 'Unresponsive'].map((c) => (
              <button key={c} type="button" className={`chip${consciousness === c ? ' chip-on' : ''}`} aria-pressed={consciousness === c} onClick={() => setConsciousness(c)}>{c}</button>
            ))}
          </div>
          <ul className="note-list" style={{ marginTop: 12 }}>
            {ews.breakdown.length ? ews.breakdown.map((b) => (<li key={b}>{b}</li>)) : <li>All NEWS2 parameters in normal band.</li>}
            {ews.qSofaCriteria.map((c) => (<li key={c}>qSOFA: {c}</li>))}
          </ul>
        </Panel>
        <Panel title="Rhythm Context" subtitle="Demo ECG at the streamed rate" aside={<Badge tone={critical ? 'bad' : 'good'}>{critical ? 'ALERT' : 'STABLE'}</Badge>}>
          <EcgStrip profile={profile} seconds={6} height={72} tone={critical ? 'bad' : 'good'} />
          <p className="celine-note">Telemetry source: {live?.source ?? 'demo stream'} at {live?.at ? new Date(live.at).toLocaleTimeString() : '—'}.</p>
        </Panel>
      </div>
    </div>
  );
}

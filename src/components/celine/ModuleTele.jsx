/** Module 13 — Tele-Triage & Remote Monitoring. Daily home questionnaire →
 * weight-gain HF rule → clinic escalation, over the subject's live weight. */
import { useMemo, useState } from 'react';
import { Panel, Badge, StatCard, Slider, ProtoTag } from '../ui/index.js';
import { assessRemoteMonitoringSymptoms } from '../../lib/celineClinicalEngine.js';

export default function ModuleTele({ profile, meds = [] }) {
  const base = Math.round(profile?.weight ?? 70);
  const [wt, setWt] = useState(base);
  const [sob, setSob] = useState(false);
  const [swell, setSwell] = useState(false);
  const [chest, setChest] = useState(false);
  const [adh, setAdh] = useState(true);
  const [mood, setMood] = useState(3);
  const out = useMemo(() => assessRemoteMonitoringSymptoms({ baselineWeight: base, currentWeight: wt, shortnessOfBreath: sob, edema: swell, chestPain: chest, medicationAdherence: adh, moodScore: mood, medications: meds }), [base, wt, sob, swell, chest, adh, mood, meds]);
  const urgent = out.escalationLevel === 'RED' || out.weightAlert;
  return (
    <div className="celine-module">
      <div className="page-header" style={{ marginBottom: 4 }}>
        <div><h2 className="page-title">13 · Tele-Triage &amp; Remote Monitoring</h2>
        <p className="page-subtitle">Post-discharge home portal for {profile?.name ?? 'the subject'} — readmission guard.</p></div>
        <ProtoTag compact />
      </div>
      {urgent && (
        <div className="celine-alert celine-alert-bad" role="alert"><strong>ESCALATION — {out.escalationLevel}:</strong> {out.escalationMessage} HF weight rule: +{(wt - base).toFixed(1)} kg vs discharge baseline.</div>
      )}
      <div className="stat-grid" style={{ marginBottom: 16, marginTop: 16 }}>
        <StatCard label="Tele Risk" value={out.riskScore} unit="pts" tone={out.toneMap?.[out.riskLevel] || 'info'} note={out.riskLevel} />
        <StatCard label="Escalation" value={out.escalationLevel} unit="tier" tone={urgent ? 'bad' : 'good'} note="clinic notified if RED" />
        <StatCard label="Weight Δ" value={`${wt - base >= 0 ? '+' : ''}${(wt - base).toFixed(1)}`} unit="kg" tone={out.weightAlert ? 'bad' : 'good'} note={`baseline ${base} kg`} />
        <StatCard label="Adherence" value={adh ? 'YES' : 'NO'} unit="" tone={adh ? 'good' : 'warn'} note={`mood ${mood}/5`} />
      </div>
      <div className="celine-grid-2">
        <Panel title="Daily Home Check-in" subtitle="Short questionnaire the subject answers from home">
          <Slider label="Weight today" value={wt} min={base - 10} max={base + 10} step={0.1} unit="kg" onChange={setWt} />
          <div className="chip-row" style={{ marginTop: 8 }}>
            <button type="button" className={`chip${sob ? ' chip-on' : ''}`} onClick={() => setSob((v) => !v)}>Breathless</button>
            <button type="button" className={`chip${swell ? ' chip-on' : ''}`} onClick={() => setSwell((v) => !v)}>Ankle swelling</button>
            <button type="button" className={`chip${chest ? ' chip-on' : ''}`} onClick={() => setChest((v) => !v)}>Chest pain</button>
            <button type="button" className={`chip${adh ? ' chip-on' : ''}`} onClick={() => setAdh((v) => !v)}>Took meds</button>
            {[1, 2, 3, 4, 5].map((m) => (<button key={m} type="button" className={`chip${mood === m ? ' chip-on' : ''}`} onClick={() => setMood(m)}>Mood {m}</button>))}
          </div>
        </Panel>
        <Panel title="Clinic Recommendation" subtitle="Rule output the outpatient desk sees" aside={<Badge tone={out.toneMap?.[out.riskLevel] || 'info'}>{out.riskLevel}</Badge>}>
          <p className="celine-rec"><strong>{out.escalationLevel}:</strong> {out.escalationMessage}</p>
          <ul className="note-list" style={{ marginTop: 8 }}>
            {out.flags.map((f) => (<li key={f}>{f}</li>))}
            {!out.flags.length && <li>No flags — continue routine remote follow-up.</li>}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

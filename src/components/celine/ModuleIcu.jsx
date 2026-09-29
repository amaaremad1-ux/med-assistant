/** Module 3 — Smart ICU Fleet & Bed Allocation. FAB-weighted triage matrix plus
 * a 20-patient surge simulator. Teaching sort logic — not a triage signal. */
import { useEffect, useMemo, useState } from 'react';
import { Panel, Badge, Slider, Meter, ProtoTag } from '../ui/index.js';
import { calculateIcuTriageScore, generateIcuStressCohort } from '../../lib/celineClinicalEngine.js';
import { liveReadingFor } from '../../lib/liveVitals.js';

export default function ModuleIcu({ profile, live, fab }) {
  const [vasopressors, setVasopressors] = useState(false);
  const [vent, setVent] = useState(false);
  const [gcs, setGcs] = useState(15);
  const [cohort, setCohort] = useState(() => generateIcuStressCohort(20));
  const [stressOn, setStressOn] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!stressOn) return undefined;
    const id = window.setInterval(() => setTick((t) => t + 1), 2000);
    return () => window.clearInterval(id);
  }, [stressOn]);
  const reading = useMemo(() => liveReadingFor(profile, Date.now()), [profile, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const triage = useMemo(() => calculateIcuTriageScore({
    fabScore: fab?.score ?? 50, sbp: reading.systolic, hr: reading.hr, spo2: reading.spo2,
    gcs, vasopressors, mechanicalVentilation: vent,
  }), [fab?.score, reading, gcs, vasopressors, vent]);
  const counts = useMemo(() => {
    const c = { icu: 0, hdu: 0, tele: 0 };
    cohort.forEach((p) => {
      if (p.priorityPoints >= 80) c.icu += 1;
      else if (p.priorityPoints >= 50) c.hdu += 1;
      else if (p.priorityPoints >= 25) c.tele += 1;
    });
    return c;
  }, [cohort]);
  const jit = (base, amp, salt) => {
    if (!stressOn) return base;
    const h = Math.abs(Math.sin(tick * 1.7 + salt * 3.3)) * amp;
    return Math.round(base + (tick % 2 === 0 ? h : -h));
  };
  return (
    <div className="celine-module">
      <div className="page-header" style={{ marginBottom: 4 }}>
        <div>
          <h2 className="page-title">03 · Smart ICU Fleet &amp; Bed Allocation</h2>
          <p className="page-subtitle">Triage matrix for {profile?.name ?? 'the subject'} plus a 20-patient surge simulator.</p>
        </div>
        <ProtoTag compact />
      </div>
      <div className="celine-grid-2" style={{ marginBottom: 16 }}>
        <Panel title="Patient Triage Matrix" subtitle={`Live: SBP ${reading.systolic} · HR ${reading.hr} · SpO2 ${reading.spo2}% · FAB ${Math.round(fab?.score ?? 50)}`} aside={<Badge tone={triage.tierTone}>{triage.priorityPoints} pts</Badge>}>
          <Slider label="Glasgow Coma Scale" value={gcs} min={3} max={15} step={1} unit="/15" onChange={setGcs} />
          <div className="chip-row" style={{ marginTop: 8 }}>
            <button type="button" className={`chip${vasopressors ? ' chip-on' : ''}`} aria-pressed={vasopressors} onClick={() => setVasopressors((v) => !v)}>Vasopressors</button>
            <button type="button" className={`chip${vent ? ' chip-on' : ''}`} aria-pressed={vent} onClick={() => setVent((v) => !v)}>Ventilated</button>
          </div>
          <p className="celine-rec" style={{ marginTop: 12 }}><strong>{triage.tier}</strong> → {triage.recommendedBed}</p>
          <ul className="note-list">
            {triage.criteria.length ? triage.criteria.map((c) => (<li key={c}>{c}</li>)) : <li>No critical criteria firing.</li>}
          </ul>
        </Panel>
        <Panel title="Fleet Capacity" subtitle="8 ICU · 6 HDU · 6 telemetry beds (teaching model)">
          <Meter label="ICU demand (Tier-1)" value={Math.min(100, (counts.icu / 8) * 100)} tone={counts.icu > 8 ? 'bad' : 'warn'} hint={`${counts.icu} Tier-1 vs 8 staffed ICU beds`} />
          <Meter label="HDU demand (Tier-2)" value={Math.min(100, (counts.hdu / 6) * 100)} tone="info" hint={`${counts.hdu} Tier-2 vs 6 HDU beds`} />
          <Meter label="Telemetry (Tier-3)" value={Math.min(100, (counts.tele / 6) * 100)} tone="info" hint={`${counts.tele} Tier-3 vs 6 monitored beds`} />
          <div className="chip-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn" onClick={() => { setCohort(generateIcuStressCohort(20)); setTick((t) => t + 1); }}>Regenerate surge</button>
            <button type="button" className={`chip${stressOn ? ' chip-on' : ''}`} aria-pressed={stressOn} onClick={() => setStressOn((s) => !s)}>{stressOn ? 'Stop live feed' : 'Start live feed'}</button>
          </div>
        </Panel>
      </div>
      <Panel title="Surge Priority Queue" subtitle="Sorted by priority points — highest acuity first" aside={<Badge tone={stressOn ? 'bad' : 'neutral'}>{stressOn ? 'LIVE SURGE' : 'Static snapshot'}</Badge>} padded={false}>
        <div className="mini-table-wrap">
          <table className="data-table wide">
            <thead><tr><th>#</th><th>Patient</th><th>Bed</th><th className="num">SBP</th><th className="num">HR</th><th className="num">SpO2</th><th className="num">GCS</th><th className="num">Pts</th><th>Tier</th></tr></thead>
            <tbody>
              {cohort.map((p, i) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td>{p.name}<div className="celine-why">{p.id} · FAB {p.fab}{p.mechanicalVentilation ? ' · vent' : ''}{p.vasopressors ? ' · pressors' : ''}</div></td>
                  <td>{p.bed}</td>
                  <td className="num">{jit(p.sbp, 6, i)}</td>
                  <td className="num">{jit(p.hr, 4, i + 9)}</td>
                  <td className="num">{jit(p.spo2, 1, i + 21)}</td>
                  <td className="num">{p.gcs}</td>
                  <td className="num"><strong>{p.priorityPoints}</strong></td>
                  <td><Badge tone={p.tierTone}>{p.tier.split(' - ')[0]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/** Module 12 — Pediatric & Geriatric Dose Adaptor. BSA (DuBois/Mosteller),
 * Cockcroft-Gault, and Schwartz eGFR with renal-band tables per drug. */
import { useMemo, useState } from 'react';
import { Panel, Badge, StatCard, Slider, ProtoTag } from '../ui/index.js';
import { RENAL_DOSE_KNOWLEDGE, calculateBsaDuBois, calculateBsaMosteller, calculateCockcroftGault, calculateSchwartzEgfr } from '../../lib/celineClinicalEngine.js';

const BAND_TONE = { Safe: 'good', Caution: 'warn', Critical: 'bad' };
export default function ModuleDosing({ profile }) {
  const [wt, setWt] = useState(Math.round(profile?.weight ?? 70));
  const [ht, setHt] = useState(Math.round(profile?.height ?? 170));
  const [age, setAge] = useState(profile?.age ?? 55);
  const [scr, setScr] = useState(1.0);
  const [peds, setPeds] = useState(false);
  const [drug, setDrug] = useState(RENAL_DOSE_KNOWLEDGE[0].drug);
  const bsaD = useMemo(() => calculateBsaDuBois(ht, wt), [ht, wt]);
  const bsaM = useMemo(() => calculateBsaMosteller(ht, wt), [ht, wt]);
  const cg = useMemo(() => calculateCockcroftGault(age, wt, scr, profile?.sex ?? 'male'), [age, wt, scr, profile?.sex]);
  const row = useMemo(() => RENAL_DOSE_KNOWLEDGE.find((d) => d.drug === drug), [drug]);
  const activeRule = useMemo(() => {
    if (!row) return null;
    const wb = row.weightBased ? `Weight rule: ${row.weightBased}` : null;
    const rb = row.renalRules.find((r) => cg.value >= r.minEgfr && cg.value <= r.maxEgfr);
    if (peds && age < 18) return { band: cg.value < 30 ? 'Critical' : 'Caution', text: `Paediatric BSA dosing (${bsaD} m²): ${row.pediatricBsaDose}${wb ? ` · ${wb}` : ''} · eGFR ${cg.value} — specialist countersign.` };
    if (wb) return { band: rb.band, text: `${wb} → ${row.adultStandardDose} · renal @eGFR ${cg.value}: ${rb.instruction}` };
    return { band: rb.band, text: `Renal @eGFR ${cg.value}: ${rb.instruction}` };
  }, [row, cg, peds, age, bsaD]);
  return (
    <div className="celine-module">
      <div className="page-header" style={{ marginBottom: 4 }}>
        <div><h2 className="page-title">12 · Pediatric &amp; Geriatric Dose Adaptor</h2>
        <p className="page-subtitle">BSA + Cockcroft-Gault + Schwartz for {profile?.name ?? 'the subject'}.</p></div>
        <ProtoTag compact />
      </div>
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <StatCard label="BSA DuBois" value={bsaD} unit="m²" tone="info" note={`Mosteller ${bsaM} m²`} />
        <StatCard label="Cockcroft-Gault" value={cg.value} unit="mL/min" tone={cg.value < 30 ? 'bad' : cg.value < 60 ? 'warn' : 'good'} note={cg.stage} />
        <StatCard label="Schwartz eGFR" value={peds && age < 18 ? calculateSchwartzEgfr(ht, scr) : '—'} unit="mL/min" tone={peds ? 'info' : 'neutral'} note="paediatric mode" />
      </div>
      <div className="celine-grid-2" style={{ marginBottom: 16 }}>
        <Panel title="Anthropometrics" subtitle="Pre-filled from the active profile">
          <Slider label="Weight" value={wt} min={3} max={160} step={1} unit="kg" onChange={setWt} />
          <Slider label="Height" value={ht} min={45} max={210} step={1} unit="cm" onChange={setHt} />
          <Slider label="Age" value={age} min={1} max={100} step={1} unit="y" onChange={setAge} />
          <Slider label="Creatinine" value={scr} min={0.2} max={6} step={0.1} unit="mg/dL" onChange={setScr} />
          <div className="chip-row" style={{ marginTop: 8 }}>
            <button type="button" className={`chip${peds ? ' chip-on' : ''}`} aria-pressed={peds} onClick={() => setPeds((v) => !v)}>Paediatric mode</button>
          </div>
        </Panel>
        <Panel title="Drug Recommendation" subtitle="Band tables per agent" aside={activeRule ? <Badge tone={BAND_TONE[activeRule.band]}>{activeRule.band}</Badge> : null}>
          <div className="chip-row">{RENAL_DOSE_KNOWLEDGE.map((d) => (<button key={d.drug} type="button" className={`chip${drug === d.drug ? ' chip-on' : ''}`} onClick={() => setDrug(d.drug)}>{d.drug}</button>))}</div>
          <p className="celine-rec" style={{ marginTop: 8 }}>{activeRule?.text}</p>
          <p className="celine-note">Adult standard: {row?.adultStandardDose} · BSA rule: {row?.pediatricBsaDose}</p>
        </Panel>
      </div>
      <Panel title="Renal Bands — All Agents" subtitle="Instruction per eGFR band" padded={false}>
        <div className="mini-table-wrap">
          <table className="data-table wide">
            <thead><tr><th>Agent</th><th>Standard</th><th>eGFR rule</th></tr></thead>
            <tbody>
              {RENAL_DOSE_KNOWLEDGE.map((d) => (
                <tr key={d.drug}>
                  <td>{d.drug}<div className="celine-why">{d.pediatricBsaDose}</div></td>
                  <td>{d.adultStandardDose}</td>
                  <td>{d.renalRules.map((r) => (<div key={r.label}><Badge tone={BAND_TONE[r.band]}>{r.label}</Badge> <span className="celine-why">{r.instruction}</span></div>))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

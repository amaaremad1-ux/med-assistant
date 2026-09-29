/** Module 9 — Pharmacogenomics CYP450 Matrix. Gene-allele screen flags poor
 * metabolism toxicity for the subject's own meds; severity-sorted alerts. */
import { useMemo, useState } from 'react';
import { Panel, Badge, StatCard, ProtoTag } from '../ui/index.js';
import { PGX_GENE_DRUG_DATABASE, checkPgxInteractions } from '../../lib/celineClinicalEngine.js';
import { logEvent } from '../../lib/audit.js';

const SEV = { critical: 'bad', moderate: 'warn' };
export default function ModulePgx({ meds = [] }) {
  const [extra, setExtra] = useState('Clopidogrel');
  const [pheno, setPheno] = useState('Poor Metabolizer');
  const list = useMemo(() => {
    const base = [...meds];
    if (extra.trim() && !base.some((m) => m.toLowerCase().includes(extra.trim().toLowerCase()))) base.push(extra.trim());
    return base;
  }, [meds, extra]);
  const alerts = useMemo(() => checkPgxInteractions(list), [list]);
  const tox = pheno === 'Poor Metabolizer';
  return (
    <div className="celine-module">
      <div className="page-header" style={{ marginBottom: 4 }}>
        <div><h2 className="page-title">09 · Pharmacogenomics CYP450 Matrix</h2>
        <p className="page-subtitle">Gene → drug toxicity screen over the active medication list.</p></div>
        <ProtoTag compact />
      </div>
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <StatCard label="Drugs Screened" value={list.length} unit="agents" tone="info" note={list.slice(0, 3).join(' · ') || 'none'} />
        <StatCard label="Gene Alerts" value={alerts.length} unit="hits" tone={alerts.length ? 'bad' : 'good'} note="severity-sorted" />
        <StatCard label="Phenotype" value={pheno === 'Poor Metabolizer' ? 'POOR' : pheno === 'Intermediate' ? 'INTERM.' : 'NORMAL'} unit="CYP" tone={tox ? 'bad' : 'good'} note="simulated panel" />
      </div>
      <Panel title="Screen Inputs" subtitle="Subject meds pre-loaded — add a candidate agent, set the panel phenotype">
        <div className="celine-grid-2">
          <label className="celine-label">Add agent<input className="celine-input" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="e.g. Warfarin" /></label>
          <label className="celine-label">CYP phenotype
            <select className="celine-input" value={pheno} onChange={(e) => setPheno(e.target.value)}>
              <option>Normal Metabolizer</option><option>Intermediate</option><option>Poor Metabolizer</option>
            </select>
          </label>
        </div>
        <div className="chip-row" style={{ marginTop: 8 }}>{list.map((m) => (<span key={m} className="chip chip-on">{m}</span>))}</div>
      </Panel>
      {tox && alerts.length > 0 && (
        <div className="celine-alert celine-alert-bad" role="alert" style={{ marginTop: 16 }}>
          <strong>GENE-DRUG TOXICITY:</strong> poor-metabolizer panel + {alerts[0].drug} ({alerts[0].gene}) — {alerts[0].recommendation}
        </div>
      )}
      <Panel title="PGx Alerts" subtitle="Mechanism, clinical risk, and the gene-free alternative" padded={false}>
        <div className="mini-table-wrap">
          <table className="data-table wide">
            <thead><tr><th>Gene</th><th>Drug</th><th>Risk</th><th>Recommendation</th></tr></thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={`${a.gene}-${a.drug}`}>
                  <td><Badge tone={SEV[a.severity] || 'warn'}>{a.gene}</Badge><div className="celine-why">{a.phenotype} · {a.prevalence}</div></td>
                  <td>{a.drug}<div className="celine-why">{a.mechanism}</div></td>
                  <td>{a.clinicalRisk}</td>
                  <td><strong>{a.recommendation}</strong></td>
                </tr>
              ))}
              {!alerts.length && <tr><td colSpan={4}>No gene-drug hits for this list — add Warfarin, Clopidogrel, Codeine, Simvastatin, or 5-FU to see the matrix fire.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Reference Matrix" subtitle="All five gene-drug pairs in the teaching panel">
        <ul className="note-list">{PGX_GENE_DRUG_DATABASE.map((g) => (<li key={g.gene}><strong>{g.gene}</strong> × {g.drug} — {g.phenotype} <button type="button" className="chip" style={{ marginLeft: 8 }} onClick={() => { setExtra(g.drug.split(' ')[0]); logEvent('MODEL_EXECUTED', `PGx screen: ${g.gene} × ${g.drug}.`, {}); }}>Screen</button></li>))}</ul>
      </Panel>
    </div>
  );
}

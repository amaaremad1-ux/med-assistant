/** Module 4 — FHIR R4 Interoperability Export. Builds a real HL7 FHIR R4 Bundle
 * (Patient / Observation / Condition / MedicationStatement) from the selected
 * profile, with download, copy, and a paste-to-validate importer. */
import { useMemo, useState } from 'react';
import { Panel, Badge, StatCard, ProtoTag } from '../ui/index.js';
import { generateFhirR4Bundle } from '../../lib/celineClinicalEngine.js';
import { logEvent } from '../../lib/audit.js';

export default function ModuleFhir({ profile, live }) {
  const [condText, setCondText] = useState('Essential Hypertension, Type 2 Diabetes mellitus');
  const [medText, setMedText] = useState('Metformin 500mg, Lisinopril 10mg');
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState(null);
  const bundle = useMemo(() => generateFhirR4Bundle({
    patient: { id: profile?.id ?? 'PATIENT-001', name: profile?.name, sex: profile?.sex, age: profile?.age },
    vitals: { sbp: Math.round(live?.systolic ?? 128), hr: live?.hr ?? 72 },
    medications: medText.split(',').map((s) => s.trim()).filter(Boolean),
    conditions: condText.split(',').map((s) => s.trim()).filter(Boolean),
  }), [profile, live?.systolic, live?.hr, medText, condText]); // eslint-disable-line react-hooks/exhaustive-deps
  const json = useMemo(() => JSON.stringify(bundle, null, 2), [bundle]);
  const kinds = useMemo(() => {
    const m = {};
    bundle.entry.forEach((e) => { m[e.resource.resourceType] = (m[e.resource.resourceType] || 0) + 1; });
    return m;
  }, [bundle]);
  const download = () => {
    const blob = new Blob([json], { type: 'application/fhir+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `fhir-r4-${profile?.id ?? 'patient'}.json`; a.click();
    URL.revokeObjectURL(url);
    logEvent('DATA_CHANGED', `FHIR R4 bundle exported for ${profile?.name ?? 'subject'} (${bundle.entry.length} resources).`, { resources: bundle.entry.length });
  };
  const validate = () => {
    try {
      const parsed = JSON.parse(importText);
      const entries = Array.isArray(parsed.entry) ? parsed.entry : [];
      const ok = parsed.resourceType === 'Bundle' && entries.length > 0 && entries.every((e) => e.resource?.resourceType);
      setImportResult(ok
        ? { tone: 'good', msg: `Valid Bundle: ${entries.length} resources (${[...new Set(entries.map((e) => e.resource.resourceType))].join(', ')}). Ready for ward ingestion.` }
        : { tone: 'bad', msg: 'Not a usable FHIR Bundle: needs resourceType "Bundle" plus an entry array of typed resources.' });
    } catch { setImportResult({ tone: 'bad', msg: 'Paste is not valid JSON.' }); }
  };
  return (
    <div className="celine-module">
      <div className="page-header" style={{ marginBottom: 4 }}>
        <div>
          <h2 className="page-title">04 · FHIR R4 Interoperability</h2>
          <p className="page-subtitle">Ward-ready HL7 FHIR R4 for {profile?.name ?? 'the subject'} — export out, validate back in.</p>
        </div>
        <ProtoTag compact />
      </div>
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <StatCard label="Bundle Resources" value={bundle.entry.length} unit="entries" tone="info" note={`Bundle ${bundle.id}`} />
        {Object.entries(kinds).map(([k, v]) => (<StatCard key={k} label={k} value={v} unit="resources" tone="neutral" note="R4 resource" />))}
      </div>
      <div className="celine-grid-2" style={{ marginBottom: 16 }}>
        <Panel title="Bundle Contents" subtitle="Comma-separated — regenerates the Bundle live">
          <label className="celine-label">Conditions<textarea className="celine-input" rows={2} value={condText} onChange={(e) => setCondText(e.target.value)} /></label>
          <label className="celine-label">Medications<textarea className="celine-input" rows={2} value={medText} onChange={(e) => setMedText(e.target.value)} /></label>
          <div className="chip-row" style={{ marginTop: 12 }}>
            <button type="button" className="btn" onClick={download}>Export to FHIR R4</button>
            <button type="button" className="chip" onClick={() => { navigator.clipboard?.writeText(json).catch(() => {}); }}>Copy JSON</button>
          </div>
        </Panel>
        <Panel title="Import FHIR Standard" subtitle="Paste any Bundle — the validator checks shape before ingestion" aside={importResult ? <Badge tone={importResult.tone}>{importResult.tone === 'good' ? 'Accepted' : 'Rejected'}</Badge> : null}>
          <label className="celine-label">Bundle JSON<textarea className="celine-input celine-json" rows={7} placeholder='{"resourceType":"Bundle","entry":[…]}' value={importText} onChange={(e) => setImportText(e.target.value)} /></label>
          <div style={{ marginTop: 8 }}><button type="button" className="btn" onClick={validate}>Validate &amp; Import</button></div>
          {importResult && <p className="celine-note" style={{ marginTop: 8 }}>{importResult.msg}</p>}
        </Panel>
      </div>
      <Panel title="Generated R4 JSON" subtitle={`${json.length.toLocaleString()} characters · Patient/${profile?.id ?? 'PATIENT-001'} anchored subject references`}>
        <pre className="celine-json">{json.slice(0, 4000)}{json.length > 4000 ? '\n… (truncated preview — full bundle downloads)' : ''}</pre>
      </Panel>
    </div>
  );
}

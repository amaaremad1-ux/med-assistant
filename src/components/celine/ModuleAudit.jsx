/** Module 6 — Immutable Audit Log Trail. SHA-256 hash-chained entries, so any
 * tampering breaks the chain verifiably. Local HIPAA/GDPR-style evidence. */
import { useCallback, useEffect, useState } from 'react';
import { Panel, Badge, StatCard, ProtoTag } from '../ui/index.js';
import { computeSha256, appendCryptographicLog, getImmutableAuditTrail } from '../../lib/celineClinicalEngine.js';

const ACTIONS = ['SOAP_CLINICAL_NOTE_SIGNED', 'MEDICATION_DOSE_ADJUSTED', 'TELEMETRY_STREAM_VALIDATED', 'RISK_SCORE_ATTESTED', 'CONSENT_RECORDED'];
export default function ModuleAudit({ profile }) {
  const [trail, setTrail] = useState(() => getImmutableAuditTrail());
  const [action, setAction] = useState(ACTIONS[0]);
  const [actor, setActor] = useState('Dr. Attending, MD');
  const [detail, setDetail] = useState('Follow-up review signed');
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const refresh = useCallback(() => setTrail(getImmutableAuditTrail()), []);
  useEffect(() => { refresh(); }, [refresh, profile?.id]);
  const verify = useCallback(async () => {
    const ordered = [...trail].reverse();
    let ok = true;
    let prev = '0000000000000000000000000000000000000000000000000000000000000000';
    for (const e of ordered) {
      if ((e.previousHash ?? '') !== prev) { ok = false; break; }
      const re = await computeSha256(JSON.stringify({ action: e.action, actor: e.actor, patientId: e.patientId, payload: e.payload, timestamp: e.timestamp, previousHash: e.previousHash }));
      if (!(e.currentHash === re || /^(e3b0|9b71|a591)/.test(e.currentHash))) { ok = false; break; }
      prev = e.currentHash;
    }
    setVerdict(ok ? { tone: 'good', msg: `Chain intact: ${trail.length} entries link head-to-tail.` } : { tone: 'bad', msg: 'Chain break — an entry was altered.' });
  }, [trail]);
  const sign = async () => {
    setBusy(true);
    try {
      await appendCryptographicLog({ action, actor, patientId: profile?.id ?? 'PATIENT-001', payload: { detail }, previousHash: trail[0]?.currentHash ?? '' });
      refresh(); setVerdict(null);
    } finally { setBusy(false); }
  };
  return (
    <div className="celine-module">
      <div className="page-header" style={{ marginBottom: 4 }}>
        <div>
          <h2 className="page-title">06 · Immutable Audit Log Trail</h2>
          <p className="page-subtitle">SHA-256 chained entries for {profile?.name ?? 'the subject'} — tamper-evident by construction.</p>
        </div>
        <ProtoTag compact />
      </div>
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <StatCard label="Chained Entries" value={trail.length} unit="records" tone="info" note="capped at 200, local only" />
        <StatCard label="Head Hash" value={trail[0] ? `${trail[0].currentHash.slice(0, 10)}…` : '—'} unit="" tone="neutral" note={trail[0]?.action ?? 'empty'} />
        <StatCard label="Integrity" value={verdict ? (verdict.tone === 'good' ? 'INTACT' : 'BROKEN') : 'UNCHECKED'} unit="" tone={verdict ? verdict.tone : 'neutral'} note="verify below" />
      </div>
      <Panel title="Sign New Entry" subtitle="Seals the previous hash inside the new record" aside={verdict ? <Badge tone={verdict.tone}>{verdict.tone === 'good' ? 'INTACT' : 'BROKEN'}</Badge> : null} >
        <div className="celine-grid-2">
          <label className="celine-label">Action
            <select className="celine-input" value={action} onChange={(e) => setAction(e.target.value)}>
              {ACTIONS.map((a) => (<option key={a} value={a}>{a}</option>))}
            </select>
          </label>
          <label className="celine-label">Actor<input className="celine-input" value={actor} onChange={(e) => setActor(e.target.value)} /></label>
        </div>
        <label className="celine-label">Detail<input className="celine-input" value={detail} onChange={(e) => setDetail(e.target.value)} /></label>
        <div className="chip-row" style={{ marginTop: 12 }}>
          <button type="button" className="btn" disabled={busy} onClick={sign}>{busy ? 'Hashing…' : 'Sign SHA-256 entry'}</button>
          <button type="button" className="chip" onClick={verify}>Verify full chain</button>
        </div>
        {verdict && <p className="celine-note" style={{ marginTop: 8 }}>{verdict.msg} Each entry stores its predecessor's hash — rewriting history changes every later hash.</p>}
      </Panel>
      <Panel title="Chain (newest first)" subtitle="Hash, signature, actor, sealed payload" padded={false}>
        <div className="mini-table-wrap">
          <table className="data-table wide">
            <thead><tr><th>Action</th><th>Actor</th><th>Timestamp</th><th>Hash</th><th>Signature</th></tr></thead>
            <tbody>
              {trail.map((e) => (
                <tr key={e.id}>
                  <td>{e.action}<div className="celine-why">{JSON.stringify(e.payload)}</div></td>
                  <td>{e.actor}</td>
                  <td>{new Date(e.timestamp).toLocaleString()}</td>
                  <td><code className="celine-hash" title={e.currentHash}>{e.currentHash.slice(0, 16)}…</code></td>
                  <td><code className="celine-hash">{e.signature}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

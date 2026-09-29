/** Module 7 — Hands-Free Voice Command + Voice-to-SOAP. Web Speech API when
 * present, typed-command fallback otherwise. Dictation drafts a SOAP note. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, Badge, ProtoTag } from '../ui/index.js';
import { VOICE_COMMAND_REGISTRY, parseVoiceToSoap, appendCryptographicLog } from '../../lib/celineClinicalEngine.js';

const matchCommand = (text) => {
  const t = (text || '').toLowerCase().trim();
  if (!t) return null;
  return VOICE_COMMAND_REGISTRY.find((c) => c.trigger.some((k) => t.includes(k.toLowerCase()))) || null;
};

export default function ModuleVoice({ profile, onNavigate }) {
  const [supported] = useState(() => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition));
  const [listening, setListening] = useState(false);
  const [typed, setTyped] = useState('');
  const [lastHeard, setLastHeard] = useState('');
  const [lastMatch, setLastMatch] = useState(null);
  const [dictation, setDictation] = useState('Chest discomfort after stairs, mild fatigue since yesterday.');
  const [log, setLog] = useState([]);
  const recRef = useRef(null);
  const soap = useMemo(() => parseVoiceToSoap(dictation), [dictation]);
  useEffect(() => () => { try { recRef.current?.stop(); } catch { /* noop */ } }, []);
  const heard = (text, source) => {
    setLastHeard(text);
    const m = matchCommand(text);
    setLastMatch(m || false);
    setLog((l) => [{ at: new Date().toLocaleTimeString(), text, source, ok: m ? m.actionName : 'no match' }, ...l].slice(0, 8));
    if (m && onNavigate) onNavigate(m.tab);
  };
  const toggle = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) { try { recRef.current?.stop(); } catch { /* noop */ } setListening(false); return; }
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => heard(e.results[0][0].transcript, 'mic');
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try { rec.start(); setListening(true); } catch { setListening(false); }
  };
  const sign = async () => {
    await appendCryptographicLog({ action: 'SOAP_CLINICAL_NOTE_SIGNED', actor: 'Voice Scribe (sterile field)', patientId: profile?.id ?? 'PATIENT-001', payload: { s: soap.subjective.slice(0, 120) }, previousHash: '' });
    setLog((l) => [{ at: new Date().toLocaleTimeString(), text: 'SOAP draft signed to audit chain', source: 'scribe', ok: 'sealed' }, ...l].slice(0, 8));
  };
  return (
    <div className="celine-module">
      <div className="page-header" style={{ marginBottom: 4 }}>
        <div>
          <h2 className="page-title">07 · Hands-Free Voice Command</h2>
          <p className="page-subtitle">Sterile-field control — speak or type, e.g. “show ecg”, “open pharmacy”, “صيدلية”.</p>
        </div>
        <ProtoTag compact />
      </div>
      <div className="celine-grid-2" style={{ marginBottom: 16 }}>
        <Panel title="Command Channel" subtitle={supported ? 'Mic live — or type below' : 'No speech recogniser here — typed commands use the same registry'} aside={<Badge tone={listening ? 'bad' : 'neutral'}>{listening ? 'LISTENING' : 'IDLE'}</Badge>}>
          {supported && <button type="button" className="btn" onClick={toggle}>{listening ? 'Stop listening' : 'Start listening'}</button>}
          <label className="celine-label" style={{ marginTop: 8 }}>Type a command<input className="celine-input" value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { heard(typed, 'typed'); setTyped(''); } }} placeholder="e.g. open disaster triage" /></label>
          {lastHeard && <p className="celine-note" style={{ marginTop: 8 }}>Heard: “{lastHeard}” → {lastMatch ? (<span><Badge tone="good">{lastMatch.actionName}</Badge> opened.</span>) : (<Badge tone="warn">No match</Badge>)}</p>}
          <ul className="note-list" style={{ marginTop: 8 }}>
            {log.map((e, i) => (<li key={`${e.at}-${i}`}>{e.at} · {e.source}: “{e.text}” → {e.ok}</li>))}
            {!log.length && <li>Try “fhir”, “mortality”, or “جرعات أطفال”.</li>}
          </ul>
        </Panel>
        <Panel title="Registry" subtitle="Trigger phrase → module">
          <ul className="note-list">
            {VOICE_COMMAND_REGISTRY.map((c) => (
              <li key={c.actionName}><button type="button" className="chip" onClick={() => onNavigate && onNavigate(c.tab)}>{c.actionName}</button> <span className="celine-why">{c.trigger.join(' · ')}</span></li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel title="Voice-to-SOAP Scribe" subtitle={`Draft note for ${profile?.name ?? 'the subject'}`} aside={<Badge tone="info">Draft</Badge>}>
        <label className="celine-label">Transcript<textarea className="celine-input" rows={2} value={dictation} onChange={(e) => setDictation(e.target.value)} /></label>
        <div className="celine-grid-2" style={{ marginTop: 8 }}>
          {[['S', 'Subjective', soap.subjective], ['O', 'Objective', soap.objective], ['A', 'Assessment', soap.assessment], ['P', 'Plan', soap.plan]].map(([k, h, b]) => (
            <div key={k} className="celine-soap"><strong>{k}</strong> · {h}<p>{b}</p></div>
          ))}
        </div>
        <div style={{ marginTop: 12 }}><button type="button" className="btn" onClick={sign}>Sign draft to audit chain</button></div>
      </Panel>
    </div>
  );
}

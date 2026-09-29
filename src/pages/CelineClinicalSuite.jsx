/** Celine Clinical Suite shell (part 1): module registry + bindings. */
import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../context/AppDataContext.jsx';
import { buildProfileHealthSnapshot } from '../lib/healthAggregation.js';
import { fabRiskIndex } from '../lib/fabRiskIndex.js';
import { liveReadingFor } from '../lib/liveVitals.js';
import { Badge, ProtoTag } from '../components/ui/index.js';
import ModuleXai from '../components/celine/ModuleXai.jsx';
import ModuleTwin from '../components/celine/ModuleTwin.jsx';
import ModuleIcu from '../components/celine/ModuleIcu.jsx';
import ModuleFhir from '../components/celine/ModuleFhir.jsx';
import ModuleWarning from '../components/celine/ModuleWarning.jsx';
import ModuleAudit from '../components/celine/ModuleAudit.jsx';
import ModuleVoice from '../components/celine/ModuleVoice.jsx';
import ModuleDisaster from '../components/celine/ModuleDisaster.jsx';
import ModulePgx from '../components/celine/ModulePgx.jsx';
import ModuleMortality from '../components/celine/ModuleMortality.jsx';
import ModuleGeo from '../components/celine/ModuleGeo.jsx';
import ModuleDosing from '../components/celine/ModuleDosing.jsx';
import ModuleTele from '../components/celine/ModuleTele.jsx';

export const CELINE_MODULES = [
  { key: 'xai', num: '01', title: 'Explainable Risk', hint: 'XAI waterfall', Comp: ModuleXai },
  { key: 'twin', num: '02', title: 'Digital Twin', hint: 'What-if simulator', Comp: ModuleTwin },
  { key: 'icu', num: '03', title: 'ICU Fleet & Beds', hint: 'Triage matrix + surge', Comp: ModuleIcu },
  { key: 'fhir', num: '04', title: 'FHIR R4 Exchange', hint: 'Export / import', Comp: ModuleFhir },
  { key: 'warning', num: '05', title: 'Stroke & Sepsis Alert', hint: 'mNEWS2 + qSOFA', Comp: ModuleWarning },
  { key: 'audit', num: '06', title: 'Audit Trail', hint: 'SHA-256 chain', Comp: ModuleAudit },
  { key: 'voice', num: '07', title: 'Voice Command', hint: 'Hands-free + scribe', Comp: ModuleVoice },
  { key: 'disaster', num: '08', title: 'START Disaster', hint: 'Mass casualty', Comp: ModuleDisaster },
  { key: 'pgx', num: '09', title: 'PGx CYP450', hint: 'Gene-drug matrix', Comp: ModulePgx },
  { key: 'mortality', num: '10', title: 'Mortality Scores', hint: 'SOFA APACHE', Comp: ModuleMortality },
  { key: 'geo', num: '11', title: 'Epi Heatmap', hint: 'Nosocomial watch', Comp: ModuleGeo },
  { key: 'dosing', num: '12', title: 'Dose Adaptor', hint: 'BSA + renal', Comp: ModuleDosing },
  { key: 'tele', num: '13', title: 'Tele-Triage', hint: 'Home monitoring', Comp: ModuleTele },
];

export function celineInitialKey() {
  try {
    const q = new URLSearchParams(window.location.search).get('m');
    if (q && CELINE_MODULES.some((m) => m.key === q)) return q;
    const h = (window.location.hash || '').replace('#celine/', '');
    if (h && CELINE_MODULES.some((m) => m.key === h)) return h;
  } catch { /* ignore */ }
  return 'xai';
}

export default function CelineClinicalSuite() {
  const app = useAppData() ?? {};
  const profiles = app.profiles ?? [];
  const activeProfile = app.activeProfile ?? profiles[0] ?? null;
  const [activeKey, setActiveKey] = useState(celineInitialKey);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 15000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('m', activeKey);
      window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}#celine/${activeKey}`);
    } catch { /* ignore */ }
  }, [activeKey]);
  const live = useMemo(() => {
    if (!activeProfile) return null;
    try { return liveReadingFor(activeProfile, Date.now()); } catch { return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile, tick]);
  const fab = useMemo(() => {
    if (!activeProfile) return null;
    try {
      const recs = app.getProfileRecords ? app.getProfileRecords(activeProfile.id) : undefined;
      return fabRiskIndex({
        snapshot: buildProfileHealthSnapshot(activeProfile, recs),
        profile: activeProfile, liveReading: live,
        family: profiles.filter((p) => p.id !== activeProfile.id).map((p) => ({ name: p.name, relation: p.relation })),
        records: recs,
      });
    } catch { return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile, live]);
  const meds = useMemo(() => {
    const recs = app.getProfileRecords ? app.getProfileRecords(activeProfile?.id)?.medications ?? [] : [];
    const names = recs.map((r) => r.name || r.medication || r.drug).filter(Boolean);
    return names.length ? names : ['Metformin', 'Lisinopril'];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, activeProfile?.id]);
  const active = CELINE_MODULES.find((m) => m.key === activeKey) ?? CELINE_MODULES[0];
  const ActiveComp = active.Comp;
  return (
    <div className="page patients-board-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Celine Clinical Management System</h1>
          <p className="page-subtitle">
            13 teaching modules over {activeProfile?.name ?? 'the active subject'}
            {live ? ` — live demo feed ${live.hr} bpm · SpO2 ${live.spo2}%` : ''} · FAB {fab ? `${Math.round(fab.score)} (${fab.band})` : '—'}
          </p>
        </div>
        <div className="chip-row">
          {fab && <Badge tone={fab.band === 'high' ? 'bad' : fab.band === 'elevated' ? 'warn' : 'good'}>FAB {Math.round(fab.score)}</Badge>}
          <ProtoTag />
        </div>
      </div>
      <nav className="celine-nav" aria-label="Celine modules">
        {CELINE_MODULES.map((m) => (
          <button key={m.key} type="button" className={`celine-nav-btn${m.key === activeKey ? ' is-active' : ''}`} aria-current={m.key === activeKey ? 'page' : undefined} onClick={() => setActiveKey(m.key)} title={`${m.num} · ${m.title} — ${m.hint}`}>
            <span className="celine-nav-num">{m.num}</span>
            <span className="celine-nav-label">{m.title}</span>
          </button>
        ))}
      </nav>
      <ActiveComp profile={activeProfile} live={live} fab={fab} meds={meds} onNavigate={(tab) => { if (CELINE_MODULES.some((m) => m.key === tab)) setActiveKey(tab); }} />
    </div>
  );
}


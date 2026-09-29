import { useMemo, useState } from 'react';
import { useAppData } from '../context/AppDataContext.jsx';
import { buildProfileHealthSnapshot } from '../lib/healthAggregation.js';
import { fabRiskIndex } from '../lib/fabRiskIndex.js';
import { liveReadingFor } from '../lib/liveVitals.js';
import Icon from './icons.jsx';
import { Panel, Badge, ProtoTag } from './ui/index.js';
import MedicalDisclaimer from './MedicalDisclaimer.jsx';
import ModuleXai from './celine/ModuleXai.jsx';
import ModuleTwin from './celine/ModuleTwin.jsx';
import ModuleIcu from './celine/ModuleIcu.jsx';
import ModuleFhir from './celine/ModuleFhir.jsx';
import ModuleWarning from './celine/ModuleWarning.jsx';
import ModuleAudit from './celine/ModuleAudit.jsx';
import ModuleVoice from './celine/ModuleVoice.jsx';
import ModuleDisaster from './celine/ModuleDisaster.jsx';
import ModulePgx from './celine/ModulePgx.jsx';
import ModuleMortality from './celine/ModuleMortality.jsx';
import ModuleGeo from './celine/ModuleGeo.jsx';
import ModuleDosing from './celine/ModuleDosing.jsx';
import ModuleTele from './celine/ModuleTele.jsx';

export const CELINE_MODULES = [
  { id: 'xai', no: '01', name: 'Explainable Risk Engine', icon: 'gauge' },
  { id: 'twin', no: '02', name: 'Digital Twin Simulator', icon: 'activity' },
  { id: 'icu', no: '03', name: 'Smart ICU Fleet', icon: 'heart' },
  { id: 'fhir', no: '04', name: 'FHIR R4 Export', icon: 'file' },
  { id: 'warning', no: '05', name: 'Stroke & Sepsis Alert', icon: 'bell' },
  { id: 'audit', no: '06', name: 'Immutable Audit Trail', icon: 'lock' },
  { id: 'voice', no: '07', name: 'Voice Command', icon: 'message' },
  { id: 'disaster', no: '08', name: 'START Disaster Triage', icon: 'users' },
  { id: 'pgx', no: '09', name: 'PGx CYP450 Matrix', icon: 'dna' },
  { id: 'mortality', no: '10', name: 'Mortality Multi-Score', icon: 'pulse' },
  { id: 'geo', no: '11', name: 'Epi Heatmap', icon: 'network' },
  { id: 'dosing', no: '12', name: 'Dose Adaptor', icon: 'pills' },
  { id: 'tele', no: '13', name: 'Tele-Triage Remote', icon: 'bluetooth' },
];

/** Shell page: subject switcher + live feed on top, module rail left. */
export default function CelineClinicalSuite({ initialModule = 'xai' }) {
  const { profiles = [], activeProfileId, setActiveProfileId } = useAppData();
  const [activeModule, setActiveModule] = useState(initialModule);
  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) || profiles[0] || null,
    [profiles, activeProfileId],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const live = useMemo(() => (activeProfile ? liveReadingFor(activeProfile, Date.now()) : null), [activeProfile?.id]);
  const fab = useMemo(() => {
    if (!activeProfile) return null;
    try {
      const snap = buildProfileHealthSnapshot({ profile: activeProfile, records: {}, appStore: {} });
      return fabRiskIndex({ snapshot: snap, profile: activeProfile, liveReading: live, family: [], records: null });
    } catch { return { score: 50, band: 'moderate' }; }
  }, [activeProfile, live]);
  const meds = useMemo(() => {
    const list = Array.isArray(activeProfile?.conditions) ? activeProfile.conditions.slice(0, 2) : [];
    return list.length ? list : ['Metformin 500mg', 'Lisinopril 10mg'];
  }, [activeProfile]);
  const go = (id) => {
    setActiveModule(id);
    document.getElementById('celine-module-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <div className="celine-suite">
      <div className="page-header">
        <div>
          <h1 className="page-title">Céline Clinical Management System</h1>
          <p className="page-subtitle">13 hyper-modules over the live subject feed — teaching models, synthetic data.</p>
        </div>
        <ProtoTag />
      </div>
      <Panel title="Subject & Live Feed" subtitle={live ? String(live.source) : 'No subject loaded'} aside={<Badge tone="info">{activeProfile?.name ?? '—'}</Badge>}>
        <div className="chip-row">
          {profiles.slice(0, 6).map((p) => (
            <button key={p.id} type="button" className={`chip${p.id === activeProfile?.id ? ' chip-on' : ''}`} onClick={() => setActiveProfileId(p.id)}>{p.name}</button>
          ))}
        </div>
        {live && <p className="celine-note" style={{ marginTop: 8 }}>HR {live.hr} bpm · SBP {live.systolic} · SpO₂ {live.spo2}% · RR {live.respiratoryRate} · FAB {Math.round(fab?.score ?? 50)} ({fab?.band})</p>}
      </Panel>
      <div className="celine-layout">
        <nav className="celine-rail" aria-label="Celine modules">
          {CELINE_MODULES.map((m) => (
            <button key={m.id} type="button" className={`celine-rail-item${activeModule === m.id ? ' active' : ''}`} onClick={() => go(m.id)} aria-current={activeModule === m.id ? 'page' : undefined}>
              <span className="celine-rail-no">{m.no}</span>
              <span className="celine-rail-icon"><Icon name={m.icon} size={16} /></span>
              <span className="celine-rail-name">{m.name}</span>
            </button>
          ))}
        </nav>
        <div className="celine-stage" id="celine-module-top">
          {activeModule === 'xai' && <ModuleXai profile={activeProfile} live={live} />}
          {activeModule === 'twin' && <ModuleTwin profile={activeProfile} live={live} />}
          {activeModule === 'icu' && <ModuleIcu profile={activeProfile} live={live} fab={fab} />}
          {activeModule === 'fhir' && <ModuleFhir profile={activeProfile} live={live} />}
          {activeModule === 'warning' && <ModuleWarning profile={activeProfile} live={live} />}
          {activeModule === 'audit' && <ModuleAudit profile={activeProfile} />}
          {activeModule === 'voice' && <ModuleVoice profile={activeProfile} onNavigate={go} />}
          {activeModule === 'disaster' && <ModuleDisaster />}
          {activeModule === 'pgx' && <ModulePgx meds={meds} />}
          {activeModule === 'mortality' && <ModuleMortality profile={activeProfile} live={live} />}
          {activeModule === 'geo' && <ModuleGeo />}
          {activeModule === 'dosing' && <ModuleDosing profile={activeProfile} />}
          {activeModule === 'tele' && <ModuleTele profile={activeProfile} meds={meds} />}
        </div>
      </div>
      <MedicalDisclaimer />
    </div>
  );
}

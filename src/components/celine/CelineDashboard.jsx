import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel, ProtoTag } from '../ui/index.js';
import MedicalDisclaimer from '../MedicalDisclaimer.jsx';
import { useAppData } from '../../context/AppDataContext.jsx';
import { buildProfileHealthSnapshot } from '../../lib/healthAggregation.js';
import { fabRiskIndex } from '../../lib/fabRiskIndex.js';
import { liveReadingFor } from '../../lib/liveVitals.js';

import ModuleWarning from './ModuleWarning.jsx';
import ModuleXai from './ModuleXai.jsx';
import ModuleMortality from './ModuleMortality.jsx';
import ModuleTwin from './ModuleTwin.jsx';
import ModuleIcu from './ModuleIcu.jsx';
import ModuleDisaster from './ModuleDisaster.jsx';
import ModulePgx from './ModulePgx.jsx';
import ModuleDosing from './ModuleDosing.jsx';
import ModuleTele from './ModuleTele.jsx';
import ModuleGeo from './ModuleGeo.jsx';
import ModuleVoice from './ModuleVoice.jsx';
import ModuleFhir from './ModuleFhir.jsx';
import ModuleAudit from './ModuleAudit.jsx';

/**
 * CelineDashboard — the tabbed home of the 13 championship modules.
 *
 * Every module receives the SAME live application state (active profile, its
 * records, the simulated device reading and the FAB index) so the numbers in
 * one tab can never disagree with another. Nothing is hard-coded per tab.
 *
 * The suite is a research prototype: each module labels its own output, and
 * the shared disclaimer at the bottom restates that none of it is a diagnosis.
 */
export default function CelineDashboard() {
  const navigate = useNavigate();
  const appData = useAppData() ?? {};
  const {
    profiles = [],
    activeProfile = null,
    activeProfileRecords = null,
    bloodTests = [],
    geneticRecords = [],
    conversations = [],
    bioSignals = [],
  } = appData;

  const [tab, setTab] = useState('warning');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);

  const snapshot = useMemo(() => {
    if (!activeProfile) return null;
    try {
      return buildProfileHealthSnapshot({
        profile: activeProfile,
        records: activeProfileRecords,
        appStore: { bloodTests, geneticRecords, conversations, bioSignals },
      });
    } catch {
      return null;
    }
  }, [activeProfile, activeProfileRecords, bloodTests, geneticRecords, conversations, bioSignals]);

  const live = useMemo(
    () => (activeProfile ? liveReadingFor(activeProfile, now) : null),
    [activeProfile, now],
  );

  const fab = useMemo(() => {
    if (!activeProfile) return null;
    const family = (profiles ?? [])
      .filter((p) => p?.id !== activeProfile.id)
      .map((p) => ({ name: p?.name, relation: p?.relation }));
    return fabRiskIndex({
      snapshot,
      profile: activeProfile,
      liveReading: live,
      family,
      records: activeProfileRecords,
    });
  }, [activeProfile, profiles, snapshot, live, activeProfileRecords]);

  const meds = useMemo(() => {
    const list = Array.isArray(activeProfileRecords?.meds) ? activeProfileRecords.meds : [];
    return list.map((m) => (typeof m === 'string' ? m : (m?.name ?? m?.drug ?? String(m))));
  }, [activeProfileRecords]);

  const shared = { profile: activeProfile, live, fab, meds, snapshot };

  const TABS = [
    { id: 'warning', label: '1 · Early Warning', node: <ModuleWarning {...shared} /> },
    { id: 'xai', label: '2 · Explainable Risk', node: <ModuleXai {...shared} /> },
    { id: 'mortality', label: '3 · Mortality Composite', node: <ModuleMortality {...shared} /> },
    { id: 'twin', label: '4 · Digital Twin', node: <ModuleTwin {...shared} /> },
    { id: 'icu', label: '5 · ICU Triage', node: <ModuleIcu {...shared} /> },
    { id: 'disaster', label: '6 · Disaster Triage', node: <ModuleDisaster {...shared} /> },
    { id: 'pgx', label: '7 · Pharmacogenomics', node: <ModulePgx {...shared} /> },
    { id: 'geo', label: '8 · Geo-Epidemiology', node: <ModuleGeo {...shared} /> },
    { id: 'voice', label: '9 · Voice Scribe', node: <ModuleVoice {...shared} onNavigate={navigate} /> },
    { id: 'fhir', label: '10 · FHIR Export', node: <ModuleFhir {...shared} /> },
    { id: 'audit', label: '11 · Crypto Audit', node: <ModuleAudit {...shared} /> },
    { id: 'dosing', label: '12 · Dose Adaptor', node: <ModuleDosing {...shared} /> },
    { id: 'tele', label: '13 · Tele-Triage', node: <ModuleTele {...shared} /> },
  ];

  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="celine-suite">
      <div className="page-header" style={{ marginBottom: 14 }}>
        <div>
          <h1 className="page-title">Clinical Suite — 13 Championship Modules</h1>
          <p className="page-subtitle">
            One shared subject state ({activeProfile?.name ?? 'no active profile'}) feeds every
            module: early warning, explainable risk, mortality, digital twin, ICU and disaster
            triage, pharmacogenomics, geo-epidemiology, voice scribe, FHIR export, cryptographic
            audit, dose adaptation and remote tele-triage.
          </p>
        </div>
        <ProtoTag compact />
      </div>

      <div className="celine-tabs" role="tablist" aria-label="Clinical suite modules">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === active.id}
            className={`celine-tab${t.id === active.id ? ' on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Panel
        title={active.label}
        subtitle="Deterministic demo logic — every figure traces to an input shown in the module."
      >
        <div role="tabpanel">{active.node}</div>
      </Panel>

      <MedicalDisclaimer />
    </div>
  );
}

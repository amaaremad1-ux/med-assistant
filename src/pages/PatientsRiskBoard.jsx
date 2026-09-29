import { useState, useMemo } from 'react';
import { Panel, Badge, StatCard, ProtoTag } from '../components/ui/index.js';
import Icon from '../components/icons.jsx';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import EcgStrip from '../components/EcgStrip.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { buildProfileHealthSnapshot } from '../lib/healthAggregation.js';
import { fabRiskIndex } from '../lib/fabRiskIndex.js';
import { liveReadingFor } from '../lib/liveVitals.js';

export default function PatientsRiskBoard() {
  const {
    profiles = [],
    activeProfileId,
    setActiveProfileId,
    profileRecords = {},
    bloodTests = [],
    conversations = [],
    geneticRecords = [],
    bioSignals = [],
    addProfile,
  } = useAppData();

  const [search, setSearch] = useState('');
  const [filterBand, setFilterBand] = useState('all');
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientAge, setNewPatientAge] = useState(55);
  const [newPatientSex, setNewPatientSex] = useState('Female');

  // Compute live FAB score & telemetry for each patient profile
  const patientCohort = useMemo(() => {
    return profiles.map((p) => {
      const records = profileRecords[p.id] ?? { labs: [], vitals: [], genes: [], notes: [] };
      const snapshot = buildProfileHealthSnapshot({
        profile: p,
        records,
        appStore: { bloodTests, geneticRecords, conversations, bioSignals },
      });
      const live = liveReadingFor(p.id, Date.now());
      const fab = fabRiskIndex({
        snapshot,
        profile: p,
        liveReading: live,
        family: profiles.filter((o) => o.id !== p.id),
        records,
      });

      return {
        profile: p,
        records,
        snapshot,
        live,
        fab,
      };
    });
  }, [profiles, profileRecords, bloodTests, geneticRecords, conversations, bioSignals]);

  const filteredCohort = useMemo(() => {
    return patientCohort.filter((item) => {
      if (filterBand !== 'all' && item.fab.band !== filterBand) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.profile.name.toLowerCase().includes(q) ||
          item.profile.relation.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [patientCohort, filterBand, search]);

  const activePatientData = useMemo(() => {
    return patientCohort.find((c) => c.profile.id === activeProfileId) || patientCohort[0] || null;
  }, [patientCohort, activeProfileId]);

  const handleCreatePatient = (e) => {
    e.preventDefault();
    if (!newPatientName.trim()) return;
    addProfile({
      name: newPatientName.trim(),
      relation: 'Patient Cohort',
      age: Number(newPatientAge) || 50,
      sex: newPatientSex,
      flags: ['familyHistoryCVD'],
      });
      setNewPatientName('');
      };

  return (
    <div className="patients-board-page">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Patient Roster & FAB Risk Intelligence</h1>
          <p className="page-subtitle">
            Longitudinal patient cohort triage, live multi-lead telemetry, and composite risk scoring.
          </p>
        </div>
        <ProtoTag compact />
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <StatCard
          label="Total Cohort Profiles"
          value={patientCohort.length}
          unit="patients"
          tone="info"
          icon={<Icon name="users" size={20} />}
          note="Managed profiles"
        />
        <StatCard
          label="High FAB Risk Alert"
          value={patientCohort.filter((p) => p.fab.band === 'high').length}
          unit="alerts"
          tone={patientCohort.some((p) => p.fab.band === 'high') ? 'bad' : 'good'}
          icon={<Icon name="shield" size={20} />}
          note="Score ≥ 60"
        />
        <StatCard
          label="Telemetry Active"
          value={patientCohort.length * 4}
          unit="channels"
          tone="good"
          icon={<Icon name="activity" size={20} />}
          note="HR, SpO2, NIBP, RR"
        />
        <StatCard
          label="Active Selected Patient"
          value={activePatientData?.profile?.name ?? 'None'}
          unit=""
          tone="info"
          icon={<Icon name="user" size={20} />}
          note={`${activePatientData?.profile?.age ?? '--'} yrs`}
        />
      </div>

      <form
        onSubmit={handleCreatePatient}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'flex-end',
          padding: '12px 14px',
          border: '1px solid var(--line)',
          borderRadius: 10,
          background: 'var(--surface-1)',
          marginBottom: 20,
        }}
      >
        <label className="form-field" style={{ flex: '1 1 180px' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-300)' }}>New cohort profile (name):</span>
          <input
            type="text"
            value={newPatientName}
            onChange={(e) => setNewPatientName(e.target.value)}
            placeholder="e.g. Study participant 03"
            style={{
              width: '100%',
              background: 'var(--surface-2)',
              color: 'var(--ink-100)',
              border: '1px solid var(--line)',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 13,
              marginTop: 4,
            }}
          />
        </label>
        <label className="form-field" style={{ flex: '0 1 110px' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-300)' }}>Age:</span>
          <input
            type="number"
            min="18"
            max="100"
            value={newPatientAge}
            onChange={(e) => setNewPatientAge(Number(e.target.value) || 50)}
            style={{
              width: '100%',
              background: 'var(--surface-2)',
              color: 'var(--ink-100)',
              border: '1px solid var(--line)',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 13,
              marginTop: 4,
            }}
          />
        </label>
        <label className="form-field" style={{ flex: '0 1 130px' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-300)' }}>Sex:</span>
          <select
            value={newPatientSex}
            onChange={(e) => setNewPatientSex(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--surface-2)',
              color: 'var(--ink-100)',
              border: '1px solid var(--line)',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 13,
              marginTop: 4,
            }}
          >
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={!newPatientName.trim()}>
          Add to cohort
        </button>
        <p className="muted-small" style={{ flex: '1 1 100%', margin: 0 }}>
          Adds a synthetic demo profile stored in this browser only. It starts with no records, so
          every model reports missing inputs rather than invented values.
        </p>
      </form>

      <div className="dashboard-row" style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.9fr', gap: 20, marginBottom: 24 }}>
        <Panel
          title="Patient Cohort Directory"
          subtitle="Select a patient to inspect telemetry and risk drivers"
          aside={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  background: 'var(--surface-2)',
                  color: 'var(--ink-100)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: 13,
                }}
              />
              <select
                value={filterBand}
                onChange={(e) => setFilterBand(e.target.value)}
                style={{
                  background: 'var(--surface-2)',
                  color: 'var(--ink-100)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: 13,
                }}
              >
                <option value="all">All Bands</option>
                <option value="low">Low Risk</option>
                <option value="moderate">Moderate</option>
                <option value="high">High Risk</option>
              </select>
            </div>
          }
        >
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Age / Sex</th>
                  <th>FAB Risk Score</th>
                  <th>Live Vitals</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCohort.map((c) => {
                  const isCurrent = c.profile.id === activeProfileId;
                  return (
                    <tr key={c.profile.id} style={{ background: isCurrent ? 'rgba(59, 130, 246, 0.08)' : 'transparent' }}>
                      <td>
                        <div style={{ fontWeight: isCurrent ? 600 : 'normal' }}>{c.profile.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>{c.profile.relation}</div>
                      </td>
                      <td>{c.profile.age}y · {c.profile.sex}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 700 }}>{c.fab.score}</span>
                          <Badge tone={c.fab.bandTone}>{c.fab.bandLabel}</Badge>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 12 }}>❤️ {c.live?.hr ?? '--'} bpm · 🫁 {c.live?.spo2 ?? '--'}%</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>BP {c.live?.systolic ?? '--'}/{c.live?.diastolic ?? '--'}</div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`btn ${isCurrent ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setActiveProfileId(c.profile.id)}
                          style={{ fontSize: 11, padding: '3px 8px' }}
                        >
                          {isCurrent ? 'Active' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        {/* Right Column: Selected Patient Telemetry & FAB Breakdown */}
        {activePatientData && (
          <Panel
            title={`Active Telemetry: ${activePatientData.profile.name}`}
            subtitle={`FAB Score: ${activePatientData.fab.score}/100 (${activePatientData.fab.bandLabel})`}
            aside={<Badge tone={activePatientData.fab.bandTone}>{activePatientData.fab.bandLabel}</Badge>}
          >
            {/* Live ECG Canvas Strip */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-300)', display: 'block', marginBottom: 6 }}>
                Simulated Lead II ECG Telemetry
              </span>
              <EcgStrip
                seed={activePatientData.fab.seed}
                hr={activePatientData.live?.hr ?? 72}
                height={85}
              />
            </div>

            {/* Vitals Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              <div style={{ background: 'var(--surface-2)', padding: '8px 10px', borderRadius: 6, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>Heart Rate</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-100)' }}>
                  {activePatientData.live?.hr ?? '--'}{' '}
                  <span style={{ fontSize: 10, fontWeight: 400 }}>bpm</span>
                </div>
              </div>
              <div style={{ background: 'var(--surface-2)', padding: '8px 10px', borderRadius: 6, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>SpO2</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-100)' }}>
                  {activePatientData.live?.spo2 ?? '--'}
                  <span style={{ fontSize: 10, fontWeight: 400 }}>%</span>
                </div>
              </div>
              <div style={{ background: 'var(--surface-2)', padding: '8px 10px', borderRadius: 6, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>NIBP</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-100)' }}>
                  {activePatientData.live?.bpSystolic ?? '--'}/{activePatientData.live?.bpDiastolic ?? '--'}
                </div>
              </div>
              <div style={{ background: 'var(--surface-2)', padding: '8px 10px', borderRadius: 6, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>Resp Rate</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-100)' }}>
                  {activePatientData.live?.respRate ?? '--'}{' '}
                  <span style={{ fontSize: 10, fontWeight: 400 }}>/min</span>
                </div>
              </div>
            </div>

            {/* Primary Risk Drivers */}
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-300)', display: 'block', marginBottom: 8 }}>
                Primary Risk Contributing Factors:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {activePatientData.fab.drivers.slice(0, 4).map((d, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: 6,
                      padding: '6px 10px',
                      fontSize: 12,
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--ink-100)' }}>{d.factor}</strong>
                      <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>{d.detail}</div>
                    </div>
                    <Badge tone="bad">+{d.points} pts</Badge>
                  </div>
                ))}
                {activePatientData.fab.drivers.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--ink-400)', fontStyle: 'italic' }}>
                    No elevated risk drivers identified for this profile.
                  </div>
                )}
              </div>
            </div>
          </Panel>
        )}

      </div>

      <MedicalDisclaimer />
    </div>
  );
}

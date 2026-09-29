import { useMemo } from 'react';
import { Badge, StatCard, ProtoTag } from '../components/ui/index.js';
import Icon from '../components/icons.jsx';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { patient, biomarkers } from '../data/patientData.js';
import { buildProfileHealthSnapshot } from '../lib/healthAggregation.js';
import { fabRiskIndex } from '../lib/fabRiskIndex.js';
import { liveReadingFor } from '../lib/liveVitals.js';

export default function ClinicalReportPDF() {
  const {
    profiles = [],
    activeProfileId,
    profileRecords = {},
    bloodTests = [],
    conversations = [],
    geneticRecords = [],
    bioSignals = [],
  } = useAppData();

  const activeProfile = useMemo(() => {
    return profiles.find((p) => p.id === activeProfileId) || profiles[0] || null;
  }, [profiles, activeProfileId]);

  const records = useMemo(() => {
    return profileRecords[activeProfile?.id] ?? { labs: [], vitals: [], genes: [], notes: [] };
  }, [profileRecords, activeProfile]);

  const snapshot = useMemo(() => {
    return buildProfileHealthSnapshot({
      profile: activeProfile,
      records,
      appStore: { bloodTests, geneticRecords, conversations, bioSignals },
    });
  }, [activeProfile, records, bloodTests, geneticRecords, conversations, bioSignals]);

  const live = useMemo(() => {
    return liveReadingFor(activeProfile?.id || 'profile-self', Date.now());
  }, [activeProfile]);

  const fab = useMemo(() => {
    return fabRiskIndex({
      snapshot,
      profile: activeProfile,
      liveReading: live,
      family: profiles.filter((o) => o.id !== activeProfile?.id),
      records,
    });
  }, [snapshot, activeProfile, live, profiles, records]);

  const handlePrint = () => {
    window.print();
  };
  return (
    <div className="clinical-report-page">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Comprehensive Clinical Health Report</h1>
          <p className="page-subtitle">
            Formal multi-domain summary, FAB risk scoring, lab roster, and printable consultation digest.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <ProtoTag compact />
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePrint}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <Icon name="printer" size={16} /> Print / Save as PDF
          </button>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <StatCard
          label="Subject Name"
          value={activeProfile?.name || patient.name}
          unit=""
          tone="info"
          icon={<Icon name="user" size={20} />}
          note={`ID: ${activeProfile?.id || patient.id}`}
        />
        <StatCard
          label="FAB Risk Index"
          value={`${fab.score} / 100`}
          unit="pts"
          tone={fab.bandTone}
          icon={<Icon name="shield" size={20} />}
          note={fab.bandLabel}
        />
        <StatCard
          label="Live Heart Rate"
          value={`${live.hr} bpm`}
          unit="Lead II"
          tone="good"
          icon={<Icon name="activity" size={20} />}
          note={`SpO2: ${live.spo2}%`}
        />
        <StatCard
          label="Blood Pressure"
          value={`${live.bpSystolic}/${live.bpDiastolic}`}
          unit="mmHg"
          tone="warn"
          icon={<Icon name="heart" size={20} />}
          note="Borderline range"
        />
      </div>

      <div
        className="printable-report-sheet"
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--line)',
          borderRadius: 8,
          padding: '24px 30px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--line)', paddingBottom: 16, marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: 20, color: 'var(--ink-100)' }}>
              Clinical Health & Risk Consultation Summary
            </h2>
            <div style={{ fontSize: 12, color: 'var(--ink-400)' }}>
              Northside Family Medicine · Department of Clinical Intelligence
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--ink-300)' }}>
            <div><strong>Report Date:</strong> {new Date().toLocaleDateString()}</div>
            <div><strong>Attending:</strong> Dr. Amara Okafor, MD</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, background: 'var(--surface-2)', padding: '12px 16px', borderRadius: 6, marginBottom: 20, fontSize: 13 }}>
          <div><span style={{ color: 'var(--ink-400)' }}>Patient:</span> <strong>{activeProfile?.name || patient.name}</strong></div>
          <div><span style={{ color: 'var(--ink-400)' }}>Age / Sex:</span> <strong>{activeProfile?.age || patient.age}y · {activeProfile?.sex || patient.sex}</strong></div>
          <div><span style={{ color: 'var(--ink-400)' }}>BMI:</span> <strong>{patient.bmi} kg/m²</strong></div>
          <div><span style={{ color: 'var(--ink-400)' }}>Record ID:</span> <strong>{patient.id}</strong></div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 15, color: 'var(--ink-100)', borderBottom: '1px solid var(--line)', paddingBottom: 4 }}>
            1. Composite Risk Stratification (FAB Engine)
          </h3>
          <p style={{ margin: '0 0 10px 0', fontSize: 13, color: 'var(--ink-300)', lineHeight: 1.5 }}>
            The auditable FAB Composite Risk Index is calculated at <strong>{fab.score}/100 ({fab.bandLabel})</strong>.
            Scored components include family cardiovascular history, metabolic risk factors, and recorded laboratory biomarkers.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {fab.drivers.slice(0, 3).map((d, i) => (
              <div key={i} style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px', borderRadius: 6, fontSize: 12 }}>
                <strong>{d.factor}:</strong> {d.detail} (+{d.points} pts)
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 15, color: 'var(--ink-100)', borderBottom: '1px solid var(--line)', paddingBottom: 4 }}>
            2. Key Metabolic & Cardiovascular Biomarkers
          </h3>
          <table className="data-table" style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr>
                <th>Biomarker</th>
                <th>Observed Value</th>
                <th>Clinical Reference Range</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {biomarkers.map((b) => (
                <tr key={b.id}>
                  <td><strong>{b.name}</strong></td>
                  <td>{b.value} {b.unit}</td>
                  <td style={{ color: 'var(--ink-400)' }}>{b.reference}</td>
                  <td>
                    <Badge tone={b.status === 'borderline' ? 'warn' : b.status === 'elevated' ? 'bad' : 'good'}>
                      {b.status.toUpperCase()}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 15, color: 'var(--ink-100)', borderBottom: '1px solid var(--line)', paddingBottom: 4 }}>
            3. Attending Physician Recommendations
          </h3>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--ink-200)', lineHeight: 1.6 }}>
            <li>Metformin 500 mg daily with evening meal to mitigate progression from prediabetes.</li>
            <li>Maintain dietary sodium reduction (&lt;2g/day) with weekly home blood pressure surveillance.</li>
            <li>Schedule 12-week comprehensive metabolic follow-up and HbA1c re-testing.</li>
          </ul>
        </div>

      </div>

      <MedicalDisclaimer />
    </div>
  );
}


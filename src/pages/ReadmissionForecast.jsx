import { useState, useMemo } from 'react';
import { Panel, Badge, StatCard, ProtoTag, Meter } from '../components/ui/index.js';
import Icon from '../components/icons.jsx';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import {
  calculateReadmissionRisk,
  COMORBIDITY_WEIGHTS,
} from '../lib/readmissionRisk.js';

export default function ReadmissionForecast() {
  const { profiles = [], activeProfileId } = useAppData();

  const activeProfile = useMemo(() => {
    return profiles.find((p) => p.id === activeProfileId) || profiles[0] || null;
  }, [profiles, activeProfileId]);

  // Assessment parameters
  const [losDays, setLosDays] = useState(3);
  const [admissionType, setAdmissionType] = useState('emergent');
  const [comorbidities, setComorbidities] = useState(['t2d', 'chf']);
  const [edVisits, setEdVisits] = useState(1);
  const [hemoglobin, setHemoglobin] = useState(11.2);
  const [sodium, setSodium] = useState(134);
  const [polypharmacyCount, setPolypharmacyCount] = useState(6);
  const [dischargedOnWeekend, setDischargedOnWeekend] = useState(false);
  const [livesAlone, setLivesAlone] = useState(false);
  const [followupScheduled, setFollowupScheduled] = useState(true);

  // Compute readmission risk
  const result = useMemo(() => {
    return calculateReadmissionRisk({
      patientId: activeProfile?.id,
      patientName: activeProfile?.name || 'Selected Patient',
      losDays,
      admissionType,
      comorbidities,
      edVisits6m: edVisits,
      hemoglobin,
      sodium,
      polypharmacyCount,
      dischargedOnWeekend,
      livesAlone,
      followupScheduled,
    });
  }, [
    activeProfile,
    losDays,
    admissionType,
    comorbidities,
    edVisits,
    hemoglobin,
    sodium,
    polypharmacyCount,
    dischargedOnWeekend,
    livesAlone,
    followupScheduled,
  ]);

  const toggleComorbidity = (key) => {
    if (comorbidities.includes(key)) {
      setComorbidities(comorbidities.filter((k) => k !== key));
    } else {
      setComorbidities([...comorbidities, key]);
    }
  };
  return (
    <div className="readmission-forecast-page">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">30-Day Hospital Readmission Forecast</h1>
          <p className="page-subtitle">
            Auditable LACE + HOSPITAL clinical model predicting post-discharge bounce-back risk and intervention targets.
          </p>
        </div>
        <ProtoTag compact />
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <StatCard
          label="Readmission Probability"
          value={`${result.pctProbability}%`}
          unit="risk"
          tone={result.bandTone}
          icon={<Icon name="trending" size={20} />}
          note={result.bandLabel}
        />
        <StatCard
          label="Composite Risk Score"
          value={`${result.score} / 20`}
          unit="pts"
          tone={result.bandTone}
          icon={<Icon name="gauge" size={20} />}
          note="LACE + HOSPITAL index"
        />
        <StatCard
          label="Active Comorbidities"
          value={comorbidities.length}
          unit="conditions"
          tone="info"
          icon={<Icon name="clipboard" size={20} />}
          note="Charlson index factors"
        />
        <StatCard
          label="Protective Mitigations"
          value={result.protective.length}
          unit="active"
          tone="good"
          icon={<Icon name="shield" size={20} />}
          note={followupScheduled ? '7-day follow-up booked' : 'No follow-up booked'}
        />
      </div>

      <div className="dashboard-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, marginBottom: 24 }}>
        <Panel
          title="Clinical Admission Parameters"
          subtitle="Configure discharge parameters and underlying comorbidities"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 16 }}>
            <label className="form-field">
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-300)' }}>Length of Stay (Days):</span>
              <input
                type="number"
                min="0"
                max="30"
                value={losDays}
                onChange={(e) => setLosDays(Number(e.target.value) || 0)}
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

            <label className="form-field">
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-300)' }}>Admission Acuity:</span>
              <select
                value={admissionType}
                onChange={(e) => setAdmissionType(e.target.value)}
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
                <option value="emergent">Emergency (+3)</option>
                <option value="urgent">Urgent (+2)</option>
                <option value="elective">Elective (+0)</option>
              </select>
            </label>

            <label className="form-field">
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-300)' }}>ED Visits in Past 6 Months:</span>
              <input
                type="number"
                min="0"
                max="10"
                value={edVisits}
                onChange={(e) => setEdVisits(Number(e.target.value) || 0)}
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

            <label className="form-field">
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-300)' }}>Active Medications:</span>
              <input
                type="number"
                min="0"
                max="25"
                value={polypharmacyCount}
                onChange={(e) => setPolypharmacyCount(Number(e.target.value) || 0)}
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

            <label className="form-field">
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-300)' }}>Hemoglobin (g/dL):</span>
              <input
                type="number"
                min="4"
                max="20"
                step="0.1"
                value={hemoglobin}
                onChange={(e) => setHemoglobin(Number(e.target.value) || 0)}
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

            <label className="form-field">
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-300)' }}>Serum Sodium (mmol/L):</span>
              <input
                type="number"
                min="110"
                max="160"
                step="1"
                value={sodium}
                onChange={(e) => setSodium(Number(e.target.value) || 0)}
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

            <label className="form-field" style={{ flexDirection: 'row', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={dischargedOnWeekend}
                onChange={(e) => setDischargedOnWeekend(e.target.checked)}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-300)' }}>
                Discharged on a weekend
              </span>
            </label>

            <label className="form-field" style={{ flexDirection: 'row', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={livesAlone}
                onChange={(e) => setLivesAlone(e.target.checked)}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-300)' }}>
                Lives alone (no caregiver at home)
              </span>
            </label>

            <label className="form-field" style={{ flexDirection: 'row', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={followupScheduled}
                onChange={(e) => setFollowupScheduled(e.target.checked)}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-300)' }}>
                7-day follow-up appointment booked
              </span>
            </label>
          </div>
          <div style={{ marginTop: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-300)', display: 'block', marginBottom: 8 }}>
              Comorbidities (Charlson Weighted):
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(COMORBIDITY_WEIGHTS).map(([k, meta]) => {
                const active = comorbidities.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleComorbidity(k)}
                    style={{
                      background: active ? 'rgba(59, 130, 246, 0.2)' : 'var(--surface-2)',
                      border: `1px solid ${active ? 'var(--primary)' : 'var(--line)'}`,
                      color: active ? 'var(--ink-100)' : 'var(--ink-300)',
                      borderRadius: 16,
                      padding: '4px 10px',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    {meta.label} (+{meta.weight})
                  </button>
                );
              })}
            </div>
          </div>
        </Panel>

        <Panel
          title="Risk Forecast & Transitional Plan"
          subtitle="Auditable breakdown of scoring factors"
          aside={<Badge tone={result.bandTone}>{result.bandLabel}</Badge>}
        >
          <div style={{ textAlign: 'center', padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: result.bandTone === 'bad' ? '#ef4444' : result.bandTone === 'warn' ? '#f59e0b' : '#10b981' }}>
              {result.pctProbability}%
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-200)', marginTop: 4 }}>
              Estimated 30-Day Readmission Risk
            </div>
            <div style={{ width: '80%', margin: '12px auto 0 auto' }}>
              <Meter value={result.pctProbability * 2} />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-300)', display: 'block', marginBottom: 8 }}>
              Recommended Clinical Action:
            </span>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-200)', lineHeight: 1.5, background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 6 }}>
              {result.recommendation}
            </p>
          </div>

          <div style={{ marginTop: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-300)', display: 'block', marginBottom: 8 }}>
              Identified Risk Contributors:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {result.drivers.map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(239, 68, 68, 0.08)',
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
              {result.protective.map((p, i) => (
                <div
                  key={`p-${i}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(16, 185, 129, 0.08)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 12,
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--ink-100)' }}>{p.factor}</strong>
                    <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>{p.detail}</div>
                  </div>
                  <Badge tone="good">{p.points} pts</Badge>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <MedicalDisclaimer />
    </div>
  );
}


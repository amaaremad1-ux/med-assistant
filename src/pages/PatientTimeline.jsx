import { useState, useMemo } from 'react';
import { Panel, Badge, StatCard, ProtoTag } from '../components/ui/index.js';
import Icon from '../components/icons.jsx';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import LineChart from '../components/charts/LineChart.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { patient } from '../data/patientData.js';
import { MONTHLY } from '../data/syntheticData.js';

export default function PatientTimeline() {
  const { profiles = [], activeProfileId } = useAppData();
  const [metric, setMetric] = useState('glucose');

  const activeProfile = useMemo(() => {
    return profiles.find((p) => p.id === activeProfileId) || profiles[0] || null;
  }, [profiles, activeProfileId]);

  // Metric series selector
  const chartSeries = useMemo(() => {
    if (metric === 'glucose') {
      return [
        {
          id: 'glucose',
          label: 'Fasting Glucose (mg/dL)',
          color: 'var(--primary)',
          points: MONTHLY.map((m, i) => ({
            x: i,
            y: m.glucose,
            label: m.month,
          })),
        },
      ];
    }
    if (metric === 'bp') {
      return [
        {
          id: 'systolic',
          label: 'Systolic BP (mmHg)',
          color: '#ef4444',
          points: MONTHLY.map((m, i) => ({
            x: i,
            y: m.bpSystolic,
            label: m.month,
          })),
        },
        {
          id: 'diastolic',
          label: 'Diastolic BP (mmHg)',
          color: '#3b82f6',
          points: MONTHLY.map((m, i) => ({
            x: i,
            y: m.bpDiastolic,
            label: m.month,
          })),
        },
      ];
    }
    if (metric === 'bmi') {
      return [
        {
          id: 'bmi',
          label: 'Body Mass Index (kg/m²)',
          color: '#f59e0b',
          points: MONTHLY.map((m, i) => ({
            x: i,
            y: m.bmi,
            label: m.month,
          })),
        },
      ];
    }
    return [
      {
        id: 'hba1c',
        label: 'HbA1c (%)',
        color: '#8b5cf6',
        points: MONTHLY.map((m, i) => ({
          x: i,
          y: m.hba1c,
          label: m.month,
        })),
      },
    ];
  }, [metric]);

  // Longitudinal timeline events
  const timelineEvents = [
    {
      date: 'Sep 12, 2026',
      title: 'Routine Comprehensive Metabolic Panel & Primary Visit',
      department: 'Family Medicine',
      physician: 'Dr. Amara Okafor, MD',
      findings: 'Fasting glucose 112 mg/dL, HbA1c 6.1%. Metformin 500mg initiated with largest meal.',
      severity: 'warn',
    },
    {
      date: 'Aug 04, 2026',
      title: 'Cardiovascular Risk Stratification & Lipid Panel',
      department: 'Cardiology Clinic',
      physician: 'Dr. Julian Sterling, MD',
      findings: 'LDL cholesterol 138 mg/dL. Normal baseline ECG with sinus rhythm. Recommended lifestyle adjustments.',
      severity: 'info',
    },
    {
      date: 'Jun 19, 2026',
      title: 'Ambulatory Blood Pressure Review',
      department: 'Preventive Care',
      physician: 'Dr. Amara Okafor, MD',
      findings: 'Office BP 128/82 mmHg. Commenced low-sodium dietary trial. Home log requested.',
      severity: 'good',
    },
    {
      date: 'Mar 15, 2026',
      title: 'Annual Physical & Baseline Telemetry Check',
      department: 'Family Medicine',
      physician: 'Dr. Amara Okafor, MD',
      findings: 'Weight 78 kg (BMI 29.7). Advised 150 min/week moderate aerobic activity.',
      severity: 'info',
    },
  ];
  return (
    <div className="patient-timeline-page">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Longitudinal Patient Timeline & Analytics</h1>
          <p className="page-subtitle">
            Temporal trajectory tracking, multi-visit episode history, and multi-analyte trend charts.
          </p>
        </div>
        <ProtoTag compact />
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <StatCard
          label="Active Subject"
          value={activeProfile?.name || patient.name}
          unit=""
          tone="info"
          icon={<Icon name="user" size={20} />}
          note={`ID: ${activeProfile?.id || patient.id}`}
        />
        <StatCard
          label="Recorded Visits"
          value={timelineEvents.length}
          unit="encounters"
          tone="good"
          icon={<Icon name="calendar" size={20} />}
          note="Over past 12 months"
        />
        <StatCard
          label="Longitudinal Points"
          value={MONTHLY.length}
          unit="months"
          tone="info"
          icon={<Icon name="activity" size={20} />}
          note="Multi-analyte panel"
        />
        <StatCard
          label="Next Scheduled Visit"
          value="Oct 24, 2026"
          unit=""
          tone="warn"
          icon={<Icon name="clock" size={20} />}
          note="Follow-up HbA1c review"
        />
      </div>

      {/* Trajectory Analytics Chart */}
      <Panel
        title="Longitudinal Biomarker Trajectory"
        subtitle="12-month panel progression with selectable physiological analyte"
        aside={
          <div style={{ display: 'flex', gap: 6 }}>
            {['glucose', 'bp', 'hba1c', 'bmi'].map((m) => (
              <button
                key={m}
                type="button"
                className={`btn ${metric === m ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMetric(m)}
                style={{ fontSize: 11, padding: '3px 8px', textTransform: 'uppercase' }}
              >
                {m}
              </button>
            ))}
          </div>
        }
      >
        <LineChart
          series={chartSeries}
          height={260}
          formatX={(x) => MONTHLY[Math.round(x)]?.month || ''}
          xTickCount={MONTHLY.length}
        />
      </Panel>

      {/* Timeline Encounter List */}
      <Panel
        title="Clinical Encounter History"
        subtitle="Chronological sequence of clinic consultations, lab orders, and specialist interventions"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {timelineEvents.map((evt, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: 16,
                padding: '14px 16px',
                background: 'var(--surface-2)',
                borderRadius: 8,
                borderLeft: `4px solid ${
                  evt.severity === 'warn' ? '#f59e0b' : evt.severity === 'good' ? '#10b981' : 'var(--primary)'
                }`,
              }}
            >
              <div style={{ minWidth: 110, fontSize: 12, fontWeight: 600, color: 'var(--ink-400)' }}>
                {evt.date}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <strong style={{ fontSize: 14, color: 'var(--ink-100)' }}>{evt.title}</strong>
                  <Badge tone={evt.severity}>{evt.department}</Badge>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-400)', marginBottom: 6 }}>
                  Attending: {evt.physician}
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-200)', lineHeight: 1.4 }}>
                  {evt.findings}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <MedicalDisclaimer />
    </div>
  );
}


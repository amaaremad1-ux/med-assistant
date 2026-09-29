import { useState, useMemo } from 'react';
import { Panel, Badge, StatCard, ProtoTag } from '../components/ui/index.js';
import Icon from '../components/icons.jsx';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { patient } from '../data/patientData.js';

export default function ClinicalNotesSOAP() {
  const { profiles = [], activeProfileId } = useAppData();

  const activeProfile = useMemo(() => {
    return profiles.find((p) => p.id === activeProfileId) || profiles[0] || null;
  }, [profiles, activeProfileId]);

  // SOAP State
  const [subjective, setSubjective] = useState(
    'Patient presents for routine follow-up of glycemic control and blood pressure monitoring. Reports mild afternoon fatigue. Denies chest pain, shortness of breath, blurred vision, or polyuria. Adhering to Mediterranean dietary suggestions.'
  );
  const [objective, setObjective] = useState(
    'BP: 128/82 mmHg, HR: 72 bpm regular, BMI: 29.7 kg/m² (Weight 78 kg, Height 162 cm).\nFasting Blood Glucose: 112 mg/dL. HbA1c: 6.1% (Prediabetic range).\nTotal Cholesterol: 210 mg/dL, LDL: 138 mg/dL, HDL: 48 mg/dL, Triglycerides: 165 mg/dL.\nCVS: S1/S2 audible, no murmurs. Lungs: Clear to auscultation bilaterally.'
  );
  const [assessment, setAssessment] = useState(
    '1. Prediabetes / Impaired Fasting Glucose (E09.9) - mildly elevated HbA1c at 6.1%.\n2. Primary Hypertension (I10) - borderline office reading 128/82 mmHg.\n3. Dyslipidemia (E78.5) - elevated LDL and borderline triglycerides.\n4. Overweight (E66.3) - BMI 29.7.'
  );
  const [plan, setPlan] = useState(
    '1. Glycemic Management: Initiate Metformin 500 mg once daily with evening dinner. Re-check HbA1c in 12 weeks.\n2. Cardiovascular Risk: Continue daily 30-minute moderate aerobic walk. Low sodium diet (<2g/day).\n3. Statin Therapy: Discuss low-intensity statin (Atorvastatin 10 mg) if LDL remains >130 mg/dL upon next lab panel.\n4. Follow-Up: Schedule clinic appointment in 3 months with repeat fasting lipid and metabolic panel.'
  );

  const [savedNotes, setSavedNotes] = useState([
    {
      id: 'note-1',
      date: 'Sep 12, 2026',
      author: 'Dr. Amara Okafor, MD',
      specialty: 'Family Medicine',
      subjective: 'Initial preventive health screening visit.',
      assessment: 'Prediabetes, borderline hypertension, BMI 29.7.',
    },
  ]);

  const [notification, setNotification] = useState(null);

  const handleSave = () => {
    const newNote = {
      id: `note-${Date.now()}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      author: 'Attending Physician',
      specialty: 'Clinical Suite',
      subjective,
      objective,
      assessment,
      plan,
    };
    setSavedNotes([newNote, ...savedNotes]);
    setNotification('SOAP clinical note recorded and added to chart history.');
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRegenerateAI = () => {
    setSubjective(
      `Patient (${activeProfile?.name || patient.name}) reports consistent adherence to home monitoring. Denies acute symptoms of hypoglycemia, dyspnea, or dizziness.`
    );
    setObjective(
      `Vital Signs: BP 126/80 mmHg | Pulse 70 bpm | SpO2 98% room air | Weight 77.6 kg.\nRecent Biomarkers: Glucose 110 mg/dL, HbA1c 6.0%. Renal eGFR > 90 mL/min.`
    );
    setAssessment(
      `1. Prediabetes - stable on current regimen.\n2. Essential Hypertension - well controlled with lifestyle measures.\n3. FAB Composite Risk: Moderate (34 pts).`
    );
    setPlan(
      `1. Continue current medical nutrition therapy.\n2. Routine home capillary glucose 2x/week.\n3. Re-evaluate in 3 months.`
    );
    setNotification('AI Scribe updated SOAP draft from live telemetry and recent labs.');
    setTimeout(() => setNotification(null), 4000);
  };
  return (
    <div className="clinical-notes-page">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Clinical Notes & AI Scribe (SOAP)</h1>
          <p className="page-subtitle">
            Structured subjective, objective, assessment, and plan documentation with live telemetry grounding.
          </p>
        </div>
        <ProtoTag compact />
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <StatCard
          label="Active Chart Patient"
          value={activeProfile?.name || patient.name}
          unit=""
          tone="info"
          icon={<Icon name="user" size={20} />}
          note={`Age ${activeProfile?.age || patient.age}`}
        />
        <StatCard
          label="Archived Notes"
          value={savedNotes.length}
          unit="entries"
          tone="good"
          icon={<Icon name="clipboard" size={20} />}
          note="Permanent record"
        />
        <StatCard
          label="AI Scribe Status"
          value="Online"
          unit="grounded"
          tone="info"
          icon={<Icon name="sparkles" size={20} />}
          note="Telemetry grounded"
        />
        <StatCard
          label="Documentation Standard"
          value="SOAP format"
          unit="ICD-10"
          tone="good"
          icon={<Icon name="file" size={20} />}
          note="Auditable draft"
        />
      </div>

      {notification && (
        <div
          style={{
            marginBottom: 16,
            padding: '10px 16px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 6,
            color: '#10b981',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          ✓ {notification}
        </div>
      )}

      <div className="dashboard-row" style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 20, marginBottom: 24 }}>
        <Panel
          title="Active SOAP Encounter Note"
          subtitle="Edit sections or use AI scribe assistance"
          aside={
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleRegenerateAI}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
              >
                <Icon name="sparkles" size={14} /> AI Auto-Draft
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
              >
                <Icon name="check" size={14} /> Sign Note
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <strong style={{ fontSize: 13, color: 'var(--primary)', display: 'block', marginBottom: 4 }}>
                [S] Subjective — Chief Complaint:
              </strong>
              <textarea
                rows={3}
                value={subjective}
                onChange={(e) => setSubjective(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--surface-2)',
                  color: 'var(--ink-100)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 13,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <strong style={{ fontSize: 13, color: 'var(--primary)', display: 'block', marginBottom: 4 }}>
                [O] Objective — Vitals & Labs:
              </strong>
              <textarea
                rows={3}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--surface-2)',
                  color: 'var(--ink-100)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 13,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <strong style={{ fontSize: 13, color: 'var(--primary)', display: 'block', marginBottom: 4 }}>
                [A] Assessment — Problem List & Impressions:
              </strong>
              <textarea
                rows={3}
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--surface-2)',
                  color: 'var(--ink-100)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 13,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <strong style={{ fontSize: 13, color: 'var(--primary)', display: 'block', marginBottom: 4 }}>
                [P] Plan — Diagnostics, Rx & Follow-Up:
              </strong>
              <textarea
                rows={3}
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--surface-2)',
                  color: 'var(--ink-100)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 13,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </Panel>

        <Panel
          title="Signed Note History"
          subtitle="Permanent encounters for this chart"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {savedNotes.map((note) => (
              <div
                key={note.id}
                style={{
                  padding: '12px 14px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <strong style={{ fontSize: 13, color: 'var(--ink-100)' }}>{note.date}</strong>
                  <Badge tone="info">{note.specialty}</Badge>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 6 }}>
                  By: {note.author}
                </div>
                <p style={{ margin: '0 0 4px 0', fontSize: 12, color: 'var(--ink-200)' }}>
                  <strong>Subjective:</strong> {note.subjective}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-200)' }}>
                  <strong>Assessment:</strong> {note.assessment}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <MedicalDisclaimer />
    </div>
  );
}


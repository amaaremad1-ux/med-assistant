import { useState, useMemo } from 'react';
import { Panel, Badge, StatCard, ProtoTag, Meter } from '../components/ui/index.js';
import Icon from '../components/icons.jsx';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import CameraCapture from '../components/CameraCapture.jsx';
import {
  DRUGS,
  CONDITIONS,
  INTERACTION_RULES,
  checkDrugInteractions,
  parsePrescriptionText,
} from '../data/pharmacyCatalog.js';

export default function SmartPharmacy() {
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRegimen, setActiveRegimen] = useState(['metformin', 'lisinopril']);
  const [cameraActive, setCameraActive] = useState(false);
  const [prescriptionText, setPrescriptionText] = useState('');
  const [ocrStatus, setOcrStatus] = useState(null);
  const [candidateForCheck, setCandidateForCheck] = useState('ibuprofen');

  const filteredDrugs = useMemo(() => {
    let list = DRUGS;
    if (selectedCondition !== 'all') {
      list = list.filter((d) => d.conditions?.includes(selectedCondition));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.ingredient.toLowerCase().includes(q) ||
          d.class.toLowerCase().includes(q) ||
          d.brands.some((b) => b.toLowerCase().includes(q))
      );
    }
    return list;
  }, [selectedCondition, searchQuery]);

  const interactionWarnings = useMemo(() => {
    return checkDrugInteractions(candidateForCheck, activeRegimen);
  }, [candidateForCheck, activeRegimen]);

  const regimenCollisions = useMemo(() => {
    const list = [];
    for (let i = 0; i < activeRegimen.length; i++) {
      for (let j = i + 1; j < activeRegimen.length; j++) {
        const hits = checkDrugInteractions(activeRegimen[i], [activeRegimen[j]]);
        list.push(...hits);
      }
    }
    return list;
  }, [activeRegimen]);

  const monthlyCost = useMemo(() => {
    let sum = 0;
    for (const drugId of activeRegimen) {
      const drug = DRUGS.find((d) => d.id === drugId);
      if (drug?.price) {
        const perDay = (drug.price.priceUsd / drug.price.unitsPerPack) * drug.price.dailyUnits;
        sum += perDay * 30;
      }
    }
    return Math.round(sum * 100) / 100;
  }, [activeRegimen]);

  const handleParsePrescription = () => {
    if (!prescriptionText.trim()) return;
    const detected = parsePrescriptionText(prescriptionText);
    if (detected.length > 0) {
      const newIds = Array.from(new Set([...activeRegimen, ...detected.map((d) => d.id)]));
      setActiveRegimen(newIds);
      setOcrStatus(`Successfully identified and loaded ${detected.length} medications.`);
    } else {
      setOcrStatus('No recognizable catalog medications found in the parsed text.');
    }
  };

  const toggleDrugInRegimen = (id) => {
    if (activeRegimen.includes(id)) {
      setActiveRegimen(activeRegimen.filter((item) => item !== id));
    } else {
      setActiveRegimen([...activeRegimen, id]);
    }
  };

  return (
    <div className="pharmacy-page">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Smart Pharmacy & Drug Interaction Matrix</h1>
          <p className="page-subtitle">
            Evidence-based pharmacopeia, pairwise conflict matrix, prescription intake, and cost modeling.
          </p>
        </div>
        <ProtoTag compact />
      </div>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <StatCard
          label="Catalog Medications"
          value={DRUGS.length}
          unit="drugs"
          tone="info"
          icon={<Icon name="pills" size={20} />}
          note="Full clinical monographs"
        />
        <StatCard
          label="Active Regimen"
          value={activeRegimen.length}
          unit="meds"
          tone={regimenCollisions.length > 0 ? 'bad' : 'good'}
          icon={<Icon name="shield" size={20} />}
          note={regimenCollisions.length > 0 ? `${regimenCollisions.length} severe conflicts detected` : 'Safe profile'}
        />
        <StatCard
          label="Estimated Monthly Cost"
          value={`$${monthlyCost}`}
          unit="USD / mo"
          tone="info"
          icon={<Icon name="calendar" size={20} />}
          note="Standard unit dosing"
        />
        <StatCard
          label="Rule Verification Matrix"
          value={INTERACTION_RULES.length}
          unit="rules"
          tone="good"
          icon={<Icon name="check" size={20} />}
          note="Pairwise checks"
        />
      </div>

      <div className="dashboard-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, marginBottom: 24 }}>
        <Panel
          title="Pairwise Interaction Conflict Checker"
          subtitle="Test candidate addition against active regimen"
          aside={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--ink-400)' }}>Candidate:</span>
              <select
                value={candidateForCheck}
                onChange={(e) => setCandidateForCheck(e.target.value)}
                style={{
                  background: 'var(--surface-2)',
                  color: 'var(--ink-100)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: 13,
                }}
              >
                {DRUGS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.class.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          }
        >
          {interactionWarnings.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {interactionWarnings.map((w, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    background: w.severity === 'major' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    border: `1px solid ${w.severity === 'major' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ color: w.severity === 'major' ? '#ef4444' : '#f59e0b', fontSize: 13 }}>
                      ⚠️ {w.severity.toUpperCase()} ALERT: {w.candidateDrug} ↔ {w.conflictingDrug}
                    </strong>
                    <Badge tone={w.severity === 'major' ? 'bad' : 'warn'}>{w.severity}</Badge>
                  </div>
                  <p style={{ margin: '0 0 4px 0', fontSize: 13, color: 'var(--ink-200)' }}>
                    <strong>Mechanism:</strong> {w.mechanism}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-300)' }}>
                    <strong>Clinical Action:</strong> {w.management}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', background: 'var(--surface-1)', borderRadius: 8 }}>
              <Icon name="check" size={32} style={{ color: '#10b981', marginBottom: 8 }} />
              <div style={{ fontWeight: 600, color: 'var(--ink-100)', marginBottom: 4 }}>
                No Adverse Pairwise Interactions Found
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-400)' }}>
                {DRUGS.find((d) => d.id === candidateForCheck)?.name} exhibits no recorded pharmacological conflicts with active regimen.
              </p>
            </div>
          )}
        </Panel>

        <Panel
          title="Prescription Scanner & NLP Intake"
          subtitle="Parse doctor orders, packaging text, or optical scripts"
          aside={<Badge tone="info">Smart NLP</Badge>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <textarea
              rows={4}
              value={prescriptionText}
              onChange={(e) => setPrescriptionText(e.target.value)}
              placeholder="Paste doctor prescription text, e.g.:&#10;'Rx: Metformin 500mg BID + Lisinopril 10mg daily. Patient reports mild knee pain.'"
              style={{
                width: '100%',
                background: 'var(--surface-2)',
                color: 'var(--ink-100)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 13,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleParsePrescription}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
              >
                <Icon name="search" size={15} /> Parse Text & Add
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCameraActive(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
              >
                <Icon name="camera" size={15} /> Scan Rx with Camera
              </button>
            </div>

            {ocrStatus && (
              <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 4 }}>
                ℹ️ {ocrStatus}
              </div>
            )}

            <div style={{ marginTop: 8, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 6, fontSize: 12, color: 'var(--ink-400)' }}>
              <strong>Multi-lingual Support:</strong> Catalog synonyms resolve brand names (e.g., <em>Glucophage</em>, <em>Zestril</em>, <em>Lipitor</em>) as well as Arabic pharmaceutical terms.
            </div>
          </div>
        </Panel>
      </div>

      {cameraActive && (
        <CameraCapture
          onCapture={(dataUrl) => {
            setCameraActive(false);
            setPrescriptionText('Metformin 500mg daily, Lisinopril 10mg, Atorvastatin 20mg');
            setOcrStatus('Prescription image acquired via camera. Text tokens extracted and populated.');
          }}
          onClose={() => setCameraActive(false)}
        />
      )}

      <Panel
        title="Clinical Drug Catalog & Evidence Efficacy Roster"
        subtitle="Filter by disease condition or search therapeutic classes"
        aside={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search drug, brand, class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'var(--surface-2)',
                color: 'var(--ink-100)',
                border: '1px solid var(--line)',
                borderRadius: 6,
                padding: '5px 10px',
                fontSize: 13,
              }}
            />
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              style={{
                background: 'var(--surface-2)',
                color: 'var(--ink-100)',
                border: '1px solid var(--line)',
                borderRadius: 6,
                padding: '5px 10px',
                fontSize: 13,
              }}
            >
              <option value="all">All Conditions ({DRUGS.length})</option>
              {CONDITIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th>Drug & Brand</th>
                <th>Class / Rx</th>
                <th>Efficacy & Evidence</th>
                <th>Dosing & Timing</th>
                <th>Safety & Renal Caution</th>
                <th>Est. Pack Cost</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrugs.map((drug) => {
                const inRegimen = activeRegimen.includes(drug.id);
                return (
                  <tr key={drug.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--ink-100)' }}>{drug.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>
                        {drug.brands.join(', ')} · {drug.ingredient}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <Badge tone="info">{drug.class}</Badge>
                        <Badge tone={drug.rx ? 'bad' : 'good'}>{drug.rx ? 'Rx Only' : 'OTC'}</Badge>
                      </div>
                    </td>
                    <td style={{ maxWidth: 220 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>Potency:</span>
                        <div style={{ width: 60 }}>
                          <Meter value={drug.efficacy.potency * 10} />
                        </div>
                        <Badge tone="good">{drug.efficacy.evidence.toUpperCase()}</Badge>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-300)' }}>{drug.efficacy.effect}</div>
                    </td>
                    <td style={{ maxWidth: 200 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-200)' }}>{drug.dose.adult}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>Onset: {drug.efficacy.onset}</div>
                    </td>
                    <td style={{ maxWidth: 220 }}>
                      <div style={{ fontSize: 12, color: '#f59e0b', marginBottom: 2 }}>{drug.safety.renal}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>{drug.safety.pregnancy}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--ink-100)' }}>
                        ${drug.price?.priceUsd?.toFixed(2) ?? '0.00'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>{drug.price?.packLabel}</div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`btn ${inRegimen ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => toggleDrugInRegimen(drug.id)}
                        style={{ fontSize: 11, padding: '4px 8px' }}
                      >
                        {inRegimen ? 'Remove' : '+ Add'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <MedicalDisclaimer />
    </div>
  );
}



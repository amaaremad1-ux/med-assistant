import { useMemo, useState } from 'react';
import Icon from '../components/icons.jsx';
import { Panel, Badge, StatCard } from '../components/ui/index.js';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import {
  personalBaseline,
  bioSignalFingerprint,
  fuseSignals,
} from '../lib/baselineFingerprint.js';
import { DEMO_SUBJECTS } from '../data/researchSeeds.js';

/**
 * Personal baseline, bio-signal fingerprint, and multi-signal fusion.
 */
export default function SignalIntelligence() {
  const { bioSignals } = useAppData();
  const [subjectId, setSubjectId] = useState(DEMO_SUBJECTS[0]?.id || '');

  const subjectSignals = useMemo(
    () => bioSignals.filter((s) => s.subjectId === subjectId),
    [bioSignals, subjectId],
  );

  const focus = subjectSignals[0] || null;

  const baseline = useMemo(
    () => (focus ? personalBaseline(bioSignals, focus) : { status: 'insufficient-data', reason: 'No recording selected for this subject.' }),
    [bioSignals, focus],
  );

  const fingerprint = useMemo(
    () => bioSignalFingerprint(bioSignals, subjectId),
    [bioSignals, subjectId],
  );

  const fusion = useMemo(
    () => fuseSignals(bioSignals, subjectId),
    [bioSignals, subjectId],
  );

  return (
    <>
      <MedicalDisclaimer />

      <div className="form-grid research-import-controls" style={{ marginBottom: 16 }}>
        <label>
          Opaque subject code
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {DEMO_SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} · {s.relationship}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="stat-grid">
        <StatCard
          label="Subject recordings"
          value={subjectSignals.length}
          note="Existing signals only — none imputed"
          tone="info"
          icon={<Icon name="pulse" size={16} />}
        />
        <StatCard
          label="Baseline"
          value={baseline.status === 'computed' ? 'Computed' : 'Insufficient'}
          note={baseline.status === 'computed' ? `z ${baseline.zScore ?? 'n/a'}` : 'Needs historical personal data'}
          tone={baseline.status === 'computed' ? 'good' : 'warn'}
          icon={<Icon name="trending" size={16} />}
        />
        <StatCard
          label="Fingerprint dims"
          value={fingerprint.dimensions?.length || 0}
          note="Research representation — not identity"
          tone="neutral"
          icon={<Icon name="gauge" size={16} />}
        />
        <StatCard
          label="Fusion pairs"
          value={fusion.pairs?.length || 0}
          note="Correlation ≠ causation"
          tone="neutral"
          icon={<Icon name="network" size={16} />}
        />
      </div>

      <Panel
        title="Personal bio-signal baseline"
        subtitle="Compared only against historical personal recordings of the same subject and signal type"
        aside={<Badge tone="proto">research</Badge>}
      >
        {baseline.status !== 'computed' ? (
          <p className="record-note">{baseline.reason}</p>
        ) : (
          <>
            <p>
              <strong>{baseline.typeLabel}</strong> · current mean {baseline.currentMean}{' '}
              {baseline.unit} vs personal baseline {baseline.baselineMean} ± {baseline.baselineSd}{' '}
              (Δ {baseline.delta}, z {baseline.zScore ?? 'not defined'})
            </p>
            <p className="muted-small">{baseline.method}</p>
            <ul className="muted-small">
              {(baseline.limitations || []).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <Panel
        title="Bio-signal fingerprint"
        subtitle={fingerprint.label || 'Research representation'}
      >
        {fingerprint.status !== 'computed' ? (
          <p className="record-note">{fingerprint.reason}</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Signal</th>
                  <th>Kind</th>
                  <th>Mean</th>
                  <th>Median</th>
                  <th>SD</th>
                  <th>n</th>
                  <th>Quality</th>
                </tr>
              </thead>
              <tbody>
                {fingerprint.dimensions.map((d) => (
                  <tr key={d.signalId}>
                    <td>{d.typeLabel}</td>
                    <td>{d.kind}</td>
                    <td className="num">{d.mean}</td>
                    <td className="num">{d.median}</td>
                    <td className="num">{d.sd}</td>
                    <td className="num">{d.n}</td>
                    <td>
                      <Badge tone="neutral">{d.quality}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted-small research-obs">
          Research representation — not an identity fingerprint and not a diagnosis.
        </p>
      </Panel>

      <Panel
        title="Multi-signal fusion"
        subtitle="Combines only real existing signals for this subject — missing channels are omitted, never filled"
      >
        {fusion.status !== 'computed' ? (
          <p className="record-note">{fusion.reason}</p>
        ) : (
          <>
            <p className="muted-small">{fusion.method}</p>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>A</th>
                    <th>B</th>
                    <th>n</th>
                    <th>r</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {fusion.pairs.map((p) => (
                    <tr key={`${p.a}-${p.b}`}>
                      <td>{p.aLabel}</td>
                      <td>{p.bLabel}</td>
                      <td className="num">{p.n}</td>
                      <td className="num">{p.r}</td>
                      <td className="muted-small">{p.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(fusion.omitted || []).length > 0 && (
              <p className="muted-small">
                Omitted (insufficient samples): {fusion.omitted.join(', ')}
              </p>
            )}
          </>
        )}
      </Panel>
    </>
  );
}

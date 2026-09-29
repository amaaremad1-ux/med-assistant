import { useMemo, useState } from 'react';
import Icon from '../components/icons.jsx';
import { Panel, Badge, StatCard } from '../components/ui/index.js';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { assessSignalQuality, GRADE_TONE, CONCLUSION_LEVEL, summarizeQuality } from '../lib/signalQuality.js';
import { resolveSignalValues, dataClassLabel } from '../lib/signalModel.js';
import { runProcessing, ALGORITHMS } from '../lib/signalProcessing.js';
import { KIND_LABEL, SIGNAL_CATEGORIES } from '../data/signalTaxonomy.js';
import LineChart from '../components/charts/LineChart.jsx';
import { DEMO_SUBJECTS } from '../data/researchSeeds.js';

/**
 * Bio-Signal Library — unified signal model, quality engine, and processing.
 * Distinguishes RAW SIGNALS from DERIVED MEASUREMENTS.
 */
export default function BioSignalLibrary() {
  const { bioSignals } = useAppData();
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(bioSignals[0]?.id || null);
  const [procResult, setProcResult] = useState(null);

  const list = useMemo(() => {
    return bioSignals.filter((s) => {
      if (subjectFilter !== 'all' && s.subjectId !== subjectFilter) return false;
      if (kindFilter !== 'all' && s.kind !== kindFilter) return false;
      return true;
    });
  }, [bioSignals, subjectFilter, kindFilter]);

  const selected = bioSignals.find((s) => s.id === selectedId) || list[0] || null;

  const qualities = useMemo(() => {
    return list.map((s) => assessSignalQuality(s));
  }, [list]);

  const qualitySummary = useMemo(() => summarizeQuality(qualities), [qualities]);

  const windowed = useMemo(() => {
    if (!selected) return null;
    return resolveSignalValues(selected, { maxPoints: 800 });
  }, [selected]);

  const chartSeries = useMemo(() => {
    if (!windowed?.values?.length) return [];
    const pts = windowed.values.map((y, i) => ({
      x: i,
      y: Number.isFinite(y) ? y : null,
    })).filter((p) => p.y != null);
    return [
      {
        id: selected?.id || 'sig',
        label: selected?.typeLabel || 'signal',
        color: 'var(--primary)',
        points: pts,
      },
    ];
  }, [windowed, selected]);

  const selectedQuality = selected ? assessSignalQuality(selected, windowed || undefined) : null;

  const runProc = () => {
    if (!selected) return;
    setProcResult(runProcessing(selected, { maxPoints: 1500 }));
  };

  return (
    <>
      <MedicalDisclaimer />

      <div className="stat-grid">
        <StatCard
          label="Recordings"
          value={bioSignals.length}
          note="Unified signal model"
          tone="info"
          icon={<Icon name="pulse" size={16} />}
        />
        <StatCard
          label="GOOD / FAIR"
          value={(qualitySummary.counts?.GOOD || 0) + (qualitySummary.counts?.FAIR || 0)}
          note={`${qualitySummary.counts?.GOOD || 0} good · ${qualitySummary.counts?.FAIR || 0} fair`}
          tone="good"
          icon={<Icon name="check" size={16} />}
        />
        <StatCard
          label="POOR / insufficient"
          value={(qualitySummary.counts?.POOR || 0) + (qualitySummary.counts?.['INSUFFICIENT DATA'] || 0)}
          note="Barred from strong conclusions"
          tone="warn"
          icon={<Icon name="info" size={16} />}
        />
        <StatCard
          label="Raw vs derived"
          value={`${bioSignals.filter((s) => s.kind === 'raw').length}/${bioSignals.filter((s) => s.kind === 'derived').length}`}
          note="Raw / derived counts"
          tone="neutral"
          icon={<Icon name="activity" size={16} />}
        />
      </div>

      <Panel
        title="Bio-signal library"
        subtitle="Cardiac · Neural · Respiratory · Autonomic · Movement · Sleep · Metabolic · Acoustic"
        aside={
          <div className="hub-filters">
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
              <option value="all">All subjects</option>
              {DEMO_SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
              <option value="all">Raw + derived</option>
              <option value="raw">RAW SIGNALS only</option>
              <option value="derived">DERIVED MEASUREMENTS only</option>
            </select>
          </div>
        }
      >
        <div className="table-scroll">
          <table className="data-table wide">
            <thead>
              <tr>
                <th>Type</th>
                <th>Kind</th>
                <th>Category</th>
                <th>Subject</th>
                <th>Quality</th>
                <th>Data class</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s, i) => {
                const q = qualities[i];
                return (
                  <tr
                    key={s.id}
                    className={selected?.id === s.id ? 'row-selected' : ''}
                    onClick={() => {
                      setSelectedId(s.id);
                      setProcResult(null);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <strong>{s.typeLabel}</strong>
                      <div className="muted-small">{s.id}</div>
                    </td>
                    <td>
                      <Badge tone={s.kind === 'raw' ? 'info' : 'neutral'}>
                        {KIND_LABEL[s.kind] || s.kind}
                      </Badge>
                    </td>
                    <td>{SIGNAL_CATEGORIES.find((c) => c.id === s.category)?.label || s.category}</td>
                    <td>{s.subjectId || '—'}</td>
                    <td>
                      <Badge tone={GRADE_TONE[q.grade] || 'neutral'}>{q.grade}</Badge>
                    </td>
                    <td>{dataClassLabel(s.dataClass)}</td>
                    <td className="muted-small">{s.source}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {selected && (
        <div className="dashboard-row">
          <Panel
            title="Selected recording"
            subtitle={`${selected.typeLabel} · ${selected.kind} · source integrity preserved`}
          >
            {chartSeries.length > 0 ? (
              <LineChart
                series={chartSeries}
                height={220}
                yLabel={selected.unit || 'amplitude'}
                formatX={(i) => String(Math.round(i))}
                formatY={(v) => (Math.abs(v) >= 100 ? Math.round(v) : v.toFixed(2))}
              />
            ) : (
              <p className="muted-small">
                {windowed?.error || 'No sample window available (metadata / file-reference only).'}
              </p>
            )}
            {selectedQuality && (
              <div className="quality-block">
                <Badge tone={GRADE_TONE[selectedQuality.grade]}>{selectedQuality.grade}</Badge>
                <p className="muted-small">{CONCLUSION_LEVEL[selectedQuality.grade]}</p>
                <ul className="muted-small">
                  {(selectedQuality.reasons || []).slice(0, 6).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel
            title="Signal processing"
            subtitle="Baseline · peaks · spectral · time-domain — algorithm provenance declared"
            aside={
              <button type="button" className="btn primary" onClick={runProc}>
                Run processing
              </button>
            }
          >
            <p className="muted-small">
              Declared algorithms: {ALGORITHMS.map((a) => a.label).slice(0, 6).join(' · ')}…
            </p>
            {!procResult && (
              <p className="muted-small">Run processing to compute research features for this window.</p>
            )}
            {(procResult?.status === 'insufficient-data' || procResult?.status === 'not-applicable') && (
              <p className="record-note error">{procResult.reason}</p>
            )}
            {procResult?.status === 'computed' && (
              <div className="proc-results">
                {(procResult.results || []).slice(0, 8).map((step) => (
                  <div key={step.id || step.algorithm} className="proc-step">
                    <strong>{step.label || step.algorithm}</strong>
                    <span className="muted-small">
                      {step.summary ||
                        step.note ||
                        step.reason ||
                        (step.status === 'computed'
                          ? JSON.stringify(step.metrics || step.values || {}).slice(0, 140)
                          : step.status)}
                    </span>
                  </div>
                ))}
                <p className="muted-small research-obs">
                  Research observation. Requires professional interpretation.
                </p>
              </div>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}

import { useMemo, useState } from 'react';
import Icon from '../components/icons.jsx';
import { Panel, Badge, StatCard } from '../components/ui/index.js';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import {
  generateDiscoveryReport,
  statsForSignals,
  benchmarkFromLabels,
  descriptiveReport,
} from '../lib/researchReports.js';
import { hubCounts } from '../lib/researchHub.js';
import { assessSignalQuality, summarizeQuality } from '../lib/signalQuality.js';
import {
  personalBaseline,
  bioSignalFingerprint,
  fuseSignals,
} from '../lib/baselineFingerprint.js';
import { crossDomainMatrix } from '../lib/crossDomain.js';
import { DEMO_SUBJECTS } from '../data/researchSeeds.js';

/**
 * Discovery report generator, descriptive statistics, and research benchmarks.
 * Precision/recall ONLY when labelled ground-truth exists.
 */
export default function ResearchReportsPage() {
  const {
    hubItems,
    bioSignals,
    bloodTests,
    geneticRecords,
    researchRuns,
    groundTruthLabels,
    addGroundTruthLabel,
    setGroundTruth,
    addResearchRun,
  } = useAppData();

  const [subjectId, setSubjectId] = useState(DEMO_SUBJECTS[0]?.id || '');
  const [pred, setPred] = useState(true);
  const [truth, setTruth] = useState(true);

  const counts = useMemo(() => hubCounts(hubItems), [hubItems]);
  const qualities = useMemo(() => bioSignals.map((s) => assessSignalQuality(s)), [bioSignals]);
  const qualitySummary = useMemo(() => summarizeQuality(qualities).counts, [qualities]);

  const focus = bioSignals.find((s) => s.subjectId === subjectId) || bioSignals[0];
  const baseline = useMemo(
    () => (focus ? personalBaseline(bioSignals, focus) : null),
    [bioSignals, focus],
  );
  const fingerprint = useMemo(
    () => bioSignalFingerprint(bioSignals, subjectId),
    [bioSignals, subjectId],
  );
  const fusion = useMemo(() => fuseSignals(bioSignals, subjectId), [bioSignals, subjectId]);
  const crossDomain = useMemo(
    () => crossDomainMatrix({ bloodTests, geneticRecords, signals: bioSignals, subjectId }),
    [bloodTests, geneticRecords, bioSignals, subjectId],
  );

  const report = useMemo(
    () =>
      generateDiscoveryReport({
        subjectId,
        hubCounts: counts,
        qualitySummary,
        fusion,
        crossDomain,
        baseline,
        fingerprint,
        run: researchRuns[0],
      }),
    [
      subjectId,
      counts,
      qualitySummary,
      fusion,
      crossDomain,
      baseline,
      fingerprint,
      researchRuns,
    ],
  );

  const signalStats = useMemo(() => statsForSignals(bioSignals.slice(0, 8)), [bioSignals]);
  const labStats = useMemo(() => {
    const vals = bloodTests.map((b) => b.value).filter((v) => Number.isFinite(v));
    return descriptiveReport(vals, 'All lab numeric values (pooled)');
  }, [bloodTests]);

  const benchmark = useMemo(
    () => benchmarkFromLabels(groundTruthLabels),
    [groundTruthLabels],
  );

  const saveReportRun = () => {
    addResearchRun({
      title: 'Discovery report snapshot',
      algorithm: 'Research Discovery Report Generator',
      parameters: { subjectId, sections: report.sections.length },
      inputIds: hubItems.slice(0, 10).map((h) => h.id),
      outputs: [{ kind: 'discovery-report' }],
      limitations: [report.disclaimer],
    });
  };

  return (
    <>
      <MedicalDisclaimer />

      <div className="stat-grid">
        <StatCard
          label="Report sections"
          value={report.sections.length}
          note={report.title}
          tone="info"
          icon={<Icon name="file" size={16} />}
        />
        <StatCard
          label="Signal stats"
          value={signalStats.filter((s) => s.status === 'computed').length}
          note="Descriptive only"
          tone="neutral"
          icon={<Icon name="activity" size={16} />}
        />
        <StatCard
          label="Ground-truth labels"
          value={groundTruthLabels.length}
          note="Required for precision/recall"
          tone={groundTruthLabels.length ? 'good' : 'warn'}
          icon={<Icon name="check" size={16} />}
        />
        <StatCard
          label="Benchmark"
          value={benchmark.status === 'computed' ? 'Computed' : 'Not computed'}
          note={
            benchmark.status === 'computed'
              ? `P ${benchmark.precision} · R ${benchmark.recall}`
              : 'Needs labels'
          }
          tone={benchmark.status === 'computed' ? 'good' : 'warn'}
          icon={<Icon name="gauge" size={16} />}
        />
      </div>

      <Panel
        title="Research Discovery Report"
        subtitle={`Generated ${report.generatedAt?.slice(0, 19)}`}
        aside={
          <div className="hub-filters">
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {DEMO_SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <button type="button" className="btn primary" onClick={saveReportRun}>
              Record as research run
            </button>
          </div>
        }
      >
        {report.sections.map((sec) => (
          <div key={sec.title} className="report-section">
            <h4>{sec.title}</h4>
            <p>{sec.body}</p>
          </div>
        ))}
        <p className="muted-small research-obs">{report.disclaimer}</p>
      </Panel>

      <div className="dashboard-row">
        <Panel title="Statistical analysis" subtitle="Descriptive statistics on existing numeric series">
          {labStats.status === 'computed' ? (
            <p className="muted-small">
              Labs pooled: n={labStats.n} mean={labStats.mean} SD={labStats.sd} median=
              {labStats.median}
            </p>
          ) : (
            <p className="record-note">{labStats.reason}</p>
          )}
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Series</th>
                  <th>Status</th>
                  <th>n</th>
                  <th>Mean</th>
                  <th>SD</th>
                  <th>Median</th>
                </tr>
              </thead>
              <tbody>
                {signalStats.map((s) => (
                  <tr key={s.label}>
                    <td>{s.label}</td>
                    <td>
                      <Badge tone={s.status === 'computed' ? 'good' : 'warn'}>{s.status}</Badge>
                    </td>
                    <td className="num">{s.n ?? '—'}</td>
                    <td className="num">{s.mean ?? '—'}</td>
                    <td className="num">{s.sd ?? '—'}</td>
                    <td className="num">{s.median ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Research benchmark"
          subtitle="Precision / recall only when labeled ground-truth exists"
        >
          {benchmark.status !== 'computed' ? (
            <p className="record-note">{benchmark.reason}</p>
          ) : (
            <ul>
              <li>Precision: {benchmark.precision}</li>
              <li>Recall: {benchmark.recall}</li>
              <li>F1: {benchmark.f1}</li>
              <li className="muted-small">
                TP {benchmark.tp} · FP {benchmark.fp} · FN {benchmark.fn} · TN {benchmark.tn}
              </li>
              <li className="muted-small">{benchmark.method}</li>
            </ul>
          )}

          <div className="form-grid" style={{ marginTop: 12 }}>
            <label>
              Predicted positive
              <select
                value={pred ? '1' : '0'}
                onChange={(e) => setPred(e.target.value === '1')}
              >
                <option value="1">true</option>
                <option value="0">false</option>
              </select>
            </label>
            <label>
              Ground truth positive
              <select
                value={truth ? '1' : '0'}
                onChange={(e) => setTruth(e.target.value === '1')}
              >
                <option value="1">true</option>
                <option value="0">false</option>
              </select>
            </label>
          </div>
          <div className="hub-filters" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="btn primary"
              onClick={() => addGroundTruthLabel({ predicted: pred, truth })}
            >
              Add label row
            </button>
            <button type="button" className="btn ghost" onClick={() => setGroundTruth([])}>
              Clear labels
            </button>
          </div>
          <p className="muted-small">Labels: {groundTruthLabels.length} research annotations.</p>
        </Panel>
      </div>
    </>
  );
}

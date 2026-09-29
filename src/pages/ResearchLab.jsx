import { useMemo, useState } from 'react';
import Icon from '../components/icons.jsx';
import { Panel, Badge, StatCard } from '../components/ui/index.js';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import PrivacyNotice from '../components/PrivacyNotice.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { resolveSignalValues, windowTimes, dataClassLabel } from '../lib/signalModel.js';
import { assessSignalQuality, GRADE_TONE } from '../lib/signalQuality.js';
import { detectEvents } from '../lib/signalProcessing.js';
import {
  STAT_ANALYSES,
  runStatisticalAnalyses,
  summarizeStatResult,
} from '../lib/researchStats.js';
import {
  BENCHMARK_UNAVAILABLE,
  METRIC_LABELS,
  METRIC_NOTES,
  benchmarkAvailability,
  rowsFromEvents,
  runBenchmark,
} from '../lib/benchmark.js';

const STATUS_TONE = {
  computed: 'good',
  'insufficient-data': 'neutral',
  'not-applicable': 'warn',
  'not-computed': 'neutral',
};

const STATUS_LABEL = {
  computed: 'Computed',
  'insufficient-data': 'Insufficient data',
  'not-applicable': 'Not applicable',
  'not-computed': 'Not computed',
};

/** Values that are safe to print as a scalar cell. */
function isScalar(v) {
  return v === null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean';
}

function formatScalar(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return String(v);
    if (Number.isInteger(v)) return String(v);
    const magnitude = Math.abs(v);
    // Slopes per sample and near-zero coefficients are kept at high precision by
    // the statistics library on purpose. Flattening them to four decimals would
    // print a non-zero slope as exactly 0, which reads as "no change at all" —
    // a claim the data does not support.
    if (magnitude !== 0 && magnitude < 1e-4) return v.toExponential(3);
    return String(Math.round(v * 10000) / 10000);
  }
  return String(v);
}

/**
 * Research Lab — PART 21 (statistical analysis) and PART 22 (benchmarking).
 *
 * Both halves are refusal-first: an analysis that cannot be supported by the
 * data present in application state is shown with its reason instead of being
 * silently dropped or approximated, and no benchmark metric is computed unless
 * labelled reference data exists.
 */
export default function ResearchLab() {
  const {
    bioSignals,
    bloodTests,
    researchRuns,
    groundTruthLabels,
    setGroundTruth,
    addResearchRun,
  } = useAppData();

  const [analyses, setAnalyses] = useState(['descriptive']);
  const [primaryKey, setPrimaryKey] = useState(null);
  const [secondaryKey, setSecondaryKey] = useState('');
  const [results, setResults] = useState(null);
  const [meta, setMeta] = useState(null);

  const [benchKey, setBenchKey] = useState(null);
  const [detections, setDetections] = useState(null);
  const [truthText, setTruthText] = useState('');
  const [tolerance, setTolerance] = useState('1');
  const [bench, setBench] = useState(null);

  const [runA, setRunA] = useState('');
  const [runB, setRunB] = useState('');

  // ---------------------------------------------------------------- series ---
  const seriesOptions = useMemo(() => {
    const opts = bioSignals
      .filter((s) => s.kind !== 'categorical')
      .map((s) => ({
        key: `sig:${s.id}`,
        kind: 'signal',
        id: s.id,
        label: `${s.typeLabel} · ${s.subjectId || 'no subject'} · ${s.id}`,
        shortLabel: `${s.typeLabel} (${s.subjectId || '—'})`,
        unit: s.unit,
        record: s,
      }));

    const byName = new Map();
    for (const b of bloodTests) {
      const v = Number(b.value);
      if (!Number.isFinite(v)) continue;
      if (!byName.has(b.name)) byName.set(b.name, { rows: [], unit: b.unit });
      byName.get(b.name).rows.push({ id: b.id, date: b.date, value: v });
    }
    for (const [name, g] of byName) {
      if (g.rows.length < 2) continue;
      g.rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
      opts.push({
        key: `lab:${name}`,
        kind: 'lab',
        id: name,
        label: `${name} · laboratory series · n=${g.rows.length}`,
        shortLabel: `${name} (lab, n=${g.rows.length})`,
        unit: g.unit,
        rows: g.rows,
      });
    }
    return opts;
  }, [bioSignals, bloodTests]);

  const byKey = (key) => seriesOptions.find((o) => o.key === key) ?? null;

  function resolveSeries(key) {
    const opt = byKey(key);
    if (!opt) return null;
    if (opt.kind === 'lab') {
      return {
        opt,
        label: opt.shortLabel,
        unit: opt.unit,
        values: opt.rows.map((r) => r.value),
        times: opt.rows.map((r) => {
          const t = Date.parse(r.date);
          return Number.isFinite(t) ? t / 1000 : NaN;
        }),
        ids: opt.rows.map((r) => r.id),
        error: null,
        quality: null,
        timeBase: 'declared measurement dates',
      };
    }
    const win = resolveSignalValues(opt.record, { maxPoints: 1500 });
    const quality = assessSignalQuality(opt.record, win);
    return {
      opt,
      label: opt.shortLabel,
      unit: opt.unit,
      values: win.values ?? [],
      times: win.error ? null : windowTimes(win),
      dt: win.dt ?? null,
      ids: [opt.id],
      error: win.error ?? null,
      quality,
      dataClass: opt.record.dataClass,
      timeBase: win.dt ? `declared sampling interval (${win.dt} s)` : 'sample index',
    };
  }

  /**
   * How two series were brought together. Alignment is a property of the data,
   * not an assumption: two recordings only share a time base when they were
   * recorded from the same start with the same interval.
   */
  function alignmentFor(a, b) {
    if (!a || !b) return null;
    if (a.opt.kind === 'lab' || b.opt.kind === 'lab') {
      return 'not time-aligned — a laboratory series and a signal series were paired in stored order';
    }
    const ra = a.opt.record;
    const rb = b.opt.record;
    if (ra.timestamp && ra.timestamp === rb.timestamp && a.dt && a.dt === b.dt) {
      return 'time-aligned (same recording start and sampling interval)';
    }
    return 'index-paired (recordings do not share a declared time base)';
  }

  // ------------------------------------------------------------- statistics ---
  const toggleAnalysis = (id) =>
    setAnalyses((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const runStats = () => {
    const p = resolveSeries(primaryKey);
    const s = secondaryKey ? resolveSeries(secondaryKey) : null;
    if (!p) {
      setResults([
        {
          kind: 'descriptive',
          label: 'No series selected',
          status: 'not-applicable',
          reason: 'Select a series from application state first. No series was generated to fill the request.',
          values: {},
          limitations: [],
        },
      ]);
      setMeta(null);
      return;
    }

    const alignment = alignmentFor(p, s);
    const usable = (x) => x && !x.error && (x.values ?? []).length > 0;
    const out = runStatisticalAnalyses({
      primary: usable(p) ? { label: p.label, values: p.values, times: p.times, unit: p.unit } : null,
      secondary: usable(s) ? { label: s.label, values: s.values, unit: s.unit } : null,
      groupA: usable(p) ? { label: p.label, values: p.values, unit: p.unit } : null,
      groupB: usable(s) ? { label: s.label, values: s.values, unit: s.unit } : null,
      seriesList: [p, s].filter(usable).map((x) => ({ label: x.label, values: x.values, unit: x.unit })),
      alignment,
      analyses,
    });

    const computedCount = out.filter((r) => r.status === 'computed').length;
    setResults(out);
    setMeta({
      alignment,
      primary: p,
      secondary: s,
      computedCount,
      refusedCount: out.length - computedCount,
      generatedAt: new Date().toISOString(),
    });

    // PART 18 — every analysis is recorded as a reproducible research run.
    addResearchRun({
      title: `Statistical analysis · ${p.label}${s ? ` vs ${s.label}` : ''}`,
      algorithm: `researchStats/1.0 · ${analyses.join(' + ')}`,
      parameters: {
        analyses,
        primarySeries: p.opt.key,
        secondarySeries: s ? s.opt.key : null,
        alignment,
        primaryN: (p.values ?? []).filter(Number.isFinite).length,
        secondaryN: s ? (s.values ?? []).filter(Number.isFinite).length : null,
        primaryQualityGrade: p.quality?.grade ?? null,
        computed: computedCount,
        refused: out.length - computedCount,
      },
      inputIds: [...(p.ids ?? []), ...(s?.ids ?? [])],
      outputs: out
        .filter((r) => r.status === 'computed')
        .slice(0, 6)
        .map((r) => ({ nodeId: null, kind: 'statistic', label: r.label, summary: summarizeStatResult(r) })),
      limitations: [
        ...out.flatMap((r) => r.limitations ?? []).slice(0, 6),
        p.quality && p.quality.grade !== 'GOOD'
          ? `Primary series quality is ${p.quality.grade}; the statistics above are descriptive only.`
          : null,
      ].filter(Boolean),
    });
  };

  // ------------------------------------------------------------ benchmarking ---
  const benchOption = byKey(benchKey);
  const availability = useMemo(() => benchmarkAvailability(groundTruthLabels), [groundTruthLabels]);

  const parsedTruth = useMemo(() => {
    const nums = String(truthText)
      .split(/[\s,;]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map(Number)
      .filter(Number.isFinite);
    return nums.sort((a, b) => a - b);
  }, [truthText]);

  const detect = () => {
    if (!benchOption?.record) return;
    const res = detectEvents(benchOption.record, { maxPoints: 2000 });
    setDetections(res);
    setBench(null);
  };

  const runBench = () => {
    if (!benchOption?.record) return;
    const tol = Number(tolerance);
    const preds = (detections?.events ?? []).map((e) => e.offsetSec).filter(Number.isFinite);
    const rows = rowsFromEvents({
      detections: preds,
      truthTimes: parsedTruth,
      toleranceSec: Number.isFinite(tol) ? tol : null,
      annotatedSpanSec: benchOption.record.durationSec ?? null,
    });

    if (rows.rows.length) {
      // Persisted so the benchmark is reproducible from application state.
      setGroundTruth(
        rows.rows.map((r) => ({
          signalId: benchOption.id,
          signalLabel: benchOption.shortLabel,
          atSec: r.atSec,
          truth: r.truth,
          predicted: r.predicted,
          truthTimeSec: r.truth ? r.atSec : null,
          toleranceSec: Number.isFinite(tol) ? tol : null,
          annotatedAt: new Date().toISOString(),
          source: 'Researcher-supplied reference annotation',
        })),
      );
    }

    setBench(
      runBenchmark({
        labels: rows.rows,
        detections: preds,
        truthTimes: parsedTruth,
        toleranceSec: Number.isFinite(tol) ? tol : null,
        label: benchOption.shortLabel,
      }),
    );
  };

  // ---------------------------------------------------------- run comparison ---
  const a = researchRuns.find((r) => r.id === runA) ?? null;
  const b = researchRuns.find((r) => r.id === runB) ?? null;
  const paramDiff = useMemo(() => {
    if (!a || !b) return [];
    const keys = new Set([...Object.keys(a.parameters ?? {}), ...Object.keys(b.parameters ?? {})]);
    return [...keys]
      .map((k) => ({
        key: k,
        a: JSON.stringify(a.parameters?.[k] ?? null),
        b: JSON.stringify(b.parameters?.[k] ?? null),
        same: JSON.stringify(a.parameters?.[k] ?? null) === JSON.stringify(b.parameters?.[k] ?? null),
      }))
      .filter((row) => !row.same);
  }, [a, b]);

  const recordComparison = () => {
    if (!a || !b) return;
    addResearchRun({
      title: `Run comparison · ${a.id} vs ${b.id}`,
      algorithm: 'researchOps/run-comparison-1.0',
      parameters: { runA: a.id, runB: b.id, differingParameters: paramDiff.map((p) => p.key) },
      inputIds: [a.id, b.id],
      outputs: [{ nodeId: null, kind: 'comparison', label: 'Parameter diff', summary: `${paramDiff.length} parameter(s) differ` }],
      limitations: [
        'A comparison describes what changed between two recorded runs. It does not establish that one result is better.',
        'No re-execution was performed; both runs are reported as recorded.',
      ],
    });
  };

  const usableSignals = bioSignals.filter((s) => s.kind !== 'categorical');

  return (
    <>
      <PrivacyNotice />
      <MedicalDisclaimer />

      <div className="stat-grid">
        <StatCard
          label="Series available"
          value={seriesOptions.length}
          note={`${bioSignals.length} recordings · lab series from ${bloodTests.length} entries`}
          tone="info"
          icon={<Icon name="database" size={16} />}
        />
        <StatCard
          label="Analyses implemented"
          value={STAT_ANALYSES.length}
          note="Each declares its own assumptions"
          tone="neutral"
          icon={<Icon name="gauge" size={16} />}
        />
        <StatCard
          label="Reference labels"
          value={groundTruthLabels.length}
          note={availability.available ? 'Benchmark computable' : 'No labeled ground truth'}
          tone={availability.available ? 'good' : 'warn'}
          icon={<Icon name="check" size={16} />}
        />
        <StatCard
          label="Research runs"
          value={researchRuns.length}
          note="Every analysis is recorded"
          tone="neutral"
          icon={<Icon name="flask" size={16} />}
        />
      </div>

      <Panel
        title="Statistical analysis"
        subtitle="Descriptive · time-series · correlation · group comparison · correlation matrix"
        aside={<Badge tone="proto">method declared</Badge>}
      >
        <div className="lab-form-grid">
          <div className="form-field">
            <label className="form-label" htmlFor="rl-primary">
              Primary series
            </label>
            <select
              id="rl-primary"
              value={primaryKey ?? ''}
              onChange={(e) => {
                setPrimaryKey(e.target.value || null);
                setResults(null);
              }}
            >
              <option value="">Select a series from application state…</option>
              {seriesOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="rl-secondary">
              Second series (correlation / group comparison)
            </label>
            <select
              id="rl-secondary"
              value={secondaryKey}
              onChange={(e) => {
                setSecondaryKey(e.target.value);
                setResults(null);
              }}
            >
              <option value="">None selected</option>
              {seriesOptions
                .filter((o) => o.key !== primaryKey)
                .map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="builder-pickers">
          <div className="builder-picker">
            <h4>Analyses to run</h4>
            <div className="builder-picker-list">
              {STAT_ANALYSES.map((an) => (
                <label key={an.id}>
                  <input
                    type="checkbox"
                    checked={analyses.includes(an.id)}
                    onChange={() => toggleAnalysis(an.id)}
                  />
                  <span title={an.blurb}>{an.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="builder-picker">
            <h4>Input actually present</h4>
            <div className="builder-picker-list">
              <span className="muted-small">
                Primary: {primaryKey ? byKey(primaryKey)?.label : 'not selected'}
              </span>
              <span className="muted-small">
                Second: {secondaryKey ? byKey(secondaryKey)?.label : 'not selected'}
              </span>
              <span className="muted-small">
                Alignment: {meta?.alignment ?? 'not determined until both series are chosen'}
              </span>
              {meta?.primary?.quality && (
                <span className="muted-small">
                  Primary quality:{' '}
                  <Badge tone={GRADE_TONE[meta.primary.quality.grade] || 'neutral'}>
                    {meta.primary.quality.grade}
                  </Badge>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="toolbar">
          <button type="button" className="action-button" onClick={runStats} disabled={!analyses.length}>
            <Icon name="flask" size={14} />
            Run {analyses.length} analysis{analyses.length === 1 ? '' : 'es'}
          </button>
          <span className="muted-small">
            Results are recorded as a research run with their parameters, inputs and limitations.
          </span>
        </div>

        {!results && <p className="muted-small">No analysis has been run yet.</p>}

        {meta?.primary?.error && <p className="record-note error">{meta.primary.error}</p>}

        {results && (
          <div className="stat-results">
            {results.map((r) => (
              <article key={`${r.kind}-${r.label}`} className="stat-result">
                <header className="stat-result-head">
                  <strong>{r.label}</strong>
                  <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                  {r.n ? <span className="muted-small">n = {r.n}</span> : null}
                </header>

                {r.status !== 'computed' && (
                  <p className="record-note error">{r.reason}</p>
                )}

                {r.status === 'computed' && (
                  <>
                    <div className="table-scroll">
                      <table className="data-table">
                        <tbody>
                          {Object.entries(r.values)
                            .filter(([, v]) => isScalar(v))
                            .map(([k, v]) => (
                              <tr key={k}>
                                <th scope="row">{k}</th>
                                <td className="num">{formatScalar(v)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    {Object.entries(r.values)
                      .filter(([, v]) => !isScalar(v))
                      .map(([k, v]) => (
                        <details key={k} className="stat-detail">
                          <summary>{k}</summary>
                          <pre className="stat-json">{JSON.stringify(v, null, 2)}</pre>
                        </details>
                      ))}
                  </>
                )}

                {r.method && (
                  <p className="stat-method">
                    <strong>Method.</strong> {r.method}
                  </p>
                )}
                {r.assumptions?.length > 0 && (
                  <ul className="muted-small">
                    {r.assumptions.map((s) => (
                      <li key={s}>
                        <em>Assumption:</em> {s}
                      </li>
                    ))}
                  </ul>
                )}
                {r.limitations?.length > 0 && (
                  <ul className="muted-small">
                    {r.limitations.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
            <p className="muted-small research-obs">
              Research observation. Requires professional interpretation. No p-value or significance
              claim is produced by this module.
            </p>
          </div>
        )}
      </Panel>

      <Panel
        title="Research benchmarking"
        subtitle="Precision · recall · specificity · F1 · FPR · FNR · detection latency"
        aside={
          <Badge tone={availability.available ? 'good' : 'warn'}>
            {availability.available ? 'labels present' : 'labels required'}
          </Badge>
        }
      >
        {!availability.available && (
          <p className="record-note error">{BENCHMARK_UNAVAILABLE}</p>
        )}
        {availability.available && (
          <p className="muted-small">
            {availability.binaryLabelRows} binary reference row(s) and {availability.timedTruthRows}{' '}
            timed reference row(s) are held in application state.
          </p>
        )}

        <div className="lab-form-grid">
          <div className="form-field">
            <label className="form-label" htmlFor="rl-bench-signal">
              Recording to benchmark
            </label>
            <select
              id="rl-bench-signal"
              value={benchKey ?? ''}
              onChange={(e) => {
                setBenchKey(e.target.value || null);
                setDetections(null);
                setBench(null);
              }}
            >
              <option value="">Select a recording…</option>
              {usableSignals.map((s) => (
                <option key={s.id} value={`sig:${s.id}`}>
                  {s.typeLabel} · {s.subjectId} · {s.id}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="rl-tol">
              Matching tolerance (seconds)
            </label>
            <input
              id="rl-tol"
              type="number"
              min="0"
              step="0.1"
              value={tolerance}
              onChange={(e) => setTolerance(e.target.value)}
            />
          </div>
          <div className="form-field span-2">
            <label className="form-label" htmlFor="rl-truth">
              Reference event times (seconds) — supplied by the researcher, never generated
            </label>
            <textarea
              id="rl-truth"
              rows={3}
              value={truthText}
              onChange={(e) => setTruthText(e.target.value)}
              placeholder="e.g. 12.4, 30.1, 45.9"
            />
            <span className="muted-small">
              Parsed {parsedTruth.length} reference time(s). Leave empty and the benchmark will
              report that no labeled reference data exists.
            </span>
          </div>
        </div>

        <div className="toolbar">
          <button type="button" className="action-button" onClick={detect} disabled={!benchOption}>
            <Icon name="search" size={14} />
            Detect events
          </button>
          <button
            type="button"
            className="action-button secondary"
            onClick={runBench}
            disabled={!benchOption}
          >
            <Icon name="check" size={14} />
            Save labels &amp; benchmark
          </button>
        </div>

        {detections && (
          <div className="quality-block">
            <p className="muted-small">
              {detections.events.length} event(s) detected
              {detections.grade ? ` · quality ${detections.grade}` : ''}
              {detections.reason ? ` · ${detections.reason}` : ''}
            </p>
            <ul className="muted-small">
              {detections.events.slice(0, 8).map((e) => (
                <li key={e.id}>
                  {e.eventTypeLabel} @ {Math.round(e.offsetSec * 10) / 10}s ·{' '}
                  {e.confidence?.value === null || e.confidence?.value === undefined
                    ? 'no probabilistic confidence applies'
                    : `confidence ${e.confidence.value} (heuristic)`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {bench && (
          <div className="stat-results">
            {Object.entries(bench.results).map(([key, r]) => (
              <article key={key} className="stat-result">
                <header className="stat-result-head">
                  <strong>{r.label}</strong>
                  <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                </header>

                {r.status !== 'computed' && <p className="record-note error">{r.reason}</p>}

                {r.status === 'computed' && (
                  <>
                    <div className="table-scroll">
                      <table className="data-table">
                        <tbody>
                          {Object.entries(r.metrics).map(([k, v]) => (
                            <tr key={k}>
                              <th scope="row" title={METRIC_NOTES[k] ?? ''}>
                                {METRIC_LABELS[k] ?? k}
                              </th>
                              <td className="num">{formatScalar(v)}</td>
                            </tr>
                          ))}
                          {r.confusion && (
                            <tr>
                              <th scope="row">Confusion matrix</th>
                              <td className="num">
                                TP {r.confusion.tp} · FP {r.confusion.fp} · FN {r.confusion.fn} · TN{' '}
                                {r.confusion.tn}
                              </td>
                            </tr>
                          )}
                          {r.counts && (
                            <tr>
                              <th scope="row">Event counts</th>
                              <td className="num">
                                matched {r.counts.matched} · missed {r.counts.missed} · false alarms{' '}
                                {r.counts.falseAlarms}
                              </td>
                            </tr>
                          )}
                          {r.toleranceSec !== undefined && r.toleranceSec !== null && (
                            <tr>
                              <th scope="row">Declared tolerance</th>
                              <td className="num">±{r.toleranceSec} s</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {r.matches?.length > 0 && (
                      <details className="stat-detail">
                        <summary>Matched events ({r.matches.length})</summary>
                        <pre className="stat-json">{JSON.stringify(r.matches, null, 2)}</pre>
                      </details>
                    )}
                    <p className="stat-method">
                      <strong>Method.</strong> {r.method}
                    </p>
                  </>
                )}

                {r.limitations?.length > 0 && (
                  <ul className="muted-small">
                    {r.limitations.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}

        <div className="disclaimer">
          <span className="disclaimer-icon" aria-hidden="true">
            <Icon name="info" size={14} />
          </span>
          <span>
            Benchmark figures describe performance against the reference labels supplied for this
            dataset. They are not a clinical validation, not a performance claim about any medical
            device, and not a diagnosis.
          </span>
        </div>
      </Panel>

      <Panel
        title="Compare research runs"
        subtitle="Reproducibility check between two recorded runs"
        aside={<Badge tone="neutral">{researchRuns.length} runs</Badge>}
      >
        <div className="lab-form-grid">
          <div className="form-field">
            <label className="form-label" htmlFor="rl-run-a">
              Run A
            </label>
            <select id="rl-run-a" value={runA} onChange={(e) => setRunA(e.target.value)}>
              <option value="">Select a run…</option>
              {researchRuns.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} · {r.title}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="rl-run-b">
              Run B
            </label>
            <select id="rl-run-b" value={runB} onChange={(e) => setRunB(e.target.value)}>
              <option value="">Select a run…</option>
              {researchRuns.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} · {r.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {a && b && (
          <>
            <div className="table-scroll">
              <table className="data-table wide">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Run A</th>
                    <th>Run B</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Run ID', a.id, b.id],
                    ['Title', a.title, b.title],
                    ['Algorithm', a.algorithm, b.algorithm],
                    ['Created', a.createdAt?.slice(0, 19), b.createdAt?.slice(0, 19)],
                    ['Inputs', (a.inputIds ?? []).length, (b.inputIds ?? []).length],
                    ['Outputs', (a.outputs ?? []).length, (b.outputs ?? []).length],
                  ].map(([field, va, vb]) => (
                    <tr key={field}>
                      <th scope="row">{field}</th>
                      <td>{String(va ?? '—')}</td>
                      <td>{String(vb ?? '—')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4 className="rl-subhead">Differing parameters</h4>
            {paramDiff.length === 0 ? (
              <p className="muted-small">
                No parameter differs between the two runs. Identical parameters do not by themselves
                prove identical results — the outputs above are reported as recorded.
              </p>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>Run A</th>
                      <th>Run B</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paramDiff.map((p) => (
                      <tr key={p.key}>
                        <th scope="row">{p.key}</th>
                        <td className="muted-small">{p.a}</td>
                        <td className="muted-small">{p.b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="toolbar">
              <button type="button" className="action-button secondary" onClick={recordComparison}>
                <Icon name="clipboard" size={14} />
                Record comparison as a run
              </button>
            </div>
          </>
        )}
        {(!a || !b) && (
          <p className="muted-small">Select two runs to compare. Nothing is inferred from one run alone.</p>
        )}
      </Panel>

      <Panel title="Data class in use" subtitle="Every figure on this page is traceable to its source">
        <div className="table-scroll">
          <table className="data-table wide">
            <thead>
              <tr>
                <th>Recording</th>
                <th>Subject</th>
                <th>Data class</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {usableSignals.slice(0, 12).map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.typeLabel}
                    <div className="muted-small">{s.id}</div>
                  </td>
                  <td>{s.subjectId || '—'}</td>
                  <td>
                    <Badge tone={s.dataClass === 'synthetic-demo' ? 'proto' : 'info'}>
                      {dataClassLabel(s.dataClass)}
                    </Badge>
                  </td>
                  <td className="muted-small">{s.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted-small">
          Synthetic demo recordings are labelled as such and are never mixed silently with imported
          or research data.
        </p>
      </Panel>
    </>
  );
}

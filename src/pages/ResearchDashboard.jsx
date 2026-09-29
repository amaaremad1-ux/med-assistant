import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/icons.jsx';
import { Panel, StatCard, ProtoTag, Badge, Meter } from '../components/ui/index.js';
import LineChart from '../components/charts/LineChart.jsx';
import {
  MONTHLY,
  DEVICE_PROFILE,
  MODEL_DISCLAIMER,
} from '../data/syntheticData.js';
import {
  latestRisk,
  riskTrajectory,
  dataQualityReport,
  anomalyReport,
  deviationReport,
  driftReport,
  calibrationReport,
  BASELINE,
  MODEL,
} from '../lib/engine.js';
import { getEvents, formatWhen, typeTone } from '../lib/audit.js';
import { listExperiments } from '../lib/experimentStore.js';
import { useAppData } from '../context/AppDataContext.jsx';
import { dataCounts, signalQualitySummary } from '../lib/appDataSelectors.js';

/**
 * Research Dashboard (module #30) — one-glance status of every subsystem.
 * All values are synthetic research-prototype outputs.
 */
export default function ResearchDashboard() {
  const [events, setEvents] = useState([]);
  const [experimentCount, setExperimentCount] = useState(0);

  useEffect(() => {
    setEvents(getEvents().slice(0, 6));
    setExperimentCount(listExperiments().length);
  }, []);

  // Live application state (normalized data model) for the data cards.
  const app = useAppData();
  const counts = dataCounts(app);

  // PART 31 — signal quality has to materialise one window per recording, so it
  // is memoised on the signal set rather than recomputed on every render.
  const quality = useMemo(() => signalQualitySummary(app.bioSignals), [app.bioSignals]);

  const trajectorySeries = [
    {
      id: 'risk',
      label: 'Risk estimate',
      color: 'var(--primary)',
      points: riskTrajectory.map((p) => ({ x: p.i, y: p.risk, lo: p.lo, hi: p.hi })),
    },
  ];

  const halfWidth = Math.round((latestRisk.hi - latestRisk.lo) / 2);

  // PART 31 derived state — all of it read from application records.
  const completeness = counts.completeness;
  const overallPct = completeness.overall.pct;
  const latestRun = counts.latestRun;
  const finding = counts.latestFinding;
  const qualityTone = !quality
    ? 'neutral'
    : quality.usableForStrongConclusions === quality.total
      ? 'good'
      : quality.counts.POOR + quality.insufficient > 0
        ? 'warn'
        : 'info';

  return (
    <>
      <div className="stat-grid">
        <StatCard
          label="Device"
          value="Connected"
          note={`${DEVICE_PROFILE.name} · battery 71% · last sync 1 h ago`}
          tone="good"
          icon={<Icon name="bluetooth" size={16} />}
        />
        <StatCard
          label="Data quality"
          value={dataQualityReport.score}
          unit="/ 100"
          note="Completeness-weighted composite across 12 weekly batches"
          tone={dataQualityReport.level}
          icon={<Icon name="check" size={16} />}
        />
        <StatCard
          label="Baseline stability"
          value="Stable"
          note={`Personal baseline fit across 8 biomarkers · window ${BASELINE.glucose.window}`}
          tone="good"
          icon={<Icon name="trending" size={16} />}
        />
        <StatCard
          label="Latest risk estimate"
          value={latestRisk.risk}
          unit="%"
          note={`${latestRisk.horizon} T2D estimate · ${latestRisk.label}`}
          tone={latestRisk.risk > 60 ? 'bad' : latestRisk.risk > 35 ? 'warn' : 'info'}
          icon={<Icon name="shield" size={16} />}
        />
        <StatCard
          label="Uncertainty"
          value={`± ${halfWidth}`}
          unit="pts"
          note={`Interval ${latestRisk.lo}–${latestRisk.hi}% · ${latestRisk.n} measurements · completeness ${Math.round(latestRisk.completeness * 100)}%`}
          tone="neutral"
          icon={<Icon name="info" size={16} />}
        />
        <StatCard
          label="Anomaly status"
          value={anomalyReport.events.length}
          note={anomalyReport.statusLabel}
          tone={anomalyReport.status}
          icon={<Icon name="pulse" size={16} />}
        />
        <StatCard
          label="Model"
          value="Demo v0.3"
          note={`${MODEL.version} · executed ${MODEL.computedAt} · unvalidated`}
          tone="neutral"
          icon={<Icon name="cpu" size={16} />}
        />
        <StatCard
          label="Experiments"
          value={experimentCount}
          note="Saved locally in this browser (synthetic runs only)"
          tone="neutral"
          icon={<Icon name="flask" size={16} />}
        />
      </div>

      <Panel
        title="Application data (live state)"
        subtitle="Counts read from the normalized application data model — uploads, lab entries, genetics and assistant activity"
        aside={<Badge tone="proto">app state</Badge>}
      >
        <div className="stat-grid">
          <StatCard
            label="Medical Records"
            value={counts.medicalRecords}
            note={`${counts.processedRecords} processed · ${counts.errorRecords} error`}
            tone="info"
            icon={<Icon name="file" size={16} />}
          />
          <StatCard
            label="Blood Biomarkers"
            value={counts.bloodTests}
            note={`${counts.analytes} analyte${counts.analytes === 1 ? '' : 's'} tracked`}
            tone="info"
            icon={<Icon name="droplet" size={16} />}
          />
          <StatCard
            label="Genetic Data"
            value={counts.geneticRecords}
            note="variant rows on record (demo-labelled)"
            tone="neutral"
            icon={<Icon name="dna" size={16} />}
          />
          <StatCard
            label="Research Hub"
            value={counts.hubItems}
            note={`${counts.hubProcessed} processed · live catalogue`}
            tone="info"
            icon={<Icon name="database" size={16} />}
          />
          <StatCard
            label="Bio-signals"
            value={counts.bioSignals}
            note="Unified time-series model"
            tone="info"
            icon={<Icon name="pulse" size={16} />}
          />
          <StatCard
            label="Research runs"
            value={counts.researchRuns}
            note={`${counts.datasetVersions} dataset version(s)`}
            tone="neutral"
            icon={<Icon name="flask" size={16} />}
          />
          <StatCard
            label="AI Insights"
            value={counts.messages}
            note={`${counts.conversations} conversation${counts.conversations === 1 ? '' : 's'} with the assistant`}
            tone="neutral"
            icon={<Icon name="sparkles" size={16} />}
          />
          <StatCard
            label="Longitudinal Trends"
            value={app.longitudinalData.length}
            note="monthly synthetic panel points available for trend analysis"
            tone="neutral"
            icon={<Icon name="trending" size={16} />}
          />
          <StatCard
            label="Device Data"
            value="Connected"
            note={`${app.deviceData?.name ?? 'none'} · simulated stream`}
            tone="good"
            icon={<Icon name="bluetooth" size={16} />}
          />
          <StatCard
            label="Data Quality"
            value={dataQualityReport.score}
            unit="/ 100"
            note="Completeness-weighted composite across 12 weekly batches"
            tone={dataQualityReport.level}
            icon={<Icon name="check" size={16} />}
          />
          <StatCard
            label="Subjects"
            value={counts.subjects}
            note={
              counts.subjects
                ? `${counts.subjectIds.slice(0, 3).join(', ')}${counts.subjectIds.length > 3 ? ` +${counts.subjectIds.length - 3} more` : ''}`
                : 'No recording, variant row or hub item declares a subject identifier'
            }
            tone={counts.subjects ? 'info' : 'neutral'}
            icon={<Icon name="users" size={16} />}
          />
          <StatCard
            label="Metadata completeness"
            value={overallPct ?? '—'}
            unit={overallPct == null ? '' : '%'}
            note={
              overallPct == null
                ? 'No records in any domain — nothing to score'
                : `${completeness.overall.present} of ${completeness.overall.required} required fields present across ${completeness.scoredDomains} domain(s)`
            }
            tone={overallPct == null ? 'neutral' : overallPct >= 90 ? 'good' : overallPct >= 70 ? 'info' : 'warn'}
            icon={<Icon name="clipboard" size={16} />}
          />
          <StatCard
            label="Signal quality"
            value={quality ? `${quality.counts.GOOD}/${quality.total}` : '—'}
            unit={quality ? 'GOOD' : ''}
            note={
              quality
                ? `${quality.counts.FAIR} fair · ${quality.counts.POOR} poor · ${quality.insufficient} insufficient`
                : 'No bio-signal recordings to grade'
            }
            tone={qualityTone}
            icon={<Icon name="activity" size={16} />}
          />
          <StatCard
            label="Latest research run"
            value={latestRun ? latestRun.id : '—'}
            note={
              latestRun
                ? `${latestRun.title} · ${formatWhen(latestRun.createdAt)}`
                : 'No analysis has been recorded as a run yet'
            }
            tone={latestRun ? 'info' : 'neutral'}
            icon={<Icon name="clock" size={16} />}
          />
        </div>
      </Panel>

      <Panel
        title="Data completeness by domain"
        subtitle="Required metadata fields actually present in application state — no value is imputed to raise a score"
        aside={<Badge tone="proto">PART 31 · derived</Badge>}
      >
        <div className="table-scroll">
          <table className="data-table wide">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Records</th>
                <th>Fields present</th>
                <th>Completeness</th>
                <th>Missing most often</th>
              </tr>
            </thead>
            <tbody>
              {completeness.domains.map((d) => (
                <tr key={d.key}>
                  <td>
                    <strong>{d.label}</strong>
                    <p className="muted-small">{d.requirement}</p>
                  </td>
                  <td>{d.records}</td>
                  <td>{d.required ? `${d.present} / ${d.required}` : '—'}</td>
                  <td>
                    {d.pct == null ? (
                      <Badge tone="neutral">no records</Badge>
                    ) : (
                      <Badge tone={d.pct >= 90 ? 'good' : d.pct >= 70 ? 'info' : 'warn'}>{d.pct} %</Badge>
                    )}
                  </td>
                  <td>
                    {d.gaps.length
                      ? d.gaps
                          .slice(0, 3)
                          .map((g) => `${g.field} (${g.count})`)
                          .join(', ')
                      : d.records
                        ? 'Nothing missing'
                        : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Meter
          value={overallPct ?? 0}
          tone={overallPct == null ? 'neutral' : overallPct >= 90 ? 'good' : overallPct >= 70 ? 'info' : 'warn'}
          label={
            overallPct == null
              ? 'Overall metadata completeness — no records to score'
              : `Overall metadata completeness — ${overallPct} % (${completeness.overall.present}/${completeness.overall.required} fields, record-weighted)`
          }
          hint={completeness.method}
          showValue={false}
        />
        {completeness.emptyDomains > 0 && (
          <p className="muted-small" style={{ marginTop: 8 }}>
            {completeness.emptyDomains} domain(s) hold no records and were excluded from the overall
            figure rather than scored as 0 %.
          </p>
        )}
      </Panel>

      <div className="dashboard-row">
        <Panel
          title="Latest research run and recorded finding"
          subtitle="Read from the research-run log — a finding is only shown if an analysis wrote one down"
          aside={<Badge tone="neutral">PART 18 · reproducible</Badge>}
        >
          {latestRun ? (
            <ul className="status-list">
              <StatusRow icon="clock" label="Run ID" value={latestRun.id} tone="info" />
              <StatusRow icon="file" label="Title" value={latestRun.title} tone="neutral" />
              <StatusRow icon="cpu" label="Algorithm" value={latestRun.algorithm} tone="neutral" />
              <StatusRow
                icon="calendar"
                label="Recorded"
                value={formatWhen(latestRun.createdAt)}
                tone="neutral"
              />
              <StatusRow
                icon="database"
                label="Inputs / outputs"
                value={`${latestRun.inputs} input(s) · ${latestRun.outputs} output(s) · ${latestRun.limitations} limitation(s)`}
                tone="neutral"
              />
            </ul>
          ) : (
            <p className="record-note">
              No research run has been recorded yet. Runs are created by the Research Lab, Cross-Domain
              Analysis, Dataset Builder and Discovery Reports when an analysis is executed — nothing is
              pre-filled here.
            </p>
          )}

          <p className="rl-subhead">Latest detected pattern</p>
          {finding ? (
            <div className="research-obs">
              <p>
                <strong>{finding.label ?? 'Recorded output'}</strong>
                {finding.summary ? ` — ${finding.summary}` : ''}
              </p>
              <p className="muted-small">
                From run {finding.runId} ({finding.runTitle})
                {finding.kind ? ` · ${finding.kind}` : ''} · {formatWhen(finding.createdAt)}
              </p>
              <p className="muted-small">
                Research observation. Requires professional interpretation — this is a recorded analysis
                output, not a diagnosis.
              </p>
            </div>
          ) : (
            <p className="record-note">
              No analysis has recorded a finding yet, so no pattern is reported. This panel never
              substitutes a plausible-looking result for a missing one.
            </p>
          )}
        </Panel>

        <Panel
          title="Signal quality grades"
          subtitle="One analysed window per recording, graded by the profile-aware quality engine"
          aside={<Badge tone="proto">PART 7 · assessed</Badge>}
        >
          {quality ? (
            <>
              <ul className="status-list">
                <StatusRow icon="check" label="GOOD" value={`${quality.counts.GOOD} recording(s)`} tone="good" />
                <StatusRow icon="info" label="FAIR" value={`${quality.counts.FAIR} recording(s)`} tone="info" />
                <StatusRow icon="trending" label="POOR" value={`${quality.counts.POOR} recording(s)`} tone="warn" />
                <StatusRow
                  icon="x"
                  label="INSUFFICIENT DATA"
                  value={`${quality.insufficient} recording(s)`}
                  tone="bad"
                />
                <StatusRow
                  icon="shield"
                  label="Usable for strong conclusions"
                  value={`${quality.usableForStrongConclusions} of ${quality.total}`}
                  tone={quality.usableForStrongConclusions === quality.total ? 'good' : 'warn'}
                />
              </ul>
              <Meter
                value={quality.weightedMissingPct == null ? 0 : 100 - quality.weightedMissingPct}
                tone={
                  quality.weightedMissingPct == null
                    ? 'neutral'
                    : quality.weightedMissingPct <= 2
                      ? 'good'
                      : quality.weightedMissingPct <= 10
                        ? 'info'
                        : 'warn'
                }
                label="Sample coverage across analysed windows"
                hint={
                  quality.weightedMissingPct == null
                    ? 'No window reported a missing-sample percentage.'
                    : `Sample-weighted missing data ${quality.weightedMissingPct} %. ${quality.note}`
                }
                showValue={false}
              />
            </>
          ) : (
            <p className="record-note">
              No bio-signal recordings are present, so no quality grade can be computed. Upload or
              generate recordings in the Bio-signal Library first.
            </p>
          )}
        </Panel>
      </div>

      <Panel
        title="Risk trajectory with uncertainty"
        subtitle="18-month synthetic panel · 5-year T2D estimate from the unvalidated demo model"
        aside={<ProtoTag compact />}
      >
        <LineChart
          series={trajectorySeries}
          height={230}
          yMin={0}
          yMax={100}
          yLabel="Risk estimate (%)"
          formatX={(i) => MONTHLY[Math.round(i)]?.label ?? ''}
          formatY={(v) => `${Math.round(v)}`}
        />
        <p className="muted-small" style={{ marginTop: 10 }}>
          The shaded interval widens early in the panel (fewer measurements, lower
          completeness) and narrows as evidence accumulates. {MODEL_DISCLAIMER}
        </p>
      </Panel>

      <div className="dashboard-row">
        <Panel title="Subsystem status" subtitle="Live state of each research module">
          <ul className="status-list">
            <StatusRow
              icon="bluetooth"
              label="Device interface"
              value="Connected · simulated"
              tone="good"
            />
            <StatusRow
              icon="check"
              label="Data quality engine"
              value={`Score ${dataQualityReport.score}/100 · ${dataQualityReport.level === 'good' ? 'passing' : 'review flagged'}`}
              tone={dataQualityReport.level}
            />
            <StatusRow
              icon="trending"
              label="Deviation detection"
              value={`Composite z ${deviationReport.score} · ${deviationReport.level === 'good' ? 'within baseline' : 'above baseline'}`}
              tone={deviationReport.level}
            />
            <StatusRow
              icon="pulse"
              label="Anomaly detection"
              value={anomalyReport.statusLabel}
              tone={anomalyReport.status}
            />
            <StatusRow
              icon="gauge"
              label="Sensor drift"
              value={`${driftReport.statusLabel} · +${driftReport.slope} mg/dL/wk`}
              tone={driftReport.status}
            />
            <StatusRow
              icon="sliders"
              label="Calibration monitor"
              value={calibrationReport.statusLabel}
              tone={calibrationReport.status}
            />
            <StatusRow
              icon="cpu"
              label="Model registry"
              value="4 demo models · ensemble v0.3 active"
              tone="neutral"
            />
            <StatusRow
              icon="flask"
              label="Experiment center"
              value={`${experimentCount} saved synthetic run${experimentCount === 1 ? '' : 's'}`}
              tone="neutral"
            />
            <StatusRow
              icon="database"
              label="Research Data Hub"
              value={`${counts.hubItems} items · ${counts.hubProcessed} processed`}
              tone="info"
            />
            <StatusRow
              icon="pulse"
              label="Bio-signal engine"
              value={`${counts.bioSignals} recordings in unified model`}
              tone="info"
            />
            <StatusRow
              icon="network"
              label="Research runs / datasets"
              value={`${counts.researchRuns} runs · ${counts.datasetVersions} versions`}
              tone="neutral"
            />
            <StatusRow
              icon="clipboard"
              label="Metadata completeness"
              value={
                overallPct == null
                  ? 'No records to score'
                  : `${overallPct} % of required fields present`
              }
              tone={overallPct == null ? 'neutral' : overallPct >= 90 ? 'good' : overallPct >= 70 ? 'info' : 'warn'}
            />
            <StatusRow
              icon="activity"
              label="Signal quality (assessed)"
              value={
                quality
                  ? `${quality.counts.GOOD}/${quality.total} GOOD · ${quality.usableForStrongConclusions} support strong conclusions`
                  : 'No recordings to grade'
              }
              tone={qualityTone}
            />
            <StatusRow
              icon="clock"
              label="Latest research run"
              value={latestRun ? `${latestRun.id} · ${formatWhen(latestRun.createdAt)}` : 'None recorded'}
              tone={latestRun ? 'info' : 'neutral'}
            />
            <StatusRow
              icon="users"
              label="Subjects with data"
              value={counts.subjects ? `${counts.subjects} distinct identifier(s)` : 'None declared'}
              tone={counts.subjects ? 'info' : 'neutral'}
            />
          </ul>
        </Panel>

        <Panel
          title="Recent audit events"
          subtitle="Local log — measurements, model runs, data changes"
          aside={<Badge tone="neutral">local only</Badge>}
        >
          <ul className="audit-mini-list">
            {events.map((e) => (
              <li key={e.id}>
                <span className={`audit-dot tone-${typeTone(e.type)}`} />
                <div>
                  <p className="audit-mini-msg">{e.message}</p>
                  <p className="audit-mini-when">
                    {e.type} · {formatWhen(e.when)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <Meter
            value={(events.length / 6) * 100}
            tone="info"
            label="Audit buffer usage"
            hint="Events are stored in this browser only (sha_audit_v1), capped at 300 entries."
            showValue={false}
          />
        </Panel>
      </div>
    </>
  );
}

function StatusRow({ icon, label, value, tone }) {
  return (
    <li>
      <span className={`status-icon tone-${tone}`}>
        <Icon name={icon} size={16} />
      </span>
      <span className="status-label">{label}</span>
      <Badge tone={tone === 'neutral' ? 'neutral' : tone}>{value}</Badge>
    </li>
  );
}

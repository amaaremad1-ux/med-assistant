import { useState } from 'react';
import { Panel, Badge, StatCard, Meter, Tabs } from './ui/index.js';
import Icon from './icons.jsx';
import LineChart from './charts/LineChart.jsx';
import { analyteSeries, ANALYTE_MATCHERS } from '../lib/healthAggregation.js';
import { unmodelledGenes } from '../lib/unifiedRiskEngine.js';

const VERDICT_TONE = { above: 'bad', below: 'warn', within: 'good' };
const VERDICT_LABEL = { above: 'Above range', below: 'Below range', within: 'Within range' };
const TREND_TONE = { increasing: 'warn', decreasing: 'info', stable: 'neutral', insufficient: 'neutral' };

function Section({ title, subtitle, aside, children, padded = true, className = '' }) {
  return (
    <Panel title={title} subtitle={subtitle} aside={aside} padded={padded} className={className}>
      {children}
    </Panel>
  );
}

/** Laboratory results — every analyte the profile has, latest value first. */
function LabDomain({ snapshot }) {
  const overview = snapshot.labOverview;
  const [selected, setSelected] = useState(() => overview.find((a) => a.count > 1)?.key ?? overview[0]?.key ?? null);

  const outOfRange = overview.filter((a) => a.verdict === 'above' || a.verdict === 'below');
  const series = selected ? analyteSeries(snapshot.labs, selected) : [];
  const selectedMeta = ANALYTE_MATCHERS.find((m) => m.key === selected) ?? null;

  return (
    <Section
      title="Laboratory results"
      subtitle="Every analyte recorded for this profile, with its newest value, trend and the laboratory range when one was supplied."
      aside={<Badge tone={outOfRange.length ? 'warn' : 'good'}>{outOfRange.length} outside range</Badge>}
    >
      <div className="stat-grid">
        <StatCard
          label="Analytes recorded"
          value={overview.length}
          note={`${snapshot.counts.labs} lab entries in total`}
          tone="info"
        />
        <StatCard
          label="Outside supplied range"
          value={outOfRange.length}
          note={outOfRange.length ? outOfRange.map((a) => a.label).slice(0, 3).join(', ') : 'No supplied range is exceeded'}
          tone={outOfRange.length ? 'warn' : 'good'}
        />
        <StatCard
          label="With reference range"
          value={snapshot.labs.filter((l) => l.referenceRange).length}
          note="Ranges are shown only when they came with the result"
          tone="neutral"
        />
        <StatCard
          label="Added on this dashboard"
          value={snapshot.counts.ownLabs}
          note="Entered for this profile rather than imported"
          tone="info"
        />
      </div>
      {overview.length === 0 ? (
        <p className="muted-small">
          No laboratory values are recorded for this profile yet. Values entered on the Blood &amp; Laboratory page (or
          the "Add health data" tab here) appear in this list.
        </p>
      ) : (
        <>
          <div className="mini-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Analyte</th>
                  <th>Latest</th>
                  <th>Date</th>
                  <th>Laboratory range</th>
                  <th>Trend</th>
                  <th>Entries</th>
                </tr>
              </thead>
              <tbody>
                {overview.map((a) => (
                  <tr key={a.key}>
                    <td>{a.label}</td>
                    <td className="num">
                      {a.value} {a.unit}
                    </td>
                    <td>{a.date ?? '—'}</td>
                    <td>
                      {a.referenceRange ? (
                        <>
                          {a.referenceRange}{' '}
                          {a.verdict && (
                            <Badge tone={VERDICT_TONE[a.verdict] ?? 'neutral'}>{VERDICT_LABEL[a.verdict]}</Badge>
                          )}
                        </>
                      ) : (
                        <span className="muted-small">not supplied</span>
                      )}
                    </td>
                    <td>
                      <Badge tone={TREND_TONE[a.trend.direction] ?? 'neutral'}>
                        {a.trend.direction === 'insufficient' ? 'single value' : a.trend.direction}
                      </Badge>
                      {a.trend.change != null && a.trend.change !== 0 && (
                        <span className="muted-small">
                          {' '}
                          {a.trend.change > 0 ? '+' : ''}
                          {a.trend.change} since previous
                        </span>
                      )}
                    </td>
                    <td className="num">{a.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {snapshot.unmappedAnalytes.length > 0 && (
            <p className="muted-small" style={{ marginTop: 10 }}>
              <Icon name="info" size={13} /> Recorded but not used by any risk model yet: {snapshot.unmappedAnalytes.join(', ')}.
            </p>
          )}
          {series.length > 1 && (
            <>
              <div className="toolbar" style={{ marginTop: 14 }}>
                <label className="inline-select">
                  Chart
                  <select value={selected ?? ''} onChange={(e) => setSelected(e.target.value)}>
                    {overview
                      .filter((a) => a.count > 1)
                      .map((a) => (
                        <option key={a.key} value={a.key}>
                          {a.label} ({a.count} points)
                        </option>
                      ))}
                  </select>
                </label>
                <span className="muted-small">Series are plotted as recorded — nothing is smoothed or imputed.</span>
              </div>
              <LineChart
                series={[
                  {
                    id: selected,
                    label: `${selectedMeta?.label ?? selected} (${series[0]?.unit ?? ''})`,
                    color: 'var(--primary)',
                    points: series.map((p, i) => ({ x: i, y: p.value, label: p.date })),
                  },
                ]}
                height={200}
                formatX={(i) => series[Math.round(i)]?.date ?? ''}
                yLabel={series[0]?.unit ?? ''}
              />
            </>
          )}
        </>
      )}
    </Section>
  );
}

function VitalCell({ label, value, unit, source, tone = 'neutral', note }) {
  return (
    <div className={`vital-cell tone-${tone}`}>
      <span className="vital-cell-label">{label}</span>
      <span className="vital-cell-value">
        {value == null ? '—' : value}
        {value != null && unit ? <span className="vital-cell-unit"> {unit}</span> : null}
      </span>
      {source && <span className="vital-cell-source">{source}</span>}
      {note && <span className="vital-cell-note">{note}</span>}
    </div>
  );
}

/**
 * Biosignals & daily tracking. Each value is tagged with where it came from —
 * an entry made for this profile, or the synthetic longitudinal demo panel —
 * so a synthetic value is never mistaken for a measurement.
 */
function VitalsDomain({ snapshot }) {
  const v = snapshot.vitalFeatures;
  const label = (feat) =>
    feat?.synthetic ? 'synthetic demo panel' : feat ? 'entered for this profile' : 'not recorded';

  const bpText =
    v.systolic?.value != null && v.diastolic?.value != null
      ? `${v.systolic.value}/${v.diastolic.value}`
      : (v.systolic?.value ?? '—');

  const signalsByCategory = new Map();
  for (const s of snapshot.signals) {
    const key = s.category ?? 'uncategorised';
    signalsByCategory.set(key, (signalsByCategory.get(key) ?? 0) + 1);
  }

  return (
    <Section
      title="Biosignals & daily tracking"
      subtitle="Sleep, activity, blood pressure and body composition — the daily inputs the risk models read."
      aside={<Badge tone={v.bmi != null ? 'info' : 'neutral'}>{snapshot.counts.vitals} daily entries</Badge>}
    >
      <div className="vital-grid">
        <VitalCell
          label="Sleep (average)"
          value={v.sleepHours?.value}
          unit="h"
          source={label(v.sleepHours)}
          tone={v.sleepHours == null ? 'neutral' : v.sleepHours.value < 6 ? 'warn' : 'good'}
        />
        <VitalCell
          label="Weekly moderate activity"
          value={v.activityMinutes?.value}
          unit="min/wk"
          source={label(v.activityMinutes)}
          tone={v.activityMinutes == null ? 'neutral' : v.activityMinutes.value < 150 ? 'warn' : 'good'}
        />
        <VitalCell
          label="Blood pressure"
          value={bpText}
          unit="mmHg"
          source={label(v.systolic)}
          tone={
            v.systolic == null ? 'neutral' : v.systolic.value >= 140 ? 'bad' : v.systolic.value >= 130 ? 'warn' : 'good'
          }
        />
        <VitalCell
          label="Body mass index"
          value={v.bmi}
          unit="kg/m²"
          source={snapshot.demographics.heightCm && snapshot.demographics.weightKg ? 'profile height + weight' : 'not computable'}
          tone={v.bmi == null ? 'neutral' : v.bmi >= 30 ? 'bad' : v.bmi >= 25 ? 'warn' : 'good'}
          note={snapshot.demographics.bmiCategory ?? undefined}
        />
        <VitalCell label="Daily steps" value={v.steps?.value} unit="steps" source={label(v.steps)} />
        <VitalCell label="Resting heart rate" value={v.restingHr?.value} unit="bpm" source={label(v.restingHr)} />
      </div>

      <div className="meter-stack" style={{ marginTop: 14 }}>
        <Meter
          label="Sleep vs the 7 h level used by the models"
          value={v.sleepHours?.value == null ? 0 : Math.min(100, (v.sleepHours.value / 10) * 100)}
          threshold={70}
          tone={v.sleepHours?.value == null ? 'neutral' : v.sleepHours.value < 6 ? 'warn' : 'good'}
          suffix="%"
          hint={
            v.sleepHours?.value == null
              ? 'No sleep record — this input is missing from every estimate that uses it.'
              : `${v.sleepHours.value} h recorded${v.sleepHours.days > 1 ? ` (average of ${v.sleepHours.days} entries)` : ''}.`
          }
        />
        <Meter
          label="Activity vs the 150 min/week level used by the models"
          value={v.activityMinutes?.value == null ? 0 : Math.min(100, (v.activityMinutes.value / 150) * 100)}
          threshold={100}
          tone={
            v.activityMinutes?.value == null
              ? 'neutral'
              : v.activityMinutes.value < 60
                ? 'bad'
                : v.activityMinutes.value < 150
                  ? 'warn'
                  : 'good'
          }
          suffix="%"
          hint={
            v.activityMinutes?.value == null ? 'No activity record.' : `${v.activityMinutes.value} min/week recorded.`
          }
        />
        <Meter
          label="Systolic pressure vs the 130 mmHg level used by the models"
          value={v.systolic?.value == null ? 0 : Math.min(100, (v.systolic.value / 180) * 100)}
          threshold={72}
          tone={
            v.systolic?.value == null ? 'neutral' : v.systolic.value >= 140 ? 'bad' : v.systolic.value >= 130 ? 'warn' : 'good'
          }
          suffix="%"
          hint={
            v.systolic?.value == null
              ? 'No blood-pressure reading recorded — the hypertension and cardiovascular models run on baseline risk only.'
              : `${v.systolic.value} mmHg recorded.`
          }
        />
      </div>

      {snapshot.dailyPanel ? (
        <>
          <p className="form-label" style={{ marginTop: 16 }}>
            {snapshot.dailyPanel.label} — synthetic
          </p>
          <LineChart
            series={[
              {
                id: 'sleep',
                label: `Sleep (h) · latest ${snapshot.dailyPanel.sleep}`,
                color: 'var(--primary)',
                points: snapshot.dailyPanel.series.map((p, i) => ({ x: i, y: p.sleep })),
              },
              {
                id: 'systolic',
                label: `Systolic pressure (mmHg) · latest ${snapshot.dailyPanel.systolic}`,
                color: 'var(--warn)',
                points: snapshot.dailyPanel.series.map((p, i) => ({ x: i, y: p.systolic })),
              },
            ]}
            height={200}
            formatX={(i) => snapshot.dailyPanel.series[Math.round(i)]?.label ?? ''}
          />
          <p className="muted-small">
            {snapshot.dailyPanel.note} These points are used only for daily-tracking fields this profile has not recorded
            itself, and only for the primary profile.
          </p>
        </>
      ) : (
        <p className="muted-small" style={{ marginTop: 12 }}>
          No daily-tracking series is attached to this profile. Entries you add on the "Add health data" tab are used
          instead — nothing is copied from the primary profile.
        </p>
      )}

      {snapshot.signals.length > 0 && (
        <p className="muted-small" style={{ marginTop: 12 }}>
          <Icon name="info" size={13} /> {snapshot.signals.length} bio-signal recording
          {snapshot.signals.length === 1 ? '' : 's'} stored for this profile (
          {[...signalsByCategory.entries()].map(([c, n]) => `${c}: ${n}`).join(', ')}). Raw recordings are
          metadata-only demo records; the risk models read the derived daily metrics above, never the waveforms.
        </p>
      )}
    </Section>
  );
}

/** Genetic data — what is recorded, what is actually carried, what is modelled. */
function GeneticsDomain({ snapshot }) {
  const carried = snapshot.genes.filter((g) => g.carried);
  const notCarried = snapshot.genes.filter((g) => !g.carried);
  const unmodelled = unmodelledGenes(snapshot.genes);

  return (
    <Section
      title="Genetic data"
      subtitle="Variant rows recorded for this profile. A row is only counted as carried when it actually reports an alternate allele."
      aside={<Badge tone={carried.length ? 'warn' : 'neutral'}>{carried.length} carried</Badge>}
    >
      <div className="stat-grid">
        <StatCard
          label="Variant rows"
          value={snapshot.genes.length}
          note={`${snapshot.counts.ownGenes} entered on this dashboard`}
          tone="info"
        />
        <StatCard
          label="Actually carried"
          value={carried.length}
          note={carried.length ? carried.map((g) => `${g.gene} ${g.variant}`).join(', ') : 'No alternate allele reported'}
          tone={carried.length ? 'warn' : 'neutral'}
        />
        <StatCard
          label="Rows that are not carriers"
          value={notCarried.length}
          note={notCarried.length ? notCarried.map((g) => `${g.gene} (${g.zygosity})`).join(', ') : 'None'}
          tone="neutral"
        />
        <StatCard
          label="Genes this model does not use"
          value={unmodelled.length}
          note={unmodelled.length ? unmodelled.join(', ') : 'All recorded genes map to a model'}
          tone={unmodelled.length ? 'warn' : 'good'}
        />
      </div>

      {carried.length > 0 && (
        <div className="chip-row">
          {carried.map((g) => (
            <span className="chip" key={`carried-${g.id}`}>
              carried: {g.gene} {g.variant} ({g.zygosity})
            </span>
          ))}
        </div>
      )}

      {snapshot.genes.length === 0 ? (
        <p className="muted-small">
          No genetic variants are recorded for this profile, so every genetic contribution in the risk engine is skipped
          and listed as a missing input. Records added on the Genetic &amp; DNA Profile page (or here) will be used.
        </p>
      ) : (
        <div className="mini-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Gene</th>
                <th>Variant</th>
                <th>Zygosity</th>
                <th>Counted as carried</th>
                <th>Classification</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.genes.map((g) => (
                <tr key={g.id}>
                  <td>{g.gene}</td>
                  <td>{g.variant}</td>
                  <td>{g.zygosity}</td>
                  <td>
                    <Badge tone={g.carried ? 'warn' : 'neutral'}>{g.carried ? 'Yes' : 'No'}</Badge>
                  </td>
                  <td className="muted-small">{g.classification}</td>
                  <td className="muted-small">{g.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="muted-small" style={{ marginTop: 10 }}>
        <Icon name="info" size={13} /> Genetic rows are treated as research-only associations. "Homozygous reference" is a
        no-call for a risk variant and is never counted. Several modelled genes require confirmatory clinical testing and
        genetic counselling before any conclusion is drawn — the engine states this wherever those genes are used.
      </p>
    </Section>
  );
}

/** AI chat insights — the user's own statements, never the assistant's replies. */
function InsightsDomain({ snapshot }) {
  const ins = snapshot.insights;
  return (
    <Section
      title="AI chat insights"
      subtitle="Symptoms and topics mentioned by the patient in the AI Health Assistant, plus notes typed on this dashboard."
      aside={<Badge tone={ins.observations.length ? 'info' : 'neutral'}>{ins.observations.length} observations</Badge>}
    >
      <div className="stat-grid">
        <StatCard
          label="Conversations scanned"
          value={ins.conversationsScanned}
          note={`${ins.notesScanned} dashboard notes included`}
          tone="info"
        />
        <StatCard
          label="Patient statements read"
          value={ins.statementsScanned}
          note="Assistant replies are never read as patient data"
          tone="info"
        />
        <StatCard
          label="Symptoms matched"
          value={ins.distinctSymptoms.length}
          note="Distinct symptom keyword matches"
          tone={ins.distinctSymptoms.length ? 'warn' : 'neutral'}
        />
        <StatCard
          label="Topics mentioned"
          value={ins.topics.length}
          note={ins.topics.map((t) => t.label).slice(0, 3).join(', ') || 'None matched'}
          tone="neutral"
        />
      </div>

      {ins.topics.length > 0 && (
        <div className="chip-row">
          {ins.topics.map((t) => (
            <span className="chip" key={t.id}>
              {t.label} · keyword “{t.term}”
            </span>
          ))}
        </div>
      )}

      {ins.observations.length === 0 ? (
        <p className="muted-small">
          No symptom keywords were matched in this profile's messages or notes. That is not the same as "no symptoms" — it
          only means nothing matching the scan list was written down.
        </p>
      ) : (
        <ul className="insight-list">
          {ins.observations.map((o) => (
            <li key={o.id} className="insight-item">
              <div className="insight-head">
                <strong>{o.label}</strong>
                <Badge tone="neutral">{o.category}</Badge>
                <Badge tone={o.origin === 'ai-chat' ? 'info' : 'neutral'}>
                  {o.origin === 'ai-chat' ? 'AI chat' : 'dashboard note'}
                </Badge>
              </div>
              <p className="insight-excerpt">“{o.excerpt}”</p>
              <p className="muted-small">
                {o.conversationTitle}
                {o.at
                  ? ` · ${new Date(o.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                  : ''}{' '}
                · matched keyword “{o.term}”
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="muted-small" style={{ marginTop: 10 }}>
        {ins.method}
      </p>
    </Section>
  );
}

/**
 * Aggregated health-data overview: laboratory results, bio-signals & daily
 * tracking, genetic data and AI-chat insights, in one tabbed card.
 */

const NO_LIST = [];
const NO_COUNTS = {
  labs: 0,
  ownLabs: 0,
  vitals: 0,
  genes: 0,
  ownGenes: 0,
  notes: 0,
  conversations: 0,
  statements: 0,
  observations: 0,
  signals: 0,
};
const NO_INSIGHTS = {
  statementsScanned: 0,
  conversationsScanned: 0,
  notesScanned: 0,
  observations: NO_LIST,
  distinctSymptoms: NO_LIST,
  topics: NO_LIST,
  method: 'No insight scan was recorded for this snapshot.',
};

/**
 * Guarantee every field the domain panels read exists.
 *
 * The domains below index straight into `snapshot.counts`, `snapshot.labs` and
 * friends; a snapshot that is missing one of them (a store still hydrating, an
 * older persisted shape) would throw during render and blank the whole page.
 * Filling the gaps here keeps each panel honest — it shows zero records — while
 * never inventing a value that was not in the snapshot.
 */
function withDefaults(snapshot) {
  const dailyPanel = snapshot?.dailyPanel ?? null;
  return {
    ...snapshot,
    counts: { ...NO_COUNTS, ...(snapshot?.counts ?? {}) },
    demographics: {
      age: null,
      sex: null,
      relation: null,
      heightCm: null,
      weightKg: null,
      bmi: null,
      bmiCategory: null,
      ...(snapshot?.demographics ?? {}),
    },
    labs: snapshot?.labs ?? NO_LIST,
    labOverview: snapshot?.labOverview ?? NO_LIST,
    labFeatures: snapshot?.labFeatures ?? {},
    unmappedAnalytes: snapshot?.unmappedAnalytes ?? NO_LIST,
    vitals: snapshot?.vitals ?? NO_LIST,
    vitalFeatures: snapshot?.vitalFeatures ?? {},
    dailyPanel: dailyPanel ? { ...dailyPanel, series: dailyPanel.series ?? NO_LIST } : null,
    signals: snapshot?.signals ?? NO_LIST,
    genes: snapshot?.genes ?? NO_LIST,
    insights: { ...NO_INSIGHTS, ...(snapshot?.insights ?? {}) },
    sources: snapshot?.sources ?? NO_LIST,
    flags: snapshot?.flags ?? NO_LIST,
  };
}

export default function UnifiedDataOverview({ snapshot }) {
  if (!snapshot) return null;
  const s = withDefaults(snapshot);
  const counts = s.counts;
  return (
    <Tabs
      tabs={[
        { id: 'labs', label: `Laboratory (${counts.labs})` },
        { id: 'vitals', label: `Biosignals & daily (${counts.vitals})` },
        { id: 'genetics', label: `Genetic data (${counts.genes})` },
        { id: 'insights', label: `AI chat insights (${counts.observations})` },
      ]}
    >
      {(tab) => (
        <>
          {tab?.id === 'labs' && <LabDomain snapshot={s} />}
          {tab?.id === 'vitals' && <VitalsDomain snapshot={s} />}
          {tab?.id === 'genetics' && <GeneticsDomain snapshot={s} />}
          {tab?.id === 'insights' && <InsightsDomain snapshot={s} />}
        </>
      )}
    </Tabs>
  );
}


import { useCallback, useMemo, useState } from 'react';
import { Panel, Badge, StatCard, Meter } from '../components/ui/index.js';
import Icon from '../components/icons.jsx';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import ProfileSwitcher from '../components/ProfileSwitcher.jsx';
import UnifiedDataOverview from '../components/UnifiedDataOverview.jsx';
import DiseaseRiskCard from '../components/DiseaseRiskCard.jsx';
import DiseaseRiskDetail from '../components/DiseaseRiskDetail.jsx';
import HealthDataEntry from '../components/HealthDataEntry.jsx';
import HBarList from '../components/charts/HBarList.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { buildProfileHealthSnapshot } from '../lib/healthAggregation.js';
import { assessHealthRisks, diffAssessments } from '../lib/unifiedRiskEngine.js';

/**
 * Unified Patient Health & Risk Dashboard.
 *
 * Consumes the payload assessHealthRisks() actually returns:
 *   { modelVersion, horizonBasis, generatedAt, profile, inputCounts,
 *     results, ranked, summary, domainBreakdown, unmodelledGenes, flags, notes }
 * - `results` is EVERY model, including the ones that do not apply to this
 *   profile (they render as explicit "model not run" cards).
 * - `ranked` is the applicable subset sorted by estimate, high to low.
 *
 * Nothing here assumes a field exists: every list falls back to [] and every
 * value is optional-chained, so a partial store, an empty profile or an engine
 * failure degrades into an empty panel with an explanation rather than a crash.
 */

/** Shared fallbacks — never mutated, so a frozen/absent list cannot break a map. */
const EMPTY_LIST = [];
const EMPTY_COUNTS = {
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

/** Finite-number guard so undefined/NaN never reach the UI as "NaN". */
function num(value, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Signed point label: "+12" / "-4" / "0". */
function signed(value) {
  const n = num(value);
  return `${n > 0 ? '+' : ''}${n}`;
}

export default function UnifiedDashboard() {
  const appData = useAppData() ?? {};

  const activeProfileId = appData?.activeProfileId ?? null;
  const activeProfile = appData?.activeProfile ?? null;
  const activeProfileRecords = appData?.activeProfileRecords ?? null;
  const bloodTests = appData?.bloodTests ?? EMPTY_LIST;
  const geneticRecords = appData?.geneticRecords ?? EMPTY_LIST;
  const conversations = appData?.conversations ?? EMPTY_LIST;
  const bioSignals = appData?.bioSignals ?? EMPTY_LIST;

  // buildProfileHealthSnapshot() spreads these arrays directly, so they must
  // always be arrays even when the store has not finished hydrating.
  const appStore = useMemo(
    () => ({
      bloodTests: bloodTests ?? EMPTY_LIST,
      geneticRecords: geneticRecords ?? EMPTY_LIST,
      conversations: conversations ?? EMPTY_LIST,
      bioSignals: bioSignals ?? EMPTY_LIST,
    }),
    [bloodTests, geneticRecords, conversations, bioSignals],
  );

  // Aggregation + scoring are wrapped: a bad or absent snapshot degrades to an
  // empty dashboard that says why, instead of taking the whole page down.
  const aggregated = useMemo(() => {
    try {
      const built = buildProfileHealthSnapshot({
        profile: activeProfile,
        records: activeProfileRecords ?? {},
        appStore,
      });
      return { snapshot: built ?? null, error: null };
    } catch (err) {
      return { snapshot: null, error: err?.message ?? String(err) };
    }
  }, [activeProfile, activeProfileRecords, appStore]);

  const snapshot = aggregated.snapshot;

  const evaluated = useMemo(() => {
    if (!snapshot) return { assessment: null, error: aggregated.error };
    try {
      return { assessment: assessHealthRisks(snapshot) ?? null, error: null };
    } catch (err) {
      return { assessment: null, error: err?.message ?? String(err) };
    }
  }, [snapshot, aggregated.error]);

  const currentAssessment = evaluated.assessment;
  const engineError = evaluated.error;

  // Normalized read-only views over the assessment. `assessment` is always an
  // object, so every access below is safe even when scoring failed.
  const assessment = currentAssessment ?? {};
  const results = assessment?.results ?? EMPTY_LIST;
  const ranked = assessment?.ranked ?? EMPTY_LIST;
  const summary = assessment?.summary ?? {};
  const modelNotes = assessment?.notes ?? EMPTY_LIST;
  const domainBreakdown = assessment?.domainBreakdown ?? EMPTY_LIST;
  const modelVersion = assessment?.modelVersion ?? 'model version unavailable';
  const counts = { ...EMPTY_COUNTS, ...(snapshot?.counts ?? {}) };

  const [lastAnalysis, setLastAnalysis] = useState(() => currentAssessment);
  const [diffReport, setDiffReport] = useState(null);
  const [selectedDiseaseId, setSelectedDiseaseId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [scoredProfileId, setScoredProfileId] = useState(activeProfileId);

  const changed = diffReport?.changed ?? EMPTY_LIST;
  const changedCount = changed.length;
  const unchangedCount = num(diffReport?.unchanged?.length);

  /* All hooks run before any conditional output — rules-of-hooks safe. */

  // Switching profile invalidates the stored comparison: the previous snapshot
  // belongs to another person's record set, so diffing against it would report
  // changes that are really just "different profile". State is adjusted during
  // render (React's documented pattern) rather than in an effect, so the reset
  // is applied in the same pass that shows the new profile.
  if (scoredProfileId !== activeProfileId) {
    setScoredProfileId(activeProfileId);
    setLastAnalysis(currentAssessment);
    setDiffReport(null);
    setSelectedDiseaseId(null);
    setStatusMessage(null);
  }

  // "High-risk" mirrors riskBand() in the engine: the high band is tone "bad".
  const highRiskResults = useMemo(
    () =>
      (ranked ?? EMPTY_LIST).filter(
        (r) => r?.applies !== false && ((r?.band?.tone ?? '') === 'bad' || num(r?.risk) >= 60),
      ),
    [ranked],
  );

  // The modal keeps only the id and re-reads the live result, so a re-run or a
  // profile switch always refreshes what is displayed.
  const selectedResult = useMemo(
    () => (results ?? EMPTY_LIST).find((r) => r?.id === selectedDiseaseId) ?? null,
    [results, selectedDiseaseId],
  );

  const openDisease = useCallback((id) => setSelectedDiseaseId(id ?? null), []);
  const closeDisease = useCallback(() => setSelectedDiseaseId(null), []);

  const handleRerun = () => {
    let fresh = null;
    try {
      fresh = assessHealthRisks(snapshot) ?? null;
    } catch (err) {
      setStatusMessage(`Analysis could not be re-run: ${err?.message ?? String(err)}`);
      return;
    }
    const diff = diffAssessments(lastAnalysis ?? currentAssessment, fresh) ?? null;
    const moved = diff?.changed ?? EMPTY_LIST;
    setLastAnalysis(fresh);
    setDiffReport(diff);
    setStatusMessage(
      moved.length === 0
        ? `Analysis re-evaluated across ${results.length} model(s). No input metric changed, so every estimate is identical to the previous run — the models are deterministic.`
        : (diff?.summary ?? `Analysis re-evaluated: ${moved.length} estimate(s) changed.`),
    );
  };

  // Header + stat values, all defaulted.
  const profileName = assessment?.profile?.name ?? activeProfile?.name ?? 'Patient';
  const relation =
    activeProfile?.relation ?? activeProfile?.relationship ?? assessment?.profile?.relation ?? null;
  const ageValue = activeProfile?.age ?? assessment?.profile?.age ?? null;
  const sexValue = activeProfile?.sex ?? assessment?.profile?.sex ?? null;
  const isPrimary = Boolean(activeProfile?.isPrimary ?? assessment?.profile?.isPrimary);
  const coveragePct = num(summary?.coveragePct);
  const planItems = num(summary?.planItems);
  const highPriorityPlanItems = num(summary?.highPriorityPlanItems);
  const redFlagCount = num(summary?.redFlagCount);
  const diseasesModelled = num(summary?.diseasesModelled, results.length);
  const notApplicableCount = num(summary?.diseasesNotApplicable);
  const highest = summary?.highest ?? null;
  const totalDataPoints =
    num(counts?.labs) + num(counts?.vitals) + num(counts?.genes) + num(counts?.observations);

  // Models the engine deliberately refused to run for this profile. They are
  // listed with their own reason instead of being dropped silently.
  const notApplicable = useMemo(
    () => (results ?? EMPTY_LIST).filter((r) => r?.applies === false),
    [results],
  );
  const unmodelled = assessment?.unmodelledGenes ?? EMPTY_LIST;


  return (
    <>
      <Panel
        title={`Unified Health & Risk Profile · ${profileName}`}
        subtitle={`${relation ? `${relation} · ` : ''}${sexValue || 'sex not stated'}, ${
          ageValue != null ? `${ageValue} yrs` : 'age unrecorded'
        } · ${diseasesModelled} of ${results.length} deterministic models apply · ${modelVersion}`}
        aside={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Badge tone={isPrimary ? 'info' : 'neutral'}>
              {isPrimary ? 'Primary profile' : 'Family member'}
            </Badge>
            <button type="button" className="action-button" onClick={handleRerun}>
              <Icon name="refresh" size={14} /> Re-run AI Analysis
            </button>
          </div>
        }
      >
        {engineError && (
          <div className="notice-banner tone-border-bad" role="alert">
            <strong>This profile could not be scored</strong>
            <span>
              {engineError} The panels below stay empty instead of showing an estimate built from
              missing data.
            </span>
          </div>
        )}

        <div className="stat-grid">
          <StatCard
            label="Model coverage"
            value={`${coveragePct}%`}
            note={`${num(summary?.inputsPresent)} of ${num(summary?.inputsTotal)} declared model inputs present`}
            tone={coveragePct >= 70 ? 'good' : 'warn'}
          />
          <StatCard
            label="Conditions modelled"
            value={diseasesModelled}
            note={
              notApplicableCount > 0
                ? `${notApplicableCount} model(s) do not apply to this profile`
                : 'Every model applies to this profile'
            }
            tone="info"
          />
          <StatCard
            label="High-risk estimates"
            value={highRiskResults.length}
            note={
              highRiskResults.length
                ? highRiskResults.map((r) => r?.label ?? r?.id ?? 'model').join(', ')
                : 'No estimate reaches the high band'
            }
            tone={highRiskResults.length > 0 ? 'bad' : 'good'}
          />
          <StatCard
            label="Highest estimate"
            value={highest?.risk != null ? `${Math.round(num(highest.risk))}%` : '—'}
            note={
              highest?.label
                ? `${highest.label} · ${highest?.band?.label ?? 'unrated'}`
                : 'No applicable model produced an estimate'
            }
            tone={highest?.band?.tone ?? 'neutral'}
          />
          <StatCard
            label="Reported symptom flags"
            value={redFlagCount}
            note="Self-reported statements matched from AI chat or your notes"
            tone={redFlagCount > 0 ? 'warn' : 'neutral'}
          />
          <StatCard
            label="Prevention actions"
            value={planItems}
            note={`${highPriorityPlanItems} marked high priority · every step is evidence-linked`}
            tone="info"
          />
          <StatCard
            label="Aggregated data points"
            value={totalDataPoints}
            note={`${num(counts?.labs)} labs · ${num(counts?.vitals)} daily entries · ${num(
              counts?.genes,
            )} variants · ${num(counts?.observations)} chat insights`}
            tone="neutral"
          />
        </div>

        <Meter
          value={coveragePct}
          tone={coveragePct >= 70 ? 'good' : coveragePct >= 40 ? 'warn' : 'bad'}
          label={`Model input coverage — ${num(summary?.inputsPresent)} of ${num(summary?.inputsTotal)} declared inputs present`}
          hint="Coverage is the share of declared model inputs that actually carry a value for this profile. Inputs that are absent are recorded as gaps; they are never treated as normal results."
          suffix="%"
        />

        {statusMessage && (
          <div
            className={`notice-banner ${changedCount > 0 ? 'tone-border-warn' : 'tone-border-info'}`}
          >
            <strong>Analysis run</strong>
            <span>{statusMessage}</span>
          </div>
        )}

        {changedCount > 0 && (
          <div className="diff-box">
            <strong>Detected changes between analysis snapshots</strong>
            <ul>
              {changed.map((c, i) => (
                <li key={c?.id ?? `changed-${i}`}>
                  <strong>{c?.label ?? c?.id ?? 'Model'}</strong>: {num(c?.from)}% →{' '}
                  {num(c?.to)}% ({signed(c?.delta)} points)
                </li>
              ))}
            </ul>
            {unchangedCount > 0 && (
              <p className="muted-small">
                {unchangedCount} estimate(s) were re-scored and did not move.
              </p>
            )}
          </div>
        )}
      </Panel>

      <ProfileSwitcher />

      {snapshot ? (
        <UnifiedDataOverview snapshot={snapshot} />
      ) : (
        <Panel
          title="Aggregated health data"
          subtitle="Laboratory results, daily tracking, genetics and chat insights for the active profile"
        >
          <p className="record-note">
            No data snapshot could be built for this profile
            {aggregated.error ? ` — ${aggregated.error}` : ''}. The overview stays empty rather than
            showing values from another profile or from the demo seed.
          </p>
        </Panel>
      )}

      <Panel
        title="Disease risk & progression models"
        subtitle={`${ranked.length} applicable deterministic model(s), highest estimate first · ${notApplicable.length} model(s) not run for this profile · missing inputs are reported as gaps, never as zero risk`}
        aside={<Badge tone="neutral">{modelVersion}</Badge>}
      >
        {ranked.length === 0 ? (
          <p className="record-note">
            No model applies to this profile, so no estimate is shown. A model is skipped when its own
            applicability rule is not met (for example a sex-limited cancer model) — that is not the same
            as a low risk.
          </p>
        ) : (
          <div className="risk-card-grid">
            {ranked.map((result, i) => (
              <DiseaseRiskCard key={result?.id ?? `ranked-${i}`} result={result} onOpen={openDisease} />
            ))}
          </div>
        )}

        {notApplicable.length > 0 && (
          <>
            <p className="rl-subhead">Models not run for this profile</p>
            <div className="risk-card-grid">
              {notApplicable.map((result, i) => (
                <DiseaseRiskCard
                  key={result?.id ?? `na-${i}`}
                  result={result}
                  onOpen={openDisease}
                />
              ))}
            </div>
          </>
        )}
      </Panel>

      <Panel
        title="Which data domain moves the estimates"
        subtitle="Sum of the risk-increasing points contributed by each domain across every applicable model"
        aside={<Badge tone="proto">derived from the run above</Badge>}
      >
        {domainBreakdown.length === 0 ? (
          <p className="record-note">
            No measured input pushed any estimate above its age/sex baseline, so there is no domain to
            rank. This is a statement about the data present, not evidence of low risk.
          </p>
        ) : (
          <HBarList
            items={domainBreakdown.map((d) => ({
              label: d?.domain ?? 'unlabelled domain',
              value: num(d?.points),
              note: `${num(d?.points)} percentage points summed across applicable models`,
              tone: num(d?.points) > 0 ? 'bad' : 'good',
            }))}
            formatValue={(v) => `${v} pts`}
            caption="Points are summed across models, so a domain that feeds several conditions appears larger. They are not probabilities and cannot be added to a single risk number."
          />
        )}

        {unmodelled.length > 0 && (
          <div className="chip-row" style={{ marginTop: 12 }}>
            {unmodelled.map((g) => (
              <span className="chip" key={g}>
                not modelled: {g}
              </span>
            ))}
            <p className="muted-small" style={{ width: '100%' }}>
              These genetic entries are on the profile but no model in this engine uses them, so they
              contributed nothing to any estimate above.
            </p>
          </div>
        )}
      </Panel>

      <HealthDataEntry profile={activeProfile} records={activeProfileRecords} />

      {modelNotes.length > 0 && (
        <Panel
          title="Model notes & limitations"
          subtitle="Applies to every estimate on this page"
          aside={<Badge tone="warn">unvalidated demo model</Badge>}
        >
          <ul className="note-list">
            {modelNotes.map((n, i) => (
              <li key={typeof n === 'string' ? n : `note-${i}`}>{n}</li>
            ))}
          </ul>
        </Panel>
      )}

      {selectedResult && (
        <DiseaseRiskDetail
          result={selectedResult}
          onClose={closeDisease}
          modelVersion={modelVersion}
        />
      )}

      <MedicalDisclaimer />
    </>
  );
}

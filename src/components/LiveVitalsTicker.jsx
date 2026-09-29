import { useEffect, useMemo, useState } from 'react';
import { useAppData } from '../context/AppDataContext.jsx';
import { buildProfileHealthSnapshot } from '../lib/healthAggregation.js';
import { fabRiskIndex } from '../lib/fabRiskIndex.js';
import { liveReadingFor } from '../lib/liveVitals.js';
import { buildTickerItems } from '../lib/tickerFeed.js';

/** Wall clock that ticks on a fixed interval so the live figures keep moving. */
function useNow(intervalMs = 5000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * LiveVitalsTicker — the pulsing alert bar pinned above the top bar on every
 * screen. It scrolls continuously and carries the live vital signs, each
 * profile's FAB risk band (and any band change), laboratory values that sit
 * outside the range supplied with them, the medication count on file, and two
 * honest statements about what the numbers are.
 *
 * It is a real marquee: the track is duplicated and animated with CSS, so it
 * costs no timers per item and pauses on hover / when the OS asks for reduced
 * motion.
 */
export default function LiveVitalsTicker() {
  const appData = useAppData();
  const {
    profiles = [],
    activeProfileId = null,
    activeProfile = null,
    profileRecords = {},
    bloodTests = [],
    geneticRecords = [],
    conversations = [],
    bioSignals = [],
  } = appData ?? {};

  const now = useNow(5000);

  // 1) Data-only snapshots: they change when the records change, not every tick.
  const snapshots = useMemo(() => {
    const appStore = { bloodTests, geneticRecords, conversations, bioSignals };
    const out = {};
    for (const profile of profiles) {
      out[profile.id] = buildProfileHealthSnapshot({
        profile,
        records: profileRecords[profile.id],
        appStore,
      });
    }
    return out;
  }, [profiles, profileRecords, bloodTests, geneticRecords, conversations, bioSignals]);

  // 2) The index WITHOUT the live reading — the reference a band change is
  //    measured against, so the "RISK CHANGE" line is a real comparison.
  const dataOnlyFab = useMemo(() => {
    const out = {};
    for (const profile of profiles) {
      const family = profiles
        .filter((p) => p.id !== profile.id)
        .map((p) => ({ name: p.name, relation: p.relation }));
      out[profile.id] = fabRiskIndex({
        snapshot: snapshots[profile.id],
        profile,
        liveReading: null,
        family,
        records: profileRecords[profile.id],
      });
    }
    return out;
  }, [profiles, snapshots, profileRecords]);

  // 3) Live pass: readings + the index that includes them.
  const { readings, liveFab } = useMemo(() => {
    const readingsOut = {};
    const fabOut = {};
    for (const profile of profiles) {
      const reading = liveReadingFor(profile, now);
      readingsOut[profile.id] = reading;
      const family = profiles
        .filter((p) => p.id !== profile.id)
        .map((p) => ({
          name: p.name,
          relation: p.relation,
          score: dataOnlyFab[p.id]?.score ?? 0,
          band: dataOnlyFab[p.id]?.band ?? 'low',
        }));
      fabOut[profile.id] = fabRiskIndex({
        snapshot: snapshots[profile.id],
        profile,
        liveReading: reading,
        family,
        records: profileRecords[profile.id],
      });
    }
    return { readings: readingsOut, liveFab: fabOut };
  }, [profiles, snapshots, dataOnlyFab, profileRecords, now]);

  const items = useMemo(
    () =>
      buildTickerItems({
        profiles,
        fabByProfile: liveFab,
        dataOnlyFabByProfile: dataOnlyFab,
        readingsByProfile: readings,
        snapshotsByProfile: snapshots,
        activeProfileId: activeProfile?.id ?? activeProfileId,
        medsCount: Array.isArray(profileRecords?.[activeProfile?.id]?.meds)
          ? profileRecords[activeProfile.id].meds.length
          : 0,
      }),
    [profiles, liveFab, dataOnlyFab, readings, snapshots, activeProfile, activeProfileId, profileRecords],
  );

  if (!items.length) return null;

  const duration = Math.max(38, items.length * 9);

  return (
    <div className="live-ticker" role="status" aria-live="polite" aria-label="Live clinical alerts">
      <span className="live-ticker-flag">
        <span className="live-dot" aria-hidden="true" />
        LIVE
      </span>
      <div className="live-ticker-viewport">
        <div className="live-ticker-track" style={{ animationDuration: `${duration}s` }}>
          {[0, 1].map((copy) => (
            <div className="live-ticker-group" key={copy} aria-hidden={copy === 1}>
              {items.map((item) => (
                <span
                  key={`${copy}-${item.id}`}
                  className={`live-ticker-item tone-${item.tone}`}
                  title={item.note ?? ''}
                >
                  <span className="live-ticker-tag">{item.tag}</span>
                  {item.text}
                  <span className="live-ticker-sep" aria-hidden="true">
                    ◆
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

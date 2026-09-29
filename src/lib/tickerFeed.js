/**
 * Ticker feed — turns live application state into the scrolling alerts shown in
 * the marquee bar at the top of every screen.
 *
 * Every line is derived from something that genuinely exists in the app:
 *   LIVE      the current simulated device reading for the active profile
 *   RISK      each profile's FAB band, and any band change detected between the
 *             data-only index and the index that includes the live reading
 *   LAB       laboratory values that fall outside the range supplied with them
 *   MEDS      how many medications are on file for the active profile
 *   SYSTEM    honest statements about what the numbers are (and are not)
 *
 * Nothing here is decorative filler text: if a rule has no data, its line is
 * simply absent. The marquee only repeats whatever was really produced.
 */

const MAX_ITEMS = 14;

const TONE_ORDER = { bad: 0, warn: 1, info: 2, good: 3 };

function push(list, item) {
  if (!item?.text) return;
  list.push({ id: `${item.tag}-${item.ref ?? item.text}`.slice(0, 90), tone: item.tone ?? 'info', ...item });
}

export function buildTickerItems({
  profiles = [],
  fabByProfile = {},
  dataOnlyFabByProfile = {},
  readingsByProfile = {},
  snapshotsByProfile = {},
  activeProfileId = null,
  medsCount = 0,
  extraAlerts = [],
} = {}) {
  const items = [];
  const active = profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null;
  const reading = active ? readingsByProfile[active.id] : null;

  // ---- LIVE vitals of the active profile -------------------------------
  if (active && reading) {
    push(items, {
      tag: 'LIVE',
      ref: `${active.id}-live`,
      tone: 'good',
      text: `${active.name} — HR ${reading.hr} bpm · SpO₂ ${reading.spo2} % · BP ${reading.systolic}/${reading.diastolic} mmHg · ${reading.temperature} °C · signal quality ${reading.quality} %`,
      note: reading.source,
    });
  }

  // ---- Family risk bands + detected band changes ------------------------
  for (const profile of profiles) {
    const fab = fabByProfile[profile.id];
    if (!fab) continue;
    const previous = dataOnlyFabByProfile[profile.id];
    const changed = previous && previous.band !== fab.band;
    push(items, {
      tag: changed ? 'RISK CHANGE' : 'RISK',
      ref: `${profile.id}-band`,
      tone: changed ? (fab.band === 'high' ? 'bad' : 'warn') : fab.bandTone,
      text: changed
        ? `${profile.name} (${profile.relation}): FAB band moved ${previous.bandLabel} → ${fab.bandLabel} — index ${previous.score} → ${fab.score}/100`
        : `${profile.name} (${profile.relation}): FAB index ${fab.score}/100 · ${fab.bandLabel} — top driver: ${fab.drivers[0]?.label ?? 'no scored driver'}`,
      note: changed
        ? 'Band change detected between the stored-data index and the index including the current live reading.'
        : fab.note,
    });
  }

  // ---- Laboratory values outside their supplied range -------------------
  for (const profile of profiles) {
    const snapshot = snapshotsByProfile[profile.id];
    const outOfRange = (snapshot?.labOverview ?? []).filter(
      (a) => a.verdict && a.verdict !== 'within' && a.referenceRange,
    );
    for (const a of outOfRange.slice(0, 3)) {
      push(items, {
        tag: 'LAB',
        ref: `${profile.id}-${a.key}`,
        tone: a.verdict === 'above' ? 'warn' : 'info',
        text: `${profile.name}: ${a.label} ${a.value} ${a.unit} is ${a.verdict} the supplied range ${a.referenceRange}${a.date ? ` (${a.date})` : ''}`,
        note: `${a.source ?? 'Source not stated'} · laboratory range supplied with the result`,
      });
    }
  }

  // ---- Medications on file ---------------------------------------------
  if (active) {
    push(items, {
      tag: 'MEDS',
      ref: `${active.id}-meds`,
      tone: medsCount ? 'info' : 'good',
      text: medsCount
        ? `${active.name}: ${medsCount} medication${medsCount === 1 ? '' : 's'} on file — drug-interaction screening runs automatically in the Smart Pharmacy module`
        : `${active.name}: no medications on file yet — add them in Smart Pharmacy to enable automatic interaction screening`,
    });
  }

  // ---- Caller-supplied alerts (pharmacy interactions, report exports…) --
  for (const alert of extraAlerts) push(items, alert);

  // ---- Honest system statements ----------------------------------------
  push(items, {
    tag: 'SYSTEM',
    ref: 'disclaimer',
    tone: 'info',
    text: 'Every risk figure in this application is an unvalidated demo estimate over synthetic or user-entered data — not a diagnosis and not a medical device',
  });
  push(items, {
    tag: 'SYSTEM',
    ref: 'privacy',
    tone: 'info',
    text: 'Records stay in this browser only: profile data is kept in local storage and never uploaded by the prototype',
  });

  const sorted = items.sort((a, b) => (TONE_ORDER[a.tone] ?? 9) - (TONE_ORDER[b.tone] ?? 9));
  return sorted.slice(0, MAX_ITEMS);
}

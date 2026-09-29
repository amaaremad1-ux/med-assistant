import { useState } from 'react';
import { Panel, Badge } from './ui/index.js';
import Icon from './icons.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import {
  PROFILE_RELATIONS,
  PROFILE_SEXES,
  RISK_FLAGS,
  RISK_FLAG_GROUPS,
  profileInitials,
  profileMetaLine,
} from '../data/healthProfiles.js';

const EMPTY_MEMBER = {
  name: '',
  relation: 'Brother',
  sex: 'Male',
  age: '',
  heightCm: '',
  weightKg: '',
};

/**
 * Multi-profile switcher (self + family members).
 *
 * Switching profiles changes which record set the dashboard analyses. Nothing
 * is copied between profiles: a newly added family member starts with an empty
 * record set, and the dashboard says so explicitly until data is entered for
 * them.
 */
export default function ProfileSwitcher() {
  const {
    profiles,
    activeProfile,
    activeProfileRecords,
    getProfileRecords,
    setActiveProfileId,
    addProfile,
    updateProfile,
    removeProfile,
    setProfileFlags,
  } = useAppData();

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState(EMPTY_MEMBER);

  if (!activeProfile) return null;

  const flags = activeProfile.flags ?? [];
  const records = activeProfileRecords ?? { labs: [], vitals: [], genes: [], notes: [] };
  const recordCount =
    (records.labs?.length ?? 0) +
    (records.vitals?.length ?? 0) +
    (records.genes?.length ?? 0) +
    (records.notes?.length ?? 0);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const submitMember = (event) => {
    event.preventDefault();
    if (!draft.name.trim()) {
      setError('A name is required — the greeting and every record are labelled with it.');
      return;
    }
    const age = draft.age === '' ? null : Number(draft.age);
    if (age != null && (!Number.isFinite(age) || age < 0 || age > 120)) {
      setError('Age must be a number between 0 and 120.');
      return;
    }
    addProfile({
      name: draft.name.trim(),
      relation: draft.relation,
      sex: draft.sex,
      age,
      heightCm: draft.heightCm === '' ? null : Number(draft.heightCm),
      weightKg: draft.weightKg === '' ? null : Number(draft.weightKg),
      flags: [],
    });
    setDraft(EMPTY_MEMBER);
    setError(null);
    setAdding(false);
  };

  const updateDemographics = (patch) => {
    const next = { ...patch };
    for (const key of ['age', 'heightCm', 'weightKg']) {
      if (key in next) {
        const raw = next[key];
        next[key] = raw === '' || raw == null ? null : Number(raw);
      }
    }
    updateProfile(activeProfile.id, next);
  };

  const toggleFlag = (flagId) => {
    const next = flags.includes(flagId) ? flags.filter((f) => f !== flagId) : [...flags, flagId];
    setProfileFlags(activeProfile.id, next);
  };

  return (
    <Panel
      title="Profiles"
      subtitle="Switch between family members. Each profile keeps its own independent record set — nothing is copied between them."
      aside={<Badge tone="info">{profiles.length} profile{profiles.length === 1 ? '' : 's'}</Badge>}
    >
      <ul className="profile-list">
        {profiles.map((p) => {
          const own = getProfileRecords ? getProfileRecords(p.id) : null;
          const count = own
            ? (own.labs?.length ?? 0) + (own.vitals?.length ?? 0) + (own.genes?.length ?? 0) + (own.notes?.length ?? 0)
            : 0;
          return (
            <li key={p.id}>
              <button
                type="button"
                className={`profile-chip ${p.id === activeProfile.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveProfileId(p.id);
                  setConfirmRemove(false);
                }}
                aria-pressed={p.id === activeProfile.id}
              >
                <span className="profile-avatar">{profileInitials(p.name)}</span>
                <span className="profile-chip-text">
                  <strong>{p.name}</strong>
                  <em>{profileMetaLine(p) || 'Demographics not stated'}</em>
                </span>
                {p.isPrimary ? (
                  <Badge tone="neutral">Primary</Badge>
                ) : (
                  <Badge tone={count ? 'info' : 'warn'}>{count ? `${count} entries` : 'no records'}</Badge>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="toolbar">
        <button type="button" className="action-button secondary" onClick={() => setAdding((v) => !v)}>
          {adding ? 'Cancel' : 'Add family member'}
        </button>
        <button type="button" className="action-button secondary" onClick={() => setEditing((v) => !v)}>
          {editing ? 'Close profile details' : 'Edit demographics & risk flags'}
        </button>
        {!activeProfile.isPrimary && profiles.length > 1 && (
          <button
            type="button"
            className="action-button secondary danger"
            onClick={() => {
              if (!confirmRemove) {
                setConfirmRemove(true);
                return;
              }
              removeProfile(activeProfile.id);
              setConfirmRemove(false);
            }}
          >
            {confirmRemove
              ? `Confirm removal — deletes ${recordCount} entr${recordCount === 1 ? 'y' : 'ies'}`
              : 'Remove this profile'}
          </button>
        )}
      </div>
      {confirmRemove && (
        <p className="fact-note">
          Removing a profile deletes everything entered for it in this browser. The primary profile cannot be removed.
        </p>
      )}
      {error && <p className="form-error">{error}</p>}

      {adding && (
        <form className="lab-form-grid form-block" onSubmit={submitMember}>
          <label className="form-field">
            <span className="form-label">Name</span>
            <input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Rafael Vasquez" />
          </label>
          <label className="form-field">
            <span className="form-label">Relationship</span>
            <select value={draft.relation} onChange={(e) => set({ relation: e.target.value })}>
              {PROFILE_RELATIONS.filter((r) => r !== 'Self').map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="form-label">Sex</span>
            <select value={draft.sex} onChange={(e) => set({ sex: e.target.value })}>
              {PROFILE_SEXES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="form-label">Age</span>
            <input type="number" min="0" max="120" value={draft.age} onChange={(e) => set({ age: e.target.value })} />
          </label>
          <label className="form-field">
            <span className="form-label">Height (cm)</span>
            <input type="number" min="0" value={draft.heightCm} onChange={(e) => set({ heightCm: e.target.value })} />
          </label>
          <label className="form-field">
            <span className="form-label">Weight (kg)</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={draft.weightKg}
              onChange={(e) => set({ weightKg: e.target.value })}
            />
          </label>
          <div className="form-field">
            <span className="form-label">&nbsp;</span>
            <button type="submit" className="action-button">
              Create profile
            </button>
          </div>
        </form>
      )}

      {editing && (
        <div className="form-block">
          <p className="form-label">Demographics for {activeProfile.name}</p>
          <div className="lab-form-grid">
            <label className="form-field">
              <span className="form-label">Name</span>
              <input value={activeProfile.name} onChange={(e) => updateProfile(activeProfile.id, { name: e.target.value })} />
            </label>
            <label className="form-field">
              <span className="form-label">Relationship</span>
              <select
                value={activeProfile.relation}
                onChange={(e) => updateProfile(activeProfile.id, { relation: e.target.value })}
              >
                {PROFILE_RELATIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="form-label">Sex (gates sex-specific models)</span>
              <select value={activeProfile.sex} onChange={(e) => updateProfile(activeProfile.id, { sex: e.target.value })}>
                {PROFILE_SEXES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="form-label">Age</span>
              <input
                type="number"
                min="0"
                max="120"
                value={activeProfile.age ?? ''}
                onChange={(e) => updateDemographics({ age: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span className="form-label">Height (cm)</span>
              <input
                type="number"
                min="0"
                value={activeProfile.heightCm ?? ''}
                onChange={(e) => updateDemographics({ heightCm: e.target.value })}
              />
            </label>
            <label className="form-field">
              <span className="form-label">Weight (kg)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={activeProfile.weightKg ?? ''}
                onChange={(e) => updateDemographics({ weightKg: e.target.value })}
              />
            </label>
          </div>

          {RISK_FLAG_GROUPS.map((group) => (
            <div key={group} className="form-block">
              <p className="form-label">{group} — self-declared, not measured</p>
              <div className="check-grid">
                {RISK_FLAGS.filter((f) => f.group === group).map((flag) => (
                  <label key={flag.id} className={`check-item ${flags.includes(flag.id) ? 'on' : ''}`}>
                    <input type="checkbox" checked={flags.includes(flag.id)} onChange={() => toggleFlag(flag.id)} />
                    {flag.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <p className="fact-note">
            <Icon name="info" size={13} /> Declared flags are used only as self-declared inputs and are labelled as such
            in every explanation. An unchecked flag means "not declared" — it is never treated as a negative result.
          </p>
        </div>
      )}
    </Panel>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Panel, Badge, StatCard } from '../components/ui/index.js';
import { getEvents, clearEvents, AUDIT_TYPES, typeTone, formatWhen } from '../lib/audit.js';

/**
 * Audit Trail (module #28) — full local event log with type filtering.
 * Every measurement, model execution, prediction and data change in this
 * demo is recorded here. The trail lives in this browser's localStorage
 * only (key sha_audit_v1, capped at 300 entries).
 */
export default function AuditTrail() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    setEvents(getEvents());
  }, []);

  const filtered = useMemo(
    () => (filter === 'ALL' ? events : events.filter((e) => e.type === filter)),
    [events, filter],
  );

  function refresh() {
    setEvents(getEvents());
  }

  function clear() {
    clearEvents('Manual clear from Audit Trail page');
    setEvents(getEvents());
    setFilter('ALL');
  }

  return (
    <>
      <div className="stat-grid">
        <StatCard label="Events in trail" value={events.length} note="Capped at 300 — oldest entries drop first" tone="info" />
        <StatCard label="Currently shown" value={filtered.length} note={filter === 'ALL' ? 'No filter applied' : `Filtered to ${filter}`} />
        <StatCard label="Event types" value={AUDIT_TYPES.length} note="Measurement · model · prediction · data · experiment" />
        <StatCard label="Storage" value="Local" note="localStorage in this browser only" />
      </div>

      <Panel
        title="Audit trail"
        subtitle="Append-only research log — every entry records what the prototype did and when"
        aside={
          <span className="inline-select">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="ALL">All types</option>
              {AUDIT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replaceAll('_', ' ').toLowerCase()}
                </option>
              ))}
            </select>
          </span>
        }
      >
        <div className="toolbar">
          <button className="action-button secondary" onClick={refresh}>
            Refresh
          </button>
          <button className="action-button secondary" onClick={clear}>
            Clear trail
          </button>
          <span className="fact-note">Clearing records the clear itself — the log stays append-only.</span>
        </div>

        {filtered.length === 0 ? (
          <p className="fact-note">No events match this filter yet.</p>
        ) : (
          <div className="mini-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Type</th>
                  <th>Event</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td className="fact-note">{formatWhen(e.at)}</td>
                    <td>
                      <Badge tone={typeTone(e.type)}>{e.type.replaceAll('_', ' ').toLowerCase()}</Badge>
                    </td>
                    <td>{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Method" subtitle="How the audit trail works in this prototype">
        <ul className="plain-list" style={{ maxWidth: 620 }}>
          <li><span>What is logged</span><strong>Device batches received, model executions, generated predictions, data changes, experiments</strong></li>
          <li><span>Where it lives</span><strong>localStorage key sha_audit_v1 — this browser, nothing transmitted</strong></li>
          <li><span>Retention</span><strong>Last 300 entries; clearing appends an explicit “cleared” marker</strong></li>
          <li><span>Research purpose</span><strong>Demonstrates the traceability a clinical deployment would require</strong></li>
        </ul>
      </Panel>
    </>
  );
}

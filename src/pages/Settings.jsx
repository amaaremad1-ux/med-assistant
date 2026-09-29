import { useEffect, useState } from 'react';
import { Panel, Badge, StatCard } from '../components/ui/index.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { getEvents, clearEvents } from '../lib/audit.js';
import { listExperiments, clearExperiments } from '../lib/experimentStore.js';
import { MODEL } from '../lib/engine.js';

/**
 * Settings — appearance, local data management, and build information.
 * Everything on this page operates on this browser only.
 */
export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const [auditCount, setAuditCount] = useState(0);
  const [expCount, setExpCount] = useState(0);

  useEffect(() => {
    setAuditCount(getEvents().length);
    setExpCount(listExperiments().length);
  }, []);

  function clearAudit() {
    clearEvents('Manual clear from Settings page');
    setAuditCount(getEvents().length);
  }

  function clearExps() {
    clearExperiments();
    setExpCount(0);
  }

  return (
    <>
      <Panel
        title="Appearance"
        subtitle="Theme preference is stored locally and applies to every page"
        aside={<Badge tone={theme === 'dark' ? 'info' : 'neutral'}>{theme === 'dark' ? 'Dark' : 'Light'} theme active</Badge>}
      >
        <div className="toolbar">
          <button className="action-button" onClick={toggleTheme}>
            Switch to {theme === 'dark' ? 'light' : 'dark'} theme
          </button>
          <span className="fact-note">
            Saved to localStorage key sha_theme_v1 — clearing site data resets it to light.
          </span>
        </div>
      </Panel>

      <Panel
        title="Local data management"
        subtitle="The prototype stores a small amount of state in this browser — manage or remove it here"
      >
        <div className="stat-grid">
          <StatCard label="Audit events stored" value={auditCount} note="Key sha_audit_v1 · cap 300" tone="info" />
          <StatCard label="Saved experiments" value={expCount} note="Key sha_experiments_v1 · cap 25" tone="info" />
        </div>
        <div className="toolbar">
          <button className="action-button secondary" onClick={clearAudit}>
            Clear audit trail
          </button>
          <button className="action-button secondary" onClick={clearExps}>
            Clear saved experiments
          </button>
        </div>
        <p className="fact-note">
          Clearing is local and reversible only by re-generating activity — nothing is
          synchronized anywhere, because the prototype has no backend.
        </p>
      </Panel>

      <Panel
        title="About this build"
        subtitle="Adaptive preventive health & risk console (research prototype)"
      >
        <ul className="plain-list" style={{ maxWidth: 620 }}>
          <li><span>Model version</span><strong>{MODEL.version}</strong></li>
          <li><span>Computed at</span><strong>{MODEL.computedAt}</strong></li>
          <li><span>Data source</span><strong>Synthetic only — seeded PRNG (seed 20260920), no real patients</strong></li>
          <li><span>Backend</span><strong>None — static frontend, all computation in-browser</strong></li>
          <li><span>Clinical status</span><strong>Unvalidated research demo — not a medical device, not a diagnosis</strong></li>
        </ul>
      </Panel>
    </>
  );
}

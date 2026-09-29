/** Module 11 — Geospatial & Epidemiological Intelligence. Ward heatmap with
 * nosocomial cluster alerts over the teaching hospital model. */
import { useMemo } from 'react';
import { Panel, Badge, StatCard, ProtoTag } from '../ui/index.js';
import { HOSPITAL_WARDS_AND_ZONES, evaluateEpidemiologicalAlerts } from '../../lib/celineClinicalEngine.js';

const FILL = { bad: 'rgba(194,55,47,.55)', warn: 'rgba(180,83,9,.5)', good: 'rgba(23,138,80,.45)' };
export default function ModuleGeo() {
  const epi = useMemo(() => evaluateEpidemiologicalAlerts(), []);
  return (
    <div className="celine-module">
      <div className="page-header" style={{ marginBottom: 4 }}>
        <div><h2 className="page-title">11 · Geospatial &amp; Epidemiological Intelligence</h2>
        <p className="page-subtitle">Ward heatmap for nosocomial clusters (MRSA / CRE teaching model).</p></div>
        <ProtoTag compact />
      </div>
      {epi.activeClusters > 0 && (
        <div className="celine-alert celine-alert-warn" role="alert"><strong>{epi.nosocomialIndex}:</strong> {epi.alerts[0]}</div>
      )}
      <div className="stat-grid" style={{ marginBottom: 16, marginTop: 16 }}>
        <StatCard label="Monitored Beds" value={epi.totalMonitoredBeds} unit="beds" tone="info" note="5 zones" />
        <StatCard label="Active Clusters" value={epi.activeClusters} unit="zones" tone={epi.activeClusters ? 'bad' : 'good'} note={epi.nosocomialIndex} />
      </div>
      <div className="celine-grid-2">
        <Panel title="Hospital Heatmap" subtitle="Bubble size = active cases · colour = outbreak risk">
          <svg viewBox="0 0 100 100" className="celine-map" role="img" aria-label="Hospital ward heatmap">
            <rect x="2" y="2" width="96" height="96" rx="6" className="celine-map-bg" />
            {HOSPITAL_WARDS_AND_ZONES.map((z) => (
              <g key={z.id}>
                <circle cx={z.x} cy={z.y} r={4 + z.activeCases * 0.28} fill={FILL[z.tone]} stroke="currentColor" strokeWidth="0.6" />
                <text x={z.x} y={z.y - 6.5} textAnchor="middle" className="celine-map-label">{z.activeCases}</text>
              </g>
            ))}
          </svg>
          <ul className="note-list" style={{ marginTop: 8 }}>
            {HOSPITAL_WARDS_AND_ZONES.map((z) => (<li key={z.id}><Badge tone={z.tone}>{z.activeCases} cases</Badge> {z.name} — {z.mrsaOutbreakRisk}</li>))}
          </ul>
        </Panel>
        <Panel title="Epidemic Alerts" subtitle="Fires when ≥2 high-risk clusters coincide" aside={<Badge tone={epi.activeClusters ? 'warn' : 'good'}>{epi.activeClusters ? 'BARRIER' : 'STANDARD'}</Badge>}>
          <ul className="note-list">
            {epi.alerts.map((a) => (<li key={a}>{a}</li>))}
            {!epi.alerts.length && <li>No clusters above threshold — standard biosafety.</li>}
          </ul>
          <p className="celine-note">Teaching thresholds over a fixed ward model — not surveillance data.</p>
        </Panel>
      </div>
    </div>
  );
}

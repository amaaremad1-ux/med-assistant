import { Panel, Badge, ProtoTag } from '../components/ui/index.js';
import { PRIVACY } from '../data/syntheticData.js';

/**
 * Privacy by Design (module #17) — prototype placeholders.
 * The privacy architecture this research prototype models, plus a factual
 * statement of what the running app actually does today.
 */
export default function PrivacyData() {
  return (
    <>
      <Panel
        title="Privacy by design — modeled architecture"
        subtitle="How the system is designed to handle data as it moves toward real research use"
        aside={<ProtoTag compact />}
      >
        <div className="info-grid">
          {PRIVACY.map((p) => (
            <article key={p.title} className="info-card">
              <div className="info-card-head">
                <strong>{p.title}</strong>
                <Badge tone={p.tone ?? 'proto'}>{p.status}</Badge>
              </div>
              <p>{p.detail}</p>
            </article>
          ))}
        </div>
        <p className="fact-note" style={{ marginTop: 12 }}>
          Items marked Concept, Design rule, Modeled or Placeholder describe intent for
          design review. They are not implemented safeguards.
        </p>
      </Panel>

      <Panel
        title="What this app actually does today"
        subtitle="Verifiable statements about the running prototype"
        aside={<Badge tone="good">Verifiable</Badge>}
      >
        <ul className="plain-list">
          <li><span>Patient data</span><strong>100% synthetic — generated locally by seeded pseudo-random functions</strong></li>
          <li><span>Network activity</span><strong>None — no backend, no API calls, no telemetry, no analytics</strong></li>
          <li><span>Computation</span><strong>All analytics run in your browser tab</strong></li>
          <li><span>Local storage</span><strong>Audit trail and saved experiments only, in this browser (removable below on Settings)</strong></li>
          <li><span>Diagnoses</span><strong>None produced, none implied — every output is a labeled research estimate</strong></li>
        </ul>
      </Panel>

      <Panel
        title="Why privacy is architectural, not a feature"
        subtitle="The design position behind this page"
      >
        <p className="fact-note">
          Preventive-health platforms can only earn longitudinal engagement if patients
          trust that their biomarker history stays under their control. That is why this
          prototype models minimum-data collection, identity separation and on-device
          processing from the start — retrofitting privacy after a data architecture
          exists is far harder than designing it in.
        </p>
      </Panel>
    </>
  );
}

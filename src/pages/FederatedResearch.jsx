import { Panel, Badge, ProtoTag } from '../components/ui/index.js';
import LineChart from '../components/charts/LineChart.jsx';
import Icon from '../components/icons.jsx';
import { FEDERATED } from '../data/syntheticData.js';

/**
 * Federated Learning Research Extension (module #18) — SIMULATED ONLY.
 * Presents the architecture as a design concept: simulated nodes, a
 * simulated loss curve, and privacy technique concepts. No real
 * federated learning is implemented anywhere in this prototype.
 */
export default function FederatedResearch() {
  const finalRound = FEDERATED.rounds[FEDERATED.rounds.length - 1];

  return (
    <>
      <Panel
        title="Federated learning — simulated extension"
        subtitle="A design concept for privacy-preserving multi-site training, rendered with simulated telemetry"
        aside={<Badge tone="proto">Simulation, not implementation</Badge>}
      >
        <div className="event-item tone-warn">
          <div className="event-head">
            <span className="notice-icon" aria-hidden="true">
              <Icon name="info" size={16} />
            </span>
            <strong>Nothing here is real</strong>
          </div>
          <p className="fact-note">{FEDERATED.disclaimer}</p>
        </div>
        <p className="fact-note" style={{ marginTop: 10 }}>
          The intent of federated learning is that a shared model improves without any raw
          patient record ever leaving its local site. This page demonstrates how such a
          system's monitoring view could look — the nodes, uptime figures and loss curve
          below are all authored placeholders.
        </p>
      </Panel>

      <Panel
        title="Simulated network nodes"
        subtitle="Four placeholder sites with synthetic cohort sizes and uptime"
        aside={<Badge tone="proto">Simulated</Badge>}
      >
        <div className="mini-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Node</th>
                <th>Region</th>
                <th className="num">Patients (synthetic)</th>
                <th className="num">Uptime</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {FEDERATED.nodes.map((n) => (
                <tr key={n.id}>
                  <td>{n.name}</td>
                  <td>{n.region}</td>
                  <td className="num">{n.patients.toLocaleString('en-US')}</td>
                  <td className="num">{n.uptime}</td>
                  <td>
                    <Badge tone="proto">{n.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Simulated training rounds"
        subtitle="Average loss across 10 demonstration rounds — a generated convergence illustration"
        aside={<ProtoTag compact />}
      >
        <LineChart
          series={[
            {
              id: 'loss',
              label: 'Average loss (simulated)',
              color: 'var(--primary)',
              points: FEDERATED.rounds.map((r) => ({ x: r.round, y: r.avgLoss })),
            },
          ]}
          yLabel="Avg loss"
          xLabel="Federated round"
          height={220}
          formatX={(v) => `R${v}`}
          formatY={(v) => v.toFixed(2)}
        />
        <ul className="plain-list" style={{ marginTop: 12, maxWidth: 560 }}>
          <li><span>Final simulated loss</span><strong>{finalRound.avgLoss}</strong></li>
          <li><span>Round 1 note</span><strong>{FEDERATED.rounds[0].note}</strong></li>
          <li><span>Round 10 note</span><strong>{finalRound.note}</strong></li>
          <li><span>What this would mean</span><strong>Shared model improving without raw data transfer (design intent)</strong></li>
        </ul>
      </Panel>

      <Panel
        title="Privacy techniques — concept inventory"
        subtitle="How a production federated deployment would protect node data"
      >
        <div className="info-grid">
          {FEDERATED.techniques.map((t) => (
            <article key={t.title} className="info-card">
              <div className="info-card-head">
                <strong>{t.title}</strong>
                <Badge tone={t.status === 'Concept only' || t.status === 'Placeholder' ? 'proto' : 'neutral'}>
                  {t.status}
                </Badge>
              </div>
              <p>{t.detail}</p>
            </article>
          ))}
        </div>
        <p className="fact-note" style={{ marginTop: 12 }}>
          Secure aggregation, differential privacy and update-only transfer are described
          here as research concepts. None of them is implemented in this prototype, and no
          network communication of any kind occurs.
        </p>
      </Panel>
    </>
  );
}

import { useState } from 'react';
import { Panel, Badge, ProtoTag } from '../components/ui/index.js';
import NetworkGraph from '../components/charts/NetworkGraph.jsx';
import { BIOMARKER_NETWORK } from '../data/syntheticData.js';

const NODE_LABELS = Object.fromEntries(
  BIOMARKER_NETWORK.nodes.map((n) => [n.id, n.label]),
);

/**
 * Biomarker Relationship Map (module #13) — interactive map of how the
 * demo feature set relates. Edge weights are author-assigned synthetic
 * associations for demonstration, not measured correlations.
 */
export default function BiomarkerMap() {
  const [selected, setSelected] = useState(null);

  const edges = BIOMARKER_NETWORK.edges.map((e) => ({
    source: e.a,
    target: e.b,
    r: e.r,
  }));

  const connections = selected
    ? edges
        .filter((e) => e.source === selected || e.target === selected)
        .map((e) => ({
          other: e.source === selected ? e.target : e.source,
          r: e.r,
        }))
        .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
    : [];

  return (
    <>
      <Panel
        title="Biomarker relationship map"
        subtitle="Click a node to inspect its assigned associations · hover an edge for its strength"
        aside={<ProtoTag compact />}
      >
        <NetworkGraph
          nodes={BIOMARKER_NETWORK.nodes}
          edges={edges}
          selectedId={selected}
          onSelect={setSelected}
        />
        <p className="muted-small" style={{ marginTop: 10 }}>
          {BIOMARKER_NETWORK.note} Teal edges are positive associations, green edges
          are inverse (protective-leaning) ones.
        </p>
      </Panel>

      <div className="dashboard-row">
        <Panel
          title={selected ? NODE_LABELS[selected] : 'Select a biomarker'}
          subtitle={
            selected
              ? 'Assigned associations with the other demo features'
              : 'Click any node in the map above'
          }
          aside={selected ? <Badge tone="info">{connections.length} links</Badge> : undefined}
        >
          {selected ? (
            <div className="mini-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Connected biomarker</th>
                    <th>Assigned r</th>
                    <th>Direction</th>
                  </tr>
                </thead>
                <tbody>
                  {connections.map((c) => (
                    <tr key={c.other}>
                      <td>{NODE_LABELS[c.other]}</td>
                      <td className="num">{c.r.toFixed(2)}</td>
                      <td>
                        <Badge tone={c.r < 0 ? 'good' : 'warn'}>
                          {c.r < 0 ? 'Inverse' : 'Positive'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted-small">
              The map is a static demonstration of a relationship view: in a real
              research system, edges would be estimated correlations with confidence
              intervals, recomputed as the panel grows.
            </p>
          )}
        </Panel>

        <Panel title="Why a relationship map?" subtitle="Role in the adaptive preventive loop">
          <ul className="event-list">
            <li className="event-item tone-info">
              <div className="event-head">
                <strong>Holistic deviation context</strong>
              </div>
              <p className="muted-small">
                When one biomarker moves, related markers are expected to co-move. The
                anomaly engine uses this map conceptually — simultaneous deviations in
                linked markers form a stronger pattern signal.
              </p>
            </li>
            <li className="event-item tone-info">
              <div className="event-head">
                <strong>Feature selection support</strong>
              </div>
              <p className="muted-small">
                Dense clusters indicate redundant information; sparse connectors are
                high-information features. This informs which sensors matter for a
                low-cost device.
              </p>
            </li>
            <li className="event-item tone-warn">
              <div className="event-head">
                <strong>Correlation is not causation</strong>
              </div>
              <p className="muted-small">
                Edges here are illustrative numbers chosen by the prototype authors.
                They must never be read as measured clinical relationships.
              </p>
            </li>
          </ul>
        </Panel>
      </div>
    </>
  );
}

import { useMemo, useState } from 'react';
import Icon from '../components/icons.jsx';
import { Panel, Badge, StatCard } from '../components/ui/index.js';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import {
  familyTreeFromSubjects,
  genomeSignalLayers,
  INFERENCE_BAN,
} from '../lib/familyNetwork.js';
import { DEMO_SUBJECTS } from '../data/researchSeeds.js';
import NetworkGraph from '../components/charts/NetworkGraph.jsx';

/**
 * Family bio-signal network and genome-to-signal research visualizer.
 * Declared relationships only — no inheritance or diagnosis inference.
 */
export default function FamilyGenome() {
  const { bioSignals, geneticRecords } = useAppData();
  const [selectedId, setSelectedId] = useState(DEMO_SUBJECTS[0]?.id || null);

  const tree = useMemo(
    () => familyTreeFromSubjects(DEMO_SUBJECTS, bioSignals, geneticRecords),
    [bioSignals, geneticRecords],
  );

  const layers = useMemo(
    () => genomeSignalLayers({ geneticRecords, signals: bioSignals }),
    [geneticRecords, bioSignals],
  );

  return (
    <>
      <MedicalDisclaimer />

      <div className="stat-grid">
        <StatCard
          label="Family nodes"
          value={tree.nodes.length}
          note="Declared relationships only"
          tone="info"
          icon={<Icon name="users" size={16} />}
        />
        <StatCard
          label="Genome–signal layers"
          value={layers.layers.length}
          note="Catalogue hypotheses"
          tone="neutral"
          icon={<Icon name="dna" size={16} />}
        />
        <StatCard
          label="Variant + signal co-occurrence"
          value={layers.layers.filter((l) => l.variantDetected && l.signalsPresent).length}
          note="Not causal"
          tone="neutral"
          icon={<Icon name="network" size={16} />}
        />
      </div>

      <Panel
        title="Family bio-signal tree"
        subtitle={INFERENCE_BAN}
        aside={<Badge tone="proto">declared only</Badge>}
      >
        <NetworkGraph
          nodes={tree.nodes.map((n) => ({ id: n.id, label: n.label }))}
          edges={tree.edges}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Relationship</th>
                <th>Cohort</th>
                <th>Signals</th>
                <th>Variants</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {tree.nodes.map((n) => (
                <tr
                  key={n.id}
                  className={selectedId === n.id ? 'row-selected' : ''}
                  onClick={() => setSelectedId(n.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <strong>{n.label}</strong>
                    <div className="muted-small">{n.id}</div>
                  </td>
                  <td>{n.relationship}</td>
                  <td>{n.cohort}</td>
                  <td className="num">{n.signalCount}</td>
                  <td className="num">{n.variantCount}</td>
                  <td className="muted-small">{n.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Genome-to-signal research layer"
        subtitle={layers.disclaimer}
      >
        <div className="table-scroll">
          <table className="data-table wide">
            <thead>
              <tr>
                <th>Gene / variant</th>
                <th>Signal category</th>
                <th>Variant detected?</th>
                <th>Signals present?</th>
                <th>Conclusion</th>
                <th>Literature note</th>
              </tr>
            </thead>
            <tbody>
              {layers.layers.map((l) => (
                <tr key={`${l.gene}-${l.variant}`}>
                  <td>
                    <strong>
                      {l.gene} {l.variant}
                    </strong>
                  </td>
                  <td>{l.signalCategory}</td>
                  <td>
                    <Badge tone={l.variantDetected ? 'info' : 'neutral'}>
                      {l.variantDetected ? 'Variant detected' : 'Not in loaded records'}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={l.signalsPresent ? 'info' : 'neutral'}>
                      {l.signalsPresent ? `${l.signalCount} present` : 'None'}
                    </Badge>
                  </td>
                  <td className="muted-small">{l.conclusion}</td>
                  <td className="muted-small">{l.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted-small research-obs">
          Association reported in literature catalogues only. Inheritance and disease are not inferred.
        </p>
      </Panel>
    </>
  );
}

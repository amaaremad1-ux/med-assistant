import { useMemo, useState } from 'react';
import Icon from '../components/icons.jsx';
import { Panel, Badge, StatCard } from '../components/ui/index.js';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import {
  evidenceNodesFromState,
  describeEvidenceEdge,
  nextVersion,
} from '../lib/researchOps.js';
import { describeProvenance } from '../lib/provenance.js';
import NetworkGraph from '../components/charts/NetworkGraph.jsx';

/**
 * Dataset Builder (versioned manifests) + Research Runs + Evidence Graph.
 */
export default function DatasetEvidence() {
  const {
    hubItems,
    bioSignals,
    geneticRecords,
    bloodTests,
    researchRuns,
    datasetVersions,
    freezeDataset,
    deleteDatasetVersion,
    addResearchRun,
    deleteResearchRun,
  } = useAppData();

  const [name, setName] = useState('Research freeze');
  const [description, setDescription] = useState('');
  const [selectedSignals, setSelectedSignals] = useState([]);
  const [selectedGenes, setSelectedGenes] = useState([]);
  const [selectedLabs, setSelectedLabs] = useState([]);
  const [selectedHub, setSelectedHub] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [msg, setMsg] = useState(null);

  const graph = useMemo(
    () =>
      evidenceNodesFromState({
        hubItems,
        signals: bioSignals,
        geneticRecords,
        bloodTests,
        runs: researchRuns,
      }),
    [hubItems, bioSignals, geneticRecords, bloodTests, researchRuns],
  );

  const toggle = (list, setList, id) => {
    setList((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const freeze = () => {
    const manifest = freezeDataset({
      name,
      description,
      version: nextVersion(datasetVersions),
      signalIds: selectedSignals,
      geneticIds: selectedGenes,
      labIds: selectedLabs,
      hubIds: selectedHub,
    });
    addResearchRun({
      title: `Dataset freeze ${manifest.version}`,
      algorithm: 'Dataset Builder manifest-1.0',
      parameters: { datasetId: manifest.id, version: manifest.version },
      inputIds: [
        ...selectedSignals,
        ...selectedGenes,
        ...selectedLabs,
        ...selectedHub,
      ],
      outputs: [{ nodeId: manifest.id, kind: 'manifest' }],
      limitations: manifest.limitations,
    });
    setMsg(`Frozen ${manifest.version} · ${manifest.id}`);
  };

  return (
    <>
      <MedicalDisclaimer />

      <div className="stat-grid">
        <StatCard
          label="Dataset versions"
          value={datasetVersions.length}
          note="v1, v1.1, …"
          tone="info"
          icon={<Icon name="clipboard" size={16} />}
        />
        <StatCard
          label="Research runs"
          value={researchRuns.length}
          note="Run ID · params · algorithms"
          tone="neutral"
          icon={<Icon name="flask" size={16} />}
        />
        <StatCard
          label="Evidence nodes"
          value={graph.nodes.length}
          note={`${graph.edges.length} links`}
          tone="neutral"
          icon={<Icon name="network" size={16} />}
        />
      </div>

      <Panel
        title="Research Dataset Builder"
        subtitle="Versioned manifests listing identifiers present at freeze time"
        aside={<Badge tone="proto">reproducible</Badge>}
      >
        <div className="form-grid">
          <label>
            Dataset name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Description
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
        </div>

        <div className="builder-pickers">
          <Picker
            title="Signals"
            items={bioSignals.map((s) => ({ id: s.id, label: s.typeLabel }))}
            selected={selectedSignals}
            onToggle={(id) => toggle(selectedSignals, setSelectedSignals, id)}
          />
          <Picker
            title="Genetics"
            items={geneticRecords.map((g) => ({ id: g.id, label: `${g.gene} ${g.variant}` }))}
            selected={selectedGenes}
            onToggle={(id) => toggle(selectedGenes, setSelectedGenes, id)}
          />
          <Picker
            title="Labs"
            items={bloodTests.map((b) => ({ id: b.id, label: `${b.name} (${b.date})` }))}
            selected={selectedLabs}
            onToggle={(id) => toggle(selectedLabs, setSelectedLabs, id)}
          />
          <Picker
            title="Hub items"
            items={hubItems.map((h) => ({ id: h.id, label: h.name }))}
            selected={selectedHub}
            onToggle={(id) => toggle(selectedHub, setSelectedHub, id)}
          />
        </div>

        <button type="button" className="btn primary" onClick={freeze}>
          Freeze {nextVersion(datasetVersions)}
        </button>
        {msg && <p className="record-note">{msg}</p>}

        {datasetVersions.length > 0 && (
          <div className="table-scroll" style={{ marginTop: 16 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Name</th>
                  <th>Counts</th>
                  <th>Created</th>
                  <th>Provenance</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {datasetVersions.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Badge tone="info">{d.version}</Badge>
                    </td>
                    <td>{d.name}</td>
                    <td className="muted-small">
                      sig {d.counts.signals} · gene {d.counts.genetic} · lab {d.counts.labs} · hub{' '}
                      {d.counts.hub}
                    </td>
                    <td className="muted-small">{d.createdAt?.slice(0, 19)}</td>
                    <td className="muted-small">{describeProvenance(d.provenance)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => deleteDatasetVersion(d.id)}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="dashboard-row">
        <Panel title="Research runs" subtitle="Run ID · parameters · algorithms · limitations">
          <ul className="run-list">
            {researchRuns.map((r) => (
              <li key={r.id}>
                <div>
                  <strong>{r.title}</strong>
                  <div className="muted-small">
                    {r.id} · {r.algorithm}
                  </div>
                  <div className="muted-small">{r.language}</div>
                  <ul className="muted-small">
                    {(r.limitations || []).slice(0, 3).map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
                {!String(r.id).startsWith('run-seed') && (
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => deleteResearchRun(r.id)}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Evidence graph" subtitle="Observations linked back to supporting datasets">
          {graph.nodes.length > 1 ? (
            <NetworkGraph
              nodes={graph.nodes.slice(0, 24)}
              edges={graph.edges.filter(
                (e) =>
                  graph.nodes.slice(0, 24).some((n) => n.id === e.source) &&
                  graph.nodes.slice(0, 24).some((n) => n.id === e.target),
              )}
              selectedId={selectedNode}
              onSelect={setSelectedNode}
            />
          ) : (
            <p className="muted-small">Insufficient nodes for a graph.</p>
          )}
          <ul className="muted-small">
            {graph.edges.slice(0, 12).map((e) => (
              <li key={`${e.source}-${e.target}-${e.relation}`}>
                {describeEvidenceEdge(e)}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function Picker({ title, items, selected, onToggle }) {
  return (
    <div className="builder-picker">
      <h4>{title}</h4>
      <div className="builder-picker-list">
        {items.slice(0, 40).map((it) => (
          <label key={it.id}>
            <input
              type="checkbox"
              checked={selected.includes(it.id)}
              onChange={() => onToggle(it.id)}
            />
            <span>{it.label}</span>
          </label>
        ))}
        {!items.length && <span className="muted-small">None</span>}
      </div>
    </div>
  );
}

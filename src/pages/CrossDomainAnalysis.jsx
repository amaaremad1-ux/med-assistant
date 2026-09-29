import { useMemo, useState } from 'react';
import Icon from '../components/icons.jsx';
import { Panel, Badge, StatCard } from '../components/ui/index.js';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import {
  crossDomainMatrix,
  unknownPatternDiscovery,
  domainCoverage,
  CAUSATION_DISCLAIMER,
} from '../lib/crossDomain.js';
import { DEMO_SUBJECTS } from '../data/researchSeeds.js';
import NetworkGraph from '../components/charts/NetworkGraph.jsx';

/**
 * Cross-domain research correlation and unknown pattern discovery.
 * Never confuses correlation with causation.
 */
export default function CrossDomainAnalysis() {
  const { bloodTests, geneticRecords, bioSignals, addResearchRun } = useAppData();
  const [subjectId, setSubjectId] = useState(DEMO_SUBJECTS[0]?.id || '');
  const [selectedId, setSelectedId] = useState(null);
  const [runNote, setRunNote] = useState(null);

  const coverage = useMemo(
    () => domainCoverage({ bloodTests, geneticRecords, signals: bioSignals }),
    [bloodTests, geneticRecords, bioSignals],
  );

  const matrix = useMemo(
    () =>
      crossDomainMatrix({
        bloodTests,
        geneticRecords,
        signals: bioSignals,
        subjectId,
      }),
    [bloodTests, geneticRecords, bioSignals, subjectId],
  );

  const patterns = useMemo(
    () => unknownPatternDiscovery(bioSignals, subjectId),
    [bioSignals, subjectId],
  );

  const graph = useMemo(() => {
    const computed = matrix.pairs.filter((p) => p.status === 'computed' && Number.isFinite(p.r));
    const nodeIds = new Set();
    const edges = [];
    for (const p of computed.slice(0, 40)) {
      nodeIds.add(p.a);
      nodeIds.add(p.b);
      edges.push({ source: p.a, target: p.b, r: p.r });
    }
    const nodes = [...nodeIds].map((id) => {
      const hit = matrix.domains.find((d) => d.id === id);
      return { id, label: hit?.label || id };
    });
    return { nodes, edges };
  }, [matrix]);

  const saveRun = () => {
    const run = addResearchRun({
      title: `Cross-domain matrix · ${subjectId}`,
      algorithm: 'Pearson cross-domain correlation + feature clustering',
      parameters: { subjectId, pairs: matrix.pairs.length },
      inputIds: matrix.domains.map((d) => d.id),
      outputs: [{ kind: 'correlation-matrix', n: matrix.pairs.filter((p) => p.status === 'computed').length }],
      limitations: [CAUSATION_DISCLAIMER, 'Research observation. Requires professional interpretation.'],
    });
    setRunNote(`Research run ${run.id} recorded.`);
  };

  return (
    <>
      <MedicalDisclaimer />

      <div className="stat-grid">
        <StatCard
          label="Genetics"
          value={coverage.genetics ? 'Present' : 'Missing'}
          note="Domain coverage"
          tone={coverage.genetics ? 'good' : 'warn'}
          icon={<Icon name="dna" size={16} />}
        />
        <StatCard
          label="Labs"
          value={coverage.labs ? 'Present' : 'Missing'}
          note="Domain coverage"
          tone={coverage.labs ? 'good' : 'warn'}
          icon={<Icon name="droplet" size={16} />}
        />
        <StatCard
          label="Signals / sleep / activity"
          value={`${coverage.signals ? 'Y' : 'N'} / ${coverage.sleep ? 'Y' : 'N'} / ${coverage.activity ? 'Y' : 'N'}`}
          note="Existing domains only"
          tone="info"
          icon={<Icon name="pulse" size={16} />}
        />
        <StatCard
          label="Computed pairs"
          value={matrix.pairs.filter((p) => p.status === 'computed').length}
          note="Correlation only"
          tone="neutral"
          icon={<Icon name="network" size={16} />}
        />
      </div>

      <Panel
        title="Cross-domain correlation"
        subtitle="Genetics + Labs + Signals + Sleep + Activity"
        aside={
          <div className="hub-filters">
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {DEMO_SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <button type="button" className="btn primary" onClick={saveRun}>
              Save research run
            </button>
          </div>
        }
      >
        <p className="muted-small">{matrix.disclaimer}</p>
        <p className="muted-small">{matrix.method}</p>
        {runNote && <p className="record-note">{runNote}</p>}

        {graph.nodes.length > 1 && (
          <NetworkGraph
            nodes={graph.nodes}
            edges={graph.edges}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}

        <div className="table-scroll">
          <table className="data-table wide">
            <thead>
              <tr>
                <th>A</th>
                <th>B</th>
                <th>Domains</th>
                <th>n</th>
                <th>r</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {matrix.pairs.slice(0, 60).map((p) => (
                <tr key={`${p.a}-${p.b}`}>
                  <td>{p.aLabel}</td>
                  <td>{p.bLabel}</td>
                  <td className="muted-small">{p.domains || '—'}</td>
                  <td className="num">{p.n ?? '—'}</td>
                  <td className="num">{p.status === 'computed' ? p.r : '—'}</td>
                  <td>
                    <Badge tone={p.status === 'computed' ? 'info' : 'warn'}>
                      {p.status}
                    </Badge>
                    {p.reason && <div className="muted-small">{p.reason}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Unknown pattern discovery"
        subtitle="Unsupervised groupings of available recordings — not named diseases"
      >
        {patterns.status !== 'computed' ? (
          <p className="record-note">{patterns.reason}</p>
        ) : (
          <>
            <p className="muted-small">{patterns.algorithm}</p>
            <pre className="code-block">
              {JSON.stringify(patterns.findings, null, 2).slice(0, 2500)}
            </pre>
            <ul className="muted-small">
              {(patterns.limitations || []).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </>
  );
}

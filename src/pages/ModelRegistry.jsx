import { useMemo } from 'react';
import { Panel, Badge, ProtoTag } from '../components/ui/index.js';
import HBarList from '../components/charts/HBarList.jsx';
import { MODEL_CATALOG, MODEL_HISTORY, MODEL_DISCLAIMER } from '../data/syntheticData.js';
import { multiModelScores, latestPoint } from '../lib/engine.js';

/**
 * Model Registry (modules #6 and #27): the demo model catalog, how the
 * catalog models agree on the current synthetic patient, and the version
 * history of the ensemble scorer. None of the models is validated.
 */
export default function ModelRegistry() {
  const agreement = useMemo(() => multiModelScores(latestPoint), []);

  return (
    <>
      <Panel
        title="Demo model registry"
        subtitle="Placeholder research models registered in this prototype"
        aside={<ProtoTag compact />}
      >
        <div className="info-grid">
          {MODEL_CATALOG.map((m) => (
            <article key={m.id} className="info-card">
              <div className="info-card-head">
                <strong>{m.name}</strong>
                <Badge tone="proto">{m.version}</Badge>
              </div>
              <p>{m.note}</p>
              <div className="info-card-meta">
                <span>Type — {m.type}</span>
                <span>Parameters — {m.params}</span>
                <span>Trained — {m.trained}</span>
                <span>
                  Reported AUC {m.demoAuc}{' '}
                  <em className="fact-note">(simulated placeholder, not a validated result)</em>
                </span>
              </div>
            </article>
          ))}
        </div>
        <p className="fact-note" style={{ marginTop: 12 }}>
          {MODEL_DISCLAIMER}
        </p>
      </Panel>

      <Panel
        title="Model agreement — current synthetic patient"
        subtitle="Each catalog model scored on the latest monthly panel point, with its demo uncertainty spread"
        aside={<Badge tone="warn">Estimates, not diagnoses</Badge>}
      >
        <HBarList
          items={agreement.map((m) => ({
            label: m.name,
            value: m.score,
            note: `interval ${m.lo}–${m.hi}% · spread ±${m.spread} pts`,
            tone: 'info',
          }))}
          formatValue={(v) => `${v}%`}
          caption="Bars are centered on each demo model's point estimate for the same input panel. Differences between models illustrate agreement reporting; they are not evidence about any real model."
        />
      </Panel>

      <Panel
        title="Version history — ensemble scorer"
        subtitle="Demo changelog for the transparent weighted-logistic demonstration model"
      >
        <div className="event-list">
          {MODEL_HISTORY.map((h) => (
            <div key={h.version} className="event-item tone-info">
              <div className="event-head">
                <strong>{h.version}</strong>
                <span className="fact-note">{h.date}</span>
              </div>
              <p className="fact-note">{h.change}</p>
            </div>
          ))}
        </div>
        <p className="fact-note" style={{ marginTop: 12 }}>
          Version entries are authored demo metadata. No regression testing, external
          validation, or clinical review has occurred for any version.
        </p>
      </Panel>
    </>
  );
}

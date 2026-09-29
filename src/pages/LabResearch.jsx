import { useMemo } from 'react';
import Icon from '../components/icons.jsx';
import { Panel, Badge, StatCard } from '../components/ui/index.js';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import {
  groupByPanel,
  evaluateAgainstRange,
  distinctAnalytes,
  outOfRangeEntries,
} from '../lib/appDataSelectors.js';
import { Link } from 'react-router-dom';

/**
 * Laboratory research view — flexible reference ranges
 * (Lab-provided, Dataset-provided, or Unavailable).
 */
export default function LabResearch() {
  const { bloodTests } = useAppData();

  const groups = useMemo(() => groupByPanel(bloodTests), [bloodTests]);
  const analytes = useMemo(() => distinctAnalytes(bloodTests), [bloodTests]);
  const out = useMemo(() => outOfRangeEntries(bloodTests), [bloodTests]);

  const rangeSources = useMemo(() => {
    let lab = 0;
    let dataset = 0;
    let unavailable = 0;
    for (const b of bloodTests) {
      if (!b.referenceRange) unavailable += 1;
      else if (b.referenceSource === 'laboratory' || b.referenceSource === 'lab-provided') lab += 1;
      else if (b.referenceSource === 'dataset-provided' || b.referenceSource === 'dataset')
        dataset += 1;
      else if (b.referenceSource === 'manual') lab += 1;
      else unavailable += 1;
    }
    return { lab, dataset, unavailable };
  }, [bloodTests]);

  return (
    <>
      <MedicalDisclaimer />

      <div className="stat-grid">
        <StatCard
          label="Lab entries"
          value={bloodTests.length}
          note={`${analytes.length} analytes · CBC / Metabolic / Lipids / Hormones`}
          tone="info"
          icon={<Icon name="droplet" size={16} />}
        />
        <StatCard
          label="Lab-provided ranges"
          value={rangeSources.lab}
          note="From laboratory reports"
          tone="good"
          icon={<Icon name="check" size={16} />}
        />
        <StatCard
          label="Dataset-provided"
          value={rangeSources.dataset}
          note="Bundled with imported data"
          tone="neutral"
          icon={<Icon name="database" size={16} />}
        />
        <StatCard
          label="Unavailable"
          value={rangeSources.unavailable}
          note="Never invent a universal range"
          tone="warn"
          icon={<Icon name="info" size={16} />}
        />
      </div>

      <Panel
        title="Laboratory research inventory"
        subtitle="Reference ranges are Lab-provided, Dataset-provided, or Unavailable — never assumed"
        aside={
          <Link to="/blood-lab" className="btn ghost">
            Open entry form
          </Link>
        }
      >
        {groups.map((g) => (
          <div key={g.panel} className="lab-panel-block">
            <h4>
              {g.panel} <Badge tone="neutral">{g.entries.length}</Badge>
            </h4>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Analyte</th>
                    <th>Value</th>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Source</th>
                    <th>vs range</th>
                  </tr>
                </thead>
                <tbody>
                  {g.entries.map((b) => {
                    const verdict = evaluateAgainstRange(b.value, b.referenceRange);
                    const src = !b.referenceRange
                      ? 'Unavailable'
                      : b.referenceSource === 'laboratory' || b.referenceSource === 'lab-provided'
                        ? 'Lab-provided'
                        : b.referenceSource === 'dataset-provided' || b.referenceSource === 'dataset'
                          ? 'Dataset-provided'
                          : b.referenceSource || 'Unavailable';
                    return (
                      <tr key={b.id}>
                        <td>{b.name}</td>
                        <td className="num">
                          {b.value} {b.unit}
                        </td>
                        <td>{b.date}</td>
                        <td>{b.referenceRange || '—'}</td>
                        <td>
                          <Badge tone={src === 'Unavailable' ? 'warn' : 'info'}>{src}</Badge>
                        </td>
                        <td>
                          {verdict ? (
                            <Badge
                              tone={
                                verdict === 'within' ? 'good' : verdict === 'above' ? 'bad' : 'warn'
                              }
                            >
                              {verdict}
                            </Badge>
                          ) : (
                            <span className="muted-small">n/a</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {!groups.length && (
          <p className="muted-small">Insufficient evidence — no laboratory entries loaded.</p>
        )}
      </Panel>

      <Panel title="Outside supplied reference range" subtitle="Only when a range was actually provided">
        {out.length === 0 ? (
          <p className="muted-small">No out-of-range flags (or no ranges available).</p>
        ) : (
          <ul>
            {out.map((b) => (
              <li key={b.id}>
                {b.name}: {b.value} {b.unit} ({b.verdict}) · ref {b.referenceRange}
              </li>
            ))}
          </ul>
        )}
        <p className="muted-small research-obs">
          Research observation. Requires professional interpretation.
        </p>
      </Panel>
    </>
  );
}

import { Panel, Badge, ProtoTag } from '../components/ui/index.js';
import GroupedBarChart from '../components/charts/GroupedBarChart.jsx';
import HBarList from '../components/charts/HBarList.jsx';
import { FAIRNESS } from '../data/syntheticData.js';

const pct = (v) => `${Math.round(v * 100)}%`;

function aucGap(dimension) {
  const aucs = dimension.groups.map((g) => g.auc);
  return +(Math.max(...aucs) - Math.min(...aucs)).toFixed(3);
}

/**
 * Model Fairness Research (module #26).
 * Stratified performance by demographic and cohort dimensions, plus an
 * AUC-gap summary. Every group metric is a synthetic artifact produced for
 * methodology demonstration — no real validation was performed, and the
 * gaps shown do not reflect any real population.
 */
export default function FairnessResearch() {
  return (
    <>
      <Panel
        title="Fairness research — stratified performance"
        subtitle="How the demo pipeline would report performance gaps across population subgroups"
        aside={<ProtoTag compact />}
      >
        <div className="event-item tone-warn">
          <div className="event-head">
            <Badge tone="warn">Methodology demonstration only</Badge>
          </div>
          <p className="fact-note">{FAIRNESS.note}</p>
        </div>

        <HBarList
          items={FAIRNESS.dimensions.map((d) => ({
            label: d.label,
            value: +(aucGap(d) * 100).toFixed(1),
            note: `AUC range ${Math.min(...d.groups.map((g) => g.auc))}–${Math.max(...d.groups.map((g) => g.auc))} across ${d.groups.length} groups`,
            tone: 'warn',
          }))}
          formatValue={(v) => `${v} pts`}
          caption="Largest AUC gap within each dimension, in percentage points. In a real study, gaps like these would trigger a fairness review — here they exist only to demonstrate that the review machinery works."
        />
      </Panel>

      {FAIRNESS.dimensions.map((d) => (
        <Panel
          key={d.id}
          title={`Performance by ${d.label.toLowerCase()}`}
          subtitle="AUC / sensitivity / specificity per subgroup (all synthetic)"
          aside={<Badge tone="proto">Synthetic artifact</Badge>}
        >
          <GroupedBarChart
            categories={d.groups.map((g) => g.label)}
            series={[
              { id: 'auc', label: 'AUC', color: 'var(--primary)', values: d.groups.map((g) => g.auc) },
              { id: 'sens', label: 'Sensitivity', color: 'var(--good)', values: d.groups.map((g) => g.sensitivity) },
              { id: 'spec', label: 'Specificity', color: 'var(--warn)', values: d.groups.map((g) => g.specificity) },
            ]}
            yMax={1}
            yLabel="Score"
            height={230}
            formatY={pct}
          />
          <div className="mini-table-wrap" style={{ marginTop: 12 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Group</th>
                  <th className="num">AUC</th>
                  <th className="num">Sensitivity</th>
                  <th className="num">Specificity</th>
                  <th className="num">Sens − Spec balance</th>
                </tr>
              </thead>
              <tbody>
                {d.groups.map((g) => (
                  <tr key={g.label}>
                    <td>{g.label}</td>
                    <td className="num">{g.auc}</td>
                    <td className="num">{g.sensitivity}</td>
                    <td className="num">{g.specificity}</td>
                    <td className="num">{+(g.sensitivity - g.specificity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}

      <Panel title="How to read this page" subtitle="Research framing, not findings">
        <ul className="plain-list">
          <li><span>Why fairness reporting matters</span><strong>Undetected performance gaps can translate into unequal care</strong></li>
          <li><span>What would happen in a real study</span><strong>Stratified metrics computed on held-out validation data, with sample sizes and CIs</strong></li>
          <li><span>What happens here</span><strong>Fixed author-assigned numbers render the report layout</strong></li>
          <li><span>Meaning of the gaps shown</span><strong>None — they are display artifacts of the demo</strong></li>
        </ul>
      </Panel>
    </>
  );
}

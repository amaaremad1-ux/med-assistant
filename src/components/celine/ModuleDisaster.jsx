/** Module 8 — Mass Casualty START Triage. Standby → active surge board. */
import { useMemo, useState } from 'react';
import { Panel, Badge, StatCard, ProtoTag } from '../ui/index.js';
import { classifyStartTriage, generateDisasterCohort } from '../../lib/celineClinicalEngine.js';

const ORDER = ['RED', 'YELLOW', 'GREEN', 'BLACK'];
const TONE = { RED: 'bad', YELLOW: 'warn', GREEN: 'good', BLACK: 'neutral' };
export default function ModuleDisaster() {
  const [active, setActive] = useState(false);
  const [count, setCount] = useState(12);
  const [cohort, setCohort] = useState(() => generateDisasterCohort(12));
  const [walk, setWalk] = useState(false);
  const [breath, setBreath] = useState(true);
  const [rr, setRr] = useState(22);
  const [pulse, setPulse] = useState(true);
  const [obeys, setObeys] = useState(true);
  const single = useMemo(() => classifyStartTriage({ canWalk: walk, breathing: breath, rr, hasRadialPulse: pulse, followsCommands: obeys }), [walk, breath, rr, pulse, obeys]);
  const counts = useMemo(() => {
    const c = { RED: 0, YELLOW: 0, GREEN: 0, BLACK: 0 };
    cohort.forEach((p) => { c[p.category] += 1; });
    return c;
  }, [cohort]);
  const deploy = (n) => { setCohort(generateDisasterCohort(n)); setActive(true); };
  return (
    <div className="celine-module">
      <div className="page-header" style={{ marginBottom: 4 }}>
        <div><h2 className="page-title">08 · Mass Casualty START Triage</h2>
        <p className="page-subtitle">One tap re-tunes the board for surge.</p></div>
        <ProtoTag compact />
      </div>
      <Panel title={active ? `ACTIVE — ${cohort.length} casualties` : 'Standby'} subtitle="RED immediate · YELLOW delayed · GREEN minor · BLACK expectant">
        <div className="chip-row">
          {!active && <button type="button" className="btn" onClick={() => deploy(count)}>Activate Mass Casualty Mode</button>}
          {active && <><button type="button" className="chip" onClick={() => deploy(count)}>Regenerate</button><button type="button" className="chip" onClick={() => setActive(false)}>Stand down</button></>}
          {[8, 12, 20].map((n) => (<button key={n} type="button" className={`chip${count === n ? ' chip-on' : ''}`} onClick={() => { setCount(n); if (active) deploy(n); }}>{n}</button>))}
        </div>
      </Panel>
      {active && (
        <div className="stat-grid" style={{ marginBottom: 16, marginTop: 16 }}>
          {ORDER.map((k) => (<StatCard key={k} label={k} value={counts[k]} unit="cases" tone={TONE[k]} note={k === 'RED' ? 'Immediate' : k === 'YELLOW' ? 'Delayed' : k === 'GREEN' ? 'Minor' : 'Expectant'} />))}
        </div>
      )}
      {active && (
        <Panel title="Triage Board" subtitle="RED first — each with its START action" padded={false}>
          <div className="mini-table-wrap">
            <table className="data-table wide">
              <thead><tr><th>Casualty</th><th>Tag</th><th>Zone</th><th>Action</th></tr></thead>
              <tbody>
                {[...cohort].sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category)).map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}<div className="celine-why">{p.id} · RR {p.rr}</div></td>
                    <td><Badge tone={TONE[p.category]}>{p.category}</Badge></td>
                    <td>{p.assignedZone}</td>
                    <td>{p.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      <Panel title="START Classifier" subtitle="Walk → breathe → rate → perfusion → mentation" aside={<Badge tone={TONE[single.category]}>{single.category}</Badge>}>
        <div className="chip-row">
          <button type="button" className={`chip${walk ? ' chip-on' : ''}`} onClick={() => setWalk((v) => !v)}>Walks</button>
          <button type="button" className={`chip${breath ? ' chip-on' : ''}`} onClick={() => setBreath((v) => !v)}>Breathing</button>
          <button type="button" className={`chip${pulse ? ' chip-on' : ''}`} onClick={() => setPulse((v) => !v)}>Radial pulse</button>
          <button type="button" className={`chip${obeys ? ' chip-on' : ''}`} onClick={() => setObeys((v) => !v)}>Obeys</button>
          {[8, 22, 34].map((v) => (<button key={v} type="button" className={`chip${rr === v ? ' chip-on' : ''}`} onClick={() => setRr(v)}>RR {v}</button>))}
        </div>
        <p className="celine-rec" style={{ marginTop: 8 }}><strong>{single.label}:</strong> {single.action}</p>
      </Panel>
    </div>
  );
}

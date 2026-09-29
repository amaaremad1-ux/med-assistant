import { useMemo } from 'react';

/**
 * Interactive node-link network for the biomarker relationship map.
 * Fixed radial layout (deterministic), click a node to inspect it,
 * hover an edge to see its assigned association strength.
 *
 * nodes: [{ id, label }]
 * edges: [{ source, target, r }]
 */
const W = 520;
const H = 380;
const CX = W / 2;
const CY = H / 2;
const R = 128;

export default function NetworkGraph({ nodes, edges, selectedId, onSelect }) {
  const positions = useMemo(() => {
    const map = new Map();
    nodes.forEach((n, i) => {
      const a = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      map.set(n.id, { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) });
    });
    return map;
  }, [nodes]);

  const pos = (id) => positions.get(id);
  const edgeWidth = (r) => 1 + Math.min(3, Math.abs(r) * 4);

  return (
    <div className="network-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Biomarker relationship network">
        {edges.map((e) => {
          const a = pos(e.source);
          const b = pos(e.target);
          if (!a || !b) return null;
          const active = selectedId === e.source || selectedId === e.target;
          return (
            <g key={`${e.source}-${e.target}`} className={active ? 'net-edge active' : 'net-edge'}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                strokeWidth={edgeWidth(e.r)}
                stroke={e.r < 0 ? 'var(--good)' : 'var(--primary)'}
              >
                <title>{`${e.source} ↔ ${e.target} · assigned r = ${e.r.toFixed(2)} (illustrative)`}</title>
              </line>
              {active && (
                <text
                  className="net-edge-label"
                  x={(a.x + b.x) / 2}
                  y={(a.y + b.y) / 2 - 6}
                  textAnchor="middle"
                >
                  r = {e.r.toFixed(2)}
                </text>
              )}
            </g>
          );
        })}
        {nodes.map((n) => {
          const p = pos(n.id);
          const active = selectedId === n.id;
          return (
            <g
              key={n.id}
              className={active ? 'net-node active' : 'net-node'}
              onClick={() => onSelect?.(n.id)}
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : undefined}
              onKeyDown={(ev) => {
                if (onSelect && (ev.key === 'Enter' || ev.key === ' ')) {
                  ev.preventDefault();
                  onSelect(n.id);
                }
              }}
            >
              <circle cx={p.x} cy={p.y} r={active ? 26 : 22}>
                <title>{n.label}</title>
              </circle>
              <text x={p.x} y={p.y + 4} textAnchor="middle">
                {n.id}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Scatter plot with optional identity (y = x) line and horizontal
 * reference lines (e.g. Bland-Altman bias and limits of agreement).
 *
 * points: [{ x, y, label? }]
 * refLines: [{ y, label, tone }] rendered as dashed horizontals
 */
const W = 480;
const M = { top: 14, right: 14, bottom: 34, left: 48 };

function niceTicks(min, max, count = 5) {
  if (min === max) {
    min -= 0.5;
    max += 0.5;
  }
  const span = max - min;
  const step0 = span / Math.max(1, count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
  const start = Math.ceil(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + 1e-9; v += step) ticks.push(v);
  return ticks;
}

export default function ScatterChart({
  points,
  identity = false,
  refLines = [],
  height = 300,
  xLabel,
  yLabel,
  formatX = (v) => v,
  formatY = (v) => v,
  color = 'var(--primary)',
}) {
  if (!points || points.length === 0) return null;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const pad = 0.05;
  let x0 = Math.min(...xs);
  let x1 = Math.max(...xs);
  let y0 = Math.min(...ys, ...refLines.map((r) => r.y));
  let y1 = Math.max(...ys, ...refLines.map((r) => r.y));
  if (identity) {
    const flat = [x0, x1, y0, y1];
    x0 = Math.min(...flat);
    x1 = Math.max(...flat);
    y0 = Math.min(...flat);
    y1 = Math.max(...flat);
  }
  const dx = (x1 - x0) * pad || 1;
  const dy = (y1 - y0) * pad || 1;
  x0 -= dx;
  x1 += dx;
  y0 -= dy;
  y1 += dy;

  const iw = W - M.left - M.right;
  const ih = height - M.top - M.bottom;
  const sx = (v) => M.left + ((v - x0) / (x1 - x0)) * iw;
  const sy = (v) => M.top + ih - ((v - y0) / (y1 - y0)) * ih;

  const xTicks = niceTicks(x0, x1, 5);
  const yTicks = niceTicks(y0, y1, 5);

  return (
    <div className="chart">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-label={yLabel ? `Scatter plot of ${yLabel} versus ${xLabel}` : 'Scatter plot'}
      >
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line className="chart-grid" x1={M.left} x2={W - M.right} y1={sy(t)} y2={sy(t)} />
            <text className="chart-tick" x={M.left - 6} y={sy(t) + 3} textAnchor="end">
              {formatY(t)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={`x${t}`} className="chart-tick" x={sx(t)} y={height - 10} textAnchor="middle">
            {formatX(t)}
          </text>
        ))}
        {xLabel && (
          <text className="chart-axis-label" x={W / 2} y={height - 22} textAnchor="middle">
            {xLabel}
          </text>
        )}
        {yLabel && (
          <text
            className="chart-axis-label"
            transform={`rotate(-90 12 ${(M.top + ih) / 2})`}
            x={12}
            y={(M.top + ih) / 2}
            textAnchor="middle"
          >
            {yLabel}
          </text>
        )}

        {identity && (
          <line
            className="chart-ref"
            x1={sx(x0)}
            y1={sy(x0)}
            x2={sx(x1)}
            y2={sy(x1)}
          />
        )}
        {refLines.map((r) => (
          <g key={`ref${r.y}`}>
            <line
              className={`chart-ref tone-${r.tone ?? 'neutral'}`}
              x1={M.left}
              x2={W - M.right}
              y1={sy(r.y)}
              y2={sy(r.y)}
            />
            <text className="chart-ref-label" x={W - M.right} y={sy(r.y) - 4} textAnchor="end">
              {r.label}
            </text>
          </g>
        ))}

        {points.map((p, i) => (
          <circle
            key={i}
            className="chart-dot scatter"
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={4}
            fill={color}
          >
            <title>
              {p.label ? `${p.label} — ` : ''}
              {formatX(p.x)} / {formatY(p.y)}
            </title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

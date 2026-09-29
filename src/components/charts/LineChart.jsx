/**
 * Multi-series SVG line chart with optional per-series uncertainty band.
 *
 * series: [{ id, label, color, points: [{ x, y, lo?, hi?, label? }] }]
 * Points with lo/hi render a shaded band behind the line.
 * Colors accept CSS variables (e.g. "var(--primary)").
 */
const W = 640;
const M = { top: 10, right: 14, bottom: 30, left: 46 };

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

export default function LineChart({
  series,
  height = 220,
  yMin,
  yMax,
  yTickCount = 4,
  xTickCount = 5,
  formatX = (v) => v,
  formatY = (v) => v,
  yLabel,
  xLabel,
  legend = true,
}) {
  const points = series.flatMap((s) => s.points);
  if (points.length === 0) return null;

  const xs = points.map((p) => p.x);
  const ys = points.flatMap((p) => [p.y, p.lo ?? p.y, p.hi ?? p.y]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = yMin ?? Math.min(...ys);
  const y1 = yMax ?? Math.max(...ys);
  const pad = (y1 - y0) * 0.08;
  const lo = yMin ?? y0 - pad;
  const hi = yMax ?? y1 + pad;

  const iw = W - M.left - M.right;
  const ih = height - M.top - M.bottom;
  const sx = (x) => (x1 === x0 ? iw / 2 : M.left + ((x - x0) / (x1 - x0)) * iw);
  const sy = (y) => M.top + ih - ((y - lo) / (hi - lo)) * ih;

  const yTicks = niceTicks(lo, hi, yTickCount);
  const xTicks = niceTicks(x0, x1, xTickCount);
  const line = (pts) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const band = (pts) => {
    if (pts.length < 2) return '';
    const up = pts
      .map((p) => `L${sx(p.x).toFixed(1)},${sy(p.hi).toFixed(1)}`)
      .join(' ');
    const down = pts
      .slice()
      .reverse()
      .map((p) => `L${sx(p.x).toFixed(1)},${sy(p.lo).toFixed(1)}`)
      .join(' ');
    return `M${up.replace(/^L/, '')} ${down} Z`;
  };
  const hasBand = series.some((s) => s.points.some((p) => p.lo != null));

  return (
    <div className="chart">
      {legend && (
        <div className="chart-legend">
          {series.map((s) => (
            <span key={s.id} className="chart-legend-item">
              <span className="chart-swatch" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
          {hasBand && <span className="chart-legend-note">shaded area = uncertainty interval</span>}
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-label={yLabel ? `Line chart of ${yLabel}` : 'Line chart'}
      >
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line
              className="chart-grid"
              x1={M.left}
              x2={W - M.right}
              y1={sy(t)}
              y2={sy(t)}
            />
            <text className="chart-tick" x={M.left - 6} y={sy(t) + 3} textAnchor="end">
              {formatY(t)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text
            key={`x${t}`}
            className="chart-tick"
            x={sx(t)}
            y={height - 8}
            textAnchor="middle"
          >
            {formatX(t)}
          </text>
        ))}
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
        {xLabel && (
          <text className="chart-axis-label" x={W / 2} y={height - 24} textAnchor="middle">
            {xLabel}
          </text>
        )}

        {series.map((s) => {
          const pts = [...s.points].sort((a, b) => a.x - b.x);
          const withBand = pts.some((p) => p.lo != null);
          return (
            <g key={s.id}>
              {withBand && <path className="chart-band" d={band(pts)} fill={s.color} />}
              <path
                className="chart-line"
                d={line(pts)}
                stroke={s.color}
                strokeDasharray={s.dashed ? '6 5' : undefined}
                fill="none"
              />
              {!s.dashed &&
                pts.map((p) => (
                  <circle
                    key={p.x}
                    className="chart-dot"
                    cx={sx(p.x)}
                    cy={sy(p.y)}
                    r={3}
                    fill={s.color}
                  >
                    <title>{`${p.label ?? s.label}: ${formatY(p.y)}${
                      p.lo != null ? ` (interval ${formatY(p.lo)}–${formatY(p.hi)})` : ''
                    }`}</title>
                  </circle>
                ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

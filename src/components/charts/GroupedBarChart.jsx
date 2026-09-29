/**
 * Grouped vertical bar chart.
 *
 * categories: ['Under 40', '40–59', …]
 * series: [{ id, label, color, values: [v1, v2, …] }] (aligned to categories)
 */
const W = 640;
const M = { top: 10, right: 14, bottom: 34, left: 46 };

export default function GroupedBarChart({
  categories,
  series,
  yMax,
  yLabel,
  height = 220,
  formatY = (v) => v,
  legend = true,
}) {
  if (!categories?.length || !series?.length) return null;

  const max = yMax ?? (Math.max(0, ...series.flatMap((s) => s.values)) * 1.1 || 1);
  const iw = W - M.left - M.right;
  const ih = height - M.top - M.bottom;
  const slot = iw / categories.length;
  const barW = Math.min(26, (slot * 0.7) / series.length);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const sy = (v) => M.top + ih - (v / max) * ih;

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
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={yLabel ?? 'Grouped bar chart'}>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line className="chart-grid" x1={M.left} x2={W - M.right} y1={sy(t)} y2={sy(t)} />
            <text className="chart-tick" x={M.left - 6} y={sy(t) + 3} textAnchor="end">
              {formatY(t)}
            </text>
          </g>
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
        {categories.map((cat, ci) => (
          <g key={cat}>
            <text
              className="chart-tick"
              x={M.left + slot * (ci + 0.5)}
              y={height - 10}
              textAnchor="middle"
            >
              {cat}
            </text>
            {series.map((s, si) => {
              const v = s.values[ci] ?? 0;
              const x =
                M.left + slot * (ci + 0.5) - (series.length * barW) / 2 + si * barW;
              return (
                <rect
                  key={s.id}
                  className="chart-bar"
                  x={x}
                  y={sy(v)}
                  width={barW - 2}
                  height={Math.max(0, ih - (sy(v) - M.top))}
                  fill={s.color}
                >
                  <title>{`${cat} — ${s.label}: ${formatY(v)}`}</title>
                </rect>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}

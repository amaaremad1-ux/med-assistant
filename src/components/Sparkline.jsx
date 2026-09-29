/**
 * Tiny inline sparkline for biomarker trends.
 * Expects `data` to be an array of numbers (oldest → newest).
 */
export default function Sparkline({ data, tone = 'warn' }) {
  if (!data || data.length < 2) return null;

  const width = 100;
  const height = 30;
  const pad = 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = height - pad - ((value - min) / range) * (height - pad * 2);
    return [x, y];
  });

  const polylinePoints = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg
      className={`sparkline ${tone}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline points={polylinePoints} />
      <circle cx={lastX} cy={lastY} r="2.4" />
    </svg>
  );
}

/**
 * Circular SVG gauge for the risk score.
 * `score` is 0–100; `markers` renders reference points on the track (e.g. population average).
 */
export default function RiskGauge({ score, populationAverage }) {
  const size = 200;
  const center = size / 2;
  const radius = 82;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100) / 100;
  const offset = circumference * (1 - progress);

  // Marker position for the population-average reference point.
  const markerAngle = (populationAverage / 100) * 2 * Math.PI - Math.PI / 2;
  const markerX = center + radius * Math.cos(markerAngle);
  const markerY = center + radius * Math.sin(markerAngle);

  return (
    <div className="risk-gauge">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Risk score ${score} out of 100`}>
        <defs>
          <linearGradient id="risk-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5a623" />
            <stop offset="100%" stopColor="#e8590c" />
          </linearGradient>
        </defs>
        <circle cx={center} cy={center} r={radius} className="gauge-track" />
        <circle
          cx={center}
          cy={center}
          r={radius}
          className="gauge-value"
          stroke="url(#risk-gradient)"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
        />
        <circle
          cx={markerX}
          cy={markerY}
          r="5"
          className="gauge-marker"
        />
      </svg>
      <div className="gauge-center">
        <span className="gauge-score">{score}%</span>
        <span className="gauge-caption">5-year risk</span>
        <span className="gauge-marker-legend">
          ▲ {populationAverage}% population avg
        </span>
      </div>
    </div>
  );
}

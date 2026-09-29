/**
 * Horizontal progress/level meter. value in 0–100 (clamped);
 * tone colors the fill. Optional threshold marker line.
 */
export default function Meter({
  value,
  tone = 'neutral',
  label,
  hint,
  threshold,
  showValue = true,
  suffix = '',
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="meter">
      {(label || showValue) && (
        <div className="meter-head">
          {label && <span className="meter-label">{label}</span>}
          {showValue && (
            <span className="meter-value">
              {Math.round(clamped)}
              {suffix}
            </span>
          )}
        </div>
      )}
      <div
        className="meter-track"
        role="meter"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={`meter-fill tone-${tone}`} style={{ width: `${clamped}%` }} />
        {typeof threshold === 'number' && (
          <span
            className="meter-threshold"
            style={{ left: `${Math.max(0, Math.min(100, threshold))}%` }}
          />
        )}
      </div>
      {hint && <p className="meter-hint">{hint}</p>}
    </div>
  );
}

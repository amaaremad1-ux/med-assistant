/**
 * Labeled range input for simulations. Displays the current value with
 * unit, reference marker, and range bounds.
 */
export default function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  reference,
  format,
  onChange,
  disabled = false,
}) {
  const fmt = format ?? ((v) => v);
  return (
    <div className={`slider ${disabled ? 'disabled' : ''}`}>
      <div className="slider-head">
        <label className="slider-label" htmlFor={label}>
          {label}
        </label>
        <span className="slider-value">
          {fmt(value)}
          {unit && <span className="slider-unit"> {unit}</span>}
        </span>
      </div>
      <input
        id={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
      <div className="slider-bounds">
        <span>{fmt(min)}</span>
        {typeof reference === 'number' && (
          <span className="slider-reference">personal ref {fmt(reference)}</span>
        )}
        <span>{fmt(max)}</span>
      </div>
    </div>
  );
}

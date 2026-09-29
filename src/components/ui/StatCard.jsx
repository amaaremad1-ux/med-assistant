/**
 * Compact metric card: label, big value, unit, and an optional note
 * (usually a trend or comparison). tone colors the value text.
 */
export default function StatCard({
  label,
  value,
  unit,
  note,
  tone = 'neutral',
  icon,
  title,
}) {
  return (
    <div className={`stat-card tone-${tone}`} title={title}>
      <div className="stat-card-head">
        <span className="stat-card-label">{label}</span>
        {icon && <span className="stat-card-icon">{icon}</span>}
      </div>
      <div className="stat-card-value">
        {value}
        {unit && <span className="stat-card-unit">{unit}</span>}
      </div>
      {note && <p className="stat-card-note">{note}</p>}
    </div>
  );
}

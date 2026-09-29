/**
 * Signed horizontal bar list — positive values extend right (risk
 * increasing), negative values extend left (protective). Bars are
 * scaled by the largest absolute value in the set.
 *
 * items: [{ label, value, note?, tone?, key? }]
 * `key` is optional; when two rows would share a label the index keeps React's
 * keys unique instead of emitting a duplicate-key warning.
 */
export default function HBarList({ items, formatValue = (v) => v, caption }) {
  const rows = items ?? [];
  if (!rows.length) return null;
  const max = Math.max(1e-9, ...rows.map((i) => Math.abs(i?.value ?? 0)));
  return (
    <div className="hbar-list">
      {rows.map((item, index) => {
        const value = typeof item?.value === 'number' && Number.isFinite(item.value) ? item.value : 0;
        const pct = (Math.abs(value) / max) * 50; // half-width is 50%
        const positive = value >= 0;
        const tone = item?.tone ?? (positive ? 'bad' : 'good');
        return (
          <div className="hbar-row" key={item?.key ?? `${item?.label ?? 'row'}-${index}`}>
            <span className="hbar-label" title={item?.note}>{item?.label ?? '—'}</span>
            <div className="hbar-track">
              <span className="hbar-axis" />
              <span
                className={`hbar-fill tone-${tone}`}
                style={
                  positive
                    ? { left: '50%', width: `${pct}%` }
                    : { right: '50%', width: `${pct}%` }
                }
              />
            </div>
            <span className={`hbar-value tone-text ${tone}`}>
              {positive ? '+' : ''}
              {formatValue(value)}
            </span>
          </div>
        );
      })}
      {caption && <p className="hbar-caption">{caption}</p>}
    </div>
  );
}

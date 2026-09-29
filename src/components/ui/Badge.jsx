/**
 * Tone-coded status chip. Reuses the global `.badge` styles.
 * tone: good | warn | bad | info | neutral | proto
 */
const TONE_CLASS = {
  good: 'tone-good',
  warn: 'tone-warn',
  bad: 'tone-bad',
  info: 'tone-info',
  neutral: 'tone-neutral',
  proto: 'proto',
};

export default function Badge({ tone = 'neutral', children, title }) {
  return (
    <span className={`badge ${TONE_CLASS[tone] ?? ''}`} title={title}>
      {children}
    </span>
  );
}

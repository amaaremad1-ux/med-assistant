import Badge from './ui/Badge.jsx';

const KIND_META = {
  available: { label: 'Available data', tone: 'good' },
  missing: { label: 'Missing data', tone: 'warn' },
  observation: { label: 'Research observation', tone: 'info' },
  estimate: { label: 'Statistical estimate', tone: 'info' },
  association: { label: 'Possible association', tone: 'warn' },
  disclaimer: { label: 'Not a diagnosis', tone: 'neutral' },
  answer: null,
};

/**
 * Renders the grounded block list produced by the assistant / record
 * analysis. Each non-plain block carries a provenance chip so the reader can
 * always tell available data from missing data, observation, estimate,
 * association, and the standing "not a diagnosis" disclaimer.
 *
 * Blocks may override their chip with { chip, tone } (used by the bilingual
 * medical action plan) and mark their language with { lang: 'ar' } so the
 * line renders right-to-left.
 */
export default function AnswerBlocks({ blocks }) {
  if (!blocks?.length) return null;
  return (
    <div className="answer-blocks">
      {blocks.map((b, i) => {
        const meta = b.chip
          ? { label: b.chip, tone: b.tone ?? 'info' }
          : KIND_META[b.kind] ?? KIND_META.answer;
        if (!meta) {
          return (
            <p
              key={i}
              className={`answer-line ${b.lang === 'ar' ? 'lang-ar' : ''}`}
              dir={b.lang === 'ar' ? 'rtl' : undefined}
            >
              {b.text}
            </p>
          );
        }
        return (
          <div key={i} className={`answer-block kind-${b.kind}`}>
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <p
              className={`answer-line ${b.lang === 'ar' ? 'lang-ar' : ''}`}
              dir={b.lang === 'ar' ? 'rtl' : undefined}
            >
              {b.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}

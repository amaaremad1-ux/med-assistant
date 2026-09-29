import SectionHeader from '../SectionHeader.jsx';

/**
 * Standard content card: header (title, subtitle, aside actions) + body.
 * `padded=false` renders the body flush (useful for full-bleed charts/tables).
 */
export default function Panel({
  title,
  subtitle,
  aside,
  children,
  padded = true,
  className = '',
  id,
}) {
  return (
    <section className={`panel card ${className}`} id={id}>
      {(title || aside) && (
        <SectionHeader title={title} subtitle={subtitle} aside={aside} />
      )}
      <div className={`panel-body ${padded ? '' : 'flush'}`}>{children}</div>
    </section>
  );
}

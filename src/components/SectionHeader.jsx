export default function SectionHeader({ title, subtitle, aside }) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
      {aside && <div className="section-aside">{aside}</div>}
    </div>
  );
}

/**
 * Per-card research provenance indicator. Shown on every panel that
 * presents a prediction, score, or model output so the estimate is
 * never mistaken for a clinical result.
 */
export default function ProtoTag({ compact = false, extra }) {
  if (compact) {
    return (
      <span className="proto-tag" title="Research prototype output — synthetic data, not a diagnosis">
        Research estimate · synthetic
      </span>
    );
  }
  return (
    <div className="proto-tag-row" role="note">
      <span className="proto-tag">Research Prototype</span>
      <span className="proto-tag">Synthetic Data</span>
      <span className="proto-tag">Not a Diagnosis</span>
      {extra && <span className="proto-tag">{extra}</span>}
    </div>
  );
}

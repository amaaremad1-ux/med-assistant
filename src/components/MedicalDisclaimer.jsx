import Icon from './icons.jsx';

export const MEDICAL_DISCLAIMER_TEXT =
  'Prototype / Research System — Data shown in this application may be synthetic. AI-generated results are informational estimates and are not medical diagnoses. Research observation. Requires professional interpretation.';

/**
 * Standing medical disclaimer (#13). Reuses the global `.disclaimer` styling
 * so it matches every other disclaimer in the app.
 */
export default function MedicalDisclaimer({ compact = false }) {
  return (
    <div className="disclaimer" role="note">
      <span className="disclaimer-icon">
        <Icon name="info" size={compact ? 14 : 16} />
      </span>
      <span>{MEDICAL_DISCLAIMER_TEXT}</span>
    </div>
  );
}

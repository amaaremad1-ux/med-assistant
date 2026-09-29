import Icon from './icons.jsx';

export const PRIVACY_NOTICE_TEXT =
  'Privacy prototype: this application is a research/demo interface. Do not upload real medical or genetic records unless secure storage, authentication, access control, encryption, and appropriate compliance controls have been implemented.';

/**
 * Privacy warning shown on Medical Records and the Genetic & DNA Profile
 * (#12). Reuses the global `.notice` styling.
 */
export default function PrivacyNotice() {
  return (
    <div className="notice" role="note">
      <span className="notice-icon">
        <Icon name="lock" size={18} />
      </span>
      <span>{PRIVACY_NOTICE_TEXT}</span>
    </div>
  );
}

import Icon from './icons.jsx';

export default function PrototypeNotice() {
  return (
    <div className="notice" role="note">
      <span className="notice-icon">
        <Icon name="info" size={18} />
      </span>
      <p>
        <strong>Prototype demo.</strong> All patient data shown is synthetic
        placeholder data. Risk predictions are statistical estimates only —
        they are not medical diagnoses.
      </p>
    </div>
  );
}

import { useRef, useState } from 'react';
import Icon from './icons.jsx';
import { ACCEPTED_EXTENSIONS, MAX_SIZE_BYTES } from '../lib/filePipeline.js';

/**
 * Drag-and-drop / click-to-browse upload zone (#2).
 * Calls onFiles(File[]) with the selected files; validation of type/size is
 * left to the pipeline so the error state is handled consistently.
 */
export default function FileDropzone({ onFiles, disabled = false }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (list) => {
    if (!list || !list.length) return;
    onFiles(Array.from(list));
  };

  return (
    <div
      className={`dropzone ${dragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) handleFiles(e.dataTransfer?.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      aria-label="Upload medical file"
    >
      <span className="dropzone-icon">
        <Icon name="upload" size={22} />
      </span>
      <p className="dropzone-title">Drop a file here, or click to browse</p>
      <p className="dropzone-hint">
        Accepted: {ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(', ')} · up to{' '}
        {Math.round(MAX_SIZE_BYTES / (1024 * 1024))} MB
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(',')}
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

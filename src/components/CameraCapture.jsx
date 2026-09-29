import { useEffect, useRef, useState } from 'react';
import Icon from './icons.jsx';

/**
 * Live camera capture modal for the AI assistant's vision input.
 *
 * Opens the device camera with getUserMedia, shows a live preview, and
 * returns a downscaled JPEG data-URL via onCapture(). All processing stays
 * in the browser: the frame is drawn to a local canvas and never uploaded
 * anywhere by this component (the caller decides what to do with it).
 *
 * Failure modes are surfaced honestly: no camera, permission denied, or a
 * non-secure context each get their own message.
 */
export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          'This browser or context does not expose a camera API (a secure https/localhost context is required). Use image upload instead.',
        );
        return;
      }
      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        const name = err?.name;
        setError(
          name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access for this site, or use image upload instead.'
            : name === 'NotFoundError'
              ? 'No camera was found on this device. Use image upload instead.'
              : `The camera could not be started (${name || 'unknown error'}). Use image upload instead.`,
        );
      }
    }

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const maxSide = 1024;
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL('image/jpeg', 0.85));
    onClose();
  };

  return (
    <div
      className="camera-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Camera capture"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="camera-modal">
        <div className="camera-head">
          <h3>Live camera capture</h3>
          <button type="button" className="icon-button" aria-label="Close camera" onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="camera-frame">
          <video ref={videoRef} playsInline muted className={error ? 'hidden' : ''} />
          {error && (
            <p className="camera-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <p className="muted-small">
          The frame is captured locally in your browser and attached to your message as
          an image. It is only sent to the AI provider you select.
        </p>

        <div className="camera-actions">
          <button type="button" className="action-button" onClick={capture} disabled={!ready}>
            <Icon name="camera" size={14} /> Capture photo
          </button>
          <button type="button" className="action-button secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

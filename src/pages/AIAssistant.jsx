import { useEffect, useRef, useState } from 'react';
import Icon from '../components/icons.jsx';
import { Panel, Badge } from '../components/ui/index.js';
import AnswerBlocks from '../components/AnswerBlocks.jsx';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import CameraCapture from '../components/CameraCapture.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { buildSnapshot } from '../lib/grounding.js';
import {
  runAssistant,
  listAIProviders,
  getActiveProviderId,
  setActiveProvider,
  SUGGESTED_QUESTIONS,
} from '../lib/aiService.js';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Read an image File and downscale it to a JPEG data-URL (max side 1024px).
 * Downscaling keeps attached photos small enough to live in the in-browser
 * conversation history without blowing the localStorage quota.
 */
function fileToImageBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Only image files (PNG, JPG, JPEG, …) can be attached.'));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error('Image is larger than 8 MB. Please attach a smaller photo.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The file could not be read.'));
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const img = new Image();
      img.onerror = () => reject(new Error('The file is not a decodable image.'));
      img.onload = () => {
        const maxSide = 1024;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * AI Health Assistant (#1). Grounded chat over application state only, with
 * dual image input (file upload + live camera) for the vision provider.
 * Loading, error, history, clear and suggested-question affordances.
 */
export default function AIAssistant() {
  const appData = useAppData();
  const {
    conversations,
    activeConversation,
    activeConversationId,
    startConversation,
    appendMessage,
    deleteConversation,
    clearConversations,
    setActiveConversationId,
  } = appData;

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [providers] = useState(listAIProviders);
  const [providerId, setProviderId] = useState(getActiveProviderId);
  const [pendingImage, setPendingImage] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [activeConversation?.messages.length, loading, pendingImage]);

  const attachFile = async (file) => {
    setImageError(null);
    if (!file) return;
    try {
      const dataUrl = await fileToImageBase64(file);
      setPendingImage(dataUrl);
    } catch (err) {
      setImageError(err?.message || 'The image could not be attached.');
    }
  };

  const send = async (question) => {
    const text = String(question ?? input).trim();
    if ((!text && !pendingImage) || loading) return;
    setInput('');
    const image = pendingImage;
    setPendingImage(null);
    setImageError(null);

    let convId = activeConversationId;
    if (!convId || !conversations.some((c) => c.id === convId)) {
      const conv = startConversation((text || 'Image analysis').slice(0, 48));
      convId = conv.id;
    }
    appendMessage(convId, { role: 'user', text: text || '(image attached)', image });
    setLoading(true);
    try {
      const snapshot = buildSnapshot(appData);
      const result = await runAssistant(text, snapshot, { imageBase64: image });
      appendMessage(convId, { role: 'assistant', blocks: result.blocks, text: null });
    } catch (err) {
      appendMessage(convId, {
        role: 'assistant',
        error: true,
        text: err?.message || 'The assistant could not produce an answer.',
      });
    } finally {
      setLoading(false);
    }
  };

  const activeProvider = providers.find((p) => p.id === providerId);
  const visionCapable = providerId === 'gpt-4o';

  return (
    <div className="assistant-layout">
      <Panel
        title="Conversations"
        subtitle={`${conversations.length} saved in this browser`}
        aside={
          <button type="button" className="action-button secondary" onClick={clearConversations}>
            Clear conversation
          </button>
        }
      >
        <button
          type="button"
          className="action-button"
          style={{ width: '100%', marginBottom: 10 }}
          onClick={() => setActiveConversationId(null)}
        >
          <Icon name="plus" size={14} /> New conversation
        </button>

        {conversations.length === 0 ? (
          <p className="muted-small">No conversations yet.</p>
        ) : (
          <ul className="conv-list">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`conv-item ${c.id === activeConversationId ? 'active' : ''}`}
                  onClick={() => setActiveConversationId(c.id)}
                >
                  <span className="conv-title">{c.title}</span>
                  <span className="conv-meta">
                    {c.messages.length} message{c.messages.length === 1 ? '' : 's'}
                  </span>
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Delete conversation ${c.title}`}
                  onClick={() => deleteConversation(c.id)}
                >
                  <Icon name="trash" size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="assistant-provider">
          <span className="form-label">AI provider</span>
          <select
            value={providerId}
            onChange={(e) => {
              setProviderId(e.target.value);
              try {
                setActiveProvider(e.target.value);
              } catch {
                /* keep previous provider */
              }
            }}
            aria-label="AI provider"
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
                {p.configured ? '' : ' (not configured)'}
              </option>
            ))}
          </select>
          <p className="muted-small">{activeProvider?.description}</p>
        </div>
      </Panel>

      <Panel
        title="AI Health Assistant"
        subtitle="Answers from your data and the local medical knowledge base — never a diagnosis"
        aside={<Badge tone="proto">grounded</Badge>}
        className="assistant-chat-panel"
      >
        <div className="chat-scroll" ref={scrollRef}>
          {!activeConversation || activeConversation.messages.length === 0 ? (
            <div className="chat-empty">
              <p className="chat-empty-title">Ask about your data or a health concern</p>
              <p className="muted-small">
                The assistant reads uploaded files, blood tests, biomarkers, genetic
                records, device data and the synthetic demo panel, and answers
                first-aid questions from the local medical knowledge base in English
                or Arabic. Attach a photo (upload or live camera) for vision analysis
                with the GPT-4o provider. It never invents values; when something is
                missing it says so.
              </p>
              <div className="suggested-row">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="suggested-chip"
                    onClick={() => send(q)}
                    disabled={loading}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="chat-messages">
              {activeConversation.messages.map((m) => (
                <li key={m.id} className={`chat-msg ${m.role}`}>
                  <span className={`chat-avatar ${m.role}`}>
                    <Icon name={m.role === 'user' ? 'user' : 'sparkles'} size={14} />
                  </span>
                  <div className={`chat-bubble ${m.error ? 'error' : ''}`}>
                    {m.image && (
                      <img className="chat-attached" src={m.image} alt="Attached photo" />
                    )}
                    {m.error ? (
                      <p className="answer-line" dir="auto">{m.text}</p>
                    ) : m.blocks ? (
                      <AnswerBlocks blocks={m.blocks} />
                    ) : (
                      <p className="answer-line" dir="auto">{m.text}</p>
                    )}
                  </div>
                </li>
              ))}
              {loading && (
                <li className="chat-msg assistant">
                  <span className="chat-avatar assistant">
                    <Icon name="sparkles" size={14} />
                  </span>
                  <div className="chat-bubble">
                    <p className="record-status-line">
                      <span className="spinner" aria-hidden="true" /> thinking…
                    </p>
                  </div>
                </li>
              )}
            </ul>
          )}
        </div>

        {pendingImage && (
          <div className="image-preview" role="status">
            <img src={pendingImage} alt="Attached photo preview" />
            <div className="image-preview-meta">
              <span>Photo attached to your next message.</span>
              {!visionCapable && (
                <em>
                  The local grounded assistant cannot view images — switch the provider
                  to GPT-4o (Vision) for a visual description.
                </em>
              )}
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Remove attached photo"
              onClick={() => setPendingImage(null)}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        )}
        {imageError && (
          <p className="image-error" role="alert">
            {imageError}
          </p>
        )}

        <form
          className="chat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(e) => {
              attachFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="icon-button composer-tool"
            aria-label="Upload an image (wound, rash, skin)"
            title="Upload an image (wound, rash, skin)"
            disabled={loading}
            onClick={() => fileRef.current?.click()}
          >
            <Icon name="image" size={16} />
          </button>
          <button
            type="button"
            className="icon-button composer-tool"
            aria-label="Take a photo with the camera"
            title="Take a photo with the camera"
            disabled={loading}
            onClick={() => setCameraOpen(true)}
          >
            <Icon name="camera" size={16} />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. First aid for a minor burn? / ما الإسعافات الأولية لحرق بسيط؟"
            aria-label="Message the assistant"
            disabled={loading}
          />
          <button
            type="submit"
            className="action-button"
            disabled={loading || (!input.trim() && !pendingImage)}
          >
            <Icon name="send" size={14} /> Send
          </button>
        </form>

        <MedicalDisclaimer compact />
      </Panel>

      {cameraOpen && (
        <CameraCapture
          onCapture={(dataUrl) => {
            setImageError(null);
            setPendingImage(dataUrl);
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}

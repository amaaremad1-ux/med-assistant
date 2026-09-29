/**
 * AI service interface (#1).
 *
 * The UI never talks to a model directly — it calls runAssistant(), which
 * delegates to the ACTIVE PROVIDER. Providers are plain objects:
 *
 *   { id, label, description, answer(question, snapshot, opts) -> Promise<{blocks}> }
 *
 * Shipped providers:
 *   - 'local-grounded' (default): deterministic retrieval over the grounding
 *     snapshot. Real, transparent, offline. NOT an LLM.
 *   - 'gpt-4o': OpenAI GPT-4o with vision support (images + medical advice).
 *   - 'remote': a stub created by createRemoteProvider().
 */
import { answerQuestion, SUGGESTED_QUESTIONS } from './localAssistant.js';
import {
  searchKnowledgeBase,
  kbReferenceText,
  detectLanguage,
  KB_META,
} from '../data/medicalKnowledgeBase.js';

const providers = new Map();
let activeId = 'local-grounded';

// =============== LOCAL GROUNDED ===============
providers.set('local-grounded', {
  id: 'local-grounded',
  label: 'Local grounded assistant',
  description:
    'Deterministic retrieval over application data. Offline and transparent — not a large language model.',
  async answer(question, snapshot, opts = {}) {
    await new Promise((r) => setTimeout(r, 350));
    return answerQuestion(question, snapshot, opts);
  },
});

// =============== GPT-4o PROVIDER (with Vision) ===============
providers.set('gpt-4o', {
  id: 'gpt-4o',
  label: 'GPT-4o Medical AI (Vision)',
  description: 'Advanced medical AI with image analysis. Can analyze wounds, symptoms, and give advice.',
  configured: true,
  async answer(question, snapshot, opts = {}) {
    // التعديل هنا: يقرأ من ملف .env أولاً (Vite أو عادي) ثم من LocalStorage
    const apiKey = 
      opts.apiKey || 
      import.meta.env.VITE_OPENAI_API_KEY || 
      import.meta.env.OPENAI_API_KEY || 
      localStorage.getItem('openai_api_key');

    if (!apiKey) {
      throw new Error('OpenAI API Key is missing. Please set it first.');
    }

    // Ground the model in the app's local medical knowledge base and force a
    // structured, disclaimer-carrying action plan in the user's language.
    const lang = detectLanguage(question);
    const references = kbReferenceText(searchKnowledgeBase(question, { limit: 2 }), lang);

    const systemPrompt = `You are an expert medical assistant inside a clinical research prototype dashboard.

GROUNDED REFERENCES from the app's local medical knowledge base (${KB_META.title}):
${references}

IMPORTANT RULES:
- Base your advice on the grounded references above and do not contradict them. If they contain no matching entry, say so explicitly and give only general safety guidance and red flags.
- ${KB_META.scopeNote}
- You are NOT a doctor and this is NOT a diagnosis. Never state a diagnosis as fact; use hedged language ("possible", "may indicate", "consider").
- Provide a DETAILED MEDICAL ACTION PLAN with these sections, in order:
  1) Visual description & severity assessment — ONLY if an image is attached; otherwise state that no image was provided. Describe what is visible (colour, size, edges, surrounding skin) and give a cautious severity impression (mild / moderate / concerning) with reasons.
  2) Possible causes.
  3) Immediate first-aid steps (numbered).
  4) General over-the-counter medication guidance, always with cautions: ${KB_META.otcCautionEn}
  5) Recommended medical specialist to consult.
  6) Emergency red flags that require immediate care.
- If the question is about the user's stored application data (blood tests, records, trends), answer only from the snapshot provided and say "Insufficient data available." for anything missing.
- Respond entirely in ${lang === 'ar' ? 'Arabic' : 'English'}, matching the language of the user's message.
- Always end with: ${
      lang === 'ar'
        ? '"هذا ليس تشخيصاً طبياً. يرجى استشارة طبيب حقيقي."'
        : '"This is not a medical diagnosis. Please consult a real doctor."'
    }`;

    // Build messages
    const messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: question || 'Please analyze this image and give me advice.' },
        ],
      },
    ];

    // Add image if exists
    if (opts.imageBase64) {
      messages[1].content.push({
        type: 'image_url',
        image_url: {
          url: opts.imageBase64, // should be data:image/...;base64,...
        },
      });
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 1600,
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `OpenAI request failed (HTTP ${res.status})`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || 'No response from the model.';

    // Return in the same format the UI expects
    return {
      blocks: [
        { kind: 'text', text },
      ],
    };
  },
});

/**
 * Integration point for a real AI backend.
 */
export function createRemoteProvider({ endpoint, apiKey, model } = {}) {
  return {
    id: 'remote',
    label: 'Remote AI API',
    description: endpoint
      ? `POSTs question + grounding snapshot to ${endpoint}.`
      : 'Not configured — supply endpoint/apiKey via createRemoteProvider().',
    configured: Boolean(endpoint),
    async answer(question, snapshot) {
      if (!endpoint) {
        throw new Error(
          'No remote AI backend is configured. The application is using the local grounded assistant; connect an API via createRemoteProvider({ endpoint, apiKey }).',
        );
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ model, question, snapshot }),
      });
      if (!res.ok) throw new Error(`Remote AI request failed (HTTP ${res.status}).`);
      const data = await res.json();
      if (!Array.isArray(data?.blocks)) {
        throw new Error('Remote AI response did not contain grounded blocks.');
      }
      return { blocks: data.blocks };
    },
  };
}

export function registerAIProvider(provider) {
  if (!provider?.id || typeof provider.answer !== 'function') {
    throw new Error('A provider needs an id and an answer() function.');
  }
  providers.set(provider.id, provider);
  return provider;
}

export function listAIProviders() {
  return [...providers.values()].map(({ id, label, description, configured }) => ({
    id,
    label,
    description,
    configured: configured ?? true,
  }));
}

export function getActiveProviderId() {
  return activeId;
}

export function setActiveProvider(id) {
  if (!providers.has(id)) throw new Error(`Unknown AI provider "${id}".`);
  activeId = id;
  return activeId;
}

export function getActiveProvider() {
  return providers.get(activeId) ?? providers.get('local-grounded');
}

export async function runAssistant(question, snapshot, opts = {}) {
  const provider = getActiveProvider();
  return provider.answer(question, snapshot, opts);
}

export { SUGGESTED_QUESTIONS };

// Register the unconfigured remote provider (keep it for compatibility)
registerAIProvider(createRemoteProvider({}));
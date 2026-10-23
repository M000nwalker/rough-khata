import type { AiConfig, PeerMessage } from '../types';

export const PEER_SYSTEM_PROMPT = `You are a sharp, intuitive engineering peer sitting at the study table with the user collaborating on technical material. 
- Eliminate robotic pleasantries and meta-announcements ('Certainly!', 'Here is the explanation...').
- Start sentence 1 directly answering the confusion.
- Reference visual elements in the cropped image directly ('In the bracketed term on the left...', 'Looking at the control volume...').
- Render all math in clean LaTeX ($...$ for inline, $$...$$ for display blocks).
- Keep explanations clear, rigorous, and conversational like a fellow student.`;

const STORAGE_KEY = 'rough_khata_ai_config';

export function getStoredAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          provider: parsed.provider || 'gemini',
          apiKey: parsed.apiKey || '',
          model: parsed.model || 'gemini-2.5-flash',
          customBaseUrl: parsed.customBaseUrl || ''
        };
      }
    }
  } catch (err) {
    console.warn('Failed to parse stored AI config:', err);
  }

  return {
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-2.5-flash',
    customBaseUrl: ''
  };
}

export function saveAiConfig(config: AiConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('Failed to save AI config:', err);
  }
}

export interface StreamPeerRequestOptions {
  imageDataUrl: string;
  nearbyText: string;
  userQuestion: string;
  history?: PeerMessage[];
  config: AiConfig;
  signal?: AbortSignal;
  onChunk: (chunk: string) => void;
}

/**
 * Multi-Modal streaming client for Gemini and OpenAI-compatible providers.
 */
export async function streamPeerExplanation({
  imageDataUrl,
  nearbyText,
  userQuestion,
  history = [],
  config,
  signal,
  onChunk
}: StreamPeerRequestOptions): Promise<string> {
  // If no API key is configured, yield a helpful mock peer message
  if (!config.apiKey || config.apiKey.trim() === '') {
    return handleMockPeerStream(userQuestion, nearbyText, onChunk, signal);
  }

  if (config.provider === 'gemini') {
    return streamGeminiApi({
      imageDataUrl,
      nearbyText,
      userQuestion,
      history,
      config,
      signal,
      onChunk
    });
  } else {
    return streamOpenAiCompatible({
      imageDataUrl,
      nearbyText,
      userQuestion,
      history,
      config,
      signal,
      onChunk
    });
  }
}

/**
 * Google Gemini multi-modal streaming via SSE
 */
async function streamGeminiApi({
  imageDataUrl,
  nearbyText,
  userQuestion,
  history,
  config,
  signal,
  onChunk
}: {
  imageDataUrl: string;
  nearbyText: string;
  userQuestion: string;
  history: PeerMessage[];
  config: AiConfig;
  signal?: AbortSignal;
  onChunk: (chunk: string) => void;
}): Promise<string> {
  const model = config.model || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:streamGenerateContent?key=${encodeURIComponent(config.apiKey.trim())}&alt=sse`;

  // Extract raw base64 data and mime type
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);
  const mimeType = match ? match[1] : 'image/png';
  const base64Data = match ? match[2] : imageDataUrl;

  const contents: Array<{ role: string; parts: any[] }> = [];

  // Previous conversation turns
  for (const msg of history) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    });
  }

  // Current turn with cropped visual slice & extracted PDF context
  const currentParts: any[] = [];
  if (base64Data) {
    currentParts.push({
      inlineData: {
        mimeType,
        data: base64Data
      }
    });
  }

  let promptText = '';
  if (nearbyText && nearbyText.trim()) {
    promptText += `[Context from text layer near selection]:\n"""\n${nearbyText.trim()}\n"""\n\n`;
  }
  promptText += `[Student Question]:\n${userQuestion.trim()}`;

  currentParts.push({ text: promptText });
  contents.push({ role: 'user', parts: currentParts });

  const payload = {
    systemInstruction: {
      parts: [{ text: PEER_SYSTEM_PROMPT }]
    },
    contents,
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 2048
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson?.error?.message) {
        errorDetail = errJson.error.message;
      }
    } catch {}
    throw new Error(`Gemini API Error: ${errorDetail}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Unable to read streaming response stream');
  }

  const decoder = new TextDecoder('utf-8');
  let accumulated = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;

      if (trimmed.startsWith('data: ')) {
        const jsonStr = trimmed.slice(6).trim();
        if (jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const candidate = parsed?.candidates?.[0];
          const partText = candidate?.content?.parts?.[0]?.text;
          if (partText) {
            accumulated += partText;
            onChunk(partText);
          }
        } catch (e) {
          // ignore partial chunks
        }
      }
    }
  }

  return accumulated;
}

/**
 * OpenAI / OpenRouter-compatible multi-modal streaming via SSE
 */
async function streamOpenAiCompatible({
  imageDataUrl,
  nearbyText,
  userQuestion,
  history,
  config,
  signal,
  onChunk
}: {
  imageDataUrl: string;
  nearbyText: string;
  userQuestion: string;
  history: PeerMessage[];
  config: AiConfig;
  signal?: AbortSignal;
  onChunk: (chunk: string) => void;
}): Promise<string> {
  const baseUrl = config.customBaseUrl?.trim() || 'https://openrouter.ai/api/v1';
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const model = config.model || 'openai/gpt-4o-mini';

  const messages: any[] = [{ role: 'system', content: PEER_SYSTEM_PROMPT }];

  for (const msg of history) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    });
  }

  let textContent = '';
  if (nearbyText && nearbyText.trim()) {
    textContent += `Context extracted from PDF around this selection:\n"""\n${nearbyText.trim()}\n"""\n\n`;
  }
  textContent += `Question: ${userQuestion.trim()}`;

  const currentContent: any[] = [{ type: 'text', text: textContent }];
  if (imageDataUrl) {
    currentContent.push({
      type: 'image_url',
      image_url: {
        url: imageDataUrl
      }
    });
  }

  messages.push({ role: 'user', content: currentContent });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey.trim()}`
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages
    }),
    signal
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson?.error?.message) {
        errorDetail = errJson.error.message;
      }
    } catch {}
    throw new Error(`OpenAI API Error: ${errorDetail}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Unable to read streaming response stream');
  }

  const decoder = new TextDecoder('utf-8');
  let accumulated = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;

      if (trimmed.startsWith('data: ')) {
        const jsonStr = trimmed.slice(6).trim();
        if (jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (delta) {
            accumulated += delta;
            onChunk(delta);
          }
        } catch (e) {
          // ignore partial chunks
        }
      }
    }
  }

  return accumulated;
}

/**
 * Fallback simulation when no API key is yet configured
 */
async function handleMockPeerStream(
  _userQuestion: string,
  _nearbyText: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const sample = `Notice how in the left bracket of the governing relation:
$$\\frac{\\partial \\rho}{\\partial t} + \\nabla \\cdot (\\rho \\vec{u}) = 0$$
When we assume an incompressible fluid (constant density $\\rho = \\text{const}$), the time derivative $\\frac{\\partial \\rho}{\\partial t} \\to 0$. Dividing through by the scalar $\\rho$ directly yields the divergence-free velocity field:
$$\\nabla \\cdot \\vec{u} = 0$$
Looking at the control volume slice, this enforces that mass flux entering equals mass flux exiting.

*(Tip: Click the gear icon above to paste your Google Gemini API key for instant live LLM reasoning over any equation or diagram!)*`;

  const chunks = sample.split(/(?<=\s|\\n)/);
  let accumulated = '';

  for (const chunk of chunks) {
    if (signal?.aborted) break;
    await new Promise((r) => setTimeout(r, 28));
    accumulated += chunk;
    onChunk(chunk);
  }

  return accumulated;
}

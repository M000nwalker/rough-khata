import type { AiConfig, AiProvider, PeerMessage } from '../types';

export const PEER_SYSTEM_PROMPT = `You are an elite, sharp, intuitive engineering peer sitting at the study table collaborating on technical STEM material.
- Eliminate robotic pleasantries and meta-announcements ('Certainly!', 'Here is the explanation...').
- Start sentence 1 directly answering the confusion.
- Reference visual elements in the cropped image directly ('In the bracketed term on the left...', 'Looking at the control volume...').
- Render all math in clean LaTeX ($...$ for inline, $$...$$ for display blocks).
- Keep explanations clear, rigorous, and conversational like a fellow engineering student.`;

const STORAGE_KEY = 'rough_khata_ai_config';

export interface ProviderPreset {
  id: AiProvider;
  name: string;
  defaultModel: string;
  defaultBaseUrl: string;
  models: Array<{ id: string; name: string }>;
  requiresKey: boolean;
  keyPlaceholder: string;
  keyUrl: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fastest)' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Deep Reasoning)' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' }
    ],
    requiresKey: true,
    keyPlaceholder: 'AIzaSy... (Free API key at aistudio.google.com)',
    keyUrl: 'https://aistudio.google.com/app/apikey'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3 (Chat)' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1 (Deep Reasoning)' }
    ],
    requiresKey: true,
    keyPlaceholder: 'sk-... (From platform.deepseek.com)',
    keyUrl: 'https://platform.deepseek.com/api_keys'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4o', name: 'GPT-4o (Vision & Math)' },
      { id: 'o3-mini', name: 'o3-mini (STEM Reasoning)' }
    ],
    requiresKey: true,
    keyPlaceholder: 'sk-proj-... (platform.openai.com)',
    keyUrl: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    defaultModel: 'google/gemini-2.5-flash',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    models: [
      { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'meta-llama/llama-3.2-11b-vision-instruct', name: 'Llama 3.2 Vision' }
    ],
    requiresKey: true,
    keyPlaceholder: 'sk-or-v1-... (openrouter.ai/keys)',
    keyUrl: 'https://openrouter.ai/keys'
  },
  {
    id: 'ollama',
    name: 'Ollama (Local / Offline)',
    defaultModel: 'llama3.2-vision',
    defaultBaseUrl: 'http://localhost:11434',
    models: [
      { id: 'llama3.2-vision', name: 'Llama 3.2 Vision (Local)' },
      { id: 'llava', name: 'LLaVA (Local)' },
      { id: 'qwen2.5', name: 'Qwen 2.5 (Local)' }
    ],
    requiresKey: false,
    keyPlaceholder: 'No API Key Needed (Localhost)',
    keyUrl: 'https://ollama.com'
  }
];

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
 * Universal multi-modal streaming client supporting Gemini, DeepSeek, OpenAI, OpenRouter, and Ollama.
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
  // If provider requires key and none is provided, throw helpful error with instruction
  if (config.provider !== 'ollama' && (!config.apiKey || config.apiKey.trim() === '')) {
    throw new Error(
      `Please provide your ${config.provider.toUpperCase()} API key in settings, or switch to the "Web Account" tab to chat directly with your Google/ChatGPT account on-screen!`
    );
  }

  switch (config.provider) {
    case 'gemini':
      return streamGeminiApi({
        imageDataUrl,
        nearbyText,
        userQuestion,
        history,
        config,
        signal,
        onChunk
      });
    case 'ollama':
      return streamOllamaApi({
        imageDataUrl,
        nearbyText,
        userQuestion,
        history,
        config,
        signal,
        onChunk
      });
    default:
      // OpenAI, DeepSeek, OpenRouter
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
    promptText += `[Surrounding context from PDF page]:\n"""\n${nearbyText.trim()}\n"""\n\n`;
  }
  promptText += `[Question]:\n${userQuestion.trim()}`;

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
    headers: { 'Content-Type': 'application/json' },
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
  if (!reader) throw new Error('Unable to read streaming response stream');

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
        } catch {}
      }
    }
  }

  return accumulated;
}

/**
 * OpenAI / DeepSeek / OpenRouter compatible streaming
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
  let defaultBase = 'https://api.openai.com/v1';
  if (config.provider === 'deepseek') defaultBase = 'https://api.deepseek.com/v1';
  else if (config.provider === 'openrouter') defaultBase = 'https://openrouter.ai/api/v1';

  const baseUrl = config.customBaseUrl?.trim() || defaultBase;
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const model = config.model || (config.provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini');

  const messages: any[] = [{ role: 'system', content: PEER_SYSTEM_PROMPT }];

  for (const msg of history) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    });
  }

  let textContent = '';
  if (nearbyText && nearbyText.trim()) {
    textContent += `[Context from PDF surrounding this selection]:\n"""\n${nearbyText.trim()}\n"""\n\n`;
  }
  textContent += `[Question]:\n${userQuestion.trim()}`;

  const currentContent: any[] = [{ type: 'text', text: textContent }];
  if (imageDataUrl) {
    currentContent.push({
      type: 'image_url',
      image_url: { url: imageDataUrl }
    });
  }

  messages.push({ role: 'user', content: currentContent });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey.trim()}`
  };

  if (config.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com/M000nwalker/rough-khata';
    headers['X-Title'] = 'Rough Khata STEM Study Peer';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
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
    throw new Error(`${config.provider.toUpperCase()} API Error: ${errorDetail}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Unable to read streaming response stream');

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
        } catch {}
      }
    }
  }

  return accumulated;
}

/**
 * Local Ollama Streaming API
 */
async function streamOllamaApi({
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
  const baseUrl = config.customBaseUrl?.trim() || 'http://localhost:11434';
  const url = `${baseUrl.replace(/\/+$/, '')}/api/chat`;
  const model = config.model || 'llama3.2-vision';

  // Extract raw base64 data without prefix for Ollama
  const match = imageDataUrl.match(/^data:image\/[a-zA-Z0-9.+_-]+;base64,(.+)$/);
  const rawBase64 = match ? match[1] : '';

  const messages: any[] = [{ role: 'system', content: PEER_SYSTEM_PROMPT }];

  for (const msg of history) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    });
  }

  let textContent = '';
  if (nearbyText && nearbyText.trim()) {
    textContent += `[Context from PDF]:\n${nearbyText.trim()}\n\n`;
  }
  textContent += userQuestion.trim();

  const userMsgObj: any = {
    role: 'user',
    content: textContent
  };
  if (rawBase64) {
    userMsgObj.images = [rawBase64];
  }
  messages.push(userMsgObj);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: true,
      messages
    }),
    signal
  });

  if (!response.ok) {
    throw new Error(`Ollama Error (HTTP ${response.status}). Ensure Ollama is running at ${baseUrl}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Unable to read stream from Ollama');

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
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        const chunk = parsed?.message?.content;
        if (chunk) {
          accumulated += chunk;
          onChunk(chunk);
        }
      } catch {}
    }
  }

  return accumulated;
}

import React, { useState, useRef, useEffect } from 'react';
import type { AiConfig, AiProvider, PeerSession, WebLlmService } from '../types';
import { MathMarkdownRenderer } from './MathMarkdownRenderer';
import {
  getStoredAiConfig,
  saveAiConfig,
  PROVIDER_PRESETS
} from '../utils/aiPeerClient';
import {
  Sparkles,
  X,
  Send,
  Square,
  Copy,
  PlusCircle,
  Settings,
  Sidebar,
  Maximize2,
  Minimize2,
  HelpCircle,
  FileText,
  Key,
  Check,
  Bot,
  Globe,
  ExternalLink,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  ClipboardCopy,
  Columns
} from 'lucide-react';

interface StudyPeerDockProps {
  session: PeerSession | null;
  anchor: { x: number; y: number; width: number; height: number } | null;
  dockMode: 'floating' | 'sidebar';
  onToggleDockMode: () => void;
  onClose: () => void;
  onSubmitQuestion: (question: string) => void;
  onStopStreaming: () => void;
  onInsertLatexToNotes?: (content: string) => void;
  onSendToScratchpad?: (imageDataUrl: string, content: string) => void;
}

const QUICK_PROMPTS = [
  'Why did this term cancel out here?',
  'Explain physical intuition step-by-step',
  'Derive this equation in detail',
  'What are the key assumptions made here?'
];

interface WebLlmPreset {
  id: WebLlmService;
  name: string;
  url: string;
  badge: string;
  color: string;
}

const WEB_LLM_PRESETS: WebLlmPreset[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    url: 'https://gemini.google.com/app',
    badge: 'Google Account',
    color: '#38bdf8'
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com',
    badge: 'OpenAI Account',
    color: '#10b981'
  },
  {
    id: 'claude',
    name: 'Claude',
    url: 'https://claude.ai/new',
    badge: 'Anthropic Account',
    color: '#d97706'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com',
    badge: 'DeepSeek Account',
    color: '#8b5cf6'
  }
];

export const StudyPeerDock: React.FC<StudyPeerDockProps> = ({
  session,
  anchor,
  dockMode,
  onToggleDockMode,
  onClose,
  onSubmitQuestion,
  onStopStreaming,
  onInsertLatexToNotes,
  onSendToScratchpad
}) => {
  // Navigation tabs: Direct API streaming vs. Embedded Web Account view
  const [activeTab, setActiveTab] = useState<'direct' | 'web'>('direct');
  const [selectedWebService, setSelectedWebService] = useState<WebLlmService>('gemini');

  const [inputText, setInputText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isWide, setIsWide] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showContextPreview, setShowContextPreview] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedImageToast, setCopiedImageToast] = useState(false);

  // Settings State
  const [aiConfig, setAiConfig] = useState<AiConfig>(getStoredAiConfig);
  const [tempApiKey, setTempApiKey] = useState(aiConfig.apiKey);
  const [tempProvider, setTempProvider] = useState<AiProvider>(aiConfig.provider);
  const [tempModel, setTempModel] = useState(aiConfig.model);
  const [tempCustomBaseUrl, setTempCustomBaseUrl] = useState(aiConfig.customBaseUrl || '');

  // Quick inline API key input for keyless providers
  const [inlineKeyInput, setInlineKeyInput] = useState('');

  // Draggable offset for floating mode
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHeaderDragging, setIsHeaderDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; initialOffsetX: number; initialOffsetY: number } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const webviewRef = useRef<any>(null);

  // Auto-focus input on open or when session changes
  useEffect(() => {
    if (session && activeTab === 'direct') {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 80);
    }
  }, [session?.id, activeTab]);

  // Auto-scroll chat stream
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [session?.messages, session?.status]);

  if (!session) return null;

  // Active web service configuration
  const activeWebPreset = WEB_LLM_PRESETS.find((p) => p.id === selectedWebService) || WEB_LLM_PRESETS[0];
  const targetWebUrl = activeWebPreset.url;

  // Active provider preset for direct mode
  const activeProviderPreset =
    PROVIDER_PRESETS.find((p) => p.id === aiConfig.provider) || PROVIDER_PRESETS[0];

  // Dynamic Popover Width calculation
  const defaultWidth = 500;
  const wideWidth = 840;
  const currentWidth = isWide ? wideWidth : defaultWidth;

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  let leftPos = 40;
  let topPos = 80;

  if (anchor && dockMode === 'floating') {
    const preferredLeft = anchor.x + anchor.width + 18;
    if (preferredLeft + currentWidth < viewportW - 24) {
      leftPos = preferredLeft;
    } else {
      const leftAlt = anchor.x - currentWidth - 18;
      if (leftAlt > 24) {
        leftPos = leftAlt;
      } else {
        leftPos = Math.max(24, viewportW - currentWidth - 32);
      }
    }
    topPos = Math.max(70, Math.min(viewportH - 560, anchor.y));
  }

  // Header drag handlers for floating popover
  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    if (dockMode === 'sidebar') return;
    setIsHeaderDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialOffsetX: dragOffset.x,
      initialOffsetY: dragOffset.y
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleHeaderPointerMove = (e: React.PointerEvent) => {
    if (!isHeaderDragging || !dragStartRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.mouseX;
    const deltaY = e.clientY - dragStartRef.current.mouseY;
    setDragOffset({
      x: dragStartRef.current.initialOffsetX + deltaX,
      y: dragStartRef.current.initialOffsetY + deltaY
    });
  };

  const handleHeaderPointerUp = (e: React.PointerEvent) => {
    setIsHeaderDragging(false);
    dragStartRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleSend = () => {
    const q = inputText.trim();
    if (!q || session.status === 'streaming') return;
    setInputText('');
    onSubmitQuestion(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickPromptClick = (prompt: string) => {
    if (session.status === 'streaming') return;
    onSubmitQuestion(prompt);
  };

  const handleSaveSettings = () => {
    const preset = PROVIDER_PRESETS.find((p) => p.id === tempProvider) || PROVIDER_PRESETS[0];
    const updated: AiConfig = {
      provider: tempProvider,
      apiKey: tempApiKey.trim(),
      model: tempModel.trim() || preset.defaultModel,
      customBaseUrl: tempCustomBaseUrl.trim() || preset.defaultBaseUrl
    };
    saveAiConfig(updated);
    setAiConfig(updated);
    setShowSettings(false);
  };

  const handleSaveInlineKey = () => {
    if (!inlineKeyInput.trim()) return;
    const updated: AiConfig = {
      ...aiConfig,
      apiKey: inlineKeyInput.trim()
    };
    saveAiConfig(updated);
    setAiConfig(updated);
    setInlineKeyInput('');
  };

  const handleCopyAnswer = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy Snipped Image to Clipboard for Web Account mode
  const handleCopyImageToClipboard = async () => {
    if (!session?.imageDataUrl) return;

    // Electron native IPC clipboard
    if (window.electronAPI?.copyImageToClipboard) {
      const ok = await window.electronAPI.copyImageToClipboard(session.imageDataUrl);
      if (ok) {
        setCopiedImageToast(true);
        setTimeout(() => setCopiedImageToast(false), 2400);
        return;
      }
    }

    // Standard browser fallback
    try {
      const res = await fetch(session.imageDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      setCopiedImageToast(true);
      setTimeout(() => setCopiedImageToast(false), 2400);
    } catch (err) {
      console.warn('Failed standard clipboard write:', err);
    }
  };

  // Copy OCR / Context Text to Clipboard
  const handleCopyContextToClipboard = () => {
    const textToCopy = [
      session.nearbyText ? `[Problem Context]\n${session.nearbyText}` : '',
      inputText ? `[My Question]\n${inputText}` : ''
    ]
      .filter(Boolean)
      .join('\n\n');

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedId('context-copied');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Webview navigation actions
  const handleWebReload = () => {
    if (webviewRef.current?.reload) {
      webviewRef.current.reload();
    }
  };

  const handleWebBack = () => {
    if (webviewRef.current?.canGoBack && webviewRef.current.canGoBack()) {
      webviewRef.current.goBack();
    }
  };

  const handleWebForward = () => {
    if (webviewRef.current?.canGoForward && webviewRef.current.canGoForward()) {
      webviewRef.current.goForward();
    }
  };

  const handleOpenExternal = () => {
    window.open(targetWebUrl, '_blank');
  };

  const isStreaming = session.status === 'streaming';
  const hasKey = !activeProviderPreset.requiresKey || !!aiConfig.apiKey.trim();

  return (
    <aside
      className={`study-peer-dock-container ${dockMode} ${isMinimized ? 'minimized' : ''} ${isWide ? 'wide' : ''}`}
      style={
        dockMode === 'floating'
          ? {
              left: `${leftPos + dragOffset.x}px`,
              top: `${topPos + dragOffset.y}px`,
              width: `${currentWidth}px`
            }
          : undefined
      }
    >
      {/* 1. Header Bar (Draggable in floating mode) */}
      <div
        className="peer-dock-header"
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
      >
        <div className="peer-title-wrap">
          <div className="peer-avatar">
            <Bot size={18} className="peer-avatar-icon" />
            <span className="peer-pulse-indicator" />
          </div>
          <div className="peer-title-text">
            <h4>Study Peer AI</h4>
            <span className="peer-model-tag">
              {activeTab === 'web'
                ? activeWebPreset.name
                : hasKey
                ? `${activeProviderPreset.name}: ${aiConfig.model}`
                : `${activeProviderPreset.name} (Key Needed)`}
            </span>
          </div>
        </div>

        {/* Dual Tab Segmented Switch */}
        <div className="peer-tab-switch" onPointerDown={(e) => e.stopPropagation()}>
          <button
            className={`peer-tab-btn ${activeTab === 'direct' ? 'active' : ''}`}
            onClick={() => setActiveTab('direct')}
            title="Direct streaming AI with math formula rendering"
          >
            <Sparkles size={13} />
            <span>Direct Chat</span>
          </button>
          <button
            className={`peer-tab-btn ${activeTab === 'web' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('web');
              setIsWide(true); // Automatically widen for full web experience
            }}
            title="Chat using your Google / ChatGPT / Claude accounts on-screen"
          >
            <Globe size={13} />
            <span>Web Account</span>
          </button>
        </div>

        <div className="peer-header-controls" onPointerDown={(e) => e.stopPropagation()}>
          <button
            className={`peer-ctrl-btn ${isWide ? 'active' : ''}`}
            onClick={() => setIsWide(!isWide)}
            title={isWide ? 'Standard width (500px)' : 'Widen window (840px)'}
          >
            <Columns size={15} />
          </button>
          <button
            className={`peer-ctrl-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            title="Configure AI Models & Keys"
          >
            <Settings size={15} />
          </button>
          <button
            className="peer-ctrl-btn"
            onClick={onToggleDockMode}
            title={dockMode === 'floating' ? 'Dock to right sidebar' : 'Float next to equation'}
          >
            <Sidebar size={15} />
          </button>
          <button
            className="peer-ctrl-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
          </button>
          <button
            className="peer-ctrl-btn close-btn"
            onClick={onClose}
            title="Close Study Peer (Esc)"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 2. Minimized Pill View */}
      {isMinimized && (
        <div className="peer-minimized-bar" onClick={() => setIsMinimized(false)}>
          <Sparkles size={14} />
          <span>Study Peer ({activeTab === 'direct' ? `${session.messages.length} msgs` : activeWebPreset.name})</span>
          <span className="click-to-expand">Click to expand</span>
        </div>
      )}

      {/* 3. Expanded Dock Body */}
      {!isMinimized && (
        <div className="peer-dock-body">
          {/* Settings Drawer */}
          {showSettings && (
            <div className="peer-settings-drawer">
              <div className="settings-drawer-header">
                <h5>
                  <Key size={14} /> Configure LLM Brain
                </h5>
                <button className="settings-close" onClick={() => setShowSettings(false)}>
                  <X size={14} />
                </button>
              </div>

              <div className="settings-field-group">
                <label className="settings-label">Provider</label>
                <div className="settings-preset-row">
                  {PROVIDER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      className={`settings-preset-chip ${tempProvider === preset.id ? 'active' : ''}`}
                      onClick={() => {
                        setTempProvider(preset.id);
                        setTempModel(preset.defaultModel);
                        setTempCustomBaseUrl(preset.defaultBaseUrl);
                      }}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Choice for selected provider */}
              <div className="settings-field-group">
                <div className="settings-label-row">
                  <label className="settings-label">Model Identifier</label>
                  <span className="text-muted" style={{ fontSize: '10px' }}>Select preset or type any model</span>
                </div>
                <div className="settings-model-pills">
                  {PROVIDER_PRESETS.find((p) => p.id === tempProvider)?.models.map((m) => (
                    <button
                      key={m.id}
                      className={`model-pill-btn ${tempModel === m.id ? 'active' : ''}`}
                      onClick={() => setTempModel(m.id)}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  className="settings-input"
                  style={{ marginTop: '6px' }}
                  value={tempModel}
                  onChange={(e) => setTempModel(e.target.value)}
                  placeholder="Enter model name (e.g. gemini-2.5-flash, gemini-2.5-pro, or custom)"
                />
              </div>

              {/* API Key Field */}
              {PROVIDER_PRESETS.find((p) => p.id === tempProvider)?.requiresKey && (
                <div className="settings-field-group">
                  <div className="settings-label-row">
                    <label className="settings-label">API Key</label>
                    <a
                      href={PROVIDER_PRESETS.find((p) => p.id === tempProvider)?.keyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="settings-key-link"
                    >
                      Get {tempProvider === 'gemini' ? 'Free Google Key' : 'Key'} ↗
                    </a>
                  </div>
                  <input
                    type="password"
                    className="settings-input"
                    placeholder={PROVIDER_PRESETS.find((p) => p.id === tempProvider)?.keyPlaceholder}
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                  />
                </div>
              )}

              <div className="settings-actions-row">
                <button className="settings-save-btn" onClick={handleSaveSettings}>
                  <Check size={14} />
                  <span>Save & Apply</span>
                </button>
              </div>
            </div>
          )}

          {/* ==========================================================================
              VIEW A: WEB ACCOUNT MODE (Google Gemini, ChatGPT, Claude, DeepSeek)
              ========================================================================== */}
          {activeTab === 'web' && (
            <div className="peer-web-account-stage">
              {/* Web Service Switcher Bar */}
              <div className="web-service-selector-bar">
                <div className="web-service-pills">
                  {WEB_LLM_PRESETS.map((service) => (
                    <button
                      key={service.id}
                      className={`web-service-pill ${selectedWebService === service.id ? 'active' : ''}`}
                      onClick={() => setSelectedWebService(service.id)}
                      style={{
                        borderColor: selectedWebService === service.id ? service.color : undefined
                      }}
                    >
                      <span className="service-dot" style={{ background: service.color }} />
                      <span className="service-name">{service.name}</span>
                    </button>
                  ))}
                </div>

                {/* Quick Clipboard Bridge */}
                <div className="web-toolbar-actions">
                  <button
                    className={`web-copy-snip-btn ${copiedImageToast ? 'copied' : ''}`}
                    onClick={handleCopyImageToClipboard}
                    title="Copy selected image to clipboard so you can paste (Ctrl+V) directly into Gemini / ChatGPT"
                  >
                    {copiedImageToast ? <Check size={13} /> : <ClipboardCopy size={13} />}
                    <span>{copiedImageToast ? 'Image Copied! Paste (Ctrl+V)' : 'Copy Snip (Ctrl+V)'}</span>
                  </button>

                  {session.nearbyText && (
                    <button
                      className="web-aux-btn"
                      onClick={handleCopyContextToClipboard}
                      title="Copy extracted context & question to clipboard"
                    >
                      {copiedId === 'context-copied' ? <Check size={13} /> : <Copy size={13} />}
                      <span>Copy Context</span>
                    </button>
                  )}

                  <button className="web-nav-btn" onClick={handleWebBack} title="Back">
                    <ArrowLeft size={13} />
                  </button>
                  <button className="web-nav-btn" onClick={handleWebForward} title="Forward">
                    <ArrowRight size={13} />
                  </button>
                  <button className="web-nav-btn" onClick={handleWebReload} title="Reload page">
                    <RotateCw size={13} />
                  </button>
                  <button className="web-nav-btn" onClick={handleOpenExternal} title="Open in default browser">
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>

              {/* Embedded Webview Container with persistent Google login */}
              <div className="peer-webview-wrapper">
                <webview
                  ref={webviewRef}
                  src={targetWebUrl}
                  partition="persist:study_peer"
                  useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
                  allowpopups={true}
                  className="study-peer-webview"
                />
              </div>

              {/* Bottom Instructions / Helper Bar */}
              <div className="web-account-footer-bar">
                <div className="web-footer-hint">
                  <Sparkles size={13} className="text-accent" />
                  <span>
                    Logged into your <strong>{activeWebPreset.name}</strong> account! Click <strong>"Copy Snip"</strong> above, then simply press <strong>Ctrl+V</strong> in the chat to paste your equation or diagram.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================================================
              VIEW B: DIRECT AI CHAT MODE (Instant KaTeX Math Streaming)
              ========================================================================== */}
          {activeTab === 'direct' && (
            <>
              {/* Key Setup Callout if key is missing */}
              {!hasKey && (
                <div className="peer-key-onboarding-card">
                  <div className="onboarding-icon">
                    <Sparkles size={20} />
                  </div>
                  <div className="onboarding-content">
                    <h4>Talk to {activeProviderPreset.name} Directly</h4>
                    <p>
                      Get lightning-fast math streaming, KaTeX formulas, and 1-click export to your notes.
                      {activeProviderPreset.id === 'gemini' && (
                        <> Google provides free API keys with your regular Google account.</>
                      )}
                    </p>
                    <div className="onboarding-input-row">
                      <input
                        type="password"
                        className="onboarding-input"
                        placeholder={activeProviderPreset.keyPlaceholder}
                        value={inlineKeyInput}
                        onChange={(e) => setInlineKeyInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveInlineKey()}
                      />
                      <button
                        className="onboarding-connect-btn"
                        onClick={handleSaveInlineKey}
                        disabled={!inlineKeyInput.trim()}
                      >
                        Connect
                      </button>
                    </div>
                    <div className="onboarding-footer-links">
                      <a
                        href={activeProviderPreset.keyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="onboarding-link"
                      >
                        Get Free Key at {activeProviderPreset.name} ↗
                      </a>
                      <span className="dot-divider">•</span>
                      <button
                        className="onboarding-switch-btn"
                        onClick={() => {
                          setActiveTab('web');
                          setIsWide(true);
                        }}
                      >
                        Or chat via your Google Account without an API key →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Snip Preview & Text Context Strip */}
              <div className="snip-crop-preview-strip">
                <div className="crop-thumbnail-card" title="Visual slice sent to peer model">
                  <img
                    src={session.imageDataUrl}
                    alt="Selected mathematical region"
                    className="crop-thumb-img"
                  />
                  <span className="crop-thumb-badge">Inspected Region</span>
                </div>

                <div className="crop-context-info">
                  <div className="context-tokens-row">
                    <FileText size={13} className="text-muted" />
                    <span className="context-label">
                      {session.nearbyText
                        ? `${session.nearbyText.split(/\s+/).filter(Boolean).length} nearby text tokens`
                        : 'Visual diagram inspection'}
                    </span>
                    {session.nearbyText && (
                      <button
                        className="toggle-context-btn"
                        onClick={() => setShowContextPreview(!showContextPreview)}
                      >
                        {showContextPreview ? 'Hide context' : 'View context'}
                      </button>
                    )}
                  </div>

                  {showContextPreview && session.nearbyText && (
                    <div className="extracted-context-box">
                      <pre>{session.nearbyText}</pre>
                    </div>
                  )}
                </div>

                {/* Quick Model Selector Chip */}
                <div className="header-model-chip" onClick={() => setShowSettings(true)} title="Change model">
                  <span>{aiConfig.model}</span>
                </div>
              </div>

              {/* Chat Messages Stream */}
              <div ref={chatScrollRef} className="peer-chat-messages-stage">
                {session.messages.length === 0 && (
                  <div className="peer-empty-state">
                    <div className="peer-empty-icon-wrap">
                      <Bot size={28} />
                    </div>
                    <h3>Ask anything about this region</h3>
                    <p>
                      Your peer is looking at the selected slice and nearby text.
                      Ask why a term cancels, request physical intuition, or derive the next step!
                    </p>

                    {/* Quick Prompts */}
                    <div className="quick-prompts-grid">
                      {QUICK_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          className="quick-prompt-chip"
                          onClick={() => handleQuickPromptClick(prompt)}
                        >
                          <Sparkles size={12} />
                          <span>{prompt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {session.messages.map((msg) => (
                  <div key={msg.id} className={`peer-bubble-row ${msg.role}`}>
                    {msg.role === 'user' ? (
                      <div className="peer-user-bubble">
                        <p>{msg.content}</p>
                      </div>
                    ) : (
                      <div className="peer-assistant-bubble">
                        <div className="peer-bubble-header">
                          <span className="bubble-speaker">
                            {activeProviderPreset.name} ({aiConfig.model})
                          </span>
                          <div className="bubble-actions">
                            <button
                              className="bubble-action-btn"
                              onClick={() => handleCopyAnswer(msg.id, msg.content)}
                              title="Copy explanation and LaTeX"
                            >
                              {copiedId === msg.id ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                            {onInsertLatexToNotes && (
                              <button
                                className="bubble-action-btn"
                                onClick={() => onInsertLatexToNotes(msg.content)}
                                title="Insert into current page notes"
                              >
                                <PlusCircle size={13} />
                                <span>Add to Page</span>
                              </button>
                            )}
                            {onSendToScratchpad && (
                              <button
                                className="bubble-action-btn"
                                onClick={() => onSendToScratchpad(session.imageDataUrl, msg.content)}
                                title="Create new scratchpad page with snip and derivation"
                              >
                                <Sparkles size={13} />
                                <span>New Scratchpad</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="peer-bubble-content">
                          <MathMarkdownRenderer content={msg.content} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isStreaming && (
                  <div className="peer-streaming-status-row">
                    <span className="streaming-dots">
                      {activeProviderPreset.name} is streaming derivation
                    </span>
                    <button className="stop-streaming-btn" onClick={onStopStreaming}>
                      <Square size={11} fill="currentColor" />
                      <span>Stop</span>
                    </button>
                  </div>
                )}

                {session.status === 'error' && (
                  <div className="peer-error-banner">
                    <HelpCircle size={16} />
                    <div className="error-text-wrap">
                      <span>{session.error || 'Failed to receive response from model.'}</span>
                      {!hasKey && (
                        <button
                          className="error-action-btn"
                          onClick={() => {
                            setActiveTab('web');
                            setIsWide(true);
                          }}
                        >
                          Switch to Web Account →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Prompts when in conversation */}
              {session.messages.length > 0 && !isStreaming && (
                <div className="followup-quick-chips">
                  <button
                    className="followup-chip"
                    onClick={() => handleQuickPromptClick('Can you show the next step of derivation?')}
                  >
                    Next derivation step
                  </button>
                  <button
                    className="followup-chip"
                    onClick={() => handleQuickPromptClick('What are the units and dimensions?')}
                  >
                    Units & Dimensions
                  </button>
                  <button
                    className="followup-chip"
                    onClick={() => handleQuickPromptClick('Provide a numerical example')}
                  >
                    Numerical example
                  </button>
                </div>
              )}

              {/* Input Bar */}
              <div className="peer-input-bar">
                <textarea
                  ref={textareaRef}
                  rows={2}
                  className="peer-input-textarea"
                  placeholder="Ask your peer about this equation or diagram... (Enter to send)"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                />

                <button
                  className="peer-send-btn"
                  disabled={!inputText.trim() || isStreaming}
                  onClick={handleSend}
                  title="Send to peer (Enter)"
                >
                  {isStreaming ? (
                    <div className="peer-spinner" />
                  ) : (
                    <Send size={16} className="send-icon" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  );
};

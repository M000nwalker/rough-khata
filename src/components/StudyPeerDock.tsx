import React, { useState, useRef, useEffect } from 'react';
import type { AiConfig, PeerSession } from '../types';
import { MathMarkdownRenderer } from './MathMarkdownRenderer';
import { getStoredAiConfig, saveAiConfig } from '../utils/aiPeerClient';
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
  Bot
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
  const [inputText, setInputText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showContextPreview, setShowContextPreview] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Settings State
  const [aiConfig, setAiConfig] = useState<AiConfig>(getStoredAiConfig);
  const [tempApiKey, setTempApiKey] = useState(aiConfig.apiKey);
  const [tempProvider, setTempProvider] = useState(aiConfig.provider);
  const [tempModel, setTempModel] = useState(aiConfig.model);

  // Draggable offset for floating mode
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHeaderDragging, setIsHeaderDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; initialOffsetX: number; initialOffsetY: number } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-focus input on open or when session changes
  useEffect(() => {
    if (session) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 80);
    }
  }, [session?.id]);

  // Auto-scroll chat stream
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [session?.messages, session?.status]);

  if (!session) return null;

  // Position calculation for anchored floating popover
  const popoverWidth = 460;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  let leftPos = 40;
  let topPos = 80;

  if (anchor && dockMode === 'floating') {
    // Try placing to the right of the selection box
    const preferredLeft = anchor.x + anchor.width + 18;
    if (preferredLeft + popoverWidth < viewportW - 24) {
      leftPos = preferredLeft;
    } else {
      // Try placing to the left of the selection box
      const leftAlt = anchor.x - popoverWidth - 18;
      if (leftAlt > 24) {
        leftPos = leftAlt;
      } else {
        // Fallback: place centered or docked right
        leftPos = Math.max(24, viewportW - popoverWidth - 32);
      }
    }

    // Vertical placement aligned with top of snip, clamped within viewport
    topPos = Math.max(70, Math.min(viewportH - 520, anchor.y));
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
    const updated: AiConfig = {
      provider: tempProvider,
      apiKey: tempApiKey.trim(),
      model: tempModel.trim() || (tempProvider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini')
    };
    saveAiConfig(updated);
    setAiConfig(updated);
    setShowSettings(false);
  };

  const handleCopyAnswer = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isStreaming = session.status === 'streaming';

  return (
    <aside
      className={`study-peer-dock-container ${dockMode} ${isMinimized ? 'minimized' : ''}`}
      style={
        dockMode === 'floating'
          ? {
              left: `${leftPos + dragOffset.x}px`,
              top: `${topPos + dragOffset.y}px`,
              width: `${popoverWidth}px`
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
              {aiConfig.apiKey ? aiConfig.model || 'Gemini 2.5 Flash' : 'Demo Mode (Add Key)'}
            </span>
          </div>
        </div>

        <div className="peer-header-controls" onPointerDown={(e) => e.stopPropagation()}>
          <button
            className={`peer-ctrl-btn ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
            title="AI Model & Key Settings"
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
          <span>Study Peer answering ({session.messages.length} messages)</span>
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
                  <Key size={14} /> AI Model Configuration
                </h5>
                <button className="settings-close" onClick={() => setShowSettings(false)}>
                  <X size={14} />
                </button>
              </div>

              <div className="settings-field-group">
                <label className="settings-label">Provider</label>
                <div className="settings-radio-row">
                  <button
                    className={`settings-radio-btn ${tempProvider === 'gemini' ? 'active' : ''}`}
                    onClick={() => {
                      setTempProvider('gemini');
                      setTempModel('gemini-2.5-flash');
                    }}
                  >
                    Google Gemini (Recommended)
                  </button>
                  <button
                    className={`settings-radio-btn ${
                      tempProvider === 'openai-compatible' ? 'active' : ''
                    }`}
                    onClick={() => {
                      setTempProvider('openai-compatible');
                      setTempModel('gpt-4o-mini');
                    }}
                  >
                    OpenAI / OpenRouter
                  </button>
                </div>
              </div>

              <div className="settings-field-group">
                <label className="settings-label">API Key</label>
                <input
                  type="password"
                  className="settings-input"
                  placeholder={
                    tempProvider === 'gemini'
                      ? 'AIzaSy... (free at aistudio.google.com)'
                      : 'sk-... (OpenAI / OpenRouter key)'
                  }
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                />
              </div>

              <div className="settings-field-group">
                <label className="settings-label">Model Identifier</label>
                <input
                  type="text"
                  className="settings-input"
                  value={tempModel}
                  onChange={(e) => setTempModel(e.target.value)}
                  placeholder={
                    tempProvider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini'
                  }
                />
              </div>

              <div className="settings-actions-row">
                <button className="settings-save-btn" onClick={handleSaveSettings}>
                  <Check size={14} />
                  <span>Save Configuration</span>
                </button>
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
                  Your engineering peer is looking at the selected slice and nearby text.
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
                      <span className="bubble-speaker">Engineering Peer</span>
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
                <span className="streaming-dots">Peer is writing derivation</span>
                <button className="stop-streaming-btn" onClick={onStopStreaming}>
                  <Square size={11} fill="currentColor" />
                  <span>Stop</span>
                </button>
              </div>
            )}

            {session.status === 'error' && (
              <div className="peer-error-banner">
                <HelpCircle size={16} />
                <span>{session.error || 'Failed to receive response from model.'}</span>
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
        </div>
      )}
    </aside>
  );
};

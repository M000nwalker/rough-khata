import React, { useState, useEffect, useRef } from 'react';
import { STEM_SYMBOLS, renderLatexToHtml } from '../utils/mathHelper';
import { X, Check, Calculator, Sparkles, Type } from 'lucide-react';

interface MathModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (data: { content: string; isLatex: boolean; fontSize: number; color: string; bgColor?: string }) => void;
  initialLatex?: string;
  initialColor?: string;
}

export const MathModal: React.FC<MathModalProps> = ({
  isOpen,
  onClose,
  onInsert,
  initialLatex = '\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}',
  initialColor = '#3b82f6'
}) => {
  const [isLatexMode, setIsLatexMode] = useState<boolean>(true);
  const [content, setContent] = useState<string>(initialLatex);
  const [fontSize, setFontSize] = useState<number>(24);
  const [color, setColor] = useState<string>(initialColor);
  const [bgColor, setBgColor] = useState<string>('transparent');
  const [activeTab, setActiveTab] = useState<number>(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setContent(initialLatex);
      setColor(initialColor);
    }
  }, [isOpen, initialLatex, initialColor]);

  if (!isOpen) return null;

  const insertSymbol = (latexCode: string) => {
    if (!textareaRef.current) {
      setContent((prev) => prev + latexCode);
      return;
    }

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.substring(0, start) + latexCode + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + latexCode.length, start + latexCode.length);
    }, 10);
  };

  const handleConfirm = () => {
    if (!content.trim()) return;
    onInsert({
      content: content.trim(),
      isLatex: isLatexMode,
      fontSize,
      color,
      bgColor: bgColor === 'transparent' ? undefined : bgColor
    });
    onClose();
  };

  const previewHtml = isLatexMode ? renderLatexToHtml(content, true) : content;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="math-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Calculator className="modal-icon" size={20} />
            <h3>Formula & Text</h3>
          </div>
          <button className="icon-btn-ghost" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="mode-toggle-bar">
          <button
            className={`tab-btn ${isLatexMode ? 'active' : ''}`}
            onClick={() => setIsLatexMode(true)}
          >
            <Sparkles size={16} />
            <span>LaTeX Formula</span>
          </button>
          <button
            className={`tab-btn ${!isLatexMode ? 'active' : ''}`}
            onClick={() => setIsLatexMode(false)}
          >
            <Type size={16} />
            <span>Text Note</span>
          </button>
        </div>

        {/* Live Preview Box */}
        <div className="preview-container">
          <div className="preview-label">Live Preview</div>
          <div
            className="preview-canvas"
            style={{
              fontSize: `${fontSize}px`,
              color: color,
              backgroundColor: bgColor === 'transparent' ? '#181920' : bgColor
            }}
          >
            {isLatexMode ? (
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : (
              <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'system-ui, sans-serif' }}>
                {content || 'Start typing notes...'}
              </div>
            )}
          </div>
        </div>

        {/* Text / Formula Input */}
        <div className="input-section">
          <label className="input-label">
            {isLatexMode ? 'LaTeX Expression:' : 'Text Content:'}
          </label>
          <textarea
            ref={textareaRef}
            className="math-textarea"
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isLatexMode ? 'e.g. \\frac{dy}{dx} = \\sin(x)' : 'Type your clean notes here...'}
          />
        </div>

        {/* Symbol Quick Palette (only in LaTeX mode) */}
        {isLatexMode && (
          <div className="symbol-palette-wrap">
            <div className="symbol-tabs">
              {STEM_SYMBOLS.map((category, idx) => (
                <button
                  key={category.name}
                  className={`symbol-tab ${activeTab === idx ? 'active' : ''}`}
                  onClick={() => setActiveTab(idx)}
                >
                  {category.name}
                </button>
              ))}
            </div>

            <div className="symbol-grid">
              {STEM_SYMBOLS[activeTab].items.map((item, idx) => (
                <button
                  key={idx}
                  className="symbol-chip"
                  title={item.tooltip}
                  onClick={() => insertSymbol(item.latex)}
                >
                  <span className="symbol-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Style Controls (Size, Colors) */}
        <div className="style-controls-row">
          <div className="control-group">
            <label>Font Size ({fontSize}px):</label>
            <input
              type="range"
              min="14"
              max="54"
              step="2"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
            />
          </div>

          <div className="control-group">
            <label>Color:</label>
            <div className="color-swatches">
              {['#ffffff', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#000000'].map((c) => (
                <button
                  key={c}
                  className={`color-dot ${color === c ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
              <input
                type="color"
                className="color-picker-input"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                title="Custom color"
              />
            </div>
          </div>

          <div className="control-group">
            <label>Background Box:</label>
            <select
              className="custom-select"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
            >
              <option value="transparent">Transparent</option>
              <option value="rgba(0, 0, 0, 0.7)">Dark Tint</option>
              <option value="rgba(255, 255, 255, 0.85)">White Tint</option>
              <option value="rgba(254, 240, 138, 0.4)">Yellow Note</option>
              <option value="rgba(191, 219, 254, 0.4)">Blue Note</option>
            </select>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleConfirm}>
            <Check size={18} />
            <span>Insert</span>
          </button>
        </div>
      </div>
    </div>
  );
};

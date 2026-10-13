import React, { useState } from 'react';
import type { ToolType } from '../types';
import {
  Pen,
  Highlighter,
  Eraser,
  Square,
  Circle,
  Minus,
  ArrowRight,
  MoveHorizontal,
  Triangle,
  Grid,
  Calculator,
  Flame,
  Crop,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  FolderOpen,
  FilePlus,
  ChevronDown,
  Trash2
} from 'lucide-react';

interface ToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  primaryColor: string;
  onSelectColor: (color: string) => void;
  strokeWidth: number;
  onSelectWidth: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onOpenPdf: () => void;
  onNewNotebook: () => void;
  onExportPdf: () => void;
  onOpenMathModal: () => void;
  onClearSlide: () => void;
  onToggleFullscreen: () => void;
}

const COLOR_PRESETS = [
  '#ffffff', // Chalk White
  '#38bdf8', // Neon Sky Blue
  '#4ade80', // Electric Green
  '#facc15', // Vivid Yellow
  '#f87171', // Coral Red
  '#c084fc', // Bright Violet
  '#fb923c', // Orange
  '#0f172a'  // Dark Charcoal
];

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onSelectTool,
  primaryColor,
  onSelectColor,
  strokeWidth,
  onSelectWidth,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onOpenPdf,
  onNewNotebook,
  onExportPdf,
  onOpenMathModal,
  onClearSlide,
  onToggleFullscreen
}) => {
  const [shapesDropdownOpen, setShapesDropdownOpen] = useState(false);
  const [eraserDropdownOpen, setEraserDropdownOpen] = useState(false);

  const isShapeActive = [
    'line',
    'arrow',
    'double-arrow',
    'rect',
    'circle',
    'triangle',
    'axes'
  ].includes(activeTool);

  const isEraserActive = ['eraser-stroke', 'eraser-brush'].includes(activeTool);

  return (
    <header className="tuition-top-toolbar">
      {/* 1. Brand & File Operations */}
      <div className="toolbar-section doc-ops">
        <div className="brand-badge">
          <div className="brand-dot" />
          <span className="brand-title">TuitionPad</span>
          <span className="brand-sub">STUDIO</span>
        </div>

        <button className="tool-btn icon-label" onClick={onOpenPdf} title="Open any PDF document">
          <FolderOpen size={16} />
          <span>Open PDF</span>
        </button>

        <button className="tool-btn icon-label" onClick={onNewNotebook} title="Generate blank colored notebook">
          <FilePlus size={16} />
          <span>New Notebook</span>
        </button>

        <button className="tool-btn icon-label highlight-export" onClick={onExportPdf} title="Bake and export to PDF">
          <Download size={16} />
          <span>Export PDF</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* 2. Main Annotation Tools */}
      <div className="toolbar-section tools-group">
        <button
          className={`tool-icon-btn ${activeTool === 'pen' ? 'active' : ''}`}
          onClick={() => onSelectTool('pen')}
          title="Smooth Ink Pen"
        >
          <Pen size={18} />
        </button>

        <button
          className={`tool-icon-btn ${activeTool === 'highlighter' ? 'active' : ''}`}
          onClick={() => onSelectTool('highlighter')}
          title="Text Highlighter (Multiply Blend)"
        >
          <Highlighter size={18} />
        </button>

        {/* Eraser Dropdown */}
        <div className="dropdown-wrapper">
          <button
            className={`tool-icon-btn with-caret ${isEraserActive ? 'active' : ''}`}
            onClick={() => {
              if (!isEraserActive) onSelectTool('eraser-stroke');
              setEraserDropdownOpen(!eraserDropdownOpen);
            }}
            title="Eraser (Click to switch Stroke / Brush)"
          >
            <Eraser size={18} />
            <ChevronDown size={12} className="caret-icon" />
          </button>

          {eraserDropdownOpen && (
            <div className="tool-dropdown-menu" onClick={() => setEraserDropdownOpen(false)}>
              <button
                className={`dropdown-item ${activeTool === 'eraser-stroke' ? 'selected' : ''}`}
                onClick={() => onSelectTool('eraser-stroke')}
              >
                <span>Stroke Eraser</span>
                <small>Erase whole lines on click</small>
              </button>
              <button
                className={`dropdown-item ${activeTool === 'eraser-brush' ? 'selected' : ''}`}
                onClick={() => onSelectTool('eraser-brush')}
              >
                <span>Precision Brush</span>
                <small>Continuous pixel eraser</small>
              </button>
            </div>
          )}
        </div>

        {/* Geometric STEM Shapes Dropdown */}
        <div className="dropdown-wrapper">
          <button
            className={`tool-icon-btn with-caret ${isShapeActive ? 'active' : ''}`}
            onClick={() => setShapesDropdownOpen(!shapesDropdownOpen)}
            title="Geometric STEM Shapes & Coordinate Axes"
          >
            {activeTool === 'axes' ? (
              <Grid size={18} />
            ) : activeTool === 'circle' ? (
              <Circle size={18} />
            ) : activeTool === 'rect' ? (
              <Square size={18} />
            ) : activeTool === 'triangle' ? (
              <Triangle size={18} />
            ) : activeTool === 'arrow' ? (
              <ArrowRight size={18} />
            ) : activeTool === 'double-arrow' ? (
              <MoveHorizontal size={18} />
            ) : (
              <Minus size={18} />
            )}
            <ChevronDown size={12} className="caret-icon" />
          </button>

          {shapesDropdownOpen && (
            <div className="tool-dropdown-menu shapes-menu" onClick={() => setShapesDropdownOpen(false)}>
              <button
                className={`dropdown-item ${activeTool === 'axes' ? 'selected' : ''}`}
                onClick={() => onSelectTool('axes')}
              >
                <Grid size={16} />
                <div className="item-text">
                  <strong>Cartesian Axes (X-Y)</strong>
                  <small>Graph system with tick marks</small>
                </div>
              </button>

              <button
                className={`dropdown-item ${activeTool === 'line' ? 'selected' : ''}`}
                onClick={() => onSelectTool('line')}
              >
                <Minus size={16} />
                <div className="item-text">
                  <strong>Straight Line</strong>
                  <small>Shift for 45°/90° snap</small>
                </div>
              </button>

              <button
                className={`dropdown-item ${activeTool === 'arrow' ? 'selected' : ''}`}
                onClick={() => onSelectTool('arrow')}
              >
                <ArrowRight size={16} />
                <div className="item-text">
                  <strong>Vector Arrow</strong>
                  <small>Directional vector / ray</small>
                </div>
              </button>

              <button
                className={`dropdown-item ${activeTool === 'double-arrow' ? 'selected' : ''}`}
                onClick={() => onSelectTool('double-arrow')}
              >
                <MoveHorizontal size={16} />
                <div className="item-text">
                  <strong>Bidirectional Arrow</strong>
                  <small>Dimension / reaction</small>
                </div>
              </button>

              <button
                className={`dropdown-item ${activeTool === 'rect' ? 'selected' : ''}`}
                onClick={() => onSelectTool('rect')}
              >
                <Square size={16} />
                <div className="item-text">
                  <strong>Rectangle / Box</strong>
                  <small>Answer & formula boxing</small>
                </div>
              </button>

              <button
                className={`dropdown-item ${activeTool === 'circle' ? 'selected' : ''}`}
                onClick={() => onSelectTool('circle')}
              >
                <Circle size={16} />
                <div className="item-text">
                  <strong>Circle / Ellipse</strong>
                  <small>Shift for perfect circle</small>
                </div>
              </button>

              <button
                className={`dropdown-item ${activeTool === 'triangle' ? 'selected' : ''}`}
                onClick={() => onSelectTool('triangle')}
              >
                <Triangle size={16} />
                <div className="item-text">
                  <strong>Triangle</strong>
                  <small>Trigonometry & geometry</small>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Math & Science LaTeX Typing */}
        <button
          className={`tool-icon-btn math-btn ${activeTool === 'latex' ? 'active' : ''}`}
          onClick={onOpenMathModal}
          title="Type Clean LaTeX Math & Science Formula"
        >
          <Calculator size={18} />
          <span className="math-label">LaTeX</span>
        </button>

        {/* Teacher Laser Pointer */}
        <button
          className={`tool-icon-btn laser-btn ${activeTool === 'laser' ? 'active' : ''}`}
          onClick={() => onSelectTool('laser')}
          title="Teacher Laser Pointer (Temporary Glow for Screen Sharing)"
        >
          <Flame size={18} />
          <span className="laser-label">Laser</span>
        </button>

        {/* Snip & Solve Tool */}
        <button
          className={`tool-icon-btn snip-btn ${activeTool === 'snip' ? 'active' : ''}`}
          onClick={() => onSelectTool('snip')}
          title="Snip & Solve: Crop question from PDF -> new scratchpad page"
        >
          <Crop size={18} />
          <span className="snip-label">Snip</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* 3. Color & Stroke Palette */}
      <div className="toolbar-section styling-group">
        <div className="color-palette-bar">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              className={`color-bubble ${primaryColor === color ? 'selected' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onSelectColor(color)}
            />
          ))}
          <input
            type="color"
            className="color-picker-input-toolbar"
            value={primaryColor}
            onChange={(e) => onSelectColor(e.target.value)}
            title="Custom color picker"
          />
        </div>

        <div className="stroke-width-bar">
          {[2, 4, 7, 12].map((w) => (
            <button
              key={w}
              className={`width-bubble ${strokeWidth === w ? 'selected' : ''}`}
              onClick={() => onSelectWidth(w)}
              title={`${w}px line width`}
            >
              <div
                className="width-dot"
                style={{ width: `${Math.max(3, w * 1.5)}px`, height: `${Math.max(3, w * 1.5)}px` }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-divider" />

      {/* 4. History, Zoom & Presentation Actions */}
      <div className="toolbar-section history-view-group">
        <button
          className="tool-icon-btn"
          disabled={!canUndo}
          onClick={onUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={17} />
        </button>

        <button
          className="tool-icon-btn"
          disabled={!canRedo}
          onClick={onRedo}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={17} />
        </button>

        <button
          className="tool-icon-btn"
          onClick={onClearSlide}
          title="Clear all annotations on current slide"
        >
          <Trash2 size={16} />
        </button>

        <div className="zoom-controls">
          <button className="zoom-btn" onClick={onZoomOut} title="Zoom Out">
            <ZoomOut size={15} />
          </button>
          <button className="zoom-label-btn" onClick={onResetZoom} title="Reset Zoom">
            {Math.round(zoom * 100)}%
          </button>
          <button className="zoom-btn" onClick={onZoomIn} title="Zoom In">
            <ZoomIn size={15} />
          </button>
        </div>

        <button
          className="tool-icon-btn"
          onClick={onToggleFullscreen}
          title="Toggle Fullscreen Teaching Mode"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </header>
  );
};

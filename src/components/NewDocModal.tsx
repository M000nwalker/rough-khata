import React, { useState } from 'react';
import type { PaperGrid, PaperPreset } from '../types';
import { FilePlus, X, Check, Grid, Sliders, Palette, Layout } from 'lucide-react';

interface NewDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (config: {
    title: string;
    pageCount: number;
    width: number;
    height: number;
    paperColor: string;
    paperGrid: PaperGrid;
  }) => void;
}

const PRESET_STYLES: PaperPreset[] = [
  { id: 'chalkboard', name: 'Dark Chalkboard', bgColor: '#1a1d24', gridColor: '#30363d', grid: 'grid' },
  { id: 'slate', name: 'Midnight Slate', bgColor: '#0f172a', gridColor: '#1e293b', grid: 'dots' },
  { id: 'graph-white', name: 'Math Quadrille', bgColor: '#ffffff', gridColor: '#e2e8f0', grid: 'grid' },
  { id: 'sepia', name: 'Warm Sepia', bgColor: '#fbf6ea', gridColor: '#e8dec5', grid: 'lines' },
  { id: 'mint', name: 'Eye-Care Mint', bgColor: '#f0fdf4', gridColor: '#dcfce7', grid: 'grid' },
  { id: 'plain-white', name: 'Clean White', bgColor: '#ffffff', gridColor: '#f1f5f9', grid: 'none' }
];

export const NewDocModal: React.FC<NewDocModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle] = useState<string>('STEM Lecture Notes');
  const [pageCount, setPageCount] = useState<number>(5);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | 'a4-portrait' | 'a4-landscape' | 'letter'>('16:9');
  const [paperColor, setPaperColor] = useState<string>('#1a1d24');
  const [paperGrid, setPaperGrid] = useState<PaperGrid>('grid');

  if (!isOpen) return null;

  const handleApplyPreset = (preset: PaperPreset) => {
    setPaperColor(preset.bgColor);
    setPaperGrid(preset.grid);
  };

  const handleCreate = () => {
    let width = 1280;
    let height = 720;

    if (aspectRatio === '16:9') {
      width = 1280;
      height = 720;
    } else if (aspectRatio === 'a4-portrait') {
      width = 794;
      height = 1123;
    } else if (aspectRatio === 'a4-landscape') {
      width = 1123;
      height = 794;
    } else if (aspectRatio === 'letter') {
      width = 816;
      height = 1056;
    }

    onCreate({
      title: title.trim() || 'Untitled Lecture',
      pageCount,
      width,
      height,
      paperColor,
      paperGrid
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="new-doc-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <FilePlus className="modal-icon" size={22} />
            <h3>Create New Blank Notebook</h3>
          </div>
          <button className="icon-btn-ghost" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body-scroll">
          {/* Document Title */}
          <div className="input-group">
            <label className="input-label">Notebook Title</label>
            <input
              type="text"
              className="text-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Physics Mechanics Chapter 4"
            />
          </div>

          {/* Quick Presets */}
          <div className="input-group">
            <label className="input-label">
              <Palette size={16} />
              <span>Teaching Paper Presets</span>
            </label>
            <div className="presets-grid">
              {PRESET_STYLES.map((preset) => (
                <button
                  key={preset.id}
                  className={`preset-card ${paperColor === preset.bgColor && paperGrid === preset.grid ? 'selected' : ''}`}
                  onClick={() => handleApplyPreset(preset)}
                >
                  <div
                    className="preset-preview"
                    style={{ backgroundColor: preset.bgColor }}
                  >
                    <span className="preset-grid-indicator">{preset.grid.toUpperCase()}</span>
                  </div>
                  <span className="preset-name">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Canvas Ratio / Dimensions */}
          <div className="input-group">
            <label className="input-label">
              <Layout size={16} />
              <span>Page Format</span>
            </label>
            <div className="ratio-selector">
              <button
                className={`ratio-btn ${aspectRatio === '16:9' ? 'active' : ''}`}
                onClick={() => setAspectRatio('16:9')}
              >
                <strong>16:9 Screen Share</strong>
                <span>1280 × 720 (Best for Zoom/Meet)</span>
              </button>
              <button
                className={`ratio-btn ${aspectRatio === 'a4-portrait' ? 'active' : ''}`}
                onClick={() => setAspectRatio('a4-portrait')}
              >
                <strong>A4 Portrait</strong>
                <span>794 × 1123 (Standard Print)</span>
              </button>
              <button
                className={`ratio-btn ${aspectRatio === 'a4-landscape' ? 'active' : ''}`}
                onClick={() => setAspectRatio('a4-landscape')}
              >
                <strong>A4 Landscape</strong>
                <span>1123 × 794 (Wide Note)</span>
              </button>
              <button
                className={`ratio-btn ${aspectRatio === 'letter' ? 'active' : ''}`}
                onClick={() => setAspectRatio('letter')}
              >
                <strong>US Letter</strong>
                <span>816 × 1056</span>
              </button>
            </div>
          </div>

          {/* Custom Color & Grid Fine-Tuning */}
          <div className="two-col-row">
            <div className="input-group">
              <label className="input-label">
                <Grid size={16} />
                <span>Grid Pattern</span>
              </label>
              <select
                className="custom-select"
                value={paperGrid}
                onChange={(e) => setPaperGrid(e.target.value as PaperGrid)}
              >
                <option value="none">Plain (No Grid)</option>
                <option value="grid">Math Graph (Quadrille)</option>
                <option value="dots">Dotted Bullet Grid</option>
                <option value="lines">Lined Ruled Paper</option>
                <option value="isometric">Isometric 3D Grid</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">
                <Sliders size={16} />
                <span>Custom Paper Color</span>
              </label>
              <div className="color-input-wrap">
                <input
                  type="color"
                  className="color-picker-input-large"
                  value={paperColor}
                  onChange={(e) => setPaperColor(e.target.value)}
                />
                <span className="color-hex-tag">{paperColor.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Initial Page Count */}
          <div className="input-group">
            <label className="input-label">Starting Pages ({pageCount} pages)</label>
            <input
              type="range"
              min="1"
              max="25"
              step="1"
              value={pageCount}
              onChange={(e) => setPageCount(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleCreate}>
            <Check size={18} />
            <span>Generate Notebook</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import type { PageModel, PaperGrid } from '../types';
import { Plus, Trash2, ArrowUp, ArrowDown, FileText, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface SidebarProps {
  pages: PageModel[];
  currentPageIndex: number;
  isOpen: boolean;
  onToggle: () => void;
  onSelectPage: (index: number) => void;
  onInsertBlankPage: (afterIndex: number, paperColor: string, paperGrid: PaperGrid) => void;
  onDeletePage: (index: number) => void;
  onMovePage: (fromIndex: number, toIndex: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  pages,
  currentPageIndex,
  isOpen,
  onToggle,
  onSelectPage,
  onInsertBlankPage,
  onDeletePage,
  onMovePage
}) => {
  return (
    <aside className={`tuition-sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      <div className="sidebar-header">
        <div className="sidebar-title">
          <FileText size={18} className="sidebar-icon" />
          <span>Pages ({pages.length})</span>
        </div>
        <button
          className="icon-btn-ghost collapse-btn"
          onClick={onToggle}
          title={isOpen ? 'Collapse Thumbnails' : 'Expand Thumbnails'}
        >
          {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {isOpen && (
        <>
          <div className="sidebar-quick-actions">
            <button
              className="quick-insert-btn"
              onClick={() => onInsertBlankPage(currentPageIndex, '#1a1d24', 'grid')}
              title="Insert a dark math grid page right after current page"
            >
              <Plus size={16} />
              <span>+ Add Blank Scratchpad</span>
            </button>
          </div>

          <div className="thumbnails-scroll-list">
            {pages.map((page, idx) => {
              const isSelected = idx === currentPageIndex;

              return (
                <div
                  key={page.id}
                  className={`thumbnail-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectPage(idx)}
                >
                  <div className="thumb-header">
                    <span className="thumb-num">Slide {idx + 1}</span>
                    {page.isCustomPage && (
                      <span className="thumb-badge" title="Blank Scratchpad">
                        <Sparkles size={11} /> Scratch
                      </span>
                    )}

                    <div className="thumb-controls" onClick={(e) => e.stopPropagation()}>
                      {idx > 0 && (
                        <button
                          className="thumb-ctrl-btn"
                          title="Move Up"
                          onClick={() => onMovePage(idx, idx - 1)}
                        >
                          <ArrowUp size={12} />
                        </button>
                      )}
                      {idx < pages.length - 1 && (
                        <button
                          className="thumb-ctrl-btn"
                          title="Move Down"
                          onClick={() => onMovePage(idx, idx + 1)}
                        >
                          <ArrowDown size={12} />
                        </button>
                      )}
                      {pages.length > 1 && (
                        <button
                          className="thumb-ctrl-btn delete"
                          title="Delete Page"
                          onClick={() => onDeletePage(idx)}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Thumbnail Mock Preview */}
                  <div
                    className="thumb-preview-box"
                    style={{
                      backgroundColor: page.isCustomPage ? page.paperColor : '#ffffff',
                      aspectRatio: `${page.width} / ${page.height}`
                    }}
                  >
                    <div className="thumb-inner-pattern">
                      {page.isCustomPage && page.paperGrid !== 'none' && (
                        <span className="thumb-grid-tag">{page.paperGrid}</span>
                      )}
                      {page.annotations.length > 0 && (
                        <span className="thumb-ann-tag">{page.annotations.length} notes</span>
                      )}
                    </div>
                  </div>

                  {/* Quick Insert Between Pages */}
                  <div className="insert-between-row" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="insert-between-btn"
                      title="Insert Blank Scratchpad Page Here"
                      onClick={() => onInsertBlankPage(idx, page.paperColor, page.paperGrid)}
                    >
                      <Plus size={12} />
                      <span>Insert Blank Page Here</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </aside>
  );
};

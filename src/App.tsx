import React, { useState, useEffect, useRef } from 'react';
import type { Annotation, AppMode, PageModel, PaperGrid, ToolType } from './types';
import { createBlankNotebook, insertBlankPage, loadPdfDocument } from './utils/pdfManager';
import { exportToPdf } from './utils/pdfExport';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { PageView } from './components/PageView';
import { InfiniteCanvas } from './components/InfiniteCanvas';
import { MathModal } from './components/MathModal';
import { NewDocModal } from './components/NewDocModal';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  // Mode State (Slides / PDF vs Endless Infinite Khata)
  const [appMode, setAppMode] = useState<AppMode>('slides');

  // Document State
  const [docTitle, setDocTitle] = useState<string>('Rough Khata - STEM Notes');
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfDocProxy, setPdfDocProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PageModel[]>(() => {
    // Initial 4 blank dark graph chalkboard slides
    const initial = createBlankNotebook('Rough Khata Notes', 4, 1280, 720, '#1a1d24', 'grid');
    return initial.pages;
  });
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2); // Start larger for maximum workspace!

  // Infinite Canvas State
  const [infiniteAnnotations, setInfiniteAnnotations] = useState<Annotation[]>([]);
  const [infiniteUndoStack, setInfiniteUndoStack] = useState<Annotation[][]>([]);
  const [infiniteRedoStack, setInfiniteRedoStack] = useState<Annotation[][]>([]);

  // Active Tooling & Styling
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [primaryColor, setPrimaryColor] = useState<string>('#38bdf8'); // Neon Sky Blue
  const [strokeWidth, setStrokeWidth] = useState<number>(3);

  // UI Panels & Modals
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [mathModalOpen, setMathModalOpen] = useState<boolean>(false);
  const [editingLatexInfo, setEditingLatexInfo] = useState<{ id?: string; content?: string; color?: string } | null>(null);
  const [newDocModalOpen, setNewDocModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>('Rough Khata Ready! Maximum working area active.');

  // References
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportScrollRef = useRef<HTMLElement>(null);

  // Notification helper
  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((current) => (current === msg ? null : current));
    }, 3500);
  };

  const currentPage = pages[currentPageIndex] || pages[0];

  // Auto-Fit to Width Handler (Gives maximum working space!)
  const handleFitWidth = () => {
    if (!currentPage || !viewportScrollRef.current) return;
    const stageWidth = viewportScrollRef.current.clientWidth;
    const targetScale = Number(((stageWidth - 48) / currentPage.width).toFixed(2));
    setScale(Math.max(0.4, Math.min(2.5, targetScale)));
    showNotice(`Fitted to full width (${Math.round(targetScale * 100)}%)`);
  };

  // Auto-Fit to Screen Handler
  const handleFitScreen = () => {
    if (!currentPage || !viewportScrollRef.current) return;
    const stageWidth = viewportScrollRef.current.clientWidth;
    const stageHeight = viewportScrollRef.current.clientHeight;
    const scaleW = (stageWidth - 48) / currentPage.width;
    const scaleH = (stageHeight - 80) / currentPage.height;
    const targetScale = Number(Math.min(scaleW, scaleH).toFixed(2));
    setScale(Math.max(0.4, Math.min(2.5, targetScale)));
    showNotice(`Fitted to screen (${Math.round(targetScale * 100)}%)`);
  };

  // Initial Auto-Fit calculation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (viewportScrollRef.current && currentPage) {
        const stageWidth = viewportScrollRef.current.clientWidth;
        const targetScale = Number(((stageWidth - 48) / currentPage.width).toFixed(2));
        if (targetScale > 0.5) {
          setScale(Math.min(2.0, targetScale));
        }
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [sidebarOpen]);

  // 1. Open PDF Handler
  const handleOpenPdf = async () => {
    if (window.electronAPI?.openPdfDialog) {
      try {
        const fileResult = await window.electronAPI.openPdfDialog();
        if (fileResult) {
          await loadPdfFromArrayBuffer(fileResult.data, fileResult.name);
        }
      } catch (err) {
        console.error('Failed to open PDF in Electron:', err);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    await loadPdfFromArrayBuffer(arrayBuffer, file.name);
    e.target.value = '';
  };

  const loadPdfFromArrayBuffer = async (buffer: ArrayBuffer, fileName: string) => {
    try {
      showNotice('Loading PDF document into Rough Khata...');
      const { pdfDoc, pages: loadedPages } = await loadPdfDocument(buffer);
      setPdfData(buffer);
      setPdfDocProxy(pdfDoc);
      setPages(loadedPages);
      setCurrentPageIndex(0);
      setDocTitle(fileName.replace(/\.pdf$/i, ''));
      setAppMode('slides');

      // Auto-fit newly loaded PDF
      setTimeout(() => {
        if (viewportScrollRef.current && loadedPages[0]) {
          const stageWidth = viewportScrollRef.current.clientWidth;
          const targetScale = Number(((stageWidth - 48) / loadedPages[0].width).toFixed(2));
          setScale(Math.max(0.5, Math.min(2.2, targetScale)));
        }
      }, 100);

      showNotice(`Successfully loaded "${fileName}" (${loadedPages.length} pages).`);
    } catch (err) {
      console.error('Error parsing PDF:', err);
      showNotice('Failed to open PDF document. Make sure it is a valid PDF.');
    }
  };

  // Drag and drop PDF directly onto window
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type === 'application/pdf') {
        const buffer = await file.arrayBuffer();
        await loadPdfFromArrayBuffer(buffer, file.name);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  // 2. Create Blank Notebook Handler
  const handleCreateNewNotebook = (config: {
    title: string;
    pageCount: number;
    width: number;
    height: number;
    paperColor: string;
    paperGrid: PaperGrid;
  }) => {
    const { title, pageCount, width, height, paperColor, paperGrid } = config;
    const newBook = createBlankNotebook(title, pageCount, width, height, paperColor, paperGrid);
    setPdfData(null);
    setPdfDocProxy(null);
    setPages(newBook.pages);
    setCurrentPageIndex(0);
    setDocTitle(title);
    setAppMode('slides');
    showNotice(`Created new Rough Khata "${title}" (${pageCount} pages).`);
  };

  // 3. Insert Blank Page Handler
  const handleInsertBlankPage = (afterIndex: number, paperColor: string, paperGrid: PaperGrid) => {
    const curP = pages[afterIndex] || pages[0];
    const width = curP ? curP.width : 1280;
    const height = curP ? curP.height : 720;

    const updated = insertBlankPage(pages, afterIndex, width, height, paperColor, paperGrid);
    setPages(updated);
    setCurrentPageIndex(afterIndex + 1);
    showNotice(`Inserted new blank scratchpad page at Slide ${afterIndex + 2}.`);
  };

  // 4. Extend Page Height Handler (+500px on demand)
  const handleExtendPageHeight = (pageId: string, additionalHeight: number) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id === pageId) {
          return {
            ...p,
            height: p.height + additionalHeight
          };
        }
        return p;
      })
    );
    showNotice(`Extended page height by +${additionalHeight}px! Keep writing!`);
  };

  // 5. Delete Page Handler
  const handleDeletePage = (indexToDelete: number) => {
    if (pages.length <= 1) {
      showNotice('Cannot delete the only page in the document.');
      return;
    }
    const updated = pages.filter((_, idx) => idx !== indexToDelete).map((p, idx) => ({
      ...p,
      pageNumber: idx + 1
    }));
    setPages(updated);
    if (currentPageIndex >= updated.length) {
      setCurrentPageIndex(updated.length - 1);
    }
    showNotice(`Deleted Slide ${indexToDelete + 1}.`);
  };

  // 6. Move Page Handler
  const handleMovePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    const newPages = [...pages];
    const [moved] = newPages.splice(fromIndex, 1);
    newPages.splice(toIndex, 0, moved);
    const reindexed = newPages.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    setPages(reindexed);
    setCurrentPageIndex(toIndex);
  };

  // 7. Update Annotations & Undo/Redo Stacks
  const handleUpdateAnnotations = (pageId: string, newAnnotations: Annotation[]) => {
    setPages((prevPages) =>
      prevPages.map((page) => {
        if (page.id !== pageId) return page;

        const newUndo = [...page.undoStack, page.annotations];
        return {
          ...page,
          annotations: newAnnotations,
          undoStack: newUndo.slice(-35),
          redoStack: []
        };
      })
    );
  };

  // Infinite Canvas Annotation updates
  const handleUpdateInfiniteAnnotations = (newAnns: Annotation[]) => {
    setInfiniteUndoStack((prev) => [...prev, infiniteAnnotations].slice(-35));
    setInfiniteAnnotations(newAnns);
    setInfiniteRedoStack([]);
  };

  const handleUndo = () => {
    if (appMode === 'infinite') {
      if (infiniteUndoStack.length === 0) return;
      const prev = infiniteUndoStack[infiniteUndoStack.length - 1];
      setInfiniteRedoStack((r) => [...r, infiniteAnnotations]);
      setInfiniteUndoStack((u) => u.slice(0, -1));
      setInfiniteAnnotations(prev);
      return;
    }

    if (!currentPage || currentPage.undoStack.length === 0) return;
    const previous = currentPage.undoStack[currentPage.undoStack.length - 1];
    const newUndo = currentPage.undoStack.slice(0, -1);
    const newRedo = [...currentPage.redoStack, currentPage.annotations];

    setPages((prev) =>
      prev.map((p) =>
        p.id === currentPage.id
          ? { ...p, annotations: previous, undoStack: newUndo, redoStack: newRedo }
          : p
      )
    );
  };

  const handleRedo = () => {
    if (appMode === 'infinite') {
      if (infiniteRedoStack.length === 0) return;
      const next = infiniteRedoStack[infiniteRedoStack.length - 1];
      setInfiniteUndoStack((u) => [...u, infiniteAnnotations]);
      setInfiniteRedoStack((r) => r.slice(0, -1));
      setInfiniteAnnotations(next);
      return;
    }

    if (!currentPage || currentPage.redoStack.length === 0) return;
    const next = currentPage.redoStack[currentPage.redoStack.length - 1];
    const newRedo = currentPage.redoStack.slice(0, -1);
    const newUndo = [...currentPage.undoStack, currentPage.annotations];

    setPages((prev) =>
      prev.map((p) =>
        p.id === currentPage.id
          ? { ...p, annotations: next, undoStack: newUndo, redoStack: newRedo }
          : p
      )
    );
  };

  const handleClearSlide = () => {
    if (appMode === 'infinite') {
      if (infiniteAnnotations.length === 0) return;
      handleUpdateInfiniteAnnotations([]);
      showNotice('Cleared Infinite Khata.');
      return;
    }

    if (!currentPage || currentPage.annotations.length === 0) return;
    handleUpdateAnnotations(currentPage.id, []);
    showNotice('Cleared all annotations on current slide.');
  };

  // 8. Math & LaTeX Modal Handlers
  const handleInsertMathOrText = ({
    content,
    isLatex,
    fontSize,
    color,
    bgColor
  }: {
    content: string;
    isLatex: boolean;
    fontSize: number;
    color: string;
    bgColor?: string;
  }) => {
    if (appMode === 'infinite') {
      const newItem: Annotation = {
        id: `math-inf-${Date.now()}`,
        kind: 'text-math',
        isLatex,
        content,
        x: 0,
        y: 0,
        fontSize,
        color,
        bgColor,
        width: isLatex ? 320 : 250,
        height: isLatex ? 90 : 50
      };
      handleUpdateInfiniteAnnotations([...infiniteAnnotations, newItem]);
      showNotice('Equation placed on Infinite Khata. Drag anywhere!');
      return;
    }

    if (!currentPage) return;

    if (editingLatexInfo?.id) {
      const updated = currentPage.annotations.map((ann) => {
        if (ann.id === editingLatexInfo.id && ann.kind === 'text-math') {
          return { ...ann, content, isLatex, fontSize, color, bgColor };
        }
        return ann;
      });
      handleUpdateAnnotations(currentPage.id, updated);
      setEditingLatexInfo(null);
      showNotice('Updated equation.');
      return;
    }

    const x = Math.round(currentPage.width * 0.25);
    const y = Math.round(currentPage.height * 0.35);

    const newItem: Annotation = {
      id: `math-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      kind: 'text-math',
      isLatex,
      content,
      x,
      y,
      fontSize,
      color,
      bgColor,
      width: isLatex ? 320 : 250,
      height: isLatex ? 90 : 50
    };

    handleUpdateAnnotations(currentPage.id, [...currentPage.annotations, newItem]);
    showNotice(isLatex ? 'LaTeX equation placed. Drag to reposition.' : 'Note placed. Drag to reposition.');
  };

  const handleEditLatex = (id: string, content: string, color: string) => {
    setEditingLatexInfo({ id, content, color });
    setMathModalOpen(true);
  };

  // 9. Snip & Solve Handler (Crop problem -> new blank scratchpad page)
  const handleSnipToScratchpad = (croppedDataUrl: string, sourcePageNum: number) => {
    const curWidth = currentPage?.width || 1280;
    const curHeight = currentPage?.height || 720;
    const insertIndex = currentPageIndex;

    const newPageModel: PageModel = {
      id: `scratch-page-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      pageNumber: insertIndex + 2,
      isCustomPage: true,
      width: curWidth,
      height: curHeight,
      paperColor: '#1a1d24', // Dark chalkboard
      paperGrid: 'grid',
      annotations: [
        {
          id: `snip-img-${Date.now()}`,
          kind: 'image',
          dataUrl: croppedDataUrl,
          x: 40,
          y: 40,
          width: Math.min(curWidth - 80, 700),
          height: Math.min(curHeight * 0.45, 300)
        }
      ],
      undoStack: [],
      redoStack: []
    };

    const newPagesList = [...pages];
    newPagesList.splice(insertIndex + 1, 0, newPageModel);

    const reindexed = newPagesList.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    setPages(reindexed);
    setCurrentPageIndex(insertIndex + 1);
    setActiveTool('pen');
    showNotice(`Snipped question from Slide ${sourcePageNum} to fresh scratchpad page!`);
  };

  // 10. Export PDF Handler
  const handleExportPdf = async () => {
    try {
      showNotice('Baking annotations and compiling PDF...');
      const compiledBytes = await exportToPdf(pdfData, pages, docTitle);

      if (window.electronAPI?.saveFileDialog) {
        const result = await window.electronAPI.saveFileDialog({
          defaultName: `${docTitle}_Annotated.pdf`,
          buffer: compiledBytes,
          filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
        });
        if (result && result.success) {
          showNotice(`PDF successfully saved to: ${result.filePath}`);
        }
      } else {
        const blob = new Blob([compiledBytes as any], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${docTitle}_Annotated.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotice('Downloaded annotated PDF successfully.');
      }
    } catch (err) {
      console.error('PDF export error:', err);
      showNotice('Failed to export PDF. Check console for details.');
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === '[' && appMode === 'slides') {
        setCurrentPageIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === ']' && appMode === 'slides') {
        setCurrentPageIndex((prev) => Math.min(pages.length - 1, prev + 1));
      } else if (e.key === '+' || e.key === '=') {
        setScale((s) => Math.min(2.5, Number((s + 0.15).toFixed(2))));
      } else if (e.key === '-') {
        setScale((s) => Math.max(0.4, Number((s - 0.15).toFixed(2))));
      } else if (e.key.toLowerCase() === 'p') {
        setActiveTool('pen');
      } else if (e.key.toLowerCase() === 'h') {
        setActiveTool('highlighter');
      } else if (e.key.toLowerCase() === 'e') {
        setActiveTool('eraser-stroke');
      } else if (e.key.toLowerCase() === 'l') {
        setActiveTool('laser');
      } else if (e.key.toLowerCase() === 'm') {
        setMathModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const canUndo = appMode === 'infinite' ? infiniteUndoStack.length > 0 : (currentPage ? currentPage.undoStack.length > 0 : false);
  const canRedo = appMode === 'infinite' ? infiniteRedoStack.length > 0 : (currentPage ? currentPage.redoStack.length > 0 : false);

  return (
    <div className="tuition-studio-container">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Top Application Toolbar */}
      <Toolbar
        appMode={appMode}
        onToggleMode={setAppMode}
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        primaryColor={primaryColor}
        onSelectColor={setPrimaryColor}
        strokeWidth={strokeWidth}
        onSelectWidth={setStrokeWidth}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        zoom={scale}
        onZoomIn={() => setScale((s) => Math.min(2.5, Number((s + 0.15).toFixed(2))))}
        onZoomOut={() => setScale((s) => Math.max(0.4, Number((s - 0.15).toFixed(2))))}
        onResetZoom={() => setScale(1.0)}
        onFitWidth={handleFitWidth}
        onFitScreen={handleFitScreen}
        onOpenPdf={handleOpenPdf}
        onNewNotebook={() => setNewDocModalOpen(true)}
        onExportPdf={handleExportPdf}
        onOpenMathModal={() => {
          setEditingLatexInfo(null);
          setMathModalOpen(true);
        }}
        onClearSlide={handleClearSlide}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Main Workspace Layout */}
      <div className="workspace-main-area">
        {/* Slide Navigator Sidebar (only in slides mode) */}
        {appMode === 'slides' && (
          <Sidebar
            pages={pages}
            currentPageIndex={currentPageIndex}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            onSelectPage={setCurrentPageIndex}
            onInsertBlankPage={handleInsertBlankPage}
            onDeletePage={handleDeletePage}
            onMovePage={handleMovePage}
          />
        )}

        {/* Viewport Area */}
        {appMode === 'slides' ? (
          <main ref={viewportScrollRef} className="viewport-scroll-stage">
            <div className="canvas-centering-box">
              {currentPage && (
                <PageView
                  page={currentPage}
                  pdfDoc={pdfDocProxy}
                  scale={scale}
                  activeTool={activeTool}
                  primaryColor={primaryColor}
                  strokeWidth={strokeWidth}
                  onUpdateAnnotations={handleUpdateAnnotations}
                  onSnipToScratchpad={handleSnipToScratchpad}
                  onEditLatex={handleEditLatex}
                  onExtendPageHeight={handleExtendPageHeight}
                />
              )}
            </div>

            {/* Floating Slide Navigation Pill */}
            <div className="floating-nav-pill">
              <button
                className="nav-arrow-btn"
                disabled={currentPageIndex === 0}
                onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
                title="Previous Slide ([)"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="nav-slide-counter">
                {currentPageIndex + 1} / {pages.length}
              </span>
              <button
                className="nav-arrow-btn"
                disabled={currentPageIndex === pages.length - 1}
                onClick={() => setCurrentPageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                title="Next Slide (])"
              >
                <ChevronRight size={18} />
              </button>

              <button
                className="quick-scratch-pill-btn"
                onClick={() => handleInsertBlankPage(currentPageIndex, '#1a1d24', 'grid')}
                title="Add a blank scratchpad right here"
              >
                <Sparkles size={14} />
                <span>+ Scratchpad</span>
              </button>
            </div>
          </main>
        ) : (
          /* Endless Infinite Canvas */
          <main className="viewport-infinite-stage">
            <InfiniteCanvas
              activeTool={activeTool}
              primaryColor={primaryColor}
              strokeWidth={strokeWidth}
              annotations={infiniteAnnotations}
              onUpdateAnnotations={handleUpdateInfiniteAnnotations}
              onEditLatex={handleEditLatex}
            />
          </main>
        )}
      </div>

      {/* Modals */}
      <MathModal
        isOpen={mathModalOpen}
        onClose={() => {
          setMathModalOpen(false);
          setEditingLatexInfo(null);
        }}
        onInsert={handleInsertMathOrText}
        initialLatex={editingLatexInfo?.content || '\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}'}
        initialColor={editingLatexInfo?.color || primaryColor}
      />

      <NewDocModal
        isOpen={newDocModalOpen}
        onClose={() => setNewDocModalOpen(false)}
        onCreate={handleCreateNewNotebook}
      />

      {/* Toast Notification Banner */}
      {notification && (
        <div className="tuition-toast-banner">
          <span>{notification}</span>
        </div>
      )}
    </div>
  );
};

export default App;

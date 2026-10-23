import React, { useState, useEffect, useRef } from 'react';
import type { Annotation, AppMode, PageModel, PaperGrid, PeerMessage, PeerSession, SnipRegion, ToolType } from './types';
import { createBlankNotebook, insertBlankPage, loadPdfDocument } from './utils/pdfManager';
import { exportToPdf } from './utils/pdfExport';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { PageView } from './components/PageView';
import { InfiniteCanvas } from './components/InfiniteCanvas';
import { MathModal } from './components/MathModal';
import { NewDocModal } from './components/NewDocModal';
import { StudyPeerDock } from './components/StudyPeerDock';
import { getStoredAiConfig, saveAiConfig, streamPeerExplanation } from './utils/aiPeerClient';
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
  const [notification, setNotification] = useState<string | null>(null);

  // Study Peer AI State
  const [peerSession, setPeerSession] = useState<PeerSession | null>(null);
  const [peerAnchor, setPeerAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [peerDockMode, setPeerDockMode] = useState<'floating' | 'sidebar'>('floating');
  const peerAbortControllerRef = useRef<AbortController | null>(null);

  // Detect environment API keys from Electron
  useEffect(() => {
    if (window.electronAPI?.getEnvKeys) {
      window.electronAPI.getEnvKeys().then((keys) => {
        const stored = getStoredAiConfig();
        if (!stored.apiKey && keys?.geminiKey) {
          saveAiConfig({ ...stored, apiKey: keys.geminiKey, provider: 'gemini' });
        }
      });
    }
  }, []);

  // References
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportScrollRef = useRef<HTMLElement>(null);

  // Notification helper
  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((current) => (current === msg ? null : current));
    }, 2500);
  };

  const currentPage = pages[currentPageIndex] || pages[0];

  // Auto-Fit to Width Handler
  const handleFitWidth = () => {
    if (!currentPage || !viewportScrollRef.current) return;
    const stageWidth = viewportScrollRef.current.clientWidth;
    const targetScale = Number(((stageWidth - 48) / currentPage.width).toFixed(2));
    setScale(Math.max(0.4, Math.min(2.5, targetScale)));
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
      showNotice('Opening PDF...');
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

      showNotice('PDF loaded.');
    } catch (err) {
      console.error('Error parsing PDF:', err);
      showNotice('Error opening PDF.');
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
    showNotice('Document created.');
  };

  // 3. Insert Blank Page Handler
  const handleInsertBlankPage = (afterIndex: number, paperColor: string, paperGrid: PaperGrid) => {
    const curP = pages[afterIndex] || pages[0];
    const width = curP ? curP.width : 1280;
    const height = curP ? curP.height : 720;

    const updated = insertBlankPage(pages, afterIndex, width, height, paperColor, paperGrid);
    setPages(updated);
    setCurrentPageIndex(afterIndex + 1);
    showNotice('Page added.');
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
    showNotice('Page height extended.');
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
    showNotice('Page deleted.');
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
      showNotice('Cleared.');
      return;
    }

    if (!currentPage || currentPage.annotations.length === 0) return;
    handleUpdateAnnotations(currentPage.id, []);
    showNotice('Annotations cleared.');
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
      showNotice('Formula placed.');
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
      showNotice('Formula updated.');
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
    showNotice(isLatex ? 'Formula placed.' : 'Note placed.');
  };

  const handleEditLatex = (id: string, content: string, color: string) => {
    setEditingLatexInfo({ id, content, color });
    setMathModalOpen(true);
  };

  // 9. Snip & Solve Handler (Crop problem -> new blank scratchpad page)
  const handleSnipToScratchpad = (croppedDataUrl: string, _sourcePageNum: number) => {
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
    showNotice('Selection placed on new page.');
  };

  // 10. Study Peer Handlers
  const handleAskPeerSnip = (
    box: SnipRegion,
    screenAnchor: { x: number; y: number; width: number; height: number },
    imageDataUrl: string,
    nearbyText: string
  ) => {
    if (peerAbortControllerRef.current) {
      peerAbortControllerRef.current.abort();
      peerAbortControllerRef.current = null;
    }

    setPeerAnchor(screenAnchor);
    setPeerSession({
      id: `peer-${Date.now()}`,
      pageIndex: currentPageIndex,
      box,
      imageDataUrl,
      nearbyText,
      messages: [],
      status: 'idle'
    });

    if (activeTool === 'ask-peer') {
      setActiveTool('pen');
    }
  };

  const handleCancelPeerSnip = () => {
    if (peerAbortControllerRef.current) {
      peerAbortControllerRef.current.abort();
      peerAbortControllerRef.current = null;
    }
    setPeerSession(null);
    setPeerAnchor(null);
  };

  const handleSubmitPeerQuestion = async (userQuestion: string) => {
    if (!peerSession) return;

    const userMsg: PeerMessage = {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      content: userQuestion,
      timestamp: Date.now()
    };

    const asstMsgId = `msg-a-${Date.now()}`;
    const asstMsg: PeerMessage = {
      id: asstMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    };

    const updatedHistory = [...peerSession.messages, userMsg];

    setPeerSession((prev) =>
      prev
        ? {
            ...prev,
            messages: [...updatedHistory, asstMsg],
            status: 'streaming',
            error: undefined
          }
        : null
    );

    const controller = new AbortController();
    peerAbortControllerRef.current = controller;

    try {
      const config = getStoredAiConfig();
      await streamPeerExplanation({
        imageDataUrl: peerSession.imageDataUrl,
        nearbyText: peerSession.nearbyText,
        userQuestion,
        history: updatedHistory,
        config,
        signal: controller.signal,
        onChunk: (chunk) => {
          setPeerSession((current) => {
            if (!current) return null;
            const msgs = current.messages.map((m) =>
              m.id === asstMsgId ? { ...m, content: m.content + chunk } : m
            );
            return { ...current, messages: msgs };
          });
        }
      });

      setPeerSession((prev) => (prev ? { ...prev, status: 'idle' } : null));
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setPeerSession((prev) => (prev ? { ...prev, status: 'idle' } : null));
      } else {
        console.error('Peer streaming error:', err);
        setPeerSession((prev) =>
          prev ? { ...prev, status: 'error', error: err.message || 'Stream failed' } : null
        );
      }
    } finally {
      peerAbortControllerRef.current = null;
    }
  };

  const handleStopPeerStreaming = () => {
    if (peerAbortControllerRef.current) {
      peerAbortControllerRef.current.abort();
      peerAbortControllerRef.current = null;
    }
    setPeerSession((prev) => (prev ? { ...prev, status: 'idle' } : null));
  };

  const handleInsertPeerLatexToNotes = (content: string) => {
    const match = content.match(/\$\$([\s\S]+?)\$\$/);
    const latexFormula = match ? match[1].trim() : null;

    if (latexFormula) {
      handleInsertMathOrText({
        content: latexFormula,
        isLatex: true,
        fontSize: 22,
        color: primaryColor
      });
    } else {
      handleInsertMathOrText({
        content: content.replace(/[#*`]/g, '').slice(0, 300),
        isLatex: false,
        fontSize: 16,
        color: '#f1f5f9',
        bgColor: 'rgba(26, 30, 41, 0.95)'
      });
    }
  };

  const handleSendPeerToScratchpad = (imageDataUrl: string, content: string) => {
    const curWidth = currentPage?.width || 1280;
    const curHeight = currentPage?.height || 720;
    const insertIndex = currentPageIndex;

    const newPageModel: PageModel = {
      id: `scratch-peer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      pageNumber: insertIndex + 2,
      isCustomPage: true,
      width: curWidth,
      height: curHeight,
      paperColor: '#1a1d24',
      paperGrid: 'grid',
      annotations: [
        {
          id: `snip-img-${Date.now()}`,
          kind: 'image',
          dataUrl: imageDataUrl,
          x: 40,
          y: 40,
          width: Math.min(curWidth * 0.45, 520),
          height: Math.min(curHeight * 0.4, 260)
        },
        {
          id: `math-note-${Date.now()}`,
          kind: 'text-math',
          isLatex: false,
          content: content.slice(0, 500),
          x: Math.min(curWidth * 0.45, 520) + 60,
          y: 40,
          fontSize: 16,
          color: '#38bdf8',
          bgColor: 'rgba(20, 23, 31, 0.9)',
          width: Math.min(curWidth * 0.45, 540),
          height: Math.min(curHeight * 0.8, 500)
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
    showNotice('Peer explanation saved to new scratchpad page.');
  };

  // 11. Export PDF Handler
  const handleExportPdf = async () => {
    try {
      showNotice('Exporting PDF...');
      const compiledBytes = await exportToPdf(pdfData, pages, docTitle);

      if (window.electronAPI?.saveFileDialog) {
        const result = await window.electronAPI.saveFileDialog({
          defaultName: `${docTitle}_Annotated.pdf`,
          buffer: compiledBytes,
          filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
        });
        if (result && result.success) {
          showNotice('PDF saved successfully.');
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
        showNotice('PDF exported.');
      }
    } catch (err) {
      console.error('PDF export error:', err);
      showNotice('Export failed.');
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
      } else if (e.key.toLowerCase() === 'a') {
        setActiveTool((curr) => (curr === 'ask-peer' ? 'pen' : 'ask-peer'));
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
                  frozenPeerBox={peerSession?.pageIndex === currentPageIndex ? peerSession.box : null}
                  onUpdateAnnotations={handleUpdateAnnotations}
                  onSnipToScratchpad={handleSnipToScratchpad}
                  onAskPeerSnip={handleAskPeerSnip}
                  onCancelPeerSnip={handleCancelPeerSnip}
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

      {/* In-Situ Snip-and-Ask AI Study Assistant Dock / Popover */}
      {peerSession && (
        <StudyPeerDock
          session={peerSession}
          anchor={peerAnchor}
          dockMode={peerDockMode}
          onToggleDockMode={() => setPeerDockMode((m) => (m === 'floating' ? 'sidebar' : 'floating'))}
          onClose={handleCancelPeerSnip}
          onSubmitQuestion={handleSubmitPeerQuestion}
          onStopStreaming={handleStopPeerStreaming}
          onInsertLatexToNotes={handleInsertPeerLatexToNotes}
          onSendToScratchpad={handleSendPeerToScratchpad}
        />
      )}

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

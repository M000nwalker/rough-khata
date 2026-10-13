import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Annotation, PageModel, Point, ShapeAnnotation, StrokeAnnotation, ToolType } from '../types';
import { drawPaperPattern, drawShape, drawStroke, hitTestAnnotation } from '../utils/canvasRenderer';
import { renderLatexToHtml } from '../utils/mathHelper';
import { LaserCanvas } from './LaserCanvas';
import * as pdfjsLib from 'pdfjs-dist';
import { renderPdfPage } from '../utils/pdfManager';
import { Trash2, Move, Edit3 } from 'lucide-react';

interface PageViewProps {
  page: PageModel;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  scale: number;
  activeTool: ToolType;
  primaryColor: string;
  strokeWidth: number;
  onUpdateAnnotations: (pageId: string, annotations: Annotation[]) => void;
  onSnipToScratchpad?: (croppedImageDataUrl: string, sourcePageNumber: number) => void;
  onEditLatex?: (annotationId: string, currentContent: string, currentColor: string) => void;
}

export const PageView: React.FC<PageViewProps> = ({
  page,
  pdfDoc,
  scale,
  activeTool,
  primaryColor,
  strokeWidth,
  onUpdateAnnotations,
  onSnipToScratchpad,
  onEditLatex
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotCanvasRef = useRef<HTMLCanvasElement>(null);
  const draftCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [snipBox, setSnipBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  // Selected annotation for moving / deleting
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  const pageWidth = page.width;
  const pageHeight = page.height;

  // 1. Render PDF or Paper Background Pattern
  useEffect(() => {
    if (page.isCustomPage || !pdfDoc || page.pdfPageIndex === undefined) {
      // Custom blank page: render paper color and grid pattern
      const canvas = bgCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawPaperPattern(ctx, pageWidth, pageHeight, page.paperColor, page.paperGrid);
    } else {
      // PDF page: render via PDF.js
      const canvas = pdfCanvasRef.current;
      if (canvas && pdfDoc) {
        renderPdfPage(pdfDoc, page.pdfPageIndex, canvas, 1.0);
      }
    }
  }, [page, pdfDoc, pageWidth, pageHeight]);

  // 2. Render Persisted Annotations (strokes, shapes, images)
  const redrawAnnotations = useCallback(() => {
    const canvas = annotCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, pageWidth, pageHeight);

    for (const ann of page.annotations) {
      if (ann.kind === 'stroke') {
        drawStroke(ctx, ann);
      } else if (ann.kind === 'shape') {
        drawShape(ctx, ann);
      } else if (ann.kind === 'image') {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, ann.x, ann.y, ann.width, ann.height);
        };
        img.src = ann.dataUrl;
      }
    }
  }, [page.annotations, pageWidth, pageHeight]);

  useEffect(() => {
    redrawAnnotations();
  }, [redrawAnnotations]);

  // Pointer coordinate calculation relative to unscaled page
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    return { x, y };
  };

  // 3. Pointer Down Handler
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === 'laser' || activeTool === 'select') return;

    const { x, y } = getCanvasCoords(e);
    setIsDrawing(true);

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      setCurrentPoints([{ x, y, pressure: e.pressure || 0.5 }]);
    } else if (
      activeTool === 'line' ||
      activeTool === 'arrow' ||
      activeTool === 'double-arrow' ||
      activeTool === 'rect' ||
      activeTool === 'circle' ||
      activeTool === 'triangle' ||
      activeTool === 'axes'
    ) {
      setShapeStart({ x, y });
    } else if (activeTool === 'eraser-stroke') {
      // Hit test all annotations to erase the touched object
      const remaining = page.annotations.filter((ann) => !hitTestAnnotation(ann, x, y, 12));
      if (remaining.length !== page.annotations.length) {
        onUpdateAnnotations(page.id, remaining);
      }
    } else if (activeTool === 'eraser-brush') {
      // Continuous pixel brush eraser
      eraseAtPoint(x, y);
    } else if (activeTool === 'snip') {
      setSnipBox({ startX: x, startY: y, currentX: x, currentY: y });
    }
  };

  // 4. Pointer Move Handler
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { x, y } = getCanvasCoords(e);

    const draftCanvas = draftCanvasRef.current;
    const draftCtx = draftCanvas?.getContext('2d');

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      const newPoints = [...currentPoints, { x, y, pressure: e.pressure || 0.5 }];
      setCurrentPoints(newPoints);

      if (draftCtx && draftCanvas) {
        draftCtx.clearRect(0, 0, pageWidth, pageHeight);
        drawStroke(draftCtx, {
          id: 'draft',
          kind: 'stroke',
          points: newPoints,
          color: primaryColor,
          width: activeTool === 'highlighter' ? 24 : strokeWidth,
          opacity: activeTool === 'highlighter' ? 0.35 : 1.0,
          isHighlighter: activeTool === 'highlighter'
        });
      }
    } else if (shapeStart && draftCtx && draftCanvas) {
      draftCtx.clearRect(0, 0, pageWidth, pageHeight);

      let endX = x;
      let endY = y;

      // Shift key angle/aspect ratio snapping
      if (e.shiftKey) {
        if (activeTool === 'line' || activeTool === 'arrow' || activeTool === 'double-arrow') {
          // Snap to horizontal, vertical, or 45 degree
          const dx = endX - shapeStart.x;
          const dy = endY - shapeStart.y;
          const angle = Math.atan2(dy, dx);
          const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          const dist = Math.hypot(dx, dy);
          endX = shapeStart.x + dist * Math.cos(snapAngle);
          endY = shapeStart.y + dist * Math.sin(snapAngle);
        } else if (activeTool === 'rect' || activeTool === 'circle') {
          // Snap to 1:1 square / circle
          const size = Math.max(Math.abs(endX - shapeStart.x), Math.abs(endY - shapeStart.y));
          endX = shapeStart.x + (endX >= shapeStart.x ? size : -size);
          endY = shapeStart.y + (endY >= shapeStart.y ? size : -size);
        }
      }

      drawShape(draftCtx, {
        id: 'draft-shape',
        kind: 'shape',
        shapeType: activeTool as any,
        startX: shapeStart.x,
        startY: shapeStart.y,
        endX,
        endY,
        color: primaryColor,
        width: strokeWidth
      });
    } else if (activeTool === 'eraser-brush') {
      eraseAtPoint(x, y);
    } else if (activeTool === 'snip' && snipBox && draftCtx && draftCanvas) {
      draftCtx.clearRect(0, 0, pageWidth, pageHeight);
      setSnipBox((prev) => (prev ? { ...prev, currentX: x, currentY: y } : null));

      // Draw dashed snip box
      draftCtx.save();
      draftCtx.strokeStyle = '#3b82f6';
      draftCtx.lineWidth = 2;
      draftCtx.setLineDash([6, 6]);
      draftCtx.fillStyle = 'rgba(59, 130, 246, 0.15)';

      const sx = Math.min(snipBox.startX, x);
      const sy = Math.min(snipBox.startY, y);
      const sw = Math.abs(x - snipBox.startX);
      const sh = Math.abs(y - snipBox.startY);

      draftCtx.fillRect(sx, sy, sw, sh);
      draftCtx.strokeRect(sx, sy, sw, sh);
      draftCtx.restore();
    }
  };

  // 5. Pointer Up Handler
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const draftCanvas = draftCanvasRef.current;
    const draftCtx = draftCanvas?.getContext('2d');
    if (draftCtx) draftCtx.clearRect(0, 0, pageWidth, pageHeight);

    const { x, y } = getCanvasCoords(e);

    if ((activeTool === 'pen' || activeTool === 'highlighter') && currentPoints.length > 0) {
      const newStroke: StrokeAnnotation = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        kind: 'stroke',
        points: currentPoints,
        color: primaryColor,
        width: activeTool === 'highlighter' ? 24 : strokeWidth,
        opacity: activeTool === 'highlighter' ? 0.35 : 1.0,
        isHighlighter: activeTool === 'highlighter'
      };
      onUpdateAnnotations(page.id, [...page.annotations, newStroke]);
      setCurrentPoints([]);
    } else if (shapeStart) {
      let endX = x;
      let endY = y;

      if (e.shiftKey) {
        if (activeTool === 'line' || activeTool === 'arrow' || activeTool === 'double-arrow') {
          const dx = endX - shapeStart.x;
          const dy = endY - shapeStart.y;
          const angle = Math.atan2(dy, dx);
          const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          const dist = Math.hypot(dx, dy);
          endX = shapeStart.x + dist * Math.cos(snapAngle);
          endY = shapeStart.y + dist * Math.sin(snapAngle);
        } else if (activeTool === 'rect' || activeTool === 'circle') {
          const size = Math.max(Math.abs(endX - shapeStart.x), Math.abs(endY - shapeStart.y));
          endX = shapeStart.x + (endX >= shapeStart.x ? size : -size);
          endY = shapeStart.y + (endY >= shapeStart.y ? size : -size);
        }
      }

      // Check minimum drag distance to prevent accidental zero-size clicks
      if (Math.hypot(endX - shapeStart.x, endY - shapeStart.y) > 4) {
        const newShape: ShapeAnnotation = {
          id: `shape-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          kind: 'shape',
          shapeType: activeTool as any,
          startX: shapeStart.x,
          startY: shapeStart.y,
          endX,
          endY,
          color: primaryColor,
          width: strokeWidth
        };
        onUpdateAnnotations(page.id, [...page.annotations, newShape]);
      }
      setShapeStart(null);
    } else if (activeTool === 'snip' && snipBox) {
      captureSnipBox(snipBox.startX, snipBox.startY, x, y);
      setSnipBox(null);
    }
  };

  // Erase at point (brush eraser)
  const eraseAtPoint = (px: number, py: number) => {
    const radius = 16;
    const canvas = annotCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Snip & Solve: crops selected region from canvas
  const captureSnipBox = (x1: number, y1: number, x2: number, y2: number) => {
    const sx = Math.min(x1, x2);
    const sy = Math.min(y1, y2);
    const sw = Math.abs(x2 - x1);
    const sh = Math.abs(y2 - y1);

    if (sw < 20 || sh < 20) return;

    // Create temporary canvas containing background + annotations
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sw;
    tempCanvas.height = sh;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Draw from PDF or background
    if (page.isCustomPage) {
      const bgCanvas = bgCanvasRef.current;
      if (bgCanvas) tempCtx.drawImage(bgCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
    } else {
      const pdfCanvas = pdfCanvasRef.current;
      if (pdfCanvas) tempCtx.drawImage(pdfCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
    }

    // Draw annotations overlay
    const annotCanvas = annotCanvasRef.current;
    if (annotCanvas) tempCtx.drawImage(annotCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

    const croppedDataUrl = tempCanvas.toDataURL('image/png');
    if (onSnipToScratchpad) {
      onSnipToScratchpad(croppedDataUrl, page.pageNumber);
    }
  };

  // Delete text/math item
  const handleDeleteAnnotation = (id: string) => {
    const updated = page.annotations.filter((a) => a.id !== id);
    onUpdateAnnotations(page.id, updated);
    setSelectedAnnId(null);
  };

  // Handle Dragging text/math items
  const handleItemPointerDown = (e: React.PointerEvent, annId: string) => {
    e.stopPropagation();
    setSelectedAnnId(annId);
    const ann = page.annotations.find((a) => a.id === annId);
    if (!ann || ann.kind !== 'text-math') return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = (e.clientX - rect.left) / scale;
    const clickY = (e.clientY - rect.top) / scale;
    setDragOffset({ x: clickX - ann.x, y: clickY - ann.y });
  };

  const handleContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!selectedAnnId || !dragOffset) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const curX = (e.clientX - rect.left) / scale;
    const curY = (e.clientY - rect.top) / scale;

    const newX = curX - dragOffset.x;
    const newY = curY - dragOffset.y;

    const updated = page.annotations.map((a) => {
      if (a.id === selectedAnnId && a.kind === 'text-math') {
        return { ...a, x: Math.max(0, Math.min(pageWidth - 50, newX)), y: Math.max(0, Math.min(pageHeight - 30, newY)) };
      }
      return a;
    });

    onUpdateAnnotations(page.id, updated);
  };

  const handleContainerPointerUp = () => {
    setDragOffset(null);
  };

  return (
    <div
      ref={containerRef}
      className="page-viewport-card"
      style={{
        width: `${pageWidth * scale}px`,
        height: `${pageHeight * scale}px`
      }}
      onPointerMove={handleContainerPointerMove}
      onPointerUp={handleContainerPointerUp}
    >
      <div
        className="canvas-layer-stack"
        style={{
          width: `${pageWidth}px`,
          height: `${pageHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }}
      >
        {/* Layer 1: PDF Canvas or Background Paper Pattern Canvas */}
        {page.isCustomPage ? (
          <canvas
            ref={bgCanvasRef}
            width={pageWidth}
            height={pageHeight}
            className="canvas-layer layer-bg"
          />
        ) : (
          <canvas
            ref={pdfCanvasRef}
            width={pageWidth}
            height={pageHeight}
            className="canvas-layer layer-pdf"
          />
        )}

        {/* Layer 2: Persisted Annotation Canvas */}
        <canvas
          ref={annotCanvasRef}
          width={pageWidth}
          height={pageHeight}
          className="canvas-layer layer-annotations"
        />

        {/* Layer 3: Interactive Drawing / Draft Canvas */}
        <canvas
          ref={draftCanvasRef}
          width={pageWidth}
          height={pageHeight}
          className={`canvas-layer layer-draft ${activeTool}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />

        {/* Layer 4: Interactive DOM Overlay for Text & LaTeX Equations */}
        <div className="text-math-overlay-container">
          {page.annotations.map((ann) => {
            if (ann.kind !== 'text-math') return null;
            const isSelected = selectedAnnId === ann.id;

            return (
              <div
                key={ann.id}
                className={`text-math-element ${isSelected ? 'selected' : ''}`}
                style={{
                  left: `${ann.x}px`,
                  top: `${ann.y}px`,
                  fontSize: `${ann.fontSize}px`,
                  color: ann.color,
                  backgroundColor: ann.bgColor || 'transparent'
                }}
                onPointerDown={(e) => handleItemPointerDown(e, ann.id)}
              >
                {/* Math or Text Content */}
                {ann.isLatex ? (
                  <div
                    className="latex-rendered-wrap"
                    dangerouslySetInnerHTML={{ __html: renderLatexToHtml(ann.content, true) }}
                  />
                ) : (
                  <div className="plain-text-rendered-wrap">{ann.content}</div>
                )}

                {/* Floating Item Controls */}
                {isSelected && (
                  <div className="element-action-toolbar" onPointerDown={(e) => e.stopPropagation()}>
                    <button
                      className="elem-action-btn move"
                      title="Drag to reposition"
                    >
                      <Move size={14} />
                    </button>
                    {ann.isLatex && onEditLatex && (
                      <button
                        className="elem-action-btn edit"
                        onClick={() => onEditLatex(ann.id, ann.content, ann.color)}
                        title="Edit LaTeX"
                      >
                        <Edit3 size={14} />
                      </button>
                    )}
                    <button
                      className="elem-action-btn delete"
                      onClick={() => handleDeleteAnnotation(ann.id)}
                      title="Delete item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Layer 5: Teacher Laser Pointer Overlay */}
        <LaserCanvas
          width={pageWidth}
          height={pageHeight}
          active={activeTool === 'laser'}
          laserColor="#ef4444"
        />
      </div>

      {/* Page Badge */}
      <div className="page-number-badge">
        Page {page.pageNumber} {page.isCustomPage ? '(Blank Scratchpad)' : ''}
      </div>
    </div>
  );
};

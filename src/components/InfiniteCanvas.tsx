import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Annotation, Point, ShapeAnnotation, StrokeAnnotation, ToolType } from '../types';
import { drawShape, drawStroke, hitTestAnnotation } from '../utils/canvasRenderer';
import { renderLatexToHtml } from '../utils/mathHelper';
import { LaserCanvas } from './LaserCanvas';
import { Compass, RotateCcw, Trash2, Move, Edit3, Download } from 'lucide-react';

interface InfiniteCanvasProps {
  activeTool: ToolType;
  primaryColor: string;
  strokeWidth: number;
  annotations: Annotation[];
  onUpdateAnnotations: (annotations: Annotation[]) => void;
  onEditLatex?: (annotationId: string, currentContent: string, currentColor: string) => void;
}

export const InfiniteCanvas: React.FC<InfiniteCanvasProps> = ({
  activeTool,
  primaryColor,
  strokeWidth,
  annotations,
  onUpdateAnnotations,
  onEditLatex
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotCanvasRef = useRef<HTMLCanvasElement>(null);
  const draftCanvasRef = useRef<HTMLCanvasElement>(null);

  // Pan & Zoom in World Space
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1.0);

  // Canvas Dimensions
  const [size, setSize] = useState<{ w: number; h: number }>({ w: window.innerWidth, h: window.innerHeight });

  // Interaction State
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);

  // Selected item
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  // Spacebar pan tracker
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

  // 1. Resize Handler
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setSize({
          w: containerRef.current.clientWidth,
          h: containerRef.current.clientHeight
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. Keyboard Space listener for Panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 3. Render Infinite Grid Pattern
  useEffect(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h } = size;
    ctx.clearRect(0, 0, w, h);

    // Dark chalkboard background
    ctx.fillStyle = '#12141a';
    ctx.fillRect(0, 0, w, h);

    // Grid spacing adjusted by zoom
    const baseStep = 30;
    const step = baseStep * zoom;
    const offsetX = pan.x % step;
    const offsetY = pan.y % step;

    // Major lines
    const majorStep = step * 5;
    const majorOffsetX = pan.x % majorStep;
    const majorOffsetY = pan.y % majorStep;

    ctx.save();

    // Minor grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = offsetX; x <= w; x += step) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    for (let y = offsetY; y <= h; y += step) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();

    // Major grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = majorOffsetX; x <= w; x += majorStep) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    for (let y = majorOffsetY; y <= h; y += majorStep) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();

    // World Origin (0,0) Marker
    const originX = pan.x;
    const originY = pan.y;
    if (originX >= -20 && originX <= w + 20 && originY >= -20 && originY <= h + 20) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(originX - 12, originY);
      ctx.lineTo(originX + 12, originY);
      ctx.moveTo(originX, originY - 12);
      ctx.lineTo(originX, originY + 12);
      ctx.stroke();

      ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.font = '10px monospace';
      ctx.fillText('(0,0)', originX + 6, originY - 6);
    }

    ctx.restore();
  }, [pan, zoom, size]);

  // 4. Render Persisted Annotations in World Coordinates
  const redrawAnnotations = useCallback(() => {
    const canvas = annotCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h } = size;
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    // Apply pan & zoom transform
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    for (const ann of annotations) {
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

    ctx.restore();
  }, [annotations, pan, zoom, size]);

  useEffect(() => {
    redrawAnnotations();
  }, [redrawAnnotations]);

  // Convert Screen coordinates to World coordinates
  const screenToWorld = (screenX: number, screenY: number): { x: number; y: number } => {
    return {
      x: (screenX - pan.x) / zoom,
      y: (screenY - pan.y) / zoom
    };
  };

  // Convert World coordinates to Screen coordinates
  const worldToScreen = (worldX: number, worldY: number): { x: number; y: number } => {
    return {
      x: worldX * zoom + pan.x,
      y: worldY * zoom + pan.y
    };
  };

  // 5. Mouse Wheel: Zoom & Pan
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (e.ctrlKey || e.metaKey) {
      // Zoom centered at mouse position
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      const newZoom = Math.max(0.15, Math.min(5.0, zoom * factor));

      const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
      const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    } else {
      // Pan
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  };

  // 6. Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Check if panning (Spacebar, Middle Click, or Pan tool)
    if (isSpacePressed || e.button === 1 || activeTool === 'pan' || activeTool === 'select') {
      setIsPanning(true);
      setPanStart({ x: screenX - pan.x, y: screenY - pan.y });
      return;
    }

    if (activeTool === 'laser') return;

    const world = screenToWorld(screenX, screenY);
    setIsDrawing(true);

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      setCurrentPoints([{ x: world.x, y: world.y, pressure: e.pressure || 0.5 }]);
    } else if (
      activeTool === 'line' ||
      activeTool === 'arrow' ||
      activeTool === 'double-arrow' ||
      activeTool === 'rect' ||
      activeTool === 'circle' ||
      activeTool === 'triangle' ||
      activeTool === 'axes'
    ) {
      setShapeStart(world);
    } else if (activeTool === 'eraser-stroke') {
      const remaining = annotations.filter((ann) => !hitTestAnnotation(ann, world.x, world.y, 14 / zoom));
      if (remaining.length !== annotations.length) {
        onUpdateAnnotations(remaining);
      }
    }
  };

  // 7. Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (isPanning && panStart) {
      setPan({
        x: screenX - panStart.x,
        y: screenY - panStart.y
      });
      return;
    }

    if (!isDrawing) return;

    const world = screenToWorld(screenX, screenY);
    const draftCanvas = draftCanvasRef.current;
    const draftCtx = draftCanvas?.getContext('2d');

    if (draftCtx && draftCanvas) {
      draftCtx.clearRect(0, 0, size.w, size.h);
      draftCtx.save();
      draftCtx.translate(pan.x, pan.y);
      draftCtx.scale(zoom, zoom);

      if (activeTool === 'pen' || activeTool === 'highlighter') {
        const newPoints = [...currentPoints, { x: world.x, y: world.y, pressure: e.pressure || 0.5 }];
        setCurrentPoints(newPoints);

        drawStroke(draftCtx, {
          id: 'draft',
          kind: 'stroke',
          points: newPoints,
          color: primaryColor,
          width: activeTool === 'highlighter' ? 24 : strokeWidth,
          opacity: activeTool === 'highlighter' ? 0.35 : 1.0,
          isHighlighter: activeTool === 'highlighter'
        });
      } else if (shapeStart) {
        drawShape(draftCtx, {
          id: 'draft-shape',
          kind: 'shape',
          shapeType: activeTool as any,
          startX: shapeStart.x,
          startY: shapeStart.y,
          endX: world.x,
          endY: world.y,
          color: primaryColor,
          width: strokeWidth
        });
      }

      draftCtx.restore();
    }
  };

  // 8. Pointer Up
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    const draftCanvas = draftCanvasRef.current;
    const draftCtx = draftCanvas?.getContext('2d');
    if (draftCtx) draftCtx.clearRect(0, 0, size.w, size.h);

    const rect = e.currentTarget.getBoundingClientRect();
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

    if ((activeTool === 'pen' || activeTool === 'highlighter') && currentPoints.length > 0) {
      const newStroke: StrokeAnnotation = {
        id: `stroke-inf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        kind: 'stroke',
        points: currentPoints,
        color: primaryColor,
        width: activeTool === 'highlighter' ? 24 : strokeWidth,
        opacity: activeTool === 'highlighter' ? 0.35 : 1.0,
        isHighlighter: activeTool === 'highlighter'
      };
      onUpdateAnnotations([...annotations, newStroke]);
      setCurrentPoints([]);
    } else if (shapeStart) {
      if (Math.hypot(world.x - shapeStart.x, world.y - shapeStart.y) > 4) {
        const newShape: ShapeAnnotation = {
          id: `shape-inf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          kind: 'shape',
          shapeType: activeTool as any,
          startX: shapeStart.x,
          startY: shapeStart.y,
          endX: world.x,
          endY: world.y,
          color: primaryColor,
          width: strokeWidth
        };
        onUpdateAnnotations([...annotations, newShape]);
      }
      setShapeStart(null);
    }
  };

  // Handle Dragging text/math items in Infinite Space
  const handleItemPointerDown = (e: React.PointerEvent, annId: string) => {
    e.stopPropagation();
    setSelectedAnnId(annId);
    const ann = annotations.find((a) => a.id === annId);
    if (!ann || ann.kind !== 'text-math') return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToWorld(screenX, screenY);
    setDragOffset({ x: world.x - ann.x, y: world.y - ann.y });
  };

  const handleContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!selectedAnnId || !dragOffset) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToWorld(screenX, screenY);

    const newX = world.x - dragOffset.x;
    const newY = world.y - dragOffset.y;

    const updated = annotations.map((a) => {
      if (a.id === selectedAnnId && a.kind === 'text-math') {
        return { ...a, x: newX, y: newY };
      }
      return a;
    });

    onUpdateAnnotations(updated);
  };

  const handleContainerPointerUp = () => {
    setDragOffset(null);
  };

  // Recenter (0,0)
  const handleRecenter = () => {
    setPan({ x: size.w / 2, y: size.h / 2 });
    setZoom(1.0);
  };

  // Export snapshot PNG of the current infinite view
  const handleExportSnapshot = () => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = size.w;
    exportCanvas.height = size.h;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#12141a';
    ctx.fillRect(0, 0, size.w, size.h);

    // Draw grid
    const gridCanvas = gridCanvasRef.current;
    if (gridCanvas) ctx.drawImage(gridCanvas, 0, 0);

    // Draw annotations
    const annotCanvas = annotCanvasRef.current;
    if (annotCanvas) ctx.drawImage(annotCanvas, 0, 0);

    const dataUrl = exportCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `RoughKhata_Infinite_${Date.now()}.png`;
    a.click();
  };

  return (
    <div
      ref={containerRef}
      className="infinite-canvas-stage"
      onWheel={handleWheel}
      onPointerMove={handleContainerPointerMove}
      onPointerUp={handleContainerPointerUp}
    >
      {/* Background Infinite Grid */}
      <canvas
        ref={gridCanvasRef}
        width={size.w}
        height={size.h}
        className="canvas-layer"
      />

      {/* Persisted Annotations */}
      <canvas
        ref={annotCanvasRef}
        width={size.w}
        height={size.h}
        className="canvas-layer"
      />

      {/* Interactive Inking & Shape Canvas */}
      <canvas
        ref={draftCanvasRef}
        width={size.w}
        height={size.h}
        className={`canvas-layer layer-draft ${isSpacePressed || isPanning ? 'panning' : activeTool}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      {/* DOM Overlay for Text & LaTeX Formulas */}
      <div className="text-math-overlay-container">
        {annotations.map((ann) => {
          if (ann.kind !== 'text-math') return null;
          const isSelected = selectedAnnId === ann.id;
          const screenPos = worldToScreen(ann.x, ann.y);

          return (
            <div
              key={ann.id}
              className={`text-math-element ${isSelected ? 'selected' : ''}`}
              style={{
                left: `${screenPos.x}px`,
                top: `${screenPos.y}px`,
                fontSize: `${ann.fontSize * zoom}px`,
                color: ann.color,
                backgroundColor: ann.bgColor || 'transparent',
                transformOrigin: 'top left'
              }}
              onPointerDown={(e) => handleItemPointerDown(e, ann.id)}
            >
              {ann.isLatex ? (
                <div
                  className="latex-rendered-wrap"
                  dangerouslySetInnerHTML={{ __html: renderLatexToHtml(ann.content, true) }}
                />
              ) : (
                <div className="plain-text-rendered-wrap">{ann.content}</div>
              )}

              {isSelected && (
                <div className="element-action-toolbar" onPointerDown={(e) => e.stopPropagation()}>
                  <button className="elem-action-btn move" title="Drag to reposition">
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
                    onClick={() => {
                      onUpdateAnnotations(annotations.filter((a) => a.id !== ann.id));
                      setSelectedAnnId(null);
                    }}
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

      {/* Laser Pointer */}
      <LaserCanvas
        width={size.w}
        height={size.h}
        active={activeTool === 'laser'}
        laserColor="#ef4444"
      />

      {/* Floating HUD Controls */}
      <div className="infinite-hud-controls">
        <button
          className="hud-btn"
          onClick={handleRecenter}
          title="Recenter to (0,0) Origin"
        >
          <Compass size={16} />
          <span>Origin (0,0)</span>
        </button>

        <button
          className="hud-btn"
          onClick={() => {
            setZoom(1.0);
          }}
          title="Reset Zoom to 100%"
        >
          <RotateCcw size={16} />
          <span>{Math.round(zoom * 100)}%</span>
        </button>

        <button
          className="hud-btn"
          onClick={handleExportSnapshot}
          title="Export PNG of Current View"
        >
          <Download size={16} />
          <span>Snap PNG</span>
        </button>

        {annotations.length > 0 && (
          <button
            className="hud-btn danger"
            onClick={() => onUpdateAnnotations([])}
            title="Clear Infinite Board"
          >
            <Trash2 size={15} />
            <span>Clear</span>
          </button>
        )}
      </div>
    </div>
  );
};

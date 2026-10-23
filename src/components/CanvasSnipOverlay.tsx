import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { SnipRegion } from '../types';
import { Sparkles, X, Bot } from 'lucide-react';

interface CanvasSnipOverlayProps {
  active: boolean;
  pageWidth: number;
  pageHeight: number;
  scale: number;
  frozenBox: SnipRegion | null;
  onSnipComplete: (box: SnipRegion, screenAnchor: { x: number; y: number; width: number; height: number }) => void;
  onCancelSnip: () => void;
}

/**
 * Transparent interaction layer over the canvas that tracks mouse/pointer events,
 * normalizes selection coordinates (x, y, w, h) against viewport scale and DPR,
 * and renders a glowing bounding box.
 */
export const CanvasSnipOverlay: React.FC<CanvasSnipOverlayProps> = ({
  active,
  pageWidth,
  pageHeight,
  scale,
  frozenBox,
  onSnipComplete,
  onCancelSnip
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);

  // Esc key cancels active drag or clears frozen snip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawing) {
          setIsDrawing(false);
          setStartPoint(null);
          setCurrentPoint(null);
        } else if (frozenBox) {
          onCancelSnip();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, frozenBox, onCancelSnip]);

  // Normalize client pointer coords to unscaled page coordinates
  const getPageCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };

      const unscaledX = (clientX - rect.left) / scale;
      const unscaledY = (clientY - rect.top) / scale;

      return {
        x: Math.max(0, Math.min(pageWidth, unscaledX)),
        y: Math.max(0, Math.min(pageHeight, unscaledY))
      };
    },
    [scale, pageWidth, pageHeight]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only trigger if active tool is ask-peer or Alt is held
    if (!active && !e.altKey) return;
    if (e.button !== 0) return; // Primary click only

    e.preventDefault();
    e.stopPropagation();

    // Capture pointer to receive move/up events even outside container
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const coords = getPageCoords(e.clientX, e.clientY);
    setIsDrawing(true);
    setStartPoint(coords);
    setCurrentPoint(coords);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint) return;
    e.preventDefault();
    e.stopPropagation();

    const coords = getPageCoords(e.clientX, e.clientY);
    setCurrentPoint(coords);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const endPoint = getPageCoords(e.clientX, e.clientY);
    setIsDrawing(false);

    const x = Math.min(startPoint.x, endPoint.x);
    const y = Math.min(startPoint.y, endPoint.y);
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);

    setStartPoint(null);
    setCurrentPoint(null);

    // Minimum drag threshold to prevent accidental click misfires
    if (width >= 15 && height >= 15) {
      const rect = containerRef.current?.getBoundingClientRect();
      const screenAnchor = {
        x: rect ? rect.left + x * scale : x,
        y: rect ? rect.top + y * scale : y,
        width: width * scale,
        height: height * scale
      };

      onSnipComplete({ x, y, width, height }, screenAnchor);
    }
  };

  // Compute active drag box in page coordinates
  const activeBox =
    isDrawing && startPoint && currentPoint
      ? {
          x: Math.min(startPoint.x, currentPoint.x),
          y: Math.min(startPoint.y, currentPoint.y),
          width: Math.abs(currentPoint.x - startPoint.x),
          height: Math.abs(currentPoint.y - startPoint.y)
        }
      : null;

  return (
    <div
      ref={containerRef}
      className={`canvas-snip-overlay-root ${active ? 'snip-active' : ''} ${
        frozenBox ? 'has-frozen-box' : ''
      }`}
      style={{
        width: `${pageWidth}px`,
        height: `${pageHeight}px`,
        pointerEvents: active ? 'auto' : frozenBox ? 'auto' : 'none'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* 1. Live Dragging Bounding Box */}
      {activeBox && (
        <div
          className="snip-drag-box"
          style={{
            left: `${activeBox.x}px`,
            top: `${activeBox.y}px`,
            width: `${activeBox.width}px`,
            height: `${activeBox.height}px`
          }}
        >
          {/* Neon corner markers */}
          <div className="corner-tag tl" />
          <div className="corner-tag tr" />
          <div className="corner-tag bl" />
          <div className="corner-tag br" />

          {/* Floating dimension & action tag */}
          <div className="snip-info-pill">
            <Sparkles size={12} className="spin-slow" />
            <span>
              {Math.round(activeBox.width)} × {Math.round(activeBox.height)} px
            </span>
            <span className="snip-hint-sub">Release to Ask Peer</span>
          </div>
        </div>
      )}

      {/* 2. Frozen Bounding Box (when user releases and popover/dock is active) */}
      {frozenBox && !activeBox && (
        <div
          className="snip-frozen-box"
          style={{
            left: `${frozenBox.x}px`,
            top: `${frozenBox.y}px`,
            width: `${frozenBox.width}px`,
            height: `${frozenBox.height}px`
          }}
        >
          <div className="frozen-corner tl" />
          <div className="frozen-corner tr" />
          <div className="frozen-corner bl" />
          <div className="frozen-corner br" />

          {/* Frozen header tag with clear action */}
          <div className="frozen-box-header" onClick={(e) => e.stopPropagation()}>
            <div className="frozen-badge">
              <Bot size={13} />
              <span>Inspecting Region</span>
            </div>
            <button
              className="frozen-close-btn"
              onClick={onCancelSnip}
              title="Clear selection (Esc)"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

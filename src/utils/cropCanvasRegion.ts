import type { SnipRegion } from '../types';

export interface CropCanvasOptions {
  box: SnipRegion;
  pageWidth: number;
  pageHeight: number;
  pdfCanvas?: HTMLCanvasElement | null;
  bgCanvas?: HTMLCanvasElement | null;
  annotCanvas?: HTMLCanvasElement | null;
  format?: 'image/png' | 'image/webp';
  quality?: number;
}

/**
 * Extracts the exact visual slice from the rendered PDF and annotation canvases
 * at full resolution (accounting for DPR / high DPI), returning a base64 data URL.
 */
export function cropCanvasRegion({
  box,
  pageWidth,
  pageHeight,
  pdfCanvas,
  bgCanvas,
  annotCanvas,
  format = 'image/png',
  quality = 0.95
}: CropCanvasOptions): string {
  const normX = Math.max(0, Math.min(pageWidth, box.x));
  const normY = Math.max(0, Math.min(pageHeight, box.y));
  const normW = Math.max(10, Math.min(pageWidth - normX, box.width));
  const normH = Math.max(10, Math.min(pageHeight - normY, box.height));

  // Determine pixel density multiplier from canvas internal width vs CSS page width
  const baseCanvas = pdfCanvas || bgCanvas || annotCanvas;
  const dpr = baseCanvas && pageWidth > 0 ? baseCanvas.width / pageWidth : (window.devicePixelRatio || 1);
  const renderScale = Math.max(1, dpr);

  const offscreen = document.createElement('canvas');
  offscreen.width = Math.max(1, Math.round(normW * renderScale));
  offscreen.height = Math.max(1, Math.round(normH * renderScale));

  const ctx = offscreen.getContext('2d', { alpha: true });
  if (!ctx) {
    throw new Error('Failed to acquire 2D context for offscreen crop canvas');
  }

  // Optional solid white underlay for clean contrast when cropping PDF content
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, offscreen.width, offscreen.height);

  // 1. Draw PDF page slice
  if (pdfCanvas && pdfCanvas.width > 0 && pdfCanvas.height > 0) {
    const pDpr = pdfCanvas.width / pageWidth;
    ctx.drawImage(
      pdfCanvas,
      normX * pDpr,
      normY * pDpr,
      normW * pDpr,
      normH * pDpr,
      0,
      0,
      offscreen.width,
      offscreen.height
    );
  } else if (bgCanvas && bgCanvas.width > 0 && bgCanvas.height > 0) {
    // 1b. Or draw blank notebook paper background
    const bDpr = bgCanvas.width / pageWidth;
    ctx.drawImage(
      bgCanvas,
      normX * bDpr,
      normY * bDpr,
      normW * bDpr,
      normH * bDpr,
      0,
      0,
      offscreen.width,
      offscreen.height
    );
  }

  // 2. Draw user annotations slice (pen strokes, shapes, equations, highlights)
  if (annotCanvas && annotCanvas.width > 0 && annotCanvas.height > 0) {
    const aDpr = annotCanvas.width / pageWidth;
    ctx.drawImage(
      annotCanvas,
      normX * aDpr,
      normY * aDpr,
      normW * aDpr,
      normH * aDpr,
      0,
      0,
      offscreen.width,
      offscreen.height
    );
  }

  return offscreen.toDataURL(format, quality);
}

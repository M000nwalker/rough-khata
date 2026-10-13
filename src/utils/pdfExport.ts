import { PDFDocument } from 'pdf-lib';
import type { PageModel } from '../types';
import { drawPaperPattern, drawShape, drawStroke } from './canvasRenderer';
import { renderLatexToHtml } from './mathHelper';

/**
 * Exports all pages, annotations, and math equations into a compiled PDF
 */
export async function exportToPdf(
  originalPdfBytes: ArrayBuffer | null,
  pages: PageModel[],
  _title: string = 'TuitionPad_Notes'
): Promise<Uint8Array> {
  let pdfDoc: PDFDocument;

  if (originalPdfBytes && originalPdfBytes.byteLength > 0) {
    // Load original PDF
    pdfDoc = await PDFDocument.load(originalPdfBytes);
  } else {
    // Brand new blank PDF
    pdfDoc = await PDFDocument.create();
  }

  // If brand new PDF, create pages in order
  if (!originalPdfBytes || originalPdfBytes.byteLength === 0) {
    for (let i = 0; i < pages.length; i++) {
      const pageModel = pages[i];
      pdfDoc.addPage([pageModel.width, pageModel.height]);
    }
  } else {
    // Handle inserted blank pages
    // Check which pages are custom inserted pages
    for (let i = 0; i < pages.length; i++) {
      const pageModel = pages[i];
      if (pageModel.isCustomPage) {
        // Insert a new blank page at index i
        pdfDoc.insertPage(i, [pageModel.width, pageModel.height]);
      }
    }
  }

  const exportPdfPages = pdfDoc.getPages();

  // For each page, render the annotations & backgrounds offscreen and overlay onto PDF
  for (let i = 0; i < pages.length; i++) {
    const pageModel = pages[i];
    const pdfPage = exportPdfPages[i];
    if (!pdfPage) continue;

    // Create offscreen canvas for annotations at 2x resolution for ultra-sharp print quality
    const scaleFactor = 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(pageModel.width * scaleFactor);
    canvas.height = Math.round(pageModel.height * scaleFactor);

    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.scale(scaleFactor, scaleFactor);

    // If it's a custom blank page, draw paper background & grid pattern
    if (pageModel.isCustomPage) {
      drawPaperPattern(ctx, pageModel.width, pageModel.height, pageModel.paperColor, pageModel.paperGrid);
    }

    // Draw all strokes and shapes
    for (const ann of pageModel.annotations) {
      if (ann.kind === 'stroke') {
        drawStroke(ctx, ann);
      } else if (ann.kind === 'shape') {
        drawShape(ctx, ann);
      } else if (ann.kind === 'image') {
        await drawImageOnCanvas(ctx, ann.dataUrl, ann.x, ann.y, ann.width, ann.height);
      } else if (ann.kind === 'text-math') {
        await drawTextMathOnCanvas(ctx, ann);
      }
    }

    // Convert offscreen canvas to PNG and embed in PDF page
    const pngDataUrl = canvas.toDataURL('image/png');
    const pngImage = await pdfDoc.embedPng(pngDataUrl);

    pdfPage.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: pageModel.width,
      height: pageModel.height
    });
  }

  return await pdfDoc.save();
}

/**
 * Helper to draw an image data URL onto canvas
 */
function drawImageOnCanvas(
  ctx: CanvasRenderingContext2D,
  dataUrl: string,
  x: number,
  y: number,
  w: number,
  h: number
): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, x, y, w, h);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = dataUrl;
  });
}

/**
 * Draws text or KaTeX math formula onto canvas via SVG foreignObject
 */
async function drawTextMathOnCanvas(
  ctx: CanvasRenderingContext2D,
  ann: {
    isLatex: boolean;
    content: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
    bgColor?: string;
    width?: number;
    height?: number;
  }
): Promise<void> {
  if (!ann.isLatex) {
    // Plain text
    ctx.save();
    ctx.font = `${ann.fontSize}px 'Segoe UI', Roboto, sans-serif`;
    ctx.textBaseline = 'top';

    if (ann.bgColor) {
      const textMetrics = ctx.measureText(ann.content);
      ctx.fillStyle = ann.bgColor;
      ctx.fillRect(ann.x - 4, ann.y - 2, textMetrics.width + 8, ann.fontSize * 1.3);
    }

    ctx.fillStyle = ann.color;
    ctx.fillText(ann.content, ann.x, ann.y);
    ctx.restore();
    return;
  }

  // KaTeX formula rendered to SVG
  const katexHtml = renderLatexToHtml(ann.content, true);
  const w = Math.max(ann.width || 250, 150);
  const h = Math.max(ann.height || 80, 50);

  const svgData = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-size: ${ann.fontSize}px; color: ${ann.color}; background: ${ann.bgColor || 'transparent'}; display: inline-block; padding: 4px; font-family: KaTeX_Main, serif;">
          ${katexHtml}
        </div>
      </foreignObject>
    </svg>
  `;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, ann.x, ann.y);
      resolve();
    };
    img.onerror = () => {
      // Fallback text if foreignObject SVG rendering fails
      ctx.save();
      ctx.font = `italic ${ann.fontSize}px serif`;
      ctx.fillStyle = ann.color;
      ctx.fillText(ann.content, ann.x, ann.y);
      ctx.restore();
      resolve();
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
  });
}

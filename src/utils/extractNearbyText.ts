import * as pdfjsLib from 'pdfjs-dist';
import type { Annotation, ExtractedTextResult, SnipRegion } from '../types';

interface TextItemPosition {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isInside: boolean;
}

/**
 * Extracts raw text tokens within and surrounding (±150px vertical proximity)
 * a snip selection box on a PDF page or custom canvas.
 */
export async function extractNearbyText(
  pdfDoc: pdfjsLib.PDFDocumentProxy | null,
  pageIndex: number,
  box: SnipRegion,
  proximityPx: number = 150,
  pageAnnotations: Annotation[] = []
): Promise<ExtractedTextResult> {
  const items: TextItemPosition[] = [];

  const boxLeft = box.x;
  const boxRight = box.x + box.width;
  const boxTop = box.y;
  const boxBottom = box.y + box.height;

  const proxTop = Math.max(0, boxTop - proximityPx);
  const proxBottom = boxBottom + proximityPx;

  // 1. Extract from PDF.js TextContent if this is a PDF page
  if (pdfDoc && pageIndex >= 0 && pageIndex < pdfDoc.numPages) {
    try {
      const page = await pdfDoc.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();

      for (const item of textContent.items) {
        if (!('str' in item) || typeof item.str !== 'string') continue;
        const text = item.str.trim();
        if (!text) continue;

        // In PDF.js, transform[4] = tx, transform[5] = ty in PDF user unit space
        const tx = item.transform[4];
        const ty = item.transform[5];
        const [vx, vy] = viewport.convertToViewportPoint(tx, ty);

        const itemHeight = Math.max(8, item.height || Math.hypot(item.transform[2], item.transform[3]) || 12);
        const itemWidth = Math.max(4, item.width || text.length * 6.5);
        const itemTop = vy - itemHeight;
        const itemBottom = vy;
        const itemLeft = vx;
        const itemRight = vx + itemWidth;

        // Check if item falls in proximity or directly inside the selection
        const inVertProximity = itemBottom >= proxTop && itemTop <= proxBottom;
        if (!inVertProximity) continue;

        const isInside =
          !(itemRight < boxLeft || itemLeft > boxRight || itemBottom < boxTop || itemTop > boxBottom);

        items.push({
          str: item.str,
          x: itemLeft,
          y: itemTop,
          width: itemWidth,
          height: itemHeight,
          isInside
        });
      }
    } catch (err) {
      console.warn('Failed to extract PDF text tokens for snip region:', err);
    }
  }

  // 2. Also check any DOM text/LaTeX annotations on the page
  for (const ann of pageAnnotations) {
    if (ann.kind === 'text-math' && ann.content) {
      const annTop = ann.y;
      const annBottom = ann.y + (ann.height || 40);
      const annLeft = ann.x;
      const annRight = ann.x + (ann.width || 120);

      const inVertProximity = annBottom >= proxTop && annTop <= proxBottom;
      if (inVertProximity) {
        const isInside =
          !(annRight < boxLeft || annLeft > boxRight || annBottom < boxTop || annTop > boxBottom);

        items.push({
          str: ann.isLatex ? `$${ann.content}$` : ann.content,
          x: annLeft,
          y: annTop,
          width: ann.width || 120,
          height: ann.height || 40,
          isInside
        });
      }
    }
  }

  if (items.length === 0) {
    return {
      insideText: '',
      contextText: '',
      fullNearbySnippet: '',
      tokenCount: 0
    };
  }

  // Group text items by line (clustering by vertical position within ~6px)
  items.sort((a, b) => a.y - b.y || a.x - b.x);

  const lines: TextItemPosition[][] = [];
  let currentLine: TextItemPosition[] = [];
  let currentY = -999;

  for (const item of items) {
    if (Math.abs(item.y - currentY) > 8) {
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      currentLine = [item];
      currentY = item.y;
    } else {
      currentLine.push(item);
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  const insideLines: string[] = [];
  const allLines: string[] = [];

  for (const line of lines) {
    line.sort((a, b) => a.x - b.x);
    const lineStr = line.map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim();
    if (lineStr) {
      allLines.push(lineStr);
      if (line.some((it) => it.isInside)) {
        insideLines.push(lineStr);
      }
    }
  }

  const insideText = insideLines.join('\n').trim();
  const fullNearbySnippet = allLines.join('\n').trim();
  const contextLines = allLines.filter((l) => !insideLines.includes(l));
  const contextText = contextLines.join('\n').trim();

  const tokenCount = fullNearbySnippet.split(/\s+/).filter(Boolean).length;

  return {
    insideText,
    contextText,
    fullNearbySnippet,
    tokenCount
  };
}

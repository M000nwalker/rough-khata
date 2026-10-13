import * as pdfjsLib from 'pdfjs-dist';
import type { PageModel, PaperGrid } from '../types';

// Set up worker source
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.js';
}

export interface LoadedPdf {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pages: PageModel[];
}

export async function loadPdfDocument(arrayBuffer: ArrayBuffer): Promise<LoadedPdf> {
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const pages: PageModel[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });

    pages.push({
      id: `page-pdf-${i}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      pageNumber: i,
      isCustomPage: false,
      pdfPageIndex: i - 1,
      width: Math.round(viewport.width),
      height: Math.round(viewport.height),
      paperColor: '#ffffff',
      paperGrid: 'none',
      annotations: [],
      undoStack: [],
      redoStack: []
    });
  }

  return { pdfDoc, pages };
}

export async function renderPdfPage(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageIndex: number,
  canvas: HTMLCanvasElement,
  scale: number
): Promise<void> {
  const pageNumber = pageIndex + 1;
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  ctx.save();
  ctx.scale(dpr, dpr);

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport
  };

  await page.render(renderContext).promise;
  ctx.restore();
}

export function createBlankNotebook(
  title: string,
  pageCount: number = 5,
  width: number = 960,
  height: number = 720,
  paperColor: string = '#1e222a',
  paperGrid: PaperGrid = 'grid'
): { title: string; pages: PageModel[] } {
  const pages: PageModel[] = [];

  for (let i = 1; i <= pageCount; i++) {
    pages.push({
      id: `page-blank-${i}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      pageNumber: i,
      isCustomPage: true,
      width,
      height,
      paperColor,
      paperGrid,
      annotations: [],
      undoStack: [],
      redoStack: []
    });
  }

  return { title, pages };
}

export function insertBlankPage(
  existingPages: PageModel[],
  insertAfterIndex: number,
  width: number = 960,
  height: number = 720,
  paperColor: string = '#1e222a',
  paperGrid: PaperGrid = 'grid'
): PageModel[] {
  const newPage: PageModel = {
    id: `page-inserted-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    pageNumber: insertAfterIndex + 2,
    isCustomPage: true,
    width,
    height,
    paperColor,
    paperGrid,
    annotations: [],
    undoStack: [],
    redoStack: []
  };

  const newPages = [...existingPages];
  newPages.splice(insertAfterIndex + 1, 0, newPage);

  // Re-index page numbers
  return newPages.map((p, idx) => ({
    ...p,
    pageNumber: idx + 1
  }));
}

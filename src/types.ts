export type ToolType =
  | 'select'
  | 'pen'
  | 'highlighter'
  | 'eraser-stroke'
  | 'eraser-brush'
  | 'line'
  | 'arrow'
  | 'double-arrow'
  | 'rect'
  | 'circle'
  | 'triangle'
  | 'axes'
  | 'latex'
  | 'text'
  | 'laser'
  | 'snip';

export type PaperGrid = 'none' | 'grid' | 'dots' | 'lines' | 'isometric';

export type PaperPreset = {
  id: string;
  name: string;
  bgColor: string;
  gridColor: string;
  grid: PaperGrid;
};

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface StrokeAnnotation {
  id: string;
  kind: 'stroke';
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  isHighlighter?: boolean;
}

export interface ShapeAnnotation {
  id: string;
  kind: 'shape';
  shapeType: 'line' | 'arrow' | 'double-arrow' | 'rect' | 'circle' | 'triangle' | 'axes';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  width: number;
  fillColor?: string;
  dashed?: boolean;
}

export interface TextMathAnnotation {
  id: string;
  kind: 'text-math';
  isLatex: boolean;
  content: string; // raw latex string or plain text
  x: number;
  y: number;
  fontSize: number;
  color: string;
  bgColor?: string;
  width?: number;
  height?: number;
}

export interface ImageAnnotation {
  id: string;
  kind: 'image';
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Annotation =
  | StrokeAnnotation
  | ShapeAnnotation
  | TextMathAnnotation
  | ImageAnnotation;

export interface PageModel {
  id: string;
  pageNumber: number; // 1-indexed display
  isCustomPage: boolean;
  pdfPageIndex?: number; // 0-indexed reference to original PDF page
  width: number; // standard page width (e.g. 792 for US Letter or 842 for A4)
  height: number; // standard page height
  paperColor: string;
  paperGrid: PaperGrid;
  annotations: Annotation[];
  undoStack: Annotation[][];
  redoStack: Annotation[][];
}

export interface DocumentState {
  title: string;
  pdfData: ArrayBuffer | null;
  pages: PageModel[];
  currentPageIndex: number;
  scale: number; // Zoom level (1 = 100%)
  viewMode: 'single' | 'continuous' | 'split';
  splitScratchPageIndex?: number; // In split mode, the scratch page index
}

declare global {
  interface Window {
    electronAPI?: {
      openPdfDialog: () => Promise<{ filePath: string; name: string; data: ArrayBuffer } | null>;
      saveFileDialog: (options: {
        defaultName?: string;
        buffer: Uint8Array;
        filters?: Array<{ name: string; extensions: string[] }>;
      }) => Promise<{ success: boolean; filePath: string } | false>;
      isElectron?: boolean;
    };
  }
}

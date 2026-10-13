import type { Annotation, PaperGrid, ShapeAnnotation, StrokeAnnotation } from '../types';

/**
 * Draws paper grid/dots/lines on background canvas
 */
export function drawPaperPattern(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bgColor: string,
  grid: PaperGrid
) {
  // Fill background color
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  if (grid === 'none') return;

  const isDark = isColorDark(bgColor);
  const gridLineColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  const gridMajorColor = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.16)';
  const marginColor = isDark ? 'rgba(244, 63, 94, 0.35)' : 'rgba(239, 68, 68, 0.35)';

  ctx.save();

  if (grid === 'grid') {
    // Quadrille Graph Paper (25px cells, major line every 100px)
    const step = 25;
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += step) {
      ctx.strokeStyle = x % 100 === 0 ? gridMajorColor : gridLineColor;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += step) {
      ctx.strokeStyle = y % 100 === 0 ? gridMajorColor : gridLineColor;
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }
  } else if (grid === 'dots') {
    // Dotted Bullet Grid (24px spacing)
    const step = 24;
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.22)';
    const radius = 1.2;

    for (let x = step; x < width; x += step) {
      for (let y = step; y < height; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (grid === 'lines') {
    // Lined College Ruled Notebook Paper
    const lineStep = 32;
    const topMargin = 64;
    const leftMargin = 80;

    // Red left margin line
    ctx.strokeStyle = marginColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(leftMargin + 0.5, 0);
    ctx.lineTo(leftMargin + 0.5, height);
    ctx.stroke();

    // Horizontal notebook lines
    ctx.strokeStyle = gridLineColor;
    ctx.lineWidth = 1;
    for (let y = topMargin; y <= height; y += lineStep) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }
  } else if (grid === 'isometric') {
    // Isometric 3D Triangle Grid
    const size = 30;
    const h = size * Math.sqrt(3);
    ctx.strokeStyle = gridLineColor;
    ctx.lineWidth = 0.8;

    for (let y = 0; y <= height + h; y += h) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 60-degree diagonals
    const diagCount = Math.ceil((width + height) / size);
    for (let i = -diagCount; i <= diagCount; i++) {
      ctx.beginPath();
      ctx.moveTo(i * size, 0);
      ctx.lineTo(i * size + height / Math.sqrt(3), height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(i * size, 0);
      ctx.lineTo(i * size - height / Math.sqrt(3), height);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draws a single stroke with smooth quadratic Bézier interpolation
 */
export function drawStroke(ctx: CanvasRenderingContext2D, stroke: StrokeAnnotation) {
  const points = stroke.points;
  if (!points || points.length === 0) return;

  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (stroke.isHighlighter) {
    ctx.globalAlpha = stroke.opacity || 0.4;
    ctx.globalCompositeOperation = 'multiply';
  } else {
    ctx.globalAlpha = stroke.opacity || 1.0;
  }

  if (points.length === 1) {
    ctx.fillStyle = stroke.color;
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, stroke.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
  } else {
    // Smooth Catmull-Rom / Midpoint Quadratic Spline
    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }
    // Final point
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * Draws geometric shapes & STEM Cartesian coordinate axes
 */
export function drawShape(ctx: CanvasRenderingContext2D, shape: ShapeAnnotation) {
  ctx.save();
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (shape.dashed) {
    ctx.setLineDash([8, 6]);
  }

  const { startX, startY, endX, endY } = shape;

  switch (shape.shapeType) {
    case 'line': {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      break;
    }

    case 'arrow': {
      drawArrow(ctx, startX, startY, endX, endY, shape.width, false);
      break;
    }

    case 'double-arrow': {
      drawArrow(ctx, startX, startY, endX, endY, shape.width, true);
      break;
    }

    case 'rect': {
      const rx = Math.min(startX, endX);
      const ry = Math.min(startY, endY);
      const rw = Math.abs(endX - startX);
      const rh = Math.abs(endY - startY);

      if (shape.fillColor) {
        ctx.fillStyle = shape.fillColor;
        ctx.fillRect(rx, ry, rw, rh);
      }
      ctx.strokeRect(rx, ry, rw, rh);
      break;
    }

    case 'circle': {
      const cx = (startX + endX) / 2;
      const cy = (startY + endY) / 2;
      const rx = Math.abs(endX - startX) / 2;
      const ry = Math.abs(endY - startY) / 2;

      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (shape.fillColor) {
        ctx.fillStyle = shape.fillColor;
        ctx.fill();
      }
      ctx.stroke();
      break;
    }

    case 'triangle': {
      ctx.beginPath();
      ctx.moveTo(startX, endY);
      ctx.lineTo((startX + endX) / 2, startY);
      ctx.lineTo(endX, endY);
      ctx.closePath();
      if (shape.fillColor) {
        ctx.fillStyle = shape.fillColor;
        ctx.fill();
      }
      ctx.stroke();
      break;
    }

    case 'axes': {
      // Cartesian Coordinate Axes (STEM feature)
      drawCartesianAxes(ctx, startX, startY, endX, endY, shape.width);
      break;
    }
  }

  ctx.restore();
}

/**
 * Draws arrow with proportional head
 */
function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  lineWidth: number,
  bidirectional: boolean
) {
  const headLen = Math.max(14, lineWidth * 3.5);
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Forward arrow head
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();

  if (bidirectional) {
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(fromX + headLen * Math.cos(angle - Math.PI / 6), fromY + headLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(fromX + headLen * Math.cos(angle + Math.PI / 6), fromY + headLen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  }
}

/**
 * Draws Cartesian coordinate system with arrows and tick marks
 */
function drawCartesianAxes(
  ctx: CanvasRenderingContext2D,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  lineWidth: number
) {
  const originX = (minX + maxX) / 2;
  const originY = (minY + maxY) / 2;
  const tickSize = 6;
  const tickSpacing = 28;

  // X Axis
  drawArrow(ctx, minX, originY, maxX, originY, lineWidth, false);
  // Y Axis (upwards is negative Y in canvas)
  drawArrow(ctx, originX, maxY, originX, minY, lineWidth, false);

  // X axis tick marks
  for (let x = originX + tickSpacing; x < maxX - 20; x += tickSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, originY - tickSize);
    ctx.lineTo(x, originY + tickSize);
    ctx.stroke();
  }
  for (let x = originX - tickSpacing; x > minX + 20; x -= tickSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, originY - tickSize);
    ctx.lineTo(x, originY + tickSize);
    ctx.stroke();
  }

  // Y axis tick marks
  for (let y = originY - tickSpacing; y > minY + 20; y -= tickSpacing) {
    ctx.beginPath();
    ctx.moveTo(originX - tickSize, y);
    ctx.lineTo(originX + tickSize, y);
    ctx.stroke();
  }
  for (let y = originY + tickSpacing; y < maxY - 20; y += tickSpacing) {
    ctx.beginPath();
    ctx.moveTo(originX - tickSize, y);
    ctx.lineTo(originX + tickSize, y);
    ctx.stroke();
  }

  // Draw axis labels 'x' and 'y'
  ctx.save();
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fillText('x', maxX + 6, originY + 5);
  ctx.fillText('y', originX - 6, minY - 8);
  ctx.fillText('O', originX - 14, originY + 16);
  ctx.restore();
}

/**
 * Checks if a point hits an annotation (for stroke eraser)
 */
export function hitTestAnnotation(annotation: Annotation, px: number, py: number, tolerance: number = 10): boolean {
  if (annotation.kind === 'stroke') {
    for (const pt of annotation.points) {
      const dist = Math.hypot(pt.x - px, pt.y - py);
      if (dist <= Math.max(tolerance, annotation.width / 2 + 5)) {
        return true;
      }
    }
  } else if (annotation.kind === 'shape') {
    const { startX, startY, endX, endY } = annotation;
    const minX = Math.min(startX, endX) - tolerance;
    const maxX = Math.max(startX, endX) + tolerance;
    const minY = Math.min(startY, endY) - tolerance;
    const maxY = Math.max(startY, endY) + tolerance;
    return px >= minX && px <= maxX && py >= minY && py <= maxY;
  } else if (annotation.kind === 'text-math' || annotation.kind === 'image') {
    const w = annotation.width || 150;
    const h = annotation.height || 40;
    return px >= annotation.x && px <= annotation.x + w && py >= annotation.y && py <= annotation.y + h;
  }
  return false;
}

function isColorDark(hexColor: string): boolean {
  if (!hexColor.startsWith('#')) return false;
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  // Perceived brightness formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
}

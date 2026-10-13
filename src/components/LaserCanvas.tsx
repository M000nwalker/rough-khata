import React, { useEffect, useRef } from 'react';

interface LaserPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface LaserCanvasProps {
  width: number;
  height: number;
  active: boolean;
  laserColor?: string;
}

export const LaserCanvas: React.FC<LaserCanvasProps> = ({
  width,
  height,
  active,
  laserColor = '#ef4444' // Vivid laser red
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<LaserPoint[]>([]);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      pointsRef.current = [];
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, width, height);
      }
      return;
    }

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const now = Date.now();
      const maxAge = 650; // Fade out duration in ms

      // Filter out points older than maxAge
      pointsRef.current = pointsRef.current.filter((p) => now - p.timestamp < maxAge);

      ctx.clearRect(0, 0, width, height);

      const pts = pointsRef.current;
      if (pts.length > 1) {
        for (let i = 1; i < pts.length; i++) {
          const p1 = pts[i - 1];
          const p2 = pts[i];
          const age = now - p2.timestamp;
          const progress = 1 - age / maxAge; // 1 down to 0
          const alpha = Math.max(0, Math.min(1, progress));

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = laserColor;
          ctx.lineWidth = Math.max(2, 8 * progress);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowColor = laserColor;
          ctx.shadowBlur = 12 * progress;
          ctx.globalAlpha = alpha;
          ctx.stroke();
          ctx.restore();
        }
      }

      if (pts.length > 0) {
        const last = pts[pts.length - 1];
        // Draw bright laser pointer head with glow
        ctx.save();
        ctx.beginPath();
        ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = laserColor;
        ctx.shadowBlur = 18;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(last.x, last.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = laserColor;
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [active, width, height, laserColor]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    pointsRef.current.push({ x, y, timestamp: Date.now() });
  };

  const handlePointerLeave = () => {
    // When pointer leaves, keep fading out existing points
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`laser-pointer-canvas ${active ? 'interactive' : ''}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    />
  );
};

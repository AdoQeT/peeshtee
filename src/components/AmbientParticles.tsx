import React, { useEffect, useRef } from 'react';
import { TableTheme } from '../types/game';

interface AmbientParticlesProps {
  theme?: TableTheme | 'uno';
  unoColor?: 'red' | 'blue' | 'green' | 'yellow';
  intensity?: 'normal' | 'dense';
}

const THEME_PALETTES: Record<string, string[]> = {
  estoril_blue: ['#60a5fa', '#38bdf8', '#93c5fd', '#bfdbfe', '#ffffff', '#2563eb'],
  alpine_white: ['#ffffff', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#e0e7ff'],
  melbourne_red: ['#ef4444', '#dc2626', '#b91c1c', '#f87171', '#fbbf24', '#ffffff'],
  monaco_velvet: ['#10b981', '#34d399', '#f59e0b', '#6ee7b7', '#fbbf24', '#a7f3d0'],
  sakura: ['#f472b6', '#fb7185', '#fda4af', '#fbcfe8', '#ffffff'],
  luxury_gold: ['#fbbf24', '#f59e0b', '#d97706', '#fef08a', '#ffffff'],
  traditional: ['#34d399', '#10b981', '#fbbf24', '#a7f3d0', '#fef3c7'],
  uno_red: ['#ef4444', '#f87171', '#fca5a5', '#fbbf24', '#ffffff'],
  uno_blue: ['#3b82f6', '#60a5fa', '#93c5fd', '#38bdf8', '#ffffff'],
  uno_green: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#ffffff'],
  uno_yellow: ['#f59e0b', '#fbbf24', '#fde047', '#fef08a', '#ffffff']
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  fadeSpeed: number;
  color: string;
  wobbleSpeed: number;
  wobbleAmp: number;
  phase: number;
}

export const AmbientParticles: React.FC<AmbientParticlesProps> = ({
  theme = 'traditional',
  unoColor,
  intensity = 'dense'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    let width = canvas.parentElement?.clientWidth || window.innerWidth;
    let height = canvas.parentElement?.clientHeight || window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const handleResize = () => {
      if (!canvas) return;
      dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.parentElement?.clientHeight || window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener('resize', handleResize);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const paletteKey =
      theme === 'uno' && unoColor
        ? `uno_${unoColor}`
        : THEME_PALETTES[theme]
        ? theme
        : 'estoril_blue';
    const colors = THEME_PALETTES[paletteKey] || THEME_PALETTES.estoril_blue;

    const isMobile = width < 640;
    const count = intensity === 'dense' ? (isMobile ? 28 : 55) : (isMobile ? 16 : 32);
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const baseAlpha = 0.25 + Math.random() * 0.55;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: -0.25 - Math.random() * 0.45, // gentle upward drift
        size: 1.4 + Math.random() * 2.8,
        alpha: baseAlpha,
        baseAlpha,
        fadeSpeed: 0.008 + Math.random() * 0.015,
        color: colors[Math.floor(Math.random() * colors.length)],
        wobbleSpeed: 0.01 + Math.random() * 0.02,
        wobbleAmp: 0.5 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2
      });
    }

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(32, time - lastTime) / 16.66;
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.phase += p.wobbleSpeed * dt;
        p.x += (p.vx + Math.sin(p.phase) * p.wobbleAmp) * dt;
        p.y += p.vy * dt;

        // Subtle alpha breathing pulse
        p.alpha = p.baseAlpha * (0.65 + 0.35 * Math.sin(p.phase * 1.5));

        // Screen wrap
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        } else if (p.y > height + 10) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        else if (p.x > width + 10) p.x = -10;

        // Draw soft glowing mote with zero CPU shadowBlur overhead
        ctx.save();
        ctx.fillStyle = p.color;
        // Outer soft halo
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha * 0.35));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();

        // Inner sharp nucleus
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme, unoColor, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0 w-full h-full"
    />
  );
};

import React, { useEffect, useRef } from 'react';
import { TableTheme } from '../types/game';

interface AmbientParticlesProps {
  theme?: TableTheme | 'uno';
  unoColor?: 'red' | 'blue' | 'green' | 'yellow';
  intensity?: 'normal' | 'dense';
  quality?: 'auto' | 'low' | 'medium' | 'high';
}

const THEME_PALETTES: Record<string, string[]> = {
  estoril_blue: ['#38bdf8', '#0ea5e9', '#60a5fa', '#bae6fd', '#ffffff', '#0284c7', '#93c5fd', '#7dd3fc'],
  alpine_white: ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#e0e7ff'],
  melbourne_red: ['#ef4444', '#dc2626', '#b91c1c', '#f87171', '#fbbf24', '#fef08a', '#ffffff'],
  monaco_velvet: ['#c084fc', '#a855f7', '#7e22ce', '#fbbf24', '#f59e0b', '#fef08a', '#e9d5ff', '#ffffff'],
  sakura: ['#f472b6', '#fb7185', '#fda4af', '#fbcfe8', '#f43f5e', '#ffffff'],
  luxury_gold: ['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#fef08a', '#fef3c7', '#ffffff'],
  traditional: ['#34d399', '#10b981', '#059669', '#fbbf24', '#f59e0b', '#a7f3d0', '#fef3c7', '#ffffff'],
  neon_cyber: ['#22d3ee', '#e879f9', '#38bdf8', '#c084fc', '#f472b6', '#ffffff'],
  ottoman_palace: ['#fbbf24', '#f59e0b', '#f43f5e', '#e11d48', '#fde68a', '#ffffff'],
  arctic_aurora: ['#2dd4bf', '#38bdf8', '#5eead4', '#a7f3d0', '#7dd3fc', '#ffffff'],
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

const AmbientParticlesInner: React.FC<AmbientParticlesProps> = ({
  theme = 'traditional',
  unoColor,
  intensity = 'dense',
  quality = 'auto'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || quality === 'low') {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let animId: number | null = null;
    let dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.5);
    let width = canvas.parentElement?.clientWidth || window.innerWidth;
    let height = canvas.parentElement?.clientHeight || window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let resizeRaf: number | null = null;
    const handleResize = () => {
      if (resizeRaf !== null) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        if (!canvas) return;
        dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.5);
        width = canvas.parentElement?.clientWidth || window.innerWidth;
        height = canvas.parentElement?.clientHeight || window.innerHeight;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      });
    };
    window.addEventListener('resize', handleResize);

    const paletteKey =
      theme === 'uno' && unoColor
        ? `uno_${unoColor}`
        : THEME_PALETTES[theme]
        ? theme
        : 'estoril_blue';
    const colors = THEME_PALETTES[paletteKey] || THEME_PALETTES.estoril_blue;

    const isMobile = width < 640;
    const baseCount = intensity === 'dense' ? (isMobile ? 18 : 32) : (isMobile ? 12 : 22);
    const qualityMult = quality === 'medium' ? 0.55 : 1.0;
    const count = Math.max(6, Math.round(baseCount * qualityMult));
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const baseAlpha = 0.25 + Math.random() * 0.5;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.42,
        vy: -0.22 - Math.random() * 0.42,
        size: 1.4 + Math.random() * 2.5,
        alpha: baseAlpha,
        baseAlpha,
        fadeSpeed: 0.008 + Math.random() * 0.015,
        color: colors[Math.floor(Math.random() * colors.length)],
        wobbleSpeed: 0.01 + Math.random() * 0.02,
        wobbleAmp: 0.45 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2
      });
    }

    let lastTime = performance.now();

    const render = (time: number) => {
      if (document.hidden) {
        animId = null;
        return;
      }

      const dt = Math.min(2.5, Math.max(0.25, (time - lastTime) / 16.667));
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.phase += p.wobbleSpeed * dt;
        p.x += (p.vx + Math.sin(p.phase) * p.wobbleAmp) * dt;
        p.y += p.vy * dt;

        p.alpha = p.baseAlpha * (0.65 + 0.35 * Math.sin(p.phase * 1.5));

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        } else if (p.y > height + 10) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        else if (p.x > width + 10) p.x = -10;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha * 0.32));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      animId = requestAnimationFrame(render);
    };

    const handleVisibility = () => {
      if (!document.hidden && animId === null) {
        lastTime = performance.now();
        animId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    animId = requestAnimationFrame(render);

    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
      if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [theme, unoColor, intensity, quality]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0 w-full h-full"
    />
  );
};

export const AmbientParticles = React.memo(AmbientParticlesInner);

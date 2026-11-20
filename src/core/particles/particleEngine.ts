/**
 * Project Pişti - Ultra-Smooth 144 FPS Canvas Particle, Sakura Petal & Shockwave Engine
 * Optimized with zero per-frame shadowBlur overhead for buttery performance.
 */
import { TableTheme, GraphicsQuality } from '../../types/game';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  gravity: number;
  glow?: boolean;
  kind?: 'spark' | 'petal';
  angle?: number;
  spin?: number;
  flipPhase?: number;
  flipSpeed?: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  lineWidth: number;
  color: string;
  alpha: number;
  speed: number;
}

interface ImpactStreak {
  x: number;
  y: number;
  angle: number;
  length: number;
  maxLength: number;
  speed: number;
  color: string;
  alpha: number;
}

const SAKURA_COLORS = ['#fbcfe8', '#f9a8d4', '#f472b6', '#fda4af', '#fff1f2'];

export class ParticleEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private shockwaves: Shockwave[] = [];
  private streaks: ImpactStreak[] = [];
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private currentTheme: TableTheme = 'sakura';
  private enabled: boolean = true;
  private quality: GraphicsQuality = 'auto';
  private resizeRafId: number | null = null;
  private viewWidth: number = 1280;
  private viewHeight: number = 720;
  private lastFrameTime: number = 0;

  public init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.resize();
    window.addEventListener('resize', this.handleResize);
    // Demand-driven: loop wakes automatically only when bursts/shockwaves/streaks are active
  }

  public setTheme(theme: TableTheme) {
    this.currentTheme = theme;
  }

  public setQuality(quality: GraphicsQuality) {
    this.quality = quality;
  }

  private getQualityMultiplier(): number {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return 0;
    }
    if (this.quality === 'low') return 0.25;
    if (this.quality === 'medium') return 0.6;
    if (this.quality === 'high') return 1.0;
    // auto
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
    if (cores <= 2) return 0.35;
    if (cores <= 4) return 0.7;
    return 1.0;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.particles = [];
      this.shockwaves = [];
      this.streaks = [];
      this.clearAndStop();
    }
  }

  public destroy() {
    this.stopLoop();
    window.removeEventListener('resize', this.handleResize);
    if (this.resizeRafId !== null) {
      cancelAnimationFrame(this.resizeRafId);
      this.resizeRafId = null;
    }
    this.particles = [];
    this.shockwaves = [];
    this.streaks = [];
  }

  private handleResize = () => {
    if (this.resizeRafId !== null) return;
    this.resizeRafId = requestAnimationFrame(() => {
      this.resize();
      this.resizeRafId = null;
    });
  };

  public resize() {
    if (!this.canvas) return;
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.5);
    this.viewWidth = window.innerWidth;
    this.viewHeight = window.innerHeight;
    this.canvas.width = Math.round(this.viewWidth * dpr);
    this.canvas.height = Math.round(this.viewHeight * dpr);
    this.canvas.style.width = `${this.viewWidth}px`;
    this.canvas.style.height = `${this.viewHeight}px`;
    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  private wakeLoop() {
    if (this.isRunning || !this.ctx || !this.canvas) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    const loop = (now: number) => {
      if (!this.isRunning) return;
      const dt = Math.min(2.5, Math.max(0.25, (now - this.lastFrameTime) / 16.667));
      this.lastFrameTime = now;
      this.updateAndRender(dt);
      if (this.particles.length === 0 && this.shockwaves.length === 0 && this.streaks.length === 0) {
        this.clearAndStop();
        return;
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private clearAndStop() {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);
    }
    this.stopLoop();
  }

  private stopLoop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Spawns an epic Pişti shockwave & Sakura/Fire explosion
   */
  public triggerPistiExplosion(x: number, y: number, isDouble: boolean = false) {
    if (!this.enabled) return;

    const mult = this.getQualityMultiplier();
    if (mult <= 0) return;

    const isSakura = this.currentTheme === 'sakura';
    const primaryColor = isDouble
      ? '#ec4899'
      : isSakura
      ? '#f472b6'
      : '#f59e0b';
    const secondaryColor = isDouble
      ? '#a855f7'
      : isSakura
      ? '#fb7185'
      : '#ef4444';
    const sparkCount = Math.max(12, Math.round((isDouble ? 85 : 58) * mult));

    this.shockwaves.push({
      x,
      y,
      radius: 12,
      maxRadius: isDouble ? 440 : 320,
      lineWidth: isDouble ? 11 : 7,
      color: primaryColor,
      alpha: 1,
      speed: 15
    });

    setTimeout(() => {
      if (!this.enabled) return;
      this.shockwaves.push({
        x,
        y,
        radius: 10,
        maxRadius: isDouble ? 360 : 250,
        lineWidth: 5,
        color: isSakura ? '#fbcfe8' : '#38bdf8',
        alpha: 0.9,
        speed: 11
      });
      this.wakeLoop();
    }, 75);

    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 13 + 3.5;
      const isPetal = isSakura && i % 2 === 0;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: isPetal ? Math.random() * 6 + 4.5 : Math.random() * 4 + 2,
        color: isPetal
          ? SAKURA_COLORS[Math.floor(Math.random() * SAKURA_COLORS.length)]
          : i % 2 === 0
          ? primaryColor
          : secondaryColor,
        alpha: 1,
        decay: isPetal ? Math.random() * 0.014 + 0.009 : Math.random() * 0.022 + 0.015,
        gravity: isPetal ? 0.09 : 0.2,
        glow: !isPetal,
        kind: isPetal ? 'petal' : 'spark',
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.14,
        flipPhase: Math.random() * Math.PI * 2,
        flipSpeed: Math.random() * 0.12 + 0.05
      });
    }

    const streakCount = Math.max(4, Math.round((isDouble ? 20 : 14) * mult));
    for (let i = 0; i < streakCount; i++) {
      const angle = (i / streakCount) * Math.PI * 2 + (Math.random() * 0.2 - 0.1);
      this.streaks.push({
        x,
        y,
        angle,
        length: 20,
        maxLength: Math.random() * 130 + 75,
        speed: Math.random() * 12 + 10,
        color: isSakura ? '#ffe4e6' : '#ffffff',
        alpha: 1
      });
    }

    this.wakeLoop();
  }

  /**
   * Spawns a swirling vortex when a Vale is played
   */
  public triggerJackVortex(x: number, y: number) {
    if (!this.enabled) return;
    const mult = this.getQualityMultiplier();
    if (mult <= 0) return;
    const isSakura = this.currentTheme === 'sakura';
    const particleCount = Math.max(8, Math.round(38 * mult));

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const dist = Math.random() * 160 + 45;
      const isPetal = isSakura && i % 2 === 0;

      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: -Math.cos(angle) * 3.2 - Math.sin(angle) * 4.2,
        vy: -Math.sin(angle) * 3.2 + Math.cos(angle) * 4.2,
        radius: isPetal ? 6 : Math.random() * 3.8 + 2,
        color: isPetal ? '#f9a8d4' : '#facc15',
        alpha: 0.95,
        decay: 0.024,
        gravity: 0,
        glow: !isPetal,
        kind: isPetal ? 'petal' : 'spark',
        angle: angle,
        spin: 0.1,
        flipPhase: i,
        flipSpeed: 0.08
      });
    }
    this.wakeLoop();
  }

  /**
   * Emits a dynamic particle spark burst and miniature shockwave at given coordinates
   */
  public emitBurst(x: number, y: number, color: string = '#fbbf24', count: number = 24) {
    if (!this.enabled) return;
    const mult = this.getQualityMultiplier();
    if (mult <= 0) return;
    const scaledCount = Math.max(4, Math.round(count * mult));
    for (let i = 0; i < scaledCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 2.8 + 1.2,
        color,
        alpha: 0.95,
        decay: 0.035,
        gravity: 0.06,
        glow: true,
        kind: 'spark',
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.15
      });
    }
    this.shockwaves.push({
      x,
      y,
      radius: 5,
      maxRadius: 55,
      lineWidth: 2.5,
      color,
      alpha: 0.75,
      speed: 3.2
    });
    this.wakeLoop();
  }

  /**
   * Spawns subtle card placement burst (Theme-tuned: Sakura petals, cyber neon sparks, gold flakes, cosmic dust)
   */
  public triggerCardPlace(x: number, y: number) {
    if (!this.enabled) return;
    const mult = this.getQualityMultiplier();
    if (mult <= 0) return;
    const theme = this.currentTheme;
    const isSakura = theme === 'sakura';
    const isEstoril = theme === 'estoril_blue';
    const isGold = theme === 'luxury_gold';
    const isMonaco = theme === 'monaco_velvet';
    const isCyber = theme === 'neon_cyber';
    const isOttoman = theme === 'ottoman_palace';
    const isArctic = theme === 'arctic_aurora';
    const count = Math.max(3, Math.round((isSakura ? 12 : 10) * mult));

    const themeColors = isSakura
      ? SAKURA_COLORS
      : isEstoril
      ? ['#38bdf8', '#0ea5e9', '#67e8f9', '#bae6fd']
      : isGold
      ? ['#fbbf24', '#f59e0b', '#fde047', '#ffd700']
      : isMonaco
      ? ['#10b981', '#34d399', '#f59e0b', '#a7f3d0']
      : isCyber
      ? ['#22d3ee', '#e879f9', '#38bdf8', '#f472b6']
      : isOttoman
      ? ['#fbbf24', '#f43f5e', '#f59e0b', '#fde68a']
      : isArctic
      ? ['#2dd4bf', '#38bdf8', '#a7f3d0', '#e0f2fe']
      : ['#ef4444', '#3b82f6', '#f8fafc', '#fbbf24'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.4;
      const isPetal = isSakura && i % 2 === 0;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: isPetal ? Math.random() * 4.2 + 3.8 : Math.random() * 2.2 + 1,
        color: isPetal
          ? SAKURA_COLORS[Math.floor(Math.random() * SAKURA_COLORS.length)]
          : themeColors[Math.floor(Math.random() * themeColors.length)],
        alpha: 0.85,
        decay: isPetal ? 0.026 : 0.042,
        gravity: isPetal ? 0.04 : 0.08,
        kind: isPetal ? 'petal' : 'spark',
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.1,
        flipPhase: Math.random() * Math.PI,
        flipSpeed: 0.08
      });
    }
    this.wakeLoop();
  }

  /**
   * Draws a single authentic notched Cherry Blossom (Sakura) petal (No CPU shadowBlur!)
   */
  private drawSakuraPetal(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    angle: number,
    flipPhase: number,
    color: string,
    alpha: number
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const scaleY = Math.max(0.22, Math.abs(Math.cos(flipPhase)));
    ctx.scale(1, scaleY);

    ctx.beginPath();
    ctx.moveTo(0, size * 0.8);
    ctx.bezierCurveTo(-size * 0.9, size * 0.3, -size * 0.85, -size * 0.7, -size * 0.2, -size);
    ctx.lineTo(0, -size * 0.72);
    ctx.lineTo(size * 0.2, -size);
    ctx.bezierCurveTo(size * 0.85, -size * 0.7, size * 0.9, size * 0.3, 0, size * 0.8);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fill();
    ctx.restore();
  }

  private updateAndRender(dt: number) {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);
    const drag = Math.pow(0.98, dt);

    // 1. Render & update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed * dt;
      sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);

      if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves[i] = this.shockwaves[this.shockwaves.length - 1];
        this.shockwaves.pop();
        continue;
      }

      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = sw.color;
      this.ctx.globalAlpha = sw.alpha;
      this.ctx.lineWidth = sw.lineWidth * sw.alpha;
      this.ctx.stroke();
    }

    // 2. Render & update radial streaks
    for (let i = this.streaks.length - 1; i >= 0; i--) {
      const st = this.streaks[i];
      st.length += st.speed * dt;
      st.alpha -= 0.038 * dt;

      if (st.alpha <= 0 || st.length >= st.maxLength) {
        this.streaks[i] = this.streaks[this.streaks.length - 1];
        this.streaks.pop();
        continue;
      }

      const startDist = 28;
      const startX = st.x + Math.cos(st.angle) * startDist;
      const startY = st.y + Math.sin(st.angle) * startDist;
      const endX = st.x + Math.cos(st.angle) * (startDist + st.length);
      const endY = st.y + Math.sin(st.angle) * (startDist + st.length);

      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);
      this.ctx.strokeStyle = st.color;
      this.ctx.lineWidth = 2.8;
      this.ctx.globalAlpha = Math.max(0, st.alpha);
      this.ctx.stroke();
    }

    // 3. Render & update burst particles (sparks & petals)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= drag;
      p.vy *= drag;
      p.alpha -= p.decay * dt;

      if (p.alpha <= 0) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
        continue;
      }

      if (p.kind === 'petal') {
        p.angle = (p.angle || 0) + (p.spin || 0.05) * dt;
        p.flipPhase = (p.flipPhase || 0) + (p.flipSpeed || 0.08) * dt;
        this.drawSakuraPetal(
          this.ctx,
          p.x,
          p.y,
          p.radius,
          p.angle,
          p.flipPhase,
          p.color,
          p.alpha
        );
      } else {
        const a = Math.max(0, p.alpha);
        this.ctx.fillStyle = p.color;
        if (p.glow) {
          this.ctx.globalAlpha = a * 0.25;
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.radius * 2.2, 0, Math.PI * 2);
          this.ctx.fill();
        }
        this.ctx.globalAlpha = a;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    this.ctx.globalAlpha = 1;
  }
}

export const particleEngine = new ParticleEngine();

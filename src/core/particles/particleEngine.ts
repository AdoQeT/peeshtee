/**
 * Project Pişti - Ultra-Smooth 144 FPS Canvas Particle, Sakura Petal & Shockwave Engine
 * Optimized with zero per-frame shadowBlur overhead for buttery performance.
 */
import { TableTheme } from '../../types/game';

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

interface AmbientPetal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  spin: number;
  swayPhase: number;
  swaySpeed: number;
  flipPhase: number;
  flipSpeed: number;
  color: string;
  alpha: number;
  isSpiritWisp?: boolean;
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
  private ambientPetals: AmbientPetal[] = [];
  private shockwaves: Shockwave[] = [];
  private streaks: ImpactStreak[] = [];
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private currentTheme: TableTheme = 'sakura';
  private enabled: boolean = true;

  public init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.resize();
    this.seedAmbientParticles();
    window.addEventListener('resize', this.handleResize);
    this.startLoop();
  }

  public setTheme(theme: TableTheme) {
    if (this.currentTheme !== theme) {
      this.currentTheme = theme;
      this.seedAmbientParticles();
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.particles = [];
      this.shockwaves = [];
      this.streaks = [];
    }
  }

  public destroy() {
    this.stopLoop();
    window.removeEventListener('resize', this.handleResize);
    this.particles = [];
    this.ambientPetals = [];
    this.shockwaves = [];
    this.streaks = [];
  }

  private handleResize = () => {
    this.resize();
    this.seedAmbientParticles();
  };

  public resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private seedAmbientParticles() {
    this.ambientPetals = [];
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const h = typeof window !== 'undefined' ? window.innerHeight : 720;

    if (this.currentTheme === 'sakura') {
      // 8 drifting Sakura petals + 4 floating Spirit Wisps (Lightweight 144fps)
      for (let i = 0; i < 8; i++) {
        this.ambientPetals.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: Math.random() * 0.55 + 0.2,
          vy: Math.random() * 0.65 + 0.35,
          size: Math.random() * 5.5 + 4.5,
          angle: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.022,
          swayPhase: Math.random() * Math.PI * 2,
          swaySpeed: Math.random() * 0.018 + 0.01,
          flipPhase: Math.random() * Math.PI * 2,
          flipSpeed: Math.random() * 0.035 + 0.015,
          color: SAKURA_COLORS[Math.floor(Math.random() * SAKURA_COLORS.length)],
          alpha: Math.random() * 0.4 + 0.25,
          isSpiritWisp: false
        });
      }

      for (let i = 0; i < 4; i++) {
        this.ambientPetals.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.25,
          vy: -Math.random() * 0.4 - 0.15,
          size: Math.random() * 2.5 + 1.5,
          angle: 0,
          spin: 0,
          swayPhase: Math.random() * Math.PI * 2,
          swaySpeed: 0.02,
          flipPhase: 0,
          flipSpeed: 0,
          color: i % 2 === 0 ? '#f472b6' : '#c084fc',
          alpha: Math.random() * 0.4 + 0.2,
          isSpiritWisp: true
        });
      }
    } else {
      const moteColor =
        this.currentTheme === 'estoril_blue'
          ? '#38bdf8'
          : this.currentTheme === 'monaco_velvet'
          ? '#10b981'
          : '#fbbf24';

      for (let i = 0; i < 14; i++) {
        this.ambientPetals.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.25,
          vy: -Math.random() * 0.35 - 0.1,
          size: Math.random() * 2.2 + 1,
          angle: 0,
          spin: 0,
          swayPhase: Math.random() * Math.PI * 2,
          swaySpeed: 0.015,
          flipPhase: 0,
          flipSpeed: 0,
          color: moteColor,
          alpha: Math.random() * 0.3 + 0.1,
          isSpiritWisp: true
        });
      }
    }
  }

  private startLoop() {
    if (this.isRunning) return;
    this.isRunning = true;
    const loop = () => {
      this.updateAndRender();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
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
    const sparkCount = isDouble ? 85 : 58;

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

    const streakCount = isDouble ? 20 : 14;
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
  }

  /**
   * Spawns a swirling vortex when a Vale is played
   */
  public triggerJackVortex(x: number, y: number) {
    if (!this.enabled) return;
    const isSakura = this.currentTheme === 'sakura';
    const particleCount = 38;

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
  }

  /**
   * Spawns subtle card placement burst (Theme-tuned: Sakura petals, cyber neon sparks, gold flakes, cosmic dust)
   */
  public triggerCardPlace(x: number, y: number) {
    if (!this.enabled) return;
    const theme = this.currentTheme;
    const isSakura = theme === 'sakura';
    const isEstoril = theme === 'estoril_blue';
    const isGold = theme === 'luxury_gold';
    const isMonaco = theme === 'monaco_velvet';
    const count = isSakura ? 12 : 10;

    const themeColors = isSakura
      ? SAKURA_COLORS
      : isEstoril
      ? ['#38bdf8', '#0ea5e9', '#67e8f9', '#bae6fd']
      : isGold
      ? ['#fbbf24', '#f59e0b', '#fde047', '#ffd700']
      : isMonaco
      ? ['#10b981', '#34d399', '#f59e0b', '#a7f3d0']
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

  private updateAndRender() {
    if (!this.ctx || !this.canvas) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);

    // 0. Render & update Ambient Sakura Petals & Spirit Wisps (Fast path, no shadowBlur)
    if (this.enabled) {
      for (let i = 0; i < this.ambientPetals.length; i++) {
        const ap = this.ambientPetals[i];
        ap.swayPhase += ap.swaySpeed;
        ap.flipPhase += ap.flipSpeed;
        ap.angle += ap.spin;

        ap.x += ap.vx + Math.sin(ap.swayPhase) * 0.42;
        ap.y += ap.vy;

        if (ap.y > h + 20) {
          ap.y = -20;
          ap.x = Math.random() * w;
        } else if (ap.y < -20) {
          ap.y = h + 20;
          ap.x = Math.random() * w;
        }
        if (ap.x > w + 20) {
          ap.x = -20;
        } else if (ap.x < -20) {
          ap.x = w + 20;
        }

        if (ap.isSpiritWisp) {
          const curAlpha = ap.alpha * (0.65 + 0.35 * Math.sin(ap.swayPhase * 2));
          this.ctx.fillStyle = ap.color;
          // Outer soft halo
          this.ctx.globalAlpha = curAlpha * 0.28;
          this.ctx.beginPath();
          this.ctx.arc(ap.x, ap.y, ap.size * 2.4, 0, Math.PI * 2);
          this.ctx.fill();
          // Inner core
          this.ctx.globalAlpha = curAlpha;
          this.ctx.beginPath();
          this.ctx.arc(ap.x, ap.y, ap.size, 0, Math.PI * 2);
          this.ctx.fill();
        } else {
          this.drawSakuraPetal(
            this.ctx,
            ap.x,
            ap.y,
            ap.size,
            ap.angle,
            ap.flipPhase,
            ap.color,
            ap.alpha
          );
        }
      }
    }

    // 1. Render & update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed;
      sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);

      if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = sw.color;
      this.ctx.globalAlpha = sw.alpha;
      this.ctx.lineWidth = sw.lineWidth * sw.alpha;
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 2. Render & update radial streaks
    for (let i = this.streaks.length - 1; i >= 0; i--) {
      const st = this.streaks[i];
      st.length += st.speed;
      st.alpha -= 0.038;

      if (st.alpha <= 0 || st.length >= st.maxLength) {
        this.streaks.splice(i, 1);
        continue;
      }

      const startDist = 28;
      const startX = st.x + Math.cos(st.angle) * startDist;
      const startY = st.y + Math.sin(st.angle) * startDist;
      const endX = st.x + Math.cos(st.angle) * (startDist + st.length);
      const endY = st.y + Math.sin(st.angle) * (startDist + st.length);

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);
      this.ctx.strokeStyle = st.color;
      this.ctx.lineWidth = 2.8;
      this.ctx.globalAlpha = Math.max(0, st.alpha);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 3. Render & update burst particles (sparks & petals)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.kind === 'petal') {
        p.angle = (p.angle || 0) + (p.spin || 0.05);
        p.flipPhase = (p.flipPhase || 0) + (p.flipSpeed || 0.08);
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

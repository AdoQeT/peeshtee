import React, { useLayoutEffect, useRef } from 'react';
import { Card, ShuffleStyle, TableTheme } from '../types/game';
import { CARD_DIMENSIONS, CardBackSurface, CardFrontSurface } from './CardView';
import { cardPhysics } from '../core/physics/cardPhysicsEngine';
import { sound } from '../core/audio/soundEngine';

export interface FlyingCardData {
  id: string;
  card: Card;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  startRotation: number;
  targetRotation: number;
  startFaceUp: boolean;
  endFaceUp: boolean;
  startScale?: number;
  targetScale?: number;
  duration?: number;
  arcHeight?: number;
  waypointX?: number;
  waypointY?: number;
  waypointRotation?: number;
  waypointScale?: number;
  waypointOffset?: number;
  size?: 'sm' | 'md' | 'lg';
  zIndex?: number;
  /** Motion type for physics engine tuning */
  motionType?: 'deal' | 'play' | 'sweep' | 'jack' | 'pisti_slam' | 'center_reveal';
  onComplete?: () => void;
}

interface CardAnimationLayerProps {
  isShuffling: boolean;
  shuffleStyle: ShuffleStyle;
  getDeckTargetPos: () => { x: number; y: number };
  flyingCards: FlyingCardData[];
  cardBack: string;
  theme?: TableTheme;
}

export const SHUFFLE_STYLE_NAMES: Record<ShuffleStyle, string> = {
  riffle_bridge: 'Klasik Harman & Şelale Köprüsü (Riffle & Bridge)',
  hindu_slide: 'Hindu / Üstten Paket Çekme (Hindu Shuffle)',
  triple_cut: 'Kahvehane 3\'lü Masa Kesimi (Triple Cut)',
  table_wash: 'Casino Çorba Karıştırma (Table Wash)',
  farot_wave: 'Kavisli Yelpaze & Dalga Şelalesi (Faro Cascade)'
};

const FlyingCardItem: React.FC<{ fc: FlyingCardData; cardBack: string; theme?: TableTheme }> = ({
  fc,
  cardBack,
  theme = 'traditional'
}) => {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const inner3DRef = useRef<HTMLDivElement | null>(null);
  const onCompleteRef = useRef(fc.onComplete);
  onCompleteRef.current = fc.onComplete;

  const size = fc.size || 'md';
  const duration = fc.duration ?? 400;
  const startScale = fc.startScale ?? 1;
  const targetScale = fc.targetScale ?? 1;
  const arcHeight = fc.arcHeight ?? 38;

  useLayoutEffect(() => {
    const el = outerRef.current;
    const inner = inner3DRef.current;
    if (!el) return;

    const plan = cardPhysics.generateFlightPlan(
      {
        startX: fc.startX,
        startY: fc.startY,
        targetX: fc.targetX,
        targetY: fc.targetY,
        startRotation: fc.startRotation,
        targetRotation: fc.targetRotation,
        startFaceUp: fc.startFaceUp,
        endFaceUp: fc.endFaceUp,
        startScale,
        targetScale,
        arcHeight,
        waypointX: fc.waypointX,
        waypointY: fc.waypointY,
        waypointRotation: fc.waypointRotation,
        waypointScale: fc.waypointScale,
        waypointOffset: fc.waypointOffset,
        motionType: fc.motionType
      },
      duration
    );

    const flightAnim = el.animate(plan.keyframes, {
      duration: plan.durationMs,
      easing: plan.easing,
      fill: 'forwards'
    });

    let flipAnim: Animation | null = null;
    if (inner && plan.flipKeyframes) {
      flipAnim = inner.animate(plan.flipKeyframes, {
        duration: plan.durationMs,
        easing: 'cubic-bezier(0.25, 1, 0.35, 1)',
        fill: 'forwards'
      });
    }

    let finished = false;
    const triggerComplete = () => {
      if (!finished) {
        finished = true;
        onCompleteRef.current?.();
      }
    };

    flightAnim.onfinish = triggerComplete;
    const fallbackTimer = window.setTimeout(triggerComplete, plan.durationMs + 30);

    return () => {
      finished = true;
      window.clearTimeout(fallbackTimer);
      flightAnim.cancel();
      flipAnim?.cancel();
    };
  }, [
    fc.startX,
    fc.startY,
    fc.targetX,
    fc.targetY,
    fc.startRotation,
    fc.targetRotation,
    fc.startFaceUp,
    fc.endFaceUp,
    fc.waypointX,
    fc.waypointY,
    fc.waypointRotation,
    fc.waypointScale,
    fc.waypointOffset,
    duration,
    startScale,
    targetScale,
    arcHeight
  ]);

  const sizeClasses = CARD_DIMENSIONS[size].classes;
  const initialRotY = fc.startFaceUp ? 0 : 180;

  return (
    <div
      ref={outerRef}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: fc.zIndex ?? 60,
        perspective: '1000px',
        transformStyle: 'preserve-3d',
        pointerEvents: 'none',
        transform: `translate3d(${fc.startX}px, ${fc.startY}px, 0) translate(-50%, -50%) rotate(${fc.startRotation}deg) scale(${startScale})`,
        willChange: 'transform, filter'
      }}
      className={sizeClasses}
    >
      <div
        ref={inner3DRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: `rotateY(${initialRotY}deg)`,
          willChange: 'transform'
        }}
        className="rounded-[inherit]"
      >
        {/* Front Face (0deg) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)'
          }}
          className="rounded-[inherit]"
        >
          <CardFrontSurface card={fc.card} theme={theme} />
        </div>

        {/* Back Face (180deg) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
          className="rounded-[inherit]"
        >
          <CardBackSurface cardBack={cardBack} />
        </div>
      </div>
    </div>
  );
};

/**
 * 144 FPS Hardware-Accelerated 32-Card 3D Casino Grand Shuffle Layer
 */
const DynamicDeckShuffle: React.FC<{
  style: ShuffleStyle;
  cardBack: string;
  getDeckTargetPos: () => { x: number; y: number };
}> = ({ style, cardBack }) => {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const totalCards = 32;

  useLayoutEffect(() => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const isMobile = window.innerWidth < 640;
    const spreadSpan = isMobile ? 110 : 155;
    const easeOut = 'cubic-bezier(0.22, 1, 0.36, 1)';
    const easeInOut = 'cubic-bezier(0.45, 0, 0.25, 1)';
    const duration = 2500;

    const animations: Animation[] = [];
    const audioTimers: number[] = [];

    // Multi-stage synchronized audio accents (waterfall bridge cascade & square-up slap)
    audioTimers.push(
      window.setTimeout(() => {
        sound.playCardFan();
      }, 1150),
      window.setTimeout(() => {
        sound.playTripleCut();
      }, 1920)
    );

    cardRefs.current.forEach((el, idx) => {
      if (!el) return;

      let keyframes: Keyframe[];
      const stackOffset = idx * 0.45;

      if (style === 'riffle_bridge') {
        const isLeft = idx < totalCards / 2;
        const halfIdx = isLeft ? idx : idx - totalCards / 2;
        const splitX = isLeft ? centerX - spreadSpan : centerX + spreadSpan;
        const splitRotZ = isLeft ? -14 : 14;
        const splitRotY = isLeft ? 24 : -24;
        const riffleOrder = isLeft ? halfIdx * 2 : halfIdx * 2 + 1;
        const riffleStart = 0.17 + (riffleOrder / totalCards) * 0.26;
        const riffleEnd = Math.min(0.54, riffleStart + 0.06);
        const bridgeStart = 0.56 + ((totalCards - 1 - riffleOrder) / totalCards) * 0.16;
        const bridgeDrop = Math.min(0.82, bridgeStart + 0.07);

        keyframes = [
          // 0: Initial 3D stacked deck
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - stackOffset}px, 0) translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)`,
            offset: 0,
            easing: easeOut
          },
          // 1: 3D Lift & Split into two angled dealer packets
          {
            transform: `perspective(1100px) translate3d(${splitX}px, ${centerY - 18 - halfIdx * 0.85}px, 0) translate(-50%, -50%) rotateX(16deg) rotateY(${splitRotY}deg) rotateZ(${splitRotZ}deg) scale(1.06)`,
            offset: 0.16,
            easing: easeInOut
          },
          // 2: Hold packet tension until card's riffle turn
          {
            transform: `perspective(1100px) translate3d(${splitX}px, ${centerY - 18 - halfIdx * 0.85}px, 0) translate(-50%, -50%) rotateX(16deg) rotateY(${splitRotY}deg) rotateZ(${splitRotZ}deg) scale(1.06)`,
            offset: riffleStart,
            easing: easeOut
          },
          // 3: High-speed alternating Riffle Interleave
          {
            transform: `perspective(1100px) translate3d(${centerX + (isLeft ? -22 : 22)}px, ${centerY - riffleOrder * 0.45}px, 0) translate(-50%, -50%) rotateX(8deg) rotateY(${isLeft ? 8 : -8}deg) rotateZ(${isLeft ? -4 : 4}deg) scale(1.02)`,
            offset: riffleEnd,
            easing: easeInOut
          },
          // 4: High 3D Parabolic Waterfall Bridge Arch
          {
            transform: `perspective(1100px) translate3d(${centerX + (isLeft ? -8 : 8)}px, ${centerY - 78 - Math.sin((riffleOrder / totalCards) * Math.PI) * 28}px, 0) translate(-50%, -50%) rotateX(34deg) rotateY(${isLeft ? -14 : 14}deg) rotateZ(${isLeft ? 10 : -10}deg) scale(1.12)`,
            offset: bridgeStart,
            easing: easeInOut
          },
          // 5: Cascade Waterfall Drop into center stack
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - riffleOrder * 0.45}px, 0) translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1.03)`,
            offset: bridgeDrop,
            easing: easeOut
          },
          // 6: Dealer Strip-Cut & Square-Up Pulse
          {
            transform: `perspective(1100px) translate3d(${centerX + (idx % 2 === 0 ? -4 : 4)}px, ${centerY - stackOffset - 10}px, 0) translate(-50%, -50%) rotateX(6deg) rotateY(0deg) rotateZ(0deg) scale(1.05)`,
            offset: 0.90,
            easing: easeInOut
          },
          // 7: Final Crisp Squared Stack at Center Stage (ready for 0-jump Cut Fan-Out)
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - stackOffset}px, 0) translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)`,
            offset: 1
          }
        ];
      } else if (style === 'table_wash') {
        // Casino Dual-Ring Vortex Scramble + Riffle Snap
        const isInnerRing = idx % 2 === 0;
        const ringIdx = Math.floor(idx / 2);
        const ringCount = totalCards / 2;
        const baseAngle = (ringIdx / ringCount) * Math.PI * 2;
        const dir = isInnerRing ? 1 : -1;
        const r1 = isInnerRing ? (isMobile ? 70 : 95) : (isMobile ? 120 : 165);
        const r2 = isInnerRing ? (isMobile ? 110 : 150) : (isMobile ? 75 : 105);

        const x1 = centerX + Math.cos(baseAngle + dir * 1.1) * r1;
        const y1 = centerY + Math.sin(baseAngle + dir * 1.1) * (r1 * 0.58);
        const x2 = centerX + Math.cos(baseAngle + dir * 2.6) * r2;
        const y2 = centerY + Math.sin(baseAngle + dir * 2.6) * (r2 * 0.55);
        const x3 = centerX + Math.cos(baseAngle + dir * 4.2) * (r1 * 0.7);
        const y3 = centerY + Math.sin(baseAngle + dir * 4.2) * (r1 * 0.42);

        const rot1 = ((idx * 37) % 90) - 45;
        const rot2 = ((idx * 61) % 110) - 55;
        const rot3 = ((idx * 29) % 50) - 25;

        keyframes = [
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - stackOffset}px, 0) translate(-50%, -50%) rotateX(0deg) rotateZ(0deg) scale(1)`,
            offset: 0,
            easing: easeOut
          },
          {
            transform: `perspective(1100px) translate3d(${x1}px, ${y1}px, 0) translate(-50%, -50%) rotateX(18deg) rotateY(${dir * 14}deg) rotateZ(${rot1}deg) scale(1.04)`,
            offset: 0.22,
            easing: easeInOut
          },
          {
            transform: `perspective(1100px) translate3d(${x2}px, ${y2}px, 0) translate(-50%, -50%) rotateX(22deg) rotateY(${-dir * 16}deg) rotateZ(${rot2}deg) scale(1.06)`,
            offset: 0.48,
            easing: easeInOut
          },
          {
            transform: `perspective(1100px) translate3d(${x3}px, ${y3}px, 0) translate(-50%, -50%) rotateX(14deg) rotateY(${dir * 8}deg) rotateZ(${rot3}deg) scale(1.03)`,
            offset: 0.72,
            easing: easeInOut
          },
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - stackOffset - 16}px, 0) translate(-50%, -50%) rotateX(10deg) rotateZ(0deg) scale(1.06)`,
            offset: 0.88,
            easing: easeOut
          },
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - stackOffset}px, 0) translate(-50%, -50%) rotateX(0deg) rotateZ(0deg) scale(1)`,
            offset: 1
          }
        ];
      } else if (style === 'farot_wave') {
        // 3D Helical Faro Cascade Wave & Zipper Snap
        const norm = (idx - (totalCards - 1) / 2) / (totalCards / 2);
        const waveX1 = centerX + norm * (isMobile ? 130 : 185);
        const waveY1 = centerY + Math.sin(norm * Math.PI * 1.5) * 42;
        const waveRot1 = Math.cos(norm * Math.PI * 1.5) * 24;

        const waveX2 = centerX + norm * (isMobile ? 115 : 160);
        const waveY2 = centerY - Math.sin(norm * Math.PI * 1.5) * 42;
        const waveRot2 = -Math.cos(norm * Math.PI * 1.5) * 24;
        const zipOffset = 0.62 + (idx / totalCards) * 0.24;

        keyframes = [
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - stackOffset}px, 0) translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)`,
            offset: 0,
            easing: easeOut
          },
          {
            transform: `perspective(1100px) translate3d(${waveX1}px, ${waveY1}px, 0) translate(-50%, -50%) rotateX(20deg) rotateY(${norm * 28}deg) rotateZ(${waveRot1}deg) scale(1.06)`,
            offset: 0.26,
            easing: easeInOut
          },
          {
            transform: `perspective(1100px) translate3d(${waveX2}px, ${waveY2}px, 0) translate(-50%, -50%) rotateX(24deg) rotateY(${-norm * 28}deg) rotateZ(${waveRot2}deg) scale(1.08)`,
            offset: 0.54,
            easing: easeInOut
          },
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - 35 - idx * 0.7}px, 0) translate(-50%, -50%) rotateX(15deg) rotateY(0deg) rotateZ(0deg) scale(1.05)`,
            offset: zipOffset,
            easing: easeOut
          },
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - stackOffset}px, 0) translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)`,
            offset: 1
          }
        ];
      } else if (style === 'hindu_slide') {
        // Rapid 6-Packet 3D Hindu Peel & Bridge Finish
        const packetIdx = Math.floor(idx / 5);
        const packetStartTime = 0.14 + packetIdx * 0.095;
        const peelLift = Math.min(0.76, packetStartTime + 0.05);
        const peelLand = Math.min(0.84, packetStartTime + 0.11);

        keyframes = [
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - stackOffset}px, 0) translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)`,
            offset: 0,
            easing: easeOut
          },
          {
            transform: `perspective(1100px) translate3d(${centerX + 110}px, ${centerY - 12}px, 0) translate(-50%, -50%) rotateX(14deg) rotateY(-18deg) rotateZ(10deg) scale(1.04)`,
            offset: 0.13,
            easing: easeInOut
          },
          {
            transform: `perspective(1100px) translate3d(${centerX + 110}px, ${centerY - 12}px, 0) translate(-50%, -50%) rotateX(14deg) rotateY(-18deg) rotateZ(10deg) scale(1.04)`,
            offset: packetStartTime,
            easing: easeOut
          },
          {
            transform: `perspective(1100px) translate3d(${centerX + 15}px, ${centerY - 68}px, 0) translate(-50%, -50%) rotateX(28deg) rotateY(0deg) rotateZ(-4deg) scale(1.12)`,
            offset: peelLift,
            easing: easeInOut
          },
          {
            transform: `perspective(1100px) translate3d(${centerX - 95}px, ${centerY - stackOffset}px, 0) translate(-50%, -50%) rotateX(8deg) rotateY(12deg) rotateZ(-6deg) scale(1.02)`,
            offset: peelLand,
            easing: easeOut
          },
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - stackOffset}px, 0) translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)`,
            offset: 1
          }
        ];
      } else {
        // Triple Cut: 3-Stack Cross Leapfrog + Riffle Slap
        const stackNum = idx < 11 ? 0 : idx < 22 ? 1 : 2;
        const stackX = stackNum === 0 ? centerX - spreadSpan : stackNum === 1 ? centerX : centerX + spreadSpan;
        const stackRot = stackNum === 0 ? -10 : stackNum === 1 ? 0 : 10;
        const swapX = stackNum === 0 ? centerX + spreadSpan : stackNum === 2 ? centerX - spreadSpan : centerX;
        const swapLiftY = stackNum === 0 ? -65 : stackNum === 2 ? -45 : 15;

        keyframes = [
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - stackOffset}px, 0) translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)`,
            offset: 0,
            easing: easeOut
          },
          {
            transform: `perspective(1100px) translate3d(${stackX}px, ${centerY - (idx % 11) * 0.8}px, 0) translate(-50%, -50%) rotateX(16deg) rotateY(${stackNum === 0 ? 18 : stackNum === 2 ? -18 : 0}deg) rotateZ(${stackRot}deg) scale(1.05)`,
            offset: 0.24,
            easing: easeInOut
          },
          {
            transform: `perspective(1100px) translate3d(${swapX}px, ${centerY + swapLiftY}px, 0) translate(-50%, -50%) rotateX(26deg) rotateY(0deg) rotateZ(${-stackRot}deg) scale(1.1)`,
            offset: 0.52,
            easing: easeInOut
          },
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - 42 - stackOffset}px, 0) translate(-50%, -50%) rotateX(22deg) rotateY(0deg) rotateZ(0deg) scale(1.08)`,
            offset: 0.78,
            easing: easeInOut
          },
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - stackOffset}px, 0) translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)`,
            offset: 1
          }
        ];
      }

      const anim = el.animate(keyframes, {
        duration,
        fill: 'forwards'
      });

      animations.push(anim);
    });

    return () => {
      audioTimers.forEach(t => window.clearTimeout(t));
      animations.forEach(a => a.cancel());
    };
  }, [style]);

  const sizeClasses = CARD_DIMENSIONS.md.classes;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Ambient Table Spotlight & Shockwave Ring under Shuffling Deck */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-amber-500/15 blur-3xl animate-pulse" />
        <div className="absolute w-48 h-48 sm:w-64 sm:h-64 rounded-full border-2 border-amber-400/35 shadow-[0_0_50px_rgba(245,158,11,0.3)] animate-ping" style={{ animationDuration: '1.4s' }} />
      </div>

      {/* Floating Casino Dealer Shuffle HUD Banner */}
      <div className="absolute left-1/2 top-[28%] sm:top-[26%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 z-[95] animate-in fade-in zoom-in-95 duration-200">
        <div className="px-4 py-1.5 rounded-full bg-slate-950/95 border-2 border-amber-400 text-amber-300 font-cyber text-xs font-black tracking-wider flex items-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.65)]">
          <span className="text-sm animate-spin">🎴</span>
          <span>DESTE HARMANLANIYOR</span>
        </div>
        <span className="text-[10px] font-mono font-bold text-cyan-300 bg-slate-950/90 px-3 py-0.5 rounded-full border border-cyan-400/40 shadow-md">
          {SHUFFLE_STYLE_NAMES[style]}
        </span>
      </div>

      {Array.from({ length: totalCards }).map((_, idx) => (
        <div
          key={idx}
          ref={el => {
            cardRefs.current[idx] = el;
          }}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            zIndex: 50 + idx,
            willChange: 'transform',
            boxShadow: '0 10px 24px rgba(0, 0, 0, 0.55)'
          }}
          className={sizeClasses}
        >
          <CardBackSurface cardBack={cardBack} />
        </div>
      ))}
    </div>
  );
};

export const CardAnimationLayer: React.FC<CardAnimationLayerProps> = ({
  isShuffling,
  shuffleStyle,
  getDeckTargetPos,
  flyingCards,
  cardBack,
  theme = 'traditional'
}) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {isShuffling && (
        <DynamicDeckShuffle
          style={shuffleStyle}
          cardBack={cardBack}
          getDeckTargetPos={getDeckTargetPos}
        />
      )}

      {flyingCards.map(fc => (
        <FlyingCardItem key={fc.id} fc={fc} cardBack={cardBack} theme={theme} />
      ))}
    </div>
  );
};

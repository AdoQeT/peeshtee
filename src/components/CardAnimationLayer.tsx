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
        const splitX = isLeft ? centerX - 92 : centerX + 92;
        const splitRotZ = isLeft ? -9 : 9;
        const splitRotY = isLeft ? 16 : -16;
        const riffleOrder = isLeft ? halfIdx * 2 : halfIdx * 2 + 1;
        const riffleStart = 0.16 + (riffleOrder / totalCards) * 0.28;
        const riffleEnd = Math.min(0.56, riffleStart + 0.05);
        const bridgeStart = 0.58 + ((totalCards - 1 - riffleOrder) / totalCards) * 0.15;
        const bridgeDrop = Math.min(0.80, bridgeStart + 0.06);

        keyframes = [
          // 0: Initial 3D stacked deck
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - stackOffset}px, 0) translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)`,
            offset: 0,
            easing: easeOut
          },
          // 1: Authentic table split into Left and Right dealer packets resting on felt
          {
            transform: `perspective(1100px) translate3d(${splitX}px, ${centerY - halfIdx * 0.5}px, 0) translate(-50%, -50%) rotateX(12deg) rotateY(${splitRotY}deg) rotateZ(${splitRotZ}deg) scale(1.02)`,
            offset: 0.14,
            easing: easeInOut
          },
          // 2: Hold packet position until individual card's interleaving turn
          {
            transform: `perspective(1100px) translate3d(${splitX}px, ${centerY - halfIdx * 0.5}px, 0) translate(-50%, -50%) rotateX(12deg) rotateY(${splitRotY}deg) rotateZ(${splitRotZ}deg) scale(1.02)`,
            offset: riffleStart,
            easing: easeOut
          },
          // 3: Tight alternating card-by-card weave (interleaving directly into center stack)
          {
            transform: `perspective(1100px) translate3d(${centerX + (isLeft ? -12 : 12)}px, ${centerY - riffleOrder * 0.45}px, 0) translate(-50%, -50%) rotateX(6deg) rotateY(${isLeft ? 4 : -4}deg) rotateZ(${isLeft ? -2 : 2}deg) scale(1.01)`,
            offset: riffleEnd,
            easing: easeInOut
          },
          // 4: Natural physical bridge flex (thumbs bend the interleaved cards upward)
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - 46 - Math.sin((riffleOrder / totalCards) * Math.PI) * 22}px, 0) translate(-50%, -50%) rotateX(24deg) rotateY(0deg) rotateZ(${isLeft ? 4 : -4}deg) scale(1.06)`,
            offset: bridgeStart,
            easing: easeInOut
          },
          // 5: Cascade waterfall snap flat onto the table felt
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - riffleOrder * 0.45}px, 0) translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1.01)`,
            offset: bridgeDrop,
            easing: easeOut
          },
          // 6: Final dealer side tap & square-up
          {
            transform: `perspective(1100px) translate3d(${centerX + (idx % 2 === 0 ? -2 : 2)}px, ${centerY - riffleOrder * 0.45}px, 0) translate(-50%, -50%) rotateX(2deg) rotateY(0deg) rotateZ(0deg) scale(1.02)`,
            offset: 0.92,
            easing: easeInOut
          },
          // 7: Perfectly squared, genuinely mixed deck
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - riffleOrder * 0.45}px, 0) translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)`,
            offset: 1
          }
        ];
      } else if (style === 'table_wash') {
        // Authentic Table Baize Scramble & Sweep (Smooth Flat Slide on Felt)
        const seedAngle = (idx / totalCards) * Math.PI * 2;
        const scatterDist = (isMobile ? 80 : 130) * (0.45 + (idx % 7) * 0.09);
        const scatterX = Math.cos(seedAngle * 1.8) * scatterDist;
        const scatterY = Math.sin(seedAngle * 1.8) * (scatterDist * 0.52);
        const scatterRot = ((idx * 31) % 70) - 35;

        // Circular wash motion across table felt
        const washAngle = seedAngle + Math.PI * 1.2;
        const washX = Math.cos(washAngle) * (scatterDist * 0.85);
        const washY = Math.sin(washAngle) * (scatterDist * 0.44);
        const washRot = ((idx * 47) % 60) - 30;

        const gatherOrder = (idx * 17) % totalCards;

        keyframes = [
          // 0: Initial stacked deck
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - stackOffset}px, 0) translate(-50%, -50%) rotateX(0deg) rotateZ(0deg) scale(1)`,
            offset: 0,
            easing: easeOut
          },
          // 1: Scramble across the green felt (flat on table, realistic friction)
          {
            transform: `perspective(1100px) translate3d(${centerX + scatterX}px, ${centerY + scatterY}px, 0) translate(-50%, -50%) rotateX(6deg) rotateZ(${scatterRot}deg) scale(1.01)`,
            offset: 0.28,
            easing: easeInOut
          },
          // 2: Swirling washing motion intermixing the cards on the baize
          {
            transform: `perspective(1100px) translate3d(${centerX + washX}px, ${centerY + washY}px, 0) translate(-50%, -50%) rotateX(8deg) rotateZ(${washRot}deg) scale(1.02)`,
            offset: 0.58,
            easing: easeInOut
          },
          // 3: Hands sweep inward, gathering scattered cards from edges toward center
          {
            transform: `perspective(1100px) translate3d(${centerX + (scatterX * 0.22)}px, ${centerY + (scatterY * 0.22)}px, 0) translate(-50%, -50%) rotateX(4deg) rotateZ(${scatterRot * 0.3}deg) scale(1.01)`,
            offset: 0.82,
            easing: easeOut
          },
          // 4: Dealer square-up and tap onto felt
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - gatherOrder * 0.45}px, 0) translate(-50%, -50%) rotateX(0deg) rotateZ(0deg) scale(1)`,
            offset: 1
          }
        ];
      } else if (style === 'farot_wave') {
        // Faro Interleave: Precision alternating packet zip
        const isLeft = idx % 2 === 0;
        const fIdx = Math.floor(idx / 2);
        const splitX = isLeft ? centerX - 80 : centerX + 80;
        const zipStart = 0.22 + (fIdx / (totalCards / 2)) * 0.38;
        const zipEnd = Math.min(0.72, zipStart + 0.08);

        keyframes = [
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - stackOffset}px, 0) translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)`,
            offset: 0,
            easing: easeOut
          },
          {
            transform: `perspective(1100px) translate3d(${splitX}px, ${centerY - fIdx * 0.6}px, 0) translate(-50%, -50%) rotateX(10deg) rotateY(${isLeft ? 14 : -14}deg) rotateZ(${isLeft ? -6 : 6}deg) scale(1.02)`,
            offset: 0.18,
            easing: easeInOut
          },
          {
            transform: `perspective(1100px) translate3d(${splitX}px, ${centerY - fIdx * 0.6}px, 0) translate(-50%, -50%) rotateX(10deg) rotateY(${isLeft ? 14 : -14}deg) rotateZ(${isLeft ? -6 : 6}deg) scale(1.02)`,
            offset: zipStart,
            easing: easeOut
          },
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - idx * 0.45}px, 0) translate(-50%, -50%) rotateX(4deg) rotateY(0deg) rotateZ(0deg) scale(1.02)`,
            offset: zipEnd,
            easing: easeInOut
          },
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - idx * 0.45}px, 0) translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)`,
            offset: 1
          }
        ];
      } else if (style === 'hindu_slide') {
        // Authentic Overhand/Hindu Packet Peel
        const packetIdx = Math.floor(idx / 4);
        const packetStartTime = 0.14 + packetIdx * 0.09;
        const peelLift = Math.min(0.74, packetStartTime + 0.05);
        const peelLand = Math.min(0.82, packetStartTime + 0.10);
        const finalHinduOrder = totalCards - 1 - idx;

        keyframes = [
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - stackOffset}px, 0) translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)`,
            offset: 0,
            easing: easeOut
          },
          {
            transform: `perspective(1100px) translate3d(${centerX + 85}px, ${centerY - (idx % 4) * 0.6}px, 0) translate(-50%, -50%) rotateX(10deg) rotateY(-12deg) rotateZ(6deg) scale(1.02)`,
            offset: 0.12,
            easing: easeInOut
          },
          {
            transform: `perspective(1100px) translate3d(${centerX + 85}px, ${centerY - (idx % 4) * 0.6}px, 0) translate(-50%, -50%) rotateX(10deg) rotateY(-12deg) rotateZ(6deg) scale(1.02)`,
            offset: packetStartTime,
            easing: easeOut
          },
          {
            transform: `perspective(1100px) translate3d(${centerX - 10}px, ${centerY - 45}px, 0) translate(-50%, -50%) rotateX(16deg) rotateY(0deg) rotateZ(-3deg) scale(1.05)`,
            offset: peelLift,
            easing: easeInOut
          },
          {
            transform: `perspective(1100px) translate3d(${centerX - 75}px, ${centerY - (totalCards - 1 - idx) * 0.45}px, 0) translate(-50%, -50%) rotateX(6deg) rotateY(8deg) rotateZ(-4deg) scale(1.01)`,
            offset: peelLand,
            easing: easeOut
          },
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - finalHinduOrder * 0.45}px, 0) translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)`,
            offset: 1
          }
        ];
      } else {
        // Triple Cut: 3-Stack Table Shift & Interleave Slap
        const stackNum = idx < 11 ? 0 : idx < 22 ? 1 : 2;
        const stackX = stackNum === 0 ? centerX - 95 : stackNum === 1 ? centerX : centerX + 95;
        const stackRot = stackNum === 0 ? -6 : stackNum === 1 ? 0 : 6;
        const swapX = stackNum === 0 ? centerX + 95 : stackNum === 2 ? centerX - 95 : centerX;
        const swapLiftY = stackNum === 0 ? -38 : stackNum === 2 ? -28 : 10;
        const finalTripleOrder = stackNum === 0 ? (idx % 11) + 21 : stackNum === 1 ? (idx % 11) : (idx % 11) + 11;

        keyframes = [
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - stackOffset}px, 0) translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)`,
            offset: 0,
            easing: easeOut
          },
          {
            transform: `perspective(1100px) translate3d(${stackX}px, ${centerY - (idx % 11) * 0.6}px, 0) translate(-50%, -50%) rotateX(10deg) rotateY(${stackNum === 0 ? 12 : stackNum === 2 ? -12 : 0}deg) rotateZ(${stackRot}deg) scale(1.02)`,
            offset: 0.22,
            easing: easeInOut
          },
          {
            transform: `perspective(1100px) translate3d(${swapX}px, ${centerY + swapLiftY}px, 0) translate(-50%, -50%) rotateX(16deg) rotateY(0deg) rotateZ(${-stackRot}deg) scale(1.06)`,
            offset: 0.52,
            easing: easeInOut
          },
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - 24 - (idx % 11) * 0.45}px, 0) translate(-50%, -50%) rotateX(12deg) rotateY(0deg) rotateZ(0deg) scale(1.04)`,
            offset: 0.76,
            easing: easeInOut
          },
          {
            transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - finalTripleOrder * 0.45}px, 0) translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)`,
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

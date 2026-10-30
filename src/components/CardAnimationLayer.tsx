import React, { useLayoutEffect, useRef } from 'react';
import { Card, ShuffleStyle, TableTheme } from '../types/game';
import { CARD_DIMENSIONS, CardBackSurface, CardFrontSurface } from './CardView';
import { cardPhysics } from '../core/physics/cardPhysicsEngine';

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
  motionType?: 'deal' | 'play' | 'sweep' | 'jack' | 'pisti_slam';
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
 * 144 FPS Hardware-Accelerated 14-Card Shuffle Layer
 */
const DynamicDeckShuffle: React.FC<{
  style: ShuffleStyle;
  cardBack: string;
  getDeckTargetPos: () => { x: number; y: number };
}> = ({ style, cardBack, getDeckTargetPos }) => {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const totalCards = 14;

  useLayoutEffect(() => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const targetPos = getDeckTargetPos();
    const finalX = targetPos.x;
    const finalY = targetPos.y;
    const easeOut = 'cubic-bezier(0.22, 1, 0.36, 1)';
    const easeInOut = 'cubic-bezier(0.45, 0, 0.25, 1)';

    const animations: Animation[] = [];

    cardRefs.current.forEach((el, idx) => {
      if (!el) return;

      let keyframes: Keyframe[] = [];
      const duration = 2200;
      const stackOffset = Math.min(idx, 4) * 0.8;

      if (style === 'riffle_bridge') {
        const isLeft = idx < totalCards / 2;
        const halfIdx = isLeft ? idx : idx - totalCards / 2;
        const splitX = isLeft ? centerX - 120 : centerX + 120;
        const splitRot = isLeft ? -12 : 12;
        const riffleOrder = isLeft ? halfIdx * 2 : halfIdx * 2 + 1;
        const riffleStart = 0.20 + (riffleOrder / totalCards) * 0.28;
        const riffleEnd = Math.min(0.62, riffleStart + 0.08);

        keyframes = [
          {
            transform: `translate3d(${centerX}px, ${centerY - idx * 0.5}px, 0) translate(-50%, -50%) rotate(0deg)`,
            offset: 0,
            easing: easeOut
          },
          {
            transform: `translate3d(${splitX}px, ${centerY - halfIdx * 0.7}px, 0) translate(-50%, -50%) rotate(${splitRot}deg)`,
            offset: 0.18,
            easing: easeInOut
          },
          {
            transform: `translate3d(${splitX}px, ${centerY - halfIdx * 0.7}px, 0) translate(-50%, -50%) rotate(${splitRot}deg)`,
            offset: riffleStart,
            easing: easeOut
          },
          {
            transform: `translate3d(${centerX}px, ${centerY - riffleOrder * 0.4}px, 0) translate(-50%, -50%) rotate(${isLeft ? -2 : 2}deg)`,
            offset: riffleEnd,
            easing: easeInOut
          },
          {
            transform: `translate3d(${centerX}px, ${centerY - 55}px, 0) translate(-50%, -50%) rotate(${isLeft ? 8 : -8}deg)`,
            offset: 0.72,
            easing: easeInOut
          },
          {
            transform: `translate3d(${centerX}px, ${centerY - idx * 0.5}px, 0) translate(-50%, -50%) rotate(0deg)`,
            offset: 0.84,
            easing: easeOut
          },
          {
            transform: `translate3d(${finalX - stackOffset}px, ${finalY - stackOffset}px, 0) translate(-50%, -50%) rotate(0deg)`,
            offset: 1
          }
        ];
      } else if (style === 'table_wash') {
        // Casino Table Wash Scramble: Cards swirl out across the table in wide circular orbits
        const angle = (idx / totalCards) * Math.PI * 2;
        const radius = 90 + (idx % 3) * 35;
        const orbitX1 = centerX + Math.cos(angle) * radius;
        const orbitY1 = centerY + Math.sin(angle) * (radius * 0.55);
        const orbitX2 = centerX + Math.cos(angle + 1.8) * (radius * 0.85);
        const orbitY2 = centerY + Math.sin(angle + 1.8) * (radius * 0.5);
        const rot1 = (idx * 27) % 70 - 35;
        const rot2 = (idx * 43) % 60 - 30;

        keyframes = [
          {
            transform: `translate3d(${centerX}px, ${centerY - idx * 0.5}px, 0) translate(-50%, -50%) rotate(0deg)`,
            offset: 0,
            easing: easeOut
          },
          {
            transform: `translate3d(${orbitX1}px, ${orbitY1}px, 0) translate(-50%, -50%) rotate(${rot1}deg)`,
            offset: 0.22,
            easing: easeInOut
          },
          {
            transform: `translate3d(${orbitX2}px, ${orbitY2}px, 0) translate(-50%, -50%) rotate(${rot2}deg)`,
            offset: 0.52,
            easing: easeInOut
          },
          {
            transform: `translate3d(${centerX}px, ${centerY - idx * 0.5}px, 0) translate(-50%, -50%) rotate(0deg)`,
            offset: 0.82,
            easing: easeOut
          },
          {
            transform: `translate3d(${finalX - stackOffset}px, ${finalY - stackOffset}px, 0) translate(-50%, -50%) rotate(0deg)`,
            offset: 1
          }
        ];
      } else if (style === 'farot_wave') {
        // Faro Cascade Wave: S-curve fan wave
        const waveX = centerX - 140 + idx * 21;
        const waveY = centerY + Math.sin((idx / totalCards) * Math.PI * 2) * 28;
        const waveRot = Math.cos((idx / totalCards) * Math.PI * 2) * 16;

        keyframes = [
          {
            transform: `translate3d(${centerX}px, ${centerY - idx * 0.5}px, 0) translate(-50%, -50%) rotate(0deg)`,
            offset: 0,
            easing: easeOut
          },
          {
            transform: `translate3d(${waveX}px, ${waveY}px, 0) translate(-50%, -50%) rotate(${waveRot}deg)`,
            offset: 0.32,
            easing: easeInOut
          },
          {
            transform: `translate3d(${waveX}px, ${waveY}px, 0) translate(-50%, -50%) rotate(${waveRot}deg)`,
            offset: 0.58,
            easing: easeInOut
          },
          {
            transform: `translate3d(${centerX}px, ${centerY - idx * 0.5}px, 0) translate(-50%, -50%) rotate(0deg)`,
            offset: 0.82,
            easing: easeOut
          },
          {
            transform: `translate3d(${finalX - stackOffset}px, ${finalY - stackOffset}px, 0) translate(-50%, -50%) rotate(0deg)`,
            offset: 1
          }
        ];
      } else if (style === 'hindu_slide') {
        const packetIdx = Math.floor(idx / 3);
        const packetStartTime = 0.16 + packetIdx * 0.11;

        keyframes = [
          {
            transform: `translate3d(${centerX}px, ${centerY - idx * 0.5}px, 0) translate(-50%, -50%) rotate(0deg)`,
            offset: 0,
            easing: easeOut
          },
          {
            transform: `translate3d(${centerX + 90}px, ${centerY}px, 0) translate(-50%, -50%) rotate(7deg)`,
            offset: 0.15,
            easing: easeInOut
          },
          {
            transform: `translate3d(${centerX + 90}px, ${centerY}px, 0) translate(-50%, -50%) rotate(7deg)`,
            offset: packetStartTime,
            easing: easeOut
          },
          {
            transform: `translate3d(${centerX - 75}px, ${centerY - idx * 0.5}px, 0) translate(-50%, -50%) rotate(-3deg)`,
            offset: packetStartTime + 0.10,
            easing: easeInOut
          },
          {
            transform: `translate3d(${centerX}px, ${centerY - idx * 0.5}px, 0) translate(-50%, -50%) rotate(0deg)`,
            offset: 0.84,
            easing: easeOut
          },
          {
            transform: `translate3d(${finalX - stackOffset}px, ${finalY - stackOffset}px, 0) translate(-50%, -50%) rotate(0deg)`,
            offset: 1
          }
        ];
      } else {
        // Triple Cut: 3 Clean Stacks
        const stackNum = idx < 5 ? 0 : idx < 10 ? 1 : 2;
        const stackX = stackNum === 0 ? centerX - 120 : stackNum === 1 ? centerX : centerX + 120;
        const stackRot = stackNum === 0 ? -8 : stackNum === 1 ? 0 : 8;

        keyframes = [
          {
            transform: `translate3d(${centerX}px, ${centerY - idx * 0.5}px, 0) translate(-50%, -50%) rotate(0deg)`,
            offset: 0,
            easing: easeOut
          },
          {
            transform: `translate3d(${stackX}px, ${centerY}px, 0) translate(-50%, -50%) rotate(${stackRot}deg)`,
            offset: 0.24,
            easing: easeInOut
          },
          {
            transform: `translate3d(${stackNum === 2 ? centerX : stackX}px, ${centerY}px, 0) translate(-50%, -50%) rotate(0deg)`,
            offset: 0.56,
            easing: easeInOut
          },
          {
            transform: `translate3d(${centerX}px, ${centerY - idx * 0.5}px, 0) translate(-50%, -50%) rotate(0deg)`,
            offset: 0.82,
            easing: easeOut
          },
          {
            transform: `translate3d(${finalX - stackOffset}px, ${finalY - stackOffset}px, 0) translate(-50%, -50%) rotate(0deg)`,
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
      animations.forEach(a => a.cancel());
    };
  }, [style, getDeckTargetPos]);

  const sizeClasses = CARD_DIMENSIONS.md.classes;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
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
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)'
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

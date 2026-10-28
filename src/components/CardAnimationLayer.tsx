import React, { useLayoutEffect, useRef } from 'react';
import { Card, ShuffleStyle, TableTheme } from '../types/game';
import { CARD_DIMENSIONS, CardBackSurface, CardFrontSurface } from './CardView';

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

    const dx = fc.targetX - fc.startX;
    const dy = fc.targetY - fc.startY;
    const dist = Math.hypot(dx, dy);

    const nx = dist > 1 ? -dy / dist : 0;
    const ny = dist > 1 ? dx / dist : 0;
    const curveMag = Math.min(24, dist * 0.07);
    const liftY = Math.min(arcHeight, Math.max(16, dist * 0.15));

    let keyframes: Keyframe[];

    if (fc.waypointX !== undefined && fc.waypointY !== undefined) {
      const wpOffset = fc.waypointOffset ?? 0.35;
      const wpRot = fc.waypointRotation ?? fc.startRotation + (fc.targetRotation - fc.startRotation) * 0.35;
      const wpScale = fc.waypointScale ?? Math.max(startScale, targetScale) * 1.06;

      const midArcX = (fc.waypointX + fc.targetX) * 0.5 + nx * curveMag;
      const midArcY = (fc.waypointY + fc.targetY) * 0.5 + ny * curveMag - liftY;
      const midArcRot = wpRot + (fc.targetRotation - wpRot) * 0.65;

      keyframes = [
        {
          transform: `translate3d(${fc.startX}px, ${fc.startY}px, 0) translate(-50%, -50%) rotate(${fc.startRotation}deg) scale(${startScale})`,
          offset: 0
        },
        {
          transform: `translate3d(${fc.waypointX}px, ${fc.waypointY}px, 0) translate(-50%, -50%) rotate(${wpRot}deg) scale(${wpScale})`,
          offset: wpOffset
        },
        {
          transform: `translate3d(${midArcX}px, ${midArcY}px, 0) translate(-50%, -50%) rotate(${midArcRot}deg) scale(${wpScale})`,
          offset: wpOffset + (1 - wpOffset) * 0.5
        },
        {
          transform: `translate3d(${fc.targetX}px, ${fc.targetY}px, 0) translate(-50%, -50%) rotate(${fc.targetRotation}deg) scale(${targetScale})`,
          offset: 1
        }
      ];
    } else {
      const apexX = fc.startX + dx * 0.5 + nx * curveMag;
      const apexY = fc.startY + dy * 0.5 - liftY;

      // Generate a true, continuous quadratic Bezier arc sampled uniformly across 10 steps
      // Without ANY piecewise deceleration stops!
      const steps = 10;
      keyframes = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const oneMinusT = 1 - t;
        const curX = oneMinusT * oneMinusT * fc.startX + 2 * oneMinusT * t * apexX + t * t * fc.targetX;
        const curY = oneMinusT * oneMinusT * fc.startY + 2 * oneMinusT * t * apexY + t * t * fc.targetY;
        const curRot = fc.startRotation + (fc.targetRotation - fc.startRotation) * t;
        const curScale = startScale + (targetScale - startScale) * t + Math.sin(t * Math.PI) * 0.05;

        keyframes.push({
          offset: t,
          transform: `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${curRot.toFixed(1)}deg) scale(${curScale.toFixed(3)})`
        });
      }
    }

    const flightAnim = el.animate(keyframes, {
      duration,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards'
    });

    let flipAnim: Animation | null = null;
    if (inner && fc.startFaceUp !== fc.endFaceUp) {
      const startYRot = fc.startFaceUp ? 0 : 180;
      const endYRot = fc.endFaceUp ? 0 : 180;
      flipAnim = inner.animate(
        [
          { transform: `rotateY(${startYRot}deg)`, offset: 0 },
          { transform: `rotateY(${endYRot}deg)`, offset: 1 }
        ],
        {
          duration,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards'
        }
      );
    }

    let finished = false;
    const triggerComplete = () => {
      if (!finished) {
        finished = true;
        onCompleteRef.current?.();
      }
    };

    flightAnim.onfinish = triggerComplete;
    const fallbackTimer = window.setTimeout(triggerComplete, duration + 30);

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
        transform: `translate3d(${fc.startX}px, ${fc.startY}px, 0) translate(-50%, -50%) rotate(${fc.startRotation}deg) scale(${startScale})`,
        willChange: 'transform'
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
      const duration = 2800;
      const stackOffset = Math.min(idx, 4) * 0.8;

      if (style === 'riffle_bridge') {
        const isLeft = idx < totalCards / 2;
        const halfIdx = isLeft ? idx : idx - totalCards / 2;
        const splitX = isLeft ? centerX - 110 : centerX + 110;
        const splitRot = isLeft ? -10 : 10;
        const riffleOrder = isLeft ? halfIdx * 2 : halfIdx * 2 + 1;
        const riffleStart = 0.22 + (riffleOrder / totalCards) * 0.26;
        const riffleEnd = Math.min(0.60, riffleStart + 0.08);

        keyframes = [
          {
            transform: `translate3d(${centerX}px, ${centerY - idx * 0.5}px, 0) translate(-50%, -50%) rotate(0deg)`,
            offset: 0,
            easing: easeOut
          },
          {
            transform: `translate3d(${splitX}px, ${centerY - halfIdx * 0.6}px, 0) translate(-50%, -50%) rotate(${splitRot}deg)`,
            offset: 0.20,
            easing: easeInOut
          },
          {
            transform: `translate3d(${splitX}px, ${centerY - halfIdx * 0.6}px, 0) translate(-50%, -50%) rotate(${splitRot}deg)`,
            offset: riffleStart,
            easing: easeOut
          },
          {
            transform: `translate3d(${centerX}px, ${centerY - riffleOrder * 0.4}px, 0) translate(-50%, -50%) rotate(0deg)`,
            offset: riffleEnd,
            easing: easeInOut
          },
          {
            transform: `translate3d(${centerX}px, ${centerY - 45}px, 0) translate(-50%, -50%) rotate(${isLeft ? 6 : -6}deg)`,
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
            transform: `translate3d(${centerX + 85}px, ${centerY}px, 0) translate(-50%, -50%) rotate(6deg)`,
            offset: 0.15,
            easing: easeInOut
          },
          {
            transform: `translate3d(${centerX + 85}px, ${centerY}px, 0) translate(-50%, -50%) rotate(6deg)`,
            offset: packetStartTime,
            easing: easeOut
          },
          {
            transform: `translate3d(${centerX - 70}px, ${centerY - idx * 0.5}px, 0) translate(-50%, -50%) rotate(-2deg)`,
            offset: packetStartTime + 0.10,
            easing: easeInOut
          },
          {
            transform: `translate3d(${centerX}px, ${centerY - idx * 0.5}px, 0) translate(-50%, -50%) rotate(0deg)`,
            offset: 0.85,
            easing: easeOut
          },
          {
            transform: `translate3d(${finalX - stackOffset}px, ${finalY - stackOffset}px, 0) translate(-50%, -50%) rotate(0deg)`,
            offset: 1
          }
        ];
      } else {
        const stackNum = idx < 5 ? 0 : idx < 10 ? 1 : 2;
        const stackX = stackNum === 0 ? centerX - 120 : stackNum === 1 ? centerX : centerX + 120;
        const stackRot = stackNum === 0 ? -7 : stackNum === 1 ? 0 : 7;

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

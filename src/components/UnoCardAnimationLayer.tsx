import React, { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { UnoCard } from '../features/uno/unoTypes';
import { UnoCardView, UnoCardBack } from './UnoCardView';

export interface FlyingUnoCardData {
  id: string;
  card: UnoCard;
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
  size?: 'sm' | 'md' | 'lg';
  zIndex?: number;
  onComplete?: () => void;
}

const FlyingUnoCardItem: React.FC<{ fc: FlyingUnoCardData }> = ({ fc }) => {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const onCompleteRef = useRef(fc.onComplete);
  onCompleteRef.current = fc.onComplete;

  const duration = fc.duration ?? 440;
  const startScale = fc.startScale ?? 1;
  const targetScale = fc.targetScale ?? 1;
  const arcHeight = fc.arcHeight ?? 58;

  useLayoutEffect(() => {
    const el = outerRef.current;
    const inner = innerRef.current;
    if (!el) return;

    const dx = fc.targetX - fc.startX;
    const dy = fc.targetY - fc.startY;
    const dist = Math.hypot(dx, dy);

    const nx = dist > 1 ? -dy / dist : 0;
    const curveMag = Math.min(32, dist * 0.09);
    const liftY = Math.min(arcHeight, Math.max(24, dist * 0.18));

    const apexX = fc.startX + dx * 0.5 + nx * curveMag;
    const apexY = fc.startY + dy * 0.5 - liftY;

    const steps = 12;
    const keyframes: Keyframe[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const oneMinusT = 1 - t;
      const curX =
        oneMinusT * oneMinusT * fc.startX +
        2 * oneMinusT * t * apexX +
        t * t * fc.targetX;
      const curY =
        oneMinusT * oneMinusT * fc.startY +
        2 * oneMinusT * t * apexY +
        t * t * fc.targetY;
      const curRot = fc.startRotation + (fc.targetRotation - fc.startRotation) * t;
      const arcBoost = Math.sin(t * Math.PI) * 0.14;
      const curScale = startScale + (targetScale - startScale) * t + arcBoost;
      const shadowBlur = Math.round(12 + Math.sin(t * Math.PI) * 26);
      const shadowY = Math.round(6 + Math.sin(t * Math.PI) * 20);

      keyframes.push({
        offset: t,
        transform: `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${curRot.toFixed(1)}deg) scale(${curScale.toFixed(3)})`,
        filter: `drop-shadow(0 ${shadowY}px ${shadowBlur}px rgba(0,0,0,0.65))`
      });
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
    const fallbackTimer = window.setTimeout(triggerComplete, duration + 40);

    return () => {
      finished = true;
      window.clearTimeout(fallbackTimer);
      try {
        flightAnim.cancel();
        flipAnim?.cancel();
      } catch {
        // Ignored
      }
    };
  }, [
    fc.id,
    fc.startX,
    fc.startY,
    fc.targetX,
    fc.targetY,
    fc.startRotation,
    fc.targetRotation,
    fc.startFaceUp,
    fc.endFaceUp,
    duration,
    startScale,
    targetScale,
    arcHeight
  ]);

  const initialRotY = fc.startFaceUp ? 0 : 180;
  const size = fc.size || 'md';
  const dimClass =
    size === 'sm'
      ? 'w-12 h-[72px] sm:w-14 sm:h-[84px] rounded-lg'
      : size === 'lg'
      ? 'w-28 h-[162px] sm:w-32 sm:h-[186px] rounded-2xl'
      : 'w-20 h-[116px] sm:w-24 sm:h-[140px] rounded-xl';

  return (
    <div
      ref={outerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: fc.zIndex ?? 70,
        pointerEvents: 'none',
        transform: `translate3d(${fc.startX}px, ${fc.startY}px, 0) translate(-50%, -50%) rotate(${fc.startRotation}deg) scale(${startScale})`,
        willChange: 'transform, filter',
        perspective: '900px'
      }}
      className={dimClass}
    >
      <div
        ref={innerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transform: `rotateY(${initialRotY}deg)`,
          willChange: 'transform'
        }}
        className="rounded-[inherit]"
      >
        {/* Front Face (0 deg) */}
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
          <UnoCardView card={fc.card} size={size} />
        </div>

        {/* Back Face (180 deg) */}
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
          <UnoCardBack size={size} />
        </div>
      </div>
    </div>
  );
};

export const UnoCardAnimationLayer: React.FC<{
  flyingCards: FlyingUnoCardData[];
}> = ({ flyingCards }) => {
  if (flyingCards.length === 0 || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[9999]">
      {flyingCards.map(fc => (
        <FlyingUnoCardItem key={fc.id} fc={fc} />
      ))}
    </div>,
    document.body
  );
};

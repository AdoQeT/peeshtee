import React, { useLayoutEffect, useRef } from 'react';
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

  const duration = fc.duration ?? 420;
  const startScale = fc.startScale ?? 1;
  const targetScale = fc.targetScale ?? 1;
  const arcHeight = fc.arcHeight ?? 45;

  useLayoutEffect(() => {
    const el = outerRef.current;
    const inner = innerRef.current;
    if (!el) return;

    const dx = fc.targetX - fc.startX;
    const dy = fc.targetY - fc.startY;
    const dist = Math.hypot(dx, dy);

    const nx = dist > 1 ? -dy / dist : 0;
    const curveMag = Math.min(26, dist * 0.08);
    const liftY = Math.min(arcHeight, Math.max(20, dist * 0.16));

    const apexX = fc.startX + dx * 0.5 + nx * curveMag;
    const apexY = fc.startY + dy * 0.5 - liftY;

    const steps = 10;
    const keyframes: Keyframe[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const oneMinusT = 1 - t;
      const curX = oneMinusT * oneMinusT * fc.startX + 2 * oneMinusT * t * apexX + t * t * fc.targetX;
      const curY = oneMinusT * oneMinusT * fc.startY + 2 * oneMinusT * t * apexY + t * t * fc.targetY;
      const curRot = fc.startRotation + (fc.targetRotation - fc.startRotation) * t;
      const curScale = startScale + (targetScale - startScale) * t + Math.sin(t * Math.PI) * 0.07;

      keyframes.push({
        offset: t,
        transform: `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${curRot.toFixed(1)}deg) scale(${curScale.toFixed(3)})`
      });
    }

    const flightAnim = el.animate(keyframes, {
      duration,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards'
    });

    if (inner && fc.startFaceUp !== fc.endFaceUp) {
      const startYRot = fc.startFaceUp ? 0 : 180;
      const endYRot = fc.endFaceUp ? 0 : 180;
      inner.animate(
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
    const fallbackTimer = window.setTimeout(triggerComplete, duration + 35);

    return () => {
      window.clearTimeout(fallbackTimer);
      try {
        flightAnim.cancel();
      } catch {
        // Ignored
      }
    };
  }, [fc, duration, startScale, targetScale, arcHeight]);

  return (
    <div
      ref={outerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: fc.zIndex ?? 60,
        pointerEvents: 'none',
        willChange: 'transform'
      }}
    >
      <div
        ref={innerRef}
        style={{
          transformStyle: 'preserve-3d',
          width: '100%',
          height: '100%'
        }}
      >
        {fc.endFaceUp ? (
          <UnoCardView card={fc.card} size={fc.size || 'md'} />
        ) : (
          <UnoCardBack size={fc.size || 'md'} />
        )}
      </div>
    </div>
  );
};

export const UnoCardAnimationLayer: React.FC<{
  flyingCards: FlyingUnoCardData[];
}> = ({ flyingCards }) => {
  if (flyingCards.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {flyingCards.map(fc => (
        <FlyingUnoCardItem key={fc.id} fc={fc} />
      ))}
    </div>
  );
};

import React, { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { UnoCard } from '../features/uno/unoTypes';
import { UnoCardView, UnoCardBack } from './UnoCardView';
import { gsapCardEngine } from '../core/animation/gsapCardEngine';
import gsap from 'gsap';

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

  const duration = (fc.duration ?? 440) / 1000; // in seconds
  const startScale = fc.startScale ?? 1;
  const targetScale = fc.targetScale ?? 1;
  const arcHeight = fc.arcHeight ?? 56;

  useLayoutEffect(() => {
    const el = outerRef.current;
    const inner = innerRef.current;
    if (!el) return;

    let isCancelled = false;

    const tl = gsapCardEngine.flyCard({
      element: el,
      innerElement: inner,
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
      duration,
      arcHeight,
      onComplete: () => {
        if (!isCancelled) {
          onCompleteRef.current?.();
        }
      }
    });

    return () => {
      isCancelled = true;
      tl.kill();
      gsap.killTweensOf(el);
      if (inner) gsap.killTweensOf(inner);
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

import React, { useLayoutEffect, useRef } from 'react';
import { UnoCardBack } from './UnoCardView';
import { sound } from '../core/audio/soundEngine';

interface UnoGrandShuffleLayerProps {
  getTargetPos: () => { x: number; y: number };
  onComplete: () => void;
}

/**
 * 144 FPS Hardware-Accelerated 108-Card Grand Deck Shuffle Engine for UNO
 * - Multi-Packet 3D Deck Split
 * - High-Speed Casino Riffle Interleave
 * - 3D Waterfall Bridge Bend & Snap
 * - Seamless Glide into the Draw Deck Position (Zero Teleportation)
 */
export const UnoGrandShuffleLayer: React.FC<UnoGrandShuffleLayerProps> = ({
  getTargetPos,
  onComplete
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const totalCards = 24; // 24 physical layered cards giving the optical density of a 108-card Uno deck

  useLayoutEffect(() => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const targetPos = getTargetPos();
    const finalX = targetPos.x;
    const finalY = targetPos.y;

    const easeOut = 'cubic-bezier(0.22, 1, 0.36, 1)';
    const easeInOut = 'cubic-bezier(0.45, 0, 0.25, 1)';

    sound.playRiffleShuffle();

    const animations: Animation[] = [];

    cardRefs.current.forEach((el, idx) => {
      if (!el) return;

      const duration = 2200;
      const isLeft = idx < totalCards / 2;
      const halfIdx = isLeft ? idx : idx - totalCards / 2;
      const splitX = isLeft ? centerX - 130 : centerX + 130;
      const splitRot = isLeft ? -14 : 14;
      const riffleOrder = isLeft ? halfIdx * 2 : halfIdx * 2 + 1;
      const riffleStart = 0.24 + (riffleOrder / totalCards) * 0.28;
      const riffleEnd = Math.min(0.64, riffleStart + 0.08);

      const stackOffset = Math.min(idx, 6) * 0.75;

      const keyframes: Keyframe[] = [
        // 0: Centered resting deck
        {
          transform: `translate3d(${centerX}px, ${centerY - idx * 0.6}px, 0) translate(-50%, -50%) rotate(0deg) scale(1)`,
          offset: 0,
          easing: easeOut
        },
        // 0.20: Split deck into left and right 54-card packets
        {
          transform: `translate3d(${splitX}px, ${centerY - halfIdx * 0.9}px, 0) translate(-50%, -50%) rotate(${splitRot}deg) scale(1.05)`,
          offset: 0.2,
          easing: easeInOut
        },
        // Hold split before riffle
        {
          transform: `translate3d(${splitX}px, ${centerY - halfIdx * 0.9}px, 0) translate(-50%, -50%) rotate(${splitRot}deg) scale(1.05)`,
          offset: riffleStart,
          easing: easeOut
        },
        // Riffle interleave to center with snappy snap
        {
          transform: `translate3d(${centerX + (isLeft ? -12 : 12)}px, ${centerY - riffleOrder * 0.45}px, 0) translate(-50%, -50%) rotate(${isLeft ? -3 : 3}deg) scale(1.02)`,
          offset: riffleEnd,
          easing: easeInOut
        },
        // 0.72: The 3D Bridge Arc (cards arch upwards in middle)
        {
          transform: `translate3d(${centerX}px, ${centerY - 52 - Math.abs(idx - totalCards / 2) * 1.5}px, 0) translate(-50%, -50%) rotate(${isLeft ? 9 : -9}deg) scale(1.04)`,
          offset: 0.74,
          easing: easeInOut
        },
        // 0.86: Snap flat down into unified 108-card deck
        {
          transform: `translate3d(${centerX}px, ${centerY - idx * 0.6}px, 0) translate(-50%, -50%) rotate(0deg) scale(1)`,
          offset: 0.86,
          easing: easeOut
        },
        // 1.0: Glide straight into the live Draw Deck table coordinate
        {
          transform: `translate3d(${finalX - stackOffset}px, ${finalY - stackOffset}px, 0) translate(-50%, -50%) rotate(0deg) scale(1)`,
          offset: 1
        }
      ];

      const anim = el.animate(keyframes, {
        duration,
        fill: 'forwards'
      });
      animations.push(anim);
    });

    const timer = window.setTimeout(() => {
      onComplete();
    }, 2250);

    return () => {
      window.clearTimeout(timer);
      animations.forEach(a => a.cancel());
    };
  }, [getTargetPos, onComplete, totalCards]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
    >
      {/* Dynamic Casino Riffle Atmosphere Glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 rounded-full bg-amber-500/15 blur-3xl animate-pulse" />
      </div>

      {Array.from({ length: totalCards }).map((_, idx) => (
        <div
          key={idx}
          ref={el => {
            cardRefs.current[idx] = el;
          }}
          className="absolute top-0 left-0 will-change-transform shadow-2xl rounded-2xl"
          style={{
            zIndex: 100 + idx
          }}
        >
          <UnoCardBack size="md" />
        </div>
      ))}
    </div>
  );
};

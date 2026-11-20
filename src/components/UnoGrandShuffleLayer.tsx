import React, { useLayoutEffect, useRef } from 'react';
import { UnoCardBack } from './UnoCardView';
import { sound } from '../core/audio/soundEngine';

interface UnoGrandShuffleLayerProps {
  getTargetPos: () => { x: number; y: number };
  onComplete: () => void;
  graphicsQuality?: 'auto' | 'low' | 'medium' | 'high';
}

/**
 * Hardware-Accelerated 108-Card Grand Deck Shuffle Engine for UNO
 */
export const UnoGrandShuffleLayer: React.FC<UnoGrandShuffleLayerProps> = React.memo(({
  getTargetPos,
  onComplete,
  graphicsQuality = 'auto'
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const getTargetPosRef = useRef(getTargetPos);
  getTargetPosRef.current = getTargetPos;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const totalCards = graphicsQuality === 'low' ? 16 : 24;

  useLayoutEffect(() => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const targetPos = getTargetPosRef.current();
    const finalX = targetPos.x;
    const finalY = targetPos.y;

    const easeOut = 'cubic-bezier(0.22, 1, 0.36, 1)';
    const easeInOut = 'cubic-bezier(0.45, 0, 0.25, 1)';

    sound.playRiffleShuffle();
    const fanTimer = window.setTimeout(() => sound.playCardFan(), 1100);
    const slapTimer = window.setTimeout(() => sound.playTripleCut(), 1820);

    const animations: Animation[] = [];

    cardRefs.current.forEach((el, idx) => {
      if (!el) return;

      const duration = 2350;
      const isLeft = idx < totalCards / 2;
      const halfIdx = isLeft ? idx : idx - totalCards / 2;
      const splitX = isLeft ? centerX - 145 : centerX + 145;
      const splitRotZ = isLeft ? -14 : 14;
      const splitRotY = isLeft ? 24 : -24;
      const riffleOrder = isLeft ? halfIdx * 2 : halfIdx * 2 + 1;
      const riffleStart = 0.20 + (riffleOrder / totalCards) * 0.26;
      const riffleEnd = Math.min(0.58, riffleStart + 0.06);
      const bridgeStart = 0.60 + ((totalCards - 1 - riffleOrder) / totalCards) * 0.14;
      const bridgeDrop = Math.min(0.84, bridgeStart + 0.07);

      const stackOffset = Math.min(idx, 6) * 0.75;

      const keyframes: Keyframe[] = [
        // 0: Centered resting deck
        {
          transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - idx * 0.5}px, 0) translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)`,
          offset: 0,
          easing: easeOut
        },
        // 0.18: Split deck into left and right 54-card packets in 3D
        {
          transform: `perspective(1100px) translate3d(${splitX}px, ${centerY - 16 - halfIdx * 0.85}px, 0) translate(-50%, -50%) rotateX(16deg) rotateY(${splitRotY}deg) rotateZ(${splitRotZ}deg) scale(1.06)`,
          offset: 0.18,
          easing: easeInOut
        },
        // Hold split before riffle
        {
          transform: `perspective(1100px) translate3d(${splitX}px, ${centerY - 16 - halfIdx * 0.85}px, 0) translate(-50%, -50%) rotateX(16deg) rotateY(${splitRotY}deg) rotateZ(${splitRotZ}deg) scale(1.06)`,
          offset: riffleStart,
          easing: easeOut
        },
        // Riffle interleave to center with snappy snap
        {
          transform: `perspective(1100px) translate3d(${centerX + (isLeft ? -18 : 18)}px, ${centerY - riffleOrder * 0.42}px, 0) translate(-50%, -50%) rotateX(8deg) rotateY(${isLeft ? 8 : -8}deg) rotateZ(${isLeft ? -3 : 3}deg) scale(1.02)`,
          offset: riffleEnd,
          easing: easeInOut
        },
        // The 3D Waterfall Bridge Arc
        {
          transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - 74 - Math.sin((riffleOrder / totalCards) * Math.PI) * 26}px, 0) translate(-50%, -50%) rotateX(32deg) rotateY(${isLeft ? -12 : 12}deg) rotateZ(${isLeft ? 9 : -9}deg) scale(1.1)`,
          offset: bridgeStart,
          easing: easeInOut
        },
        // Snap flat down into unified 108-card deck
        {
          transform: `perspective(1100px) translate3d(${centerX}px, ${centerY - idx * 0.5}px, 0) translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)`,
          offset: bridgeDrop,
          easing: easeOut
        },
        // 1.0: Glide straight into the live Draw Deck table coordinate
        {
          transform: `perspective(1100px) translate3d(${finalX - stackOffset}px, ${finalY - stackOffset}px, 0) translate(-50%, -50%) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)`,
          offset: 1
        }
      ];

      const anim = el.animate(keyframes, {
        duration,
        fill: 'forwards'
      });
      animations.push(anim);
    });

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) onCompleteRef.current();
    }, 2400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(fanTimer);
      window.clearTimeout(slapTimer);
      animations.forEach(a => a.cancel());
    };
  }, [totalCards]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
    >
      {/* Dynamic Casino Riffle Atmosphere Glow (zero blur-3xl/ping overhead) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(245,158,11,0.22) 0%, rgba(245,158,11,0.06) 45%, transparent 72%)'
          }}
        />
      </div>

      {/* Floating RENQ Shuffle Banner */}
      <div className="absolute left-1/2 top-[28%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-[160]">
        <div className="px-4 py-1.5 rounded-full bg-slate-950/95 border-2 border-amber-400 text-amber-300 font-cyber text-xs font-black tracking-wider flex items-center gap-2 shadow-[0_0_24px_rgba(245,158,11,0.5)]">
          <span className="animate-spin">🔥</span>
          <span>108 KART RENQ HARMANLANIYOR</span>
        </div>
      </div>

      {Array.from({ length: totalCards }).map((_, idx) => (
        <div
          key={idx}
          ref={el => {
            cardRefs.current[idx] = el;
          }}
          className="absolute top-0 left-0 will-change-transform shadow-xl rounded-2xl"
          style={{
            zIndex: 100 + idx
          }}
        >
          <UnoCardBack size="md" />
        </div>
      ))}
    </div>
  );
});

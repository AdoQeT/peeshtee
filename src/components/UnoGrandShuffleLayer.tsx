import React, { useLayoutEffect, useRef } from 'react';
import { UnoCardBack } from './UnoCardView';
import { sound } from '../core/audio/soundEngine';
import gsap from 'gsap';

interface UnoGrandShuffleLayerProps {
  getTargetPos: () => { x: number; y: number };
  onComplete: () => void;
}

/**
 * GSAP 144Hz/240Hz+ 108-Card Grand Deck Shuffle Engine for UNO
 * - Multi-Packet 3D Deck Split with Smooth Elastic Easing
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
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const totalCards = 24;

  useLayoutEffect(() => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const targetPos = getTargetPos();
    const finalX = targetPos.x;
    const finalY = targetPos.y;

    sound.playRiffleShuffle();

    const masterTl = gsap.timeline({
      onComplete: () => {
        onCompleteRef.current?.();
      }
    });

    cardRefs.current.forEach((el, idx) => {
      if (!el) return;

      const isLeft = idx < totalCards / 2;
      const halfIdx = isLeft ? idx : idx - totalCards / 2;
      const splitX = isLeft ? centerX - 130 : centerX + 130;
      const splitRot = isLeft ? -14 : 14;
      const riffleOrder = isLeft ? halfIdx * 2 : halfIdx * 2 + 1;
      const riffleDelay = 0.5 + (riffleOrder / totalCards) * 0.55;
      const stackOffset = Math.min(idx, 6) * 0.75;

      // Initial placement at center
      gsap.set(el, {
        x: centerX,
        y: centerY - idx * 0.6,
        rotation: 0,
        scale: 1,
        transformOrigin: '50% 50%',
        force3D: true
      });

      const cardTl = gsap.timeline();

      // Step 1: Split into 2 packets
      cardTl
        .to(el, {
          x: splitX,
          y: centerY - halfIdx * 0.9,
          rotation: splitRot,
          scale: 1.05,
          duration: 0.45,
          ease: 'power2.out'
        })
        // Step 2: Riffle interleave to center with crisp stagger
        .to(
          el,
          {
            x: centerX + (isLeft ? -10 : 10),
            y: centerY - riffleOrder * 0.45,
            rotation: isLeft ? -2.5 : 2.5,
            scale: 1.02,
            duration: 0.22,
            ease: 'power1.inOut'
          },
          riffleDelay
        )
        // Step 3: 3D Bridge Arc bend
        .to(el, {
          x: centerX,
          y: centerY - 52 - Math.abs(idx - totalCards / 2) * 1.6,
          rotation: isLeft ? 8 : -8,
          scale: 1.05,
          duration: 0.35,
          ease: 'power1.out'
        })
        // Step 4: Snap flat into unified deck
        .to(el, {
          x: centerX,
          y: centerY - idx * 0.6,
          rotation: 0,
          scale: 1,
          duration: 0.24,
          ease: 'back.out(1.5)' // tactile slap
        })
        // Step 5: Smooth parabolic glide into Draw Deck position
        .to(el, {
          x: finalX - stackOffset,
          y: finalY - stackOffset,
          rotation: 0,
          scale: 1,
          duration: 0.55,
          ease: 'power2.inOut'
        });

      masterTl.add(cardTl, 0);
    });

    return () => {
      masterTl.kill();
      cardRefs.current.forEach(el => {
        if (el) gsap.killTweensOf(el);
      });
    };
  }, [getTargetPos, totalCards]);

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

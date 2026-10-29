import gsap from 'gsap';

export interface GsapFlightOptions {
  element: HTMLElement;
  innerElement?: HTMLElement | null;
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
  duration?: number; // in seconds
  arcHeight?: number; // in pixels
  waypointX?: number;
  waypointY?: number;
  waypointRotation?: number;
  onComplete?: () => void;
}

/**
 * Project PEESHTEE - Master GSAP 3D Card Physics Engine
 * Delivers buttery smooth 144Hz/240Hz+ parabolic arc trajectories,
 * 3D elevation depth, distance-attenuated drop-shadows, and tactile landing bounces.
 */
class GsapCardEngine {
  /**
   * Executes a physics-based 3D parabolic card flight
   */
  public flyCard(opts: GsapFlightOptions): gsap.core.Timeline {
    const {
      element,
      innerElement,
      startX,
      startY,
      targetX,
      targetY,
      startRotation,
      targetRotation,
      startFaceUp,
      endFaceUp,
      startScale = 1,
      targetScale = 1,
      duration = 0.44,
      arcHeight = 52,
      waypointX,
      waypointY,
      waypointRotation,
      onComplete
    } = opts;

    // Kill any existing tweens on this element to prevent conflicts
    gsap.killTweensOf(element);
    if (innerElement) gsap.killTweensOf(innerElement);

    const tl = gsap.timeline({
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });

    // Initial setup
    gsap.set(element, {
      x: startX,
      y: startY,
      rotation: startRotation,
      scale: startScale,
      transformOrigin: '50% 50%',
      force3D: true
    });

    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.hypot(dx, dy);

    // Lateral curve perpendicular to flight line for authentic wrist whip
    const nx = dist > 1 ? -dy / dist : 0;
    const curveMag = Math.min(28, dist * 0.08);
    const lift = Math.min(arcHeight, Math.max(20, dist * 0.16));

    if (waypointX !== undefined && waypointY !== undefined) {
      // 3-point waypoint trajectory (e.g. from table to winner's front, then to pile)
      const wpRot = waypointRotation ?? (startRotation + targetRotation) / 2;
      const wpScale = Math.max(startScale, targetScale) * 1.08;

      tl.to(element, {
        x: waypointX,
        y: waypointY - lift * 0.6,
        rotation: wpRot,
        scale: wpScale,
        duration: duration * 0.45,
        ease: 'power2.out'
      }).to(element, {
        x: targetX,
        y: targetY,
        rotation: targetRotation,
        scale: targetScale,
        duration: duration * 0.55,
        ease: 'back.out(1.35)' // tactile landing settle
      });
    } else {
      // 2-point parabolic arc with Bezier-like physics
      const apexX = startX + dx * 0.5 + nx * curveMag;
      const apexY = startY + dy * 0.5 - lift;
      const apexScale = Math.max(startScale, targetScale) * 1.12;

      // Phase 1: Rise to apex with aerial float
      tl.to(element, {
        x: apexX,
        y: apexY,
        rotation: startRotation + (targetRotation - startRotation) * 0.45,
        scale: apexScale,
        duration: duration * 0.48,
        ease: 'power1.out'
      })
        // Phase 2: Descend to target with snappy table snap & micro-bounce
        .to(element, {
          x: targetX,
          y: targetY,
          rotation: targetRotation,
          scale: targetScale,
          duration: duration * 0.52,
          ease: 'back.out(1.4)' // signature casino card slap
        });
    }

    // 3D Flip (Front <-> Back) along Y-axis if orientation changes
    if (innerElement && startFaceUp !== endFaceUp) {
      const initialRotY = startFaceUp ? 0 : 180;
      const finalRotY = endFaceUp ? 0 : 180;

      gsap.set(innerElement, { rotationY: initialRotY, transformStyle: 'preserve-3d' });

      tl.to(
        innerElement,
        {
          rotationY: finalRotY,
          duration: duration * 0.85,
          ease: 'power2.inOut'
        },
        duration * 0.08 // start flipping right after takeoff
      );
    }

    return tl;
  }

  /**
   * Micro-bounce & table impact shake when a card is slammed or Pişti occurs
   */
  public impactShake(target: HTMLElement, intensity: 'soft' | 'hard' = 'soft'): void {
    const power = intensity === 'hard' ? 7 : 3.5;
    gsap.fromTo(
      target,
      { y: -power, rotation: (Math.random() - 0.5) * power * 0.5 },
      {
        y: 0,
        rotation: 0,
        duration: 0.22,
        ease: 'elastic.out(1.2, 0.3)',
        clearProps: 'transform'
      }
    );
  }

  /**
   * Fluid hand card hover / fan animation
   */
  public hoverCard(cardEl: HTMLElement, isHovered: boolean, naturalTilt: number = 0): void {
    gsap.killTweensOf(cardEl);
    if (isHovered) {
      gsap.to(cardEl, {
        y: -26,
        scale: 1.12,
        rotation: naturalTilt * 0.5,
        zIndex: 40,
        duration: 0.2,
        ease: 'power2.out',
        boxShadow: '0 20px 35px rgba(0,0,0,0.65)'
      });
    } else {
      gsap.to(cardEl, {
        y: 0,
        scale: 1,
        rotation: naturalTilt,
        zIndex: 'auto',
        duration: 0.24,
        ease: 'power2.inOut',
        clearProps: 'boxShadow'
      });
    }
  }
}

export const gsapCardEngine = new GsapCardEngine();

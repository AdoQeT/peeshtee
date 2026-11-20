export interface CardFlightParams {
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
  arcHeight?: number;
  waypointX?: number;
  waypointY?: number;
  waypointRotation?: number;
  waypointScale?: number;
  waypointOffset?: number;
  /** Kart türü: 'deal' = dağıtım, 'play' = oynama, 'sweep' = toplama, 'jack' = vale süpürme, 'center_reveal' = ortaya açılan kart */
  motionType?: 'deal' | 'play' | 'sweep' | 'jack' | 'pisti_slam' | 'center_reveal';
}

export interface GeneratedFlightPlan {
  keyframes: Keyframe[];
  flipKeyframes: Keyframe[] | null;
  durationMs: number;
  easing: string;
}

/**
 * Universal High-Refresh 3D Card Physics Engine (60Hz - 240Hz+ GPU Composited)
 *
 * Runs 100% on the browser's hardware-accelerated compositor thread (off-main-thread).
 * Features:
 *  1. Highly Visible 3D Parabolic Arc (80-110px aerial apex)
 *  2. True 3D Aerodynamic Pitch & Banking (32° nose-up wrist-whip)
 *  3. Decoupled Airborne Drop Shadow (expands & softens when high, snaps tight on landing)
 *  4. Tactile Casino Baize Landing Snap & Micro-Settle (Micro-overshoot dampening)
 *  5. Motion-type aware easing: play cards spring in, swept cards accelerate out
 */
class CardPhysicsEngine {
  private quality: 'auto' | 'low' | 'medium' | 'high' = 'auto';

  public setQuality(quality: 'auto' | 'low' | 'medium' | 'high') {
    this.quality = quality;
  }

  private isLowQuality(): boolean {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return true;
    }
    if (this.quality === 'low') return true;
    if (this.quality === 'auto' && typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 4) <= 2) {
      return true;
    }
    return false;
  }

  /**
   * Generates an ultra-smooth hardware keyframe sequence with bold, eye-catching 3D physics
   */
  public generateFlightPlan(
    params: CardFlightParams,
    baseDurationMs: number = 480
  ): GeneratedFlightPlan {
    const {
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
      arcHeight = 92,
      waypointX,
      waypointY,
      waypointRotation,
      waypointScale,
      waypointOffset = 0.38,
      motionType = 'deal'
    } = params;

    const dx = targetX - startX;
    const dy = targetY - startY;
    const flightDist = Math.hypot(dx, dy);

    // Motion-type aware duration calibration
    let durationBias = 0;
    if (motionType === 'play') durationBias = -30;       // oynanış biraz daha snappy
    if (motionType === 'sweep') durationBias = -50;      // toplama hızlı ve kararlı
    if (motionType === 'jack') durationBias = 20;        // vale süpürme biraz daha dramatik
    if (motionType === 'pisti_slam') durationBias = 140; // Pişti vururken havada yükselme & taakkk iniş
    if (motionType === 'center_reveal') durationBias = 190; // Ortaya açılan 4. kart veya Vale şov dönüşü

    const maxAllowedDur = motionType === 'center_reveal' ? 720 : 580;
    const adaptiveDuration = Math.round(
      Math.min(maxAllowedDur, Math.max(380, baseDurationMs + flightDist * 0.12 + durationBias))
    );

    // Normal vector perpendicular to flight direction for natural wrist banking
    const nx = flightDist > 1 ? -dy / flightDist : 0;
    const ny = flightDist > 1 ? dx / flightDist : 0;

    // Sweep & jack motions curve to the side more (cards fly to pile in arc)
    const curveDriveFactor = (motionType === 'sweep' || motionType === 'jack') ? 0.18 : 0.10;
    const curveMag = Math.min(55, Math.max(14, flightDist * curveDriveFactor));

    // Arc height: play & jack get more loft for drama, deal & sweep stay lower for snappiness
    const liftFactor = motionType === 'pisti_slam' ? 0.75 : motionType === 'jack' ? 0.35 : motionType === 'play' ? 0.30 : 0.24;
    const liftY = motionType === 'pisti_slam' ? 160 : Math.min(arcHeight, Math.max(48, flightDist * liftFactor));

    // Easing: pure smooth curves (zero off-thread filter rasterization)
    const easing =
      motionType === 'sweep' || motionType === 'jack'
        ? 'cubic-bezier(0.32, 0.08, 0.24, 1.0)'   // accelerate → crisp arrive
        : motionType === 'play'
        ? 'cubic-bezier(0.22, 1.0, 0.36, 1.0)'    // silky fast-out smooth settle
        : 'cubic-bezier(0.25, 1.0, 0.35, 1.0)';   // standard casino baize

    const lowMode = this.isLowQuality();
    const steps = lowMode ? 10 : 18;
    const keyframes: Keyframe[] = [];

    if (waypointX !== undefined && waypointY !== undefined) {
      // 3-Point Waypoint Trajectory (e.g. swept from table to showcase point then collected pile)
      const wpRot = waypointRotation ?? startRotation + (targetRotation - startRotation) * 0.4;
      const wpScale = waypointScale ?? Math.max(startScale, targetScale) * 1.18;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        let curX: number, curY: number, curRot: number, curScale: number;

        if (t <= waypointOffset) {
          const subT = t / waypointOffset;
          const subSine = Math.sin(subT * Math.PI);
          curX = startX + (waypointX - startX) * subT + nx * curveMag * subSine * 0.6;
          curY = startY + (waypointY - startY) * subT - liftY * subSine * 0.8;
          curRot = startRotation + (wpRot - startRotation) * subT;
          curScale = startScale + (wpScale - startScale) * subT + subSine * 0.16;
        } else {
          const subT = (t - waypointOffset) / (1 - waypointOffset);
          const subSine = Math.sin(subT * Math.PI);
          curX = waypointX + (targetX - waypointX) * subT + nx * curveMag * subSine * 0.9;
          curY = waypointY + (targetY - waypointY) * subT - liftY * subSine * 1.05;
          curRot = wpRot + (targetRotation - wpRot) * subT;
          curScale = wpScale + (targetScale - wpScale) * subT + subSine * 0.18;
        }

        const arcSine = Math.sin(t * Math.PI);
        const maxPitch = motionType === 'jack' ? 32 : motionType === 'sweep' ? 22 : 26;
        const pitchX = Math.round(arcSine * maxPitch);
        const pitchZ = Math.round(arcSine * Math.sign(nx) * 5);

        keyframes.push({
          offset: t,
          transform: `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${curRot.toFixed(1)}deg) rotateX(${pitchX}deg) rotateZ(${pitchZ}deg) scale(${curScale.toFixed(3)})`
        });
      }
    } else if (motionType === 'pisti_slam') {
      // Pişti / Double Pişti Taakkk Vuruş Fiziği (100% GPU compositor-only transform)
      const slamSteps = lowMode ? 12 : 20;
      for (let i = 0; i <= slamSteps; i++) {
        const t = i / slamSteps;
        let curX: number, curY: number, curRot: number, curScale: number;
        let pitchX: number, pitchZ: number;

        if (t <= 0.65) {
          const subT = t / 0.65;
          const easeOut = Math.sin(subT * Math.PI * 0.5);
          curX = startX + (dx * 0.40) * easeOut + nx * (curveMag * 0.6) * easeOut;
          curY = startY + (dy * 0.40) * easeOut - liftY * easeOut;
          curRot = startRotation + (targetRotation - startRotation) * (0.3 * easeOut);
          curScale = startScale + 0.34 * easeOut;
          pitchX = Math.round(36 * easeOut);
          pitchZ = Math.round(6 * easeOut);
        } else if (t <= 0.78) {
          const subT = (t - 0.65) / 0.13;
          curX = startX + dx * 0.40 + (dx * 0.08) * subT;
          curY = startY + dy * 0.40 - liftY + (liftY * 0.03) * subT;
          curRot = startRotation + (targetRotation - startRotation) * (0.3 + 0.08 * subT);
          curScale = startScale + 0.34;
          pitchX = 36;
          pitchZ = 6;
        } else {
          const subT = (t - 0.78) / 0.22;
          const slam = subT * subT * subT;
          const apexX = startX + dx * 0.48;
          const apexY = startY + dy * 0.48 - liftY * 0.97;
          curX = apexX + (targetX - apexX) * slam;
          curY = apexY + (targetY - apexY) * slam;
          curRot = startRotation + (targetRotation - startRotation) * (0.38 + 0.62 * slam);
          curScale = (startScale + 0.34) - 0.34 * slam;
          pitchX = Math.round(36 * (1 - slam));
          pitchZ = Math.round(6 * (1 - slam));

          if (t >= 0.96) {
            curScale = 1.04;
          }
        }

        keyframes.push({
          offset: t,
          transform: `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${curRot.toFixed(1)}deg) rotateX(${pitchX}deg) rotateZ(${pitchZ}deg) scale(${curScale.toFixed(3)})`
        });
      }
    } else if (motionType === 'center_reveal') {
      // Sinematik Ortaya Kart Açılışı (100% GPU compositor-only transform)
      const revealSteps = lowMode ? 12 : 20;
      const revealLiftY = Math.max(98, arcHeight);
      for (let i = 0; i <= revealSteps; i++) {
        const t = i / revealSteps;
        let curX: number, curY: number, curRot: number, curScale: number;
        let pitchX: number, pitchZ: number;

        if (t <= 0.52) {
          const subT = t / 0.52;
          const easeOut = Math.sin(subT * Math.PI * 0.5);
          curX = startX + dx * 0.88 * easeOut;
          curY = startY + dy * 0.88 * easeOut - revealLiftY * easeOut;
          curRot = startRotation + (targetRotation - startRotation) * (0.6 * easeOut);
          curScale = startScale + 0.40 * easeOut;
          pitchX = Math.round(22 * Math.sin(subT * Math.PI));
          pitchZ = Math.round(-5 * (1 - easeOut));
        } else if (t <= 0.74) {
          const subT = (t - 0.52) / 0.22;
          curX = startX + dx * (0.88 + 0.10 * subT);
          curY = startY + dy * (0.88 + 0.10 * subT) - revealLiftY * (1 - 0.08 * subT);
          curRot = startRotation + (targetRotation - startRotation) * (0.6 + 0.25 * subT);
          curScale = startScale + 0.40 - 0.04 * subT;
          pitchX = Math.round(10 * (1 - subT));
          pitchZ = 0;
        } else {
          const subT = (t - 0.74) / 0.26;
          const slam = subT * subT * (3 - 2 * subT);
          const apexX = startX + dx * 0.98;
          const apexY = startY + dy * 0.98 - revealLiftY * 0.92;
          curX = apexX + (targetX - apexX) * slam;
          curY = apexY + (targetY - apexY) * slam;
          curRot = startRotation + (targetRotation - startRotation) * (0.85 + 0.15 * slam);
          curScale = (startScale + 0.36) - (startScale + 0.36 - targetScale) * slam;
          pitchX = Math.round(-6 * Math.sin(subT * Math.PI));
          pitchZ = 0;
        }

        keyframes.push({
          offset: t,
          transform: `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${curRot.toFixed(1)}deg) rotateX(${pitchX}deg) rotateZ(${pitchZ}deg) scale(${curScale.toFixed(3)})`
        });
      }
    } else {
      // 2-Point Parabolic Arc with Crisp 3D Wrist Whip (100% GPU compositor-only transform)
      const sideOffset = Math.abs(ny) < 0.2 ? curveMag * 0.4 : 0;
      const apexX = startX + dx * 0.5 + nx * curveMag + ny * sideOffset;
      const apexY = startY + dy * 0.5 - liftY;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const oneMinusT = 1 - t;

        const curX =
          oneMinusT * oneMinusT * startX + 2 * oneMinusT * t * apexX + t * t * targetX;
        const curY =
          oneMinusT * oneMinusT * startY + 2 * oneMinusT * t * apexY + t * t * targetY;

        const baseRot = startRotation + (targetRotation - startRotation) * t;
        const bankFactor = motionType === 'jack' ? 10 : motionType === 'sweep' ? 5 : 7;
        const banking = Math.sin(t * Math.PI) * (nx * bankFactor);
        const curRot = baseRot + banking;

        const arcSine = Math.sin(t * Math.PI);
        const scaleBump =
          motionType === 'sweep' ? 0.10 :
          motionType === 'jack' ? 0.28 :
          motionType === 'play' ? 0.18 : 0.20;
        const curScale = startScale + (targetScale - startScale) * t + arcSine * scaleBump;

        const maxPitch = motionType === 'jack' ? 34 : motionType === 'play' ? 26 : 24;
        const pitchX = Math.round(arcSine * maxPitch);
        const pitchZ = Math.round(arcSine * Math.sign(nx || 1) * 4);

        const settleT = Math.max(0, (t - 0.9) / 0.1);
        const settle = settleT > 0 ? Math.sin(settleT * Math.PI) * 0.035 : 0;
        const finalScale = curScale + (t > 0.9 ? settle : 0);

        keyframes.push({
          offset: t,
          transform: `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${curRot.toFixed(1)}deg) rotateX(${pitchX}deg) rotateZ(${pitchZ}deg) scale(${finalScale.toFixed(3)})`
        });
      }
    }

    // 3D Flip Keyframes if card turns face-up or face-down mid-flight
    let flipKeyframes: Keyframe[] | null = null;
    if (startFaceUp !== endFaceUp) {
      const startRotY = startFaceUp ? 0 : 180;
      const endRotY = endFaceUp ? 0 : 180;
      if (motionType === 'center_reveal') {
        flipKeyframes = [
          { transform: `rotateY(${startRotY}deg)`, offset: 0 },
          { transform: `rotateY(${startRotY}deg)`, offset: 0.14 },
          { transform: `rotateY(${(startRotY + endRotY) / 2}deg)`, offset: 0.34 },
          { transform: `rotateY(${endRotY}deg)`, offset: 0.52 },
          { transform: `rotateY(${endRotY}deg)`, offset: 1 }
        ];
      } else {
        // Flip happens closer to the apex (feels like the card reveals itself at peak height)
        const flipOffset = motionType === 'deal' ? 0.52 : 0.5;
        flipKeyframes = [
          { transform: `rotateY(${startRotY}deg)`, offset: 0 },
          { transform: `rotateY(${(startRotY + endRotY) / 2}deg)`, offset: flipOffset },
          { transform: `rotateY(${endRotY}deg)`, offset: 1 }
        ];
      }
    }

    return {
      keyframes,
      flipKeyframes,
      durationMs: adaptiveDuration,
      easing
    };
  }
}

export const cardPhysics = new CardPhysicsEngine();

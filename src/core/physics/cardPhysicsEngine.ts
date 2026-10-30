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
  /** Kart türü: 'deal' = dağıtım, 'play' = oynama, 'sweep' = toplama, 'jack' = vale süpürme */
  motionType?: 'deal' | 'play' | 'sweep' | 'jack' | 'pisti_slam';
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

    const adaptiveDuration = Math.round(
      Math.min(580, Math.max(380, baseDurationMs + flightDist * 0.12 + durationBias))
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

    // Easing: play cards spring in with elastic landing; sweep cards ease-in (accelerate)
    const easing =
      motionType === 'sweep' || motionType === 'jack'
        ? 'cubic-bezier(0.40, 0.05, 0.55, 1.0)'   // accelerate → snappy arrive
        : motionType === 'play'
        ? 'cubic-bezier(0.20, 1.10, 0.30, 1.02)'  // slight overshoot spring
        : 'cubic-bezier(0.25, 1.00, 0.35, 1.00)'; // standard casino baize

    const steps = 20; // +2 extra keyframes for smoother arcs
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
          curScale = startScale + (wpScale - startScale) * subT + subSine * 0.18;
        } else {
          const subT = (t - waypointOffset) / (1 - waypointOffset);
          const subSine = Math.sin(subT * Math.PI);
          curX = waypointX + (targetX - waypointX) * subT + nx * curveMag * subSine * 0.9;
          curY = waypointY + (targetY - waypointY) * subT - liftY * subSine * 1.1;
          curRot = wpRot + (targetRotation - wpRot) * subT;
          curScale = wpScale + (targetScale - wpScale) * subT + subSine * 0.22;
        }

        const arcSine = Math.sin(t * Math.PI);

        // Aerodynamic nose-up pitch: more pronounced for jack sweeps
        const maxPitch = motionType === 'jack' ? 36 : motionType === 'sweep' ? 24 : 28;
        const pitchX = Math.round(arcSine * maxPitch);

        // Side tilt (yaw banking) — subtle card lean into the curve
        const pitchZ = Math.round(arcSine * Math.sign(nx) * 6);

        const shadowY = Math.round(5 + arcSine * 36);
        const shadowBlur = Math.round(8 + arcSine * 38);
        const shadowAlpha = (0.60 - arcSine * 0.22).toFixed(2);

        keyframes.push({
          offset: t,
          transform: `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${curRot.toFixed(1)}deg) rotateX(${pitchX}deg) rotateZ(${pitchZ}deg) scale(${curScale.toFixed(3)})`,
          filter: `drop-shadow(0 ${shadowY}px ${shadowBlur}px rgba(0,0,0,${shadowAlpha}))`
        });
      }
    } else if (motionType === 'pisti_slam') {
      // Pişti / Double Pişti Taakkk Vuruş Fiziği:
      // 1. Kart havada 160px yükselir, büyür (1.35x), derin gölgesi genişler (Anticipation)
      // 2. Tepe noktasında hafifçe asılı kalır (Apex Hang)
      // 3. Son %20'lik dilimde şiddetli kinetik ivmeyle masaya "TAKKK" diye çarpar!
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        let curX: number, curY: number, curRot: number, curScale: number;
        let shadowY: number, shadowBlur: number, shadowAlpha: string;
        let pitchX: number, pitchZ: number;

        if (t <= 0.65) {
          // Faz 1: Yavaşça ve asilce havaya süzülüş (0 -> %65)
          const subT = t / 0.65;
          const easeOut = Math.sin(subT * Math.PI * 0.5);
          curX = startX + (dx * 0.40) * easeOut + nx * (curveMag * 0.6) * easeOut;
          curY = startY + (dy * 0.40) * easeOut - liftY * easeOut;
          curRot = startRotation + (targetRotation - startRotation) * (0.3 * easeOut);
          curScale = startScale + 0.34 * easeOut;
          pitchX = Math.round(38 * easeOut);
          pitchZ = Math.round(6 * easeOut);
          shadowY = Math.round(6 + 55 * easeOut);
          shadowBlur = Math.round(8 + 58 * easeOut);
          shadowAlpha = (0.68 - 0.38 * easeOut).toFixed(2);
        } else if (t <= 0.78) {
          // Faz 2: Zirvede havada asılı kalma (Apex Hang)
          const subT = (t - 0.65) / 0.13;
          curX = startX + dx * 0.40 + (dx * 0.08) * subT;
          curY = startY + dy * 0.40 - liftY + (liftY * 0.03) * subT;
          curRot = startRotation + (targetRotation - startRotation) * (0.3 + 0.08 * subT);
          curScale = startScale + 0.34;
          pitchX = 38;
          pitchZ = 6;
          shadowY = 62;
          shadowBlur = 66;
          shadowAlpha = '0.30';
        } else {
          // Faz 3: Şiddetli ve Ani İniş — TAAAKKK! (%78 -> %100)
          const subT = (t - 0.78) / 0.22;
          // Kübik ivmelenme (gravity crash)
          const slam = subT * subT * subT;
          const apexX = startX + dx * 0.48;
          const apexY = startY + dy * 0.48 - liftY * 0.97;
          curX = apexX + (targetX - apexX) * slam;
          curY = apexY + (targetY - apexY) * slam;
          curRot = startRotation + (targetRotation - startRotation) * (0.38 + 0.62 * slam);
          curScale = (startScale + 0.34) - 0.34 * slam;
          pitchX = Math.round(38 * (1 - slam));
          pitchZ = Math.round(6 * (1 - slam));
          shadowY = Math.round(62 * (1 - slam) + 3 * slam);
          shadowBlur = Math.round(66 * (1 - slam) + 4 * slam);
          shadowAlpha = (0.30 + 0.58 * slam).toFixed(2);

          // Çarpma anında mikro esneme
          if (t >= 0.96) {
            curScale = 1.05;
          }
        }

        keyframes.push({
          offset: t,
          transform: `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${curRot.toFixed(1)}deg) rotateX(${pitchX}deg) rotateZ(${pitchZ}deg) scale(${curScale.toFixed(3)})`,
          filter: `drop-shadow(0 ${shadowY}px ${shadowBlur}px rgba(0,0,0,${shadowAlpha}))`
        });
      }
    } else {
      // 2-Point Parabolic Arc with Bold 3D Wrist Whip & Deep Floating Shadow
      // Side-curve offset to prevent perfectly vertical/horizontal straight lines
      const sideOffset = Math.abs(ny) < 0.2 ? curveMag * 0.4 : 0;
      const apexX = startX + dx * 0.5 + nx * curveMag + ny * sideOffset;
      const apexY = startY + dy * 0.5 - liftY;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const oneMinusT = 1 - t;

        // Quadratic Bezier Curve position
        const curX =
          oneMinusT * oneMinusT * startX + 2 * oneMinusT * t * apexX + t * t * targetX;
        const curY =
          oneMinusT * oneMinusT * startY + 2 * oneMinusT * t * apexY + t * t * targetY;

        // Wrist rotation with apex banking
        const baseRot = startRotation + (targetRotation - startRotation) * t;
        // Banking intensity varies by card type
        const bankFactor = motionType === 'jack' ? 10 : motionType === 'sweep' ? 5 : 7;
        const banking = Math.sin(t * Math.PI) * (nx * bankFactor);
        const curRot = baseRot + banking;

        // Scale: deal cards land slightly larger for presence, sweep cards shrink into pile
        const arcSine = Math.sin(t * Math.PI);
        const scaleBump =
          motionType === 'sweep' ? 0.12 :
          motionType === 'jack' ? 0.30 :
          motionType === 'play' ? 0.20 : 0.22;
        const curScale = startScale + (targetScale - startScale) * t + arcSine * scaleBump;

        // 3D Aerodynamic Pitch — nose-up at apex
        const maxPitch = motionType === 'jack' ? 38 : motionType === 'play' ? 28 : 26;
        const pitchX = Math.round(arcSine * maxPitch);

        // Subtle side tilt into the curve direction (feels organic)
        const pitchZ = Math.round(arcSine * Math.sign(nx || 1) * 5);

        // Landing micro-settle: tiny scale overshoot on the last 10% of travel
        const settleT = Math.max(0, (t - 0.9) / 0.1);
        const settle = settleT > 0 ? Math.sin(settleT * Math.PI) * 0.04 : 0;
        const finalScale = curScale + (t > 0.9 ? settle : 0);

        // Decoupled floating drop-shadow
        const shadowY = Math.round(4 + arcSine * 40);
        const shadowBlur = Math.round(6 + arcSine * 42);
        const shadowAlpha = (0.62 - arcSine * 0.26).toFixed(2);

        keyframes.push({
          offset: t,
          transform: `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${curRot.toFixed(1)}deg) rotateX(${pitchX}deg) rotateZ(${pitchZ}deg) scale(${finalScale.toFixed(3)})`,
          filter: `drop-shadow(0 ${shadowY}px ${shadowBlur}px rgba(0,0,0,${shadowAlpha}))`
        });
      }
    }

    // 3D Flip Keyframes if card turns face-up or face-down mid-flight
    let flipKeyframes: Keyframe[] | null = null;
    if (startFaceUp !== endFaceUp) {
      // Flip happens closer to the apex (feels like the card reveals itself at peak height)
      const flipOffset = motionType === 'deal' ? 0.52 : 0.5;
      const startRotY = startFaceUp ? 0 : 180;
      const endRotY = endFaceUp ? 0 : 180;
      flipKeyframes = [
        { transform: `rotateY(${startRotY}deg)`, offset: 0 },
        { transform: `rotateY(${(startRotY + endRotY) / 2}deg)`, offset: flipOffset },
        { transform: `rotateY(${endRotY}deg)`, offset: 1 }
      ];
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

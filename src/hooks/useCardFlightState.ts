import { useState, useCallback, MutableRefObject } from 'react';
import { Card, Player } from '../types/game';
import { FlyingCardData } from '../components/CardAnimationLayer';
import { TableDomRefs, RecentCaptureFeedback } from '../components/TableSurface';
import { sound } from '../core/audio/soundEngine';

export function getCenter(el: HTMLElement | null, fallbackX: number, fallbackY: number) {
  if (!el) return { x: fallbackX, y: fallbackY };
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return { x: fallbackX, y: fallbackY };
  }
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

export function useCardFlightState(
  tableRefs: MutableRefObject<TableDomRefs>,
  playersRef: MutableRefObject<Player[]>,
  dealTimersRef: MutableRefObject<number[]>,
  setTableCards: React.Dispatch<React.SetStateAction<Card[]>>
) {
  const [flyingCards, setFlyingCards] = useState<FlyingCardData[]>([]);
  const [hiddenCardIds, setHiddenCardIds] = useState<Set<string>>(new Set());
  const [recentCapture, setRecentCapture] = useState<RecentCaptureFeedback | null>(null);

  // Fallback target geometry if DOM node is not yet measured
  const getHandCardFallbackTarget = useCallback(
    (playerIdx: number, cardIdx: number, totalPlayers: number = 4) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const handEl = tableRefs.current.handEls[playerIdx];
      const base = getCenter(
        handEl,
        playerIdx === 0 || playerIdx === 2
          ? centerX
          : playerIdx === 1
          ? window.innerWidth - 90
          : 90,
        playerIdx === 0
          ? window.innerHeight - 95
          : playerIdx === 2 || (totalPlayers === 2 && playerIdx === 1)
          ? 110
          : centerY
      );

      const isTopOrBottom =
        playerIdx === 0 ||
        (totalPlayers === 2 && playerIdx === 1) ||
        playerIdx === 2;

      if (isTopOrBottom) {
        const spread = playerIdx === 0 ? 74 : 58;
        const centeredIdx = cardIdx - 1.5;
        const tilt = centeredIdx * 5;
        return {
          x: base.x + centeredIdx * spread,
          y: base.y,
          rotation: tilt,
          size: (totalPlayers === 4 && playerIdx === 2 ? 'sm' : 'md') as 'sm' | 'md'
        };
      }

      const centeredIdx = cardIdx - 1.5;
      const baseRot = playerIdx === 1 ? -90 : 90;
      return {
        x: base.x,
        y: base.y + centeredIdx * 34,
        rotation: baseRot + centeredIdx * 4,
        size: 'sm' as const
      };
    },
    [tableRefs]
  );

  const clearFlights = useCallback(() => {
    setFlyingCards([]);
    setHiddenCardIds(new Set());
    setRecentCapture(null);
  }, []);

  const animateSweepToCollector = useCallback(
    (
      cardsToSweep: Card[],
      winnerIdx: number,
      isPistiSweep: boolean,
      captureLabel: string,
      onSweepComplete: () => void
    ) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const potPos = getCenter(tableRefs.current.potEl, centerX + 40, centerY);

      const targetEl =
        tableRefs.current.collectedEls[winnerIdx] ||
        tableRefs.current.handEls[winnerIdx];

      const targetPos = getCenter(
        targetEl,
        centerX - 180,
        winnerIdx === 0 ? window.innerHeight - 100 : 100
      );

      sound.playSweepGather();
      setTableCards([]);

      const visibleToFly = cardsToSweep.slice(-12);
      if (visibleToFly.length === 0) {
        onSweepComplete();
        return;
      }

      let finishedCount = 0;

      const sweepFlying: FlyingCardData[] = visibleToFly.map((c, idx) => {
        const ox = c.tableOffsetX ?? 0;
        const oy = c.tableOffsetY ?? 0;
        const rot = c.tableRotation ?? 0;
        const flyId = `sweep-${c.id}-${idx}-${Date.now()}`;

        const isTopCardOfPair = idx === visibleToFly.length - 1;

        // Pişti: Top card flies face-up to pistiEls, bottom card(s) fly face-down to collectedEls
        const actualTargetEl = isPistiSweep && isTopCardOfPair
          ? tableRefs.current.pistiEls[winnerIdx] || targetEl
          : tableRefs.current.collectedEls[winnerIdx] || targetEl;

        const actualTargetPos = getCenter(
          actualTargetEl,
          targetPos.x,
          targetPos.y
        );

        const currentPistiCount =
          (playersRef.current[winnerIdx]?.pistiCount || 0) +
          (playersRef.current[winnerIdx]?.doublePistiCount || 0);

        const targetRot = isPistiSweep && isTopCardOfPair
          ? (currentPistiCount % 2 === 0 ? 1 : -1) * (2 + Math.min(currentPistiCount * 1.5, 8))
          : (idx % 2 === 0 ? 1 : -1) * 3;

        const endFaceUp = isPistiSweep ? isTopCardOfPair : false;
        const targetScale = 1;

        return {
          id: flyId,
          card: c,
          startX: potPos.x + ox,
          startY: potPos.y + oy,
          waypointX: potPos.x,
          waypointY: potPos.y - (isPistiSweep ? 22 : 12),
          waypointRotation: targetRot,
          waypointScale: isPistiSweep ? 1.12 : 1.04,
          waypointOffset: isPistiSweep ? 0.38 : 0.30,
          targetX: actualTargetPos.x,
          targetY: actualTargetPos.y,
          startRotation: rot,
          targetRotation: targetRot,
          startFaceUp: c.faceUp,
          endFaceUp,
          startScale: 1,
          targetScale,
          duration: isPistiSweep ? 540 : 440 + idx * 22,
          arcHeight: 78,
          motionType: 'sweep' as const,
          size: 'md',
          zIndex: 75 + idx,
          onComplete: () => {
            setFlyingCards(prev => prev.filter(f => f.id !== flyId));
            finishedCount++;
            if (finishedCount >= visibleToFly.length) {
              setRecentCapture({
                id: `cap-${Date.now()}`,
                playerIdx: winnerIdx,
                isPisti: isPistiSweep,
                label: captureLabel
              });
              const clearCapTimer = window.setTimeout(() => {
                setRecentCapture(null);
              }, 1500);
              dealTimersRef.current.push(clearCapTimer);

              onSweepComplete();
            }
          }
        };
      });

      setFlyingCards(prev => [...prev, ...sweepFlying]);
    },
    [tableRefs, playersRef, dealTimersRef, setTableCards]
  );

  return {
    flyingCards,
    setFlyingCards,
    hiddenCardIds,
    setHiddenCardIds,
    recentCapture,
    setRecentCapture,
    getHandCardFallbackTarget,
    clearFlights,
    animateSweepToCollector
  };
}

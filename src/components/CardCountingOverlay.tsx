/**
 * CardCountingOverlay.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Otantik Pişti 52 Fiziksel Kart Masa İçi Canlı Sayım Sistemi:
 *
 * 1. SIFIR PENCERE / SIFIR KARARTMA: Oyun alanı, çuha ve masa olduğu gibi kalır (`pointer-events-none`).
 * 2. MEVCUT DESTEDEN SÜZÜLÜŞ (Zero-Teleportation Physical Glide):
 *    2 kişilik oyunda toplanan deste (`tableRefs.collectedEls`) gizlenmez; kartlar tek tek
 *    mevcut deste konumundan (`collectedEls`) kalkıp 3B olarak ters dönerek (`CardBackSurface` -> `CardFrontSurface`)
 *    sayım alanındaki "Sayılmış" veya "Puanlar" yuvasına süzülür.
 * 3. DÜZ METİN VE ROZETLER (Zero Inversion):
 *    Tüm isim, skor, rozet ve sayaç metinleri ekrana göre %100 DÜZ (0°) okunur.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { Card, OnTableCountState, TableTheme, Player } from '../types/game';
import { CardFrontSurface, CardBackSurface } from './CardView';
import { DetailedRoundScore } from '../core/rules';
import type { TableDomRefs } from './TableSurface';
import { sound } from '../core/audio/soundEngine';
import confetti from 'canvas-confetti';
import { RotateCcw, ArrowRight, Trophy } from 'lucide-react';

interface RectBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface FlippingCardFlight {
  card: Card;
  index: number;
  isPoint: boolean;
  startRect: RectBox;
  targetRect: RectBox;
}

interface FlyingCountCardProps {
  flight: FlippingCardFlight;
  cardBack: string;
  theme: TableTheme;
  durationMs: number;
  pointBadgeClass: string;
}

const FlyingCountCard: React.FC<FlyingCountCardProps> = ({
  flight,
  cardBack,
  theme,
  durationMs,
  pointBadgeClass
}) => {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const outerEl = outerRef.current;
    const innerEl = innerRef.current;
    if (!outerEl || !innerEl) return;

    const dx = flight.targetRect.left - flight.startRect.left;
    const dy = flight.targetRect.top - flight.startRect.top;

    const outerAnim = outerEl.animate(
      [
        { transform: 'translate3d(0px, 0px, 0px) scale(1)' },
        {
          transform: `translate3d(${dx * 0.52}px, ${dy * 0.52 - 16}px, 0px) scale(1.06)`,
          offset: 0.45
        },
        { transform: `translate3d(${dx}px, ${dy}px, 0px) scale(1)` }
      ],
      {
        duration: durationMs,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards'
      }
    );

    const innerAnim = innerEl.animate(
      [
        { transform: 'rotateY(0deg)' },
        { transform: 'rotateY(180deg)' }
      ],
      {
        duration: durationMs,
        easing: 'cubic-bezier(0.25, 0.9, 0.35, 1)',
        fill: 'forwards'
      }
    );

    return () => {
      outerAnim.cancel();
      innerAnim.cancel();
    };
  }, [flight, durationMs]);

  return (
    <div
      ref={outerRef}
      style={{
        position: 'fixed',
        left: flight.startRect.left,
        top: flight.startRect.top,
        width: flight.startRect.width,
        height: flight.startRect.height,
        perspective: '1000px',
        zIndex: 45,
        pointerEvents: 'none',
        willChange: 'transform'
      }}
    >
      <div
        ref={innerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          willChange: 'transform'
        }}
      >
        {/* Kapalı Arka Yüz (desteden kalkarken görünür) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)'
          }}
          className="rounded-xl overflow-hidden shadow-xl"
        >
          <CardBackSurface cardBack={cardBack} />
        </div>

        {/* Açık Ön Yüz (havada 180° döndükten sonra sayım yuvasına inerken görünür) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
          className="rounded-xl overflow-hidden shadow-2xl"
        >
          <CardFrontSurface card={flight.card} theme={theme} />
          {flight.isPoint && (
            <div
              className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-full font-black text-[9px] shadow-lg z-40 ${pointBadgeClass}`}
            >
              +{flight.card.basePoints}P
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface Props {
  isActive: boolean;
  countState: OnTableCountState;
  userCards: Card[];
  oppCards: Card[];
  roundScores: {
    user: DetailedRoundScore;
    opp: DetailedRoundScore;
    winner: Player | null;
    isGameOver: boolean;
  } | null;
  players: Player[];
  tableRefs?: React.MutableRefObject<TableDomRefs>;
  theme?: TableTheme;
  cardBack?: string;
  targetScore: number;
  isMultiplayer?: boolean;
  isReadyForNextRound?: boolean;
  readySeatsCount?: number;
  totalHumanPlayersCount?: number;
  slotsReadiness?: { seatIndex: number; name: string; isReady: boolean }[];
  onNextRound?: () => void;
  onRestartGame?: () => void;
  onToggleReady?: () => void;
  onCountProgress?: (userCounted: number, oppCounted: number) => void;
  onCountingDone?: () => void;
}

export const CardCountingOverlay: React.FC<Props> = ({
  isActive,
  countState,
  userCards,
  oppCards,
  roundScores,
  players,
  tableRefs,
  theme = 'traditional',
  cardBack = 'classic_blue',
  targetScore: _targetScore,
  isMultiplayer = false,
  isReadyForNextRound = false,
  readySeatsCount = 0,
  totalHumanPlayersCount = 0,
  slotsReadiness = [],
  onNextRound,
  onRestartGame,
  onToggleReady,
  onCountProgress,
  onCountingDone
}) => {
  const [phase, setPhase] = useState<'ready' | 'counting' | 'completed'>('ready');

  // Step counter: k = 0..maxCards.
  // At step k:
  // - drawnCount = min(k, cards.length) have left the collected pile
  // - landedCount = min(max(0, k - 1), cards.length) have landed in the open/points stack
  // - card[k - 1] is currently in flight from collectedEls to open/points stack
  const [stepTick, setStepTick] = useState(0);

  const [isDone, setIsDone] = useState(false);
  const [isFast, setIsFast] = useState(false);

  const [userFlight, setUserFlight] = useState<FlippingCardFlight | null>(null);
  const [oppFlight, setOppFlight] = useState<FlippingCardFlight | null>(null);

  const timerRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  const userClosedPileRef = useRef<HTMLDivElement | null>(null);
  const oppClosedPileRef = useRef<HTMLDivElement | null>(null);
  const userOpenPileRef = useRef<HTMLDivElement | null>(null);
  const oppOpenPileRef = useRef<HTMLDivElement | null>(null);
  const userPointsBoxRef = useRef<HTMLDivElement | null>(null);
  const oppPointsBoxRef = useRef<HTMLDivElement | null>(null);

  const isFourPlayers = players.length === 4;
  const user = players[0];
  const opp = isFourPlayers ? players[2] : players[1];
  const isGameOver = Boolean(roundScores?.isGameOver);

  const userPistiPoints = countState.userPistiPoints ?? 0;
  const oppPistiPoints = countState.oppPistiPoints ?? 0;

  const stepDelay = isFast ? 105 : 220;

  const measureFlightRects = useCallback(
    (isUser: boolean, isPoint: boolean, currentPointCount: number): { startRect: RectBox; targetRect: RectBox } => {
      const defaultW = typeof window !== 'undefined' && window.innerWidth >= 640 ? 96 : 88;
      const defaultH = typeof window !== 'undefined' && window.innerWidth >= 640 ? 144 : 128;
      const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 500;
      const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 400;

      // 2 kişilik oyunda doğrudan mevcut toplanan deste elemanından (tableRefs.collectedEls) başla
      const sourceEl = !isFourPlayers
        ? tableRefs?.current?.collectedEls?.[isUser ? 0 : 1]
        : isUser
        ? userClosedPileRef.current
        : oppClosedPileRef.current;

      const openEl = isUser ? userOpenPileRef.current : oppOpenPileRef.current;
      const pointsEl = isUser ? userPointsBoxRef.current : oppPointsBoxRef.current;

      const fallbackStart: RectBox = {
        left: centerX - 240,
        top: isUser ? centerY + 120 : centerY - 240,
        width: defaultW,
        height: defaultH
      };
      const fallbackOpen: RectBox = {
        left: centerX - 110,
        top: isUser ? centerY + 90 : centerY - 210,
        width: defaultW,
        height: defaultH
      };

      const sRect = sourceEl?.getBoundingClientRect();
      const startRect: RectBox =
        sRect && sRect.width > 0
          ? { left: sRect.left, top: sRect.top, width: sRect.width, height: sRect.height }
          : fallbackStart;

      if (!isPoint) {
        const oRect = openEl?.getBoundingClientRect();
        const targetRect: RectBox =
          oRect && oRect.width > 0
            ? { left: oRect.left, top: oRect.top, width: oRect.width, height: oRect.height }
            : fallbackOpen;
        return { startRect, targetRect };
      }

      const pRect = pointsEl?.getBoundingClientRect();
      const overlapStep = defaultW >= 96 ? 68 : 62;
      const shiftX = Math.min(currentPointCount, 6) * overlapStep;
      const targetRect: RectBox =
        pRect && pRect.width > 0
          ? {
              left: pRect.left + shiftX,
              top: pRect.top,
              width: startRect.width,
              height: startRect.height
            }
          : {
              left: fallbackOpen.left + 120 + shiftX,
              top: fallbackOpen.top,
              width: defaultW,
              height: defaultH
            };

      return { startRect, targetRect };
    },
    [isFourPlayers, tableRefs]
  );

  // Başlatma
  useEffect(() => {
    if (!isActive) {
      startedRef.current = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      setUserFlight(null);
      setOppFlight(null);
      return;
    }

    if (startedRef.current) return;
    startedRef.current = true;

    setPhase('ready');
    setStepTick(0);
    setIsDone(false);
    setIsFast(false);
    setUserFlight(null);
    setOppFlight(null);
    onCountProgress?.(0, 0);

    // İlk karede hedef ref'lerin ölçülebilmesi için kısa hazırlık
    const readyTimer = window.setTimeout(() => {
      setPhase('counting');
    }, 80);

    return () => {
      window.clearTimeout(readyTimer);
    };
  }, [isActive, onCountProgress]);

  // Adım adım fiziksel kart çekme ve süzülme motoru
  useEffect(() => {
    if (!isActive || phase !== 'counting' || isDone) return;

    const maxSteps = Math.max(userCards.length, oppCards.length);

    // Bir önceki adımda havalanan kart varsa ve az önce hedefe indiyse puan sesini çal
    if (stepTick > 0) {
      const landedIdx = stepTick - 1;
      if (landedIdx < userCards.length) {
        const landedUserCard = userCards[landedIdx];
        if ((landedUserCard.basePoints || 0) > 0) {
          sound.playPointCardChime(landedUserCard.basePoints);
        }
      }
    }

    // Tüm kartlar hedefe indiyse sayımı bitir
    if (stepTick > maxSteps) {
      setPhase('completed');
      setIsDone(true);
      setUserFlight(null);
      setOppFlight(null);
      onCountProgress?.(userCards.length, oppCards.length);
      onCountingDone?.();

      if (countState.userMajority) {
        sound.playDoublePisti();
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.55 } });
      } else {
        sound.playMatchSweep();
      }
      return;
    }

    // stepTick === 0 ise ilk kartı hemen kaldır, sonraki adımları stepDelay ile ilerlet
    const delay = stepTick === 0 ? 16 : stepDelay;

    timerRef.current = window.setTimeout(() => {
      const nextTick = stepTick + 1;
      const drawIdx = nextTick - 1; // 0-tabanlı çekilen kart indeksi

      const nextUserDrawn = Math.min(nextTick, userCards.length);
      const nextOppDrawn = Math.min(nextTick, oppCards.length);
      onCountProgress?.(nextUserDrawn, nextOppDrawn);

      // Çekilen karttan önce hedefe inmiş olan değerli kart sayısı (hedef yuva kayması için)
      const userLandedPointsCount = userCards
        .slice(0, drawIdx)
        .filter(c => (c.basePoints || 0) > 0).length;
      const oppLandedPointsCount = oppCards
        .slice(0, drawIdx)
        .filter(c => (c.basePoints || 0) > 0).length;

      if (drawIdx < userCards.length) {
        const uCard = userCards[drawIdx];
        const isPoint = (uCard.basePoints || 0) > 0;
        const { startRect, targetRect } = measureFlightRects(true, isPoint, userLandedPointsCount);
        setUserFlight({
          card: uCard,
          index: drawIdx,
          isPoint,
          startRect,
          targetRect
        });
        sound.playCountTick(1 + (drawIdx % 10) * 0.04);
      } else {
        setUserFlight(null);
      }

      if (drawIdx < oppCards.length) {
        const oCard = oppCards[drawIdx];
        const isPoint = (oCard.basePoints || 0) > 0;
        const { startRect, targetRect } = measureFlightRects(false, isPoint, oppLandedPointsCount);
        setOppFlight({
          card: oCard,
          index: drawIdx,
          isPoint,
          startRect,
          targetRect
        });
        if (drawIdx >= userCards.length) {
          sound.playCountTick(1 + (drawIdx % 10) * 0.04);
        }
      } else {
        setOppFlight(null);
      }

      setStepTick(nextTick);
    }, delay);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [
    isActive,
    phase,
    stepTick,
    userCards,
    oppCards,
    stepDelay,
    isDone,
    countState.userMajority,
    measureFlightRects,
    onCountProgress,
    onCountingDone
  ]);

  // Hepsini Anında Say (Skip)
  const handleSkipAll = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const maxSteps = Math.max(userCards.length, oppCards.length);
    setStepTick(maxSteps + 1);
    setPhase('completed');
    setIsDone(true);
    setUserFlight(null);
    setOppFlight(null);
    onCountProgress?.(userCards.length, oppCards.length);
    onCountingDone?.();

    if (countState.userMajority) {
      sound.playDoublePisti();
      confetti({ particleCount: 75, spread: 65, origin: { y: 0.55 } });
    }
  }, [userCards.length, oppCards.length, countState.userMajority, onCountProgress, onCountingDone]);

  if (!isActive) return null;

  // Masaya inmiş (landed) kart sayısı:
  // stepTick === 1 iken 0. kart havadadır, landed = 0'dır.
  // stepTick === 2 iken 0. kart inmiştir (landed = 1), 1. kart havadadır.
  const userLandedCount = isDone
    ? userCards.length
    : Math.min(Math.max(0, stepTick - 1), userCards.length);
  const oppLandedCount = isDone
    ? oppCards.length
    : Math.min(Math.max(0, stepTick - 1), oppCards.length);

  const userDrawnCount = isDone
    ? userCards.length
    : Math.min(stepTick, userCards.length);
  const oppDrawnCount = isDone
    ? oppCards.length
    : Math.min(stepTick, oppCards.length);

  const userLandedCards = userCards.slice(0, userLandedCount);
  const oppLandedCards = oppCards.slice(0, oppLandedCount);

  const userPointCards = userLandedCards.filter(c => (c.basePoints || 0) > 0);
  const oppPointCards = oppLandedCards.filter(c => (c.basePoints || 0) > 0);

  const userCountedPile = userLandedCards.filter(c => (c.basePoints || 0) === 0);
  const oppCountedPile = oppLandedCards.filter(c => (c.basePoints || 0) === 0);

  const userCardScore = userPointCards.reduce((acc, c) => acc + (c.basePoints || 0), 0);
  const oppCardScore = oppPointCards.reduce((acc, c) => acc + (c.basePoints || 0), 0);

  const userTotalPts =
    userCardScore +
    userPistiPoints +
    (isDone && countState.userMajority ? 3 : 0);
  const oppTotalPts =
    oppCardScore +
    oppPistiPoints +
    (isDone && countState.oppMajority ? 3 : 0);

  const userRemainingCount = Math.max(0, userCards.length - userDrawnCount);
  const oppRemainingCount = Math.max(0, oppCards.length - oppDrawnCount);

  const userRemainingLayers = Math.min(
    12,
    Math.max(userRemainingCount > 0 ? 1 : 0, Math.ceil(userRemainingCount / 2.2))
  );
  const oppRemainingLayers = Math.min(
    12,
    Math.max(oppRemainingCount > 0 ? 1 : 0, Math.ceil(oppRemainingCount / 2.2))
  );

  return (
    <div className="fixed inset-0 z-40 pointer-events-none select-none overflow-hidden">
      {/* ── TOP RIGHT: Minik Sayım Kontrol Butonları ── */}
      {!isDone && (
        <div className="absolute top-3 right-3 sm:right-6 flex items-center gap-2 pointer-events-auto z-50">
          <button
            onClick={() => setIsFast(prev => !prev)}
            className="px-3 py-1 rounded-full text-xs font-bold bg-slate-950/85 text-amber-300 border border-amber-400/50 hover:bg-slate-900 transition-all cursor-pointer shadow-lg active:scale-95"
            title="Sayım Hızını Ayarla"
          >
            {isFast ? 'Normal ⏱️' : '2x Hızlı ⏩'}
          </button>
          <button
            onClick={handleSkipAll}
            className="px-3 py-1 rounded-full text-xs font-bold bg-slate-950/85 text-slate-200 border border-white/20 hover:bg-slate-900 transition-all cursor-pointer shadow-lg active:scale-95"
            title="Kart Sayımını Anında Tamamla"
          >
            Anında Say ⏭️
          </button>
        </div>
      )}

      {/* ── HAVADA SÜZÜLEREK 3B AÇILAN FİZİKSEL KARTLAR ── */}
      {userFlight && (
        <FlyingCountCard
          key={`user-flight-${userFlight.index}`}
          flight={userFlight}
          cardBack={cardBack}
          theme={theme}
          durationMs={Math.max(70, stepDelay - 12)}
          pointBadgeClass="bg-amber-400 text-slate-950"
        />
      )}
      {oppFlight && (
        <FlyingCountCard
          key={`opp-flight-${oppFlight.index}`}
          flight={oppFlight}
          cardBack={cardBack}
          theme={theme}
          durationMs={Math.max(70, stepDelay - 12)}
          pointBadgeClass="bg-rose-500 text-white"
        />
      )}

      {/* ── 1. RAKİBİN MASADAKİ SAYIM İSTASYONU ── */}
      <div className="absolute top-24 sm:top-32 left-1/2 -translate-x-1/2 pointer-events-none z-30">
        <div className="flex items-center gap-3 sm:gap-5 p-2 rounded-2xl">
          {/* 4 Kişilik oyunda ortak deste kutusu; 2 kişilik oyunda mevcut collectedEls destesi kullanılır */}
          {isFourPlayers && (
            <div className="relative flex flex-col items-center">
              <span className="text-[10px] font-mono text-slate-300 mb-0.5 font-bold">
                Kalan ({oppRemainingCount})
              </span>
              <div
                ref={oppClosedPileRef}
                className="relative w-[88px] h-[128px] sm:w-24 sm:h-36 rounded-xl border border-dashed border-white/20 flex items-center justify-center bg-black/20"
              >
                {oppRemainingCount > 0 ? (
                  <div className="relative w-full h-full">
                    {Array.from({ length: oppRemainingLayers }).map((_, layerIdx) => (
                      <div
                        key={layerIdx}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          transform: `translate3d(${((layerIdx * 13) % 5) - 2}px, ${layerIdx * -1}px, 0) rotate(${((layerIdx * 17) % 7) - 3}deg)`
                        }}
                        className="rounded-xl overflow-hidden shadow-md"
                      >
                        <CardBackSurface cardBack={cardBack} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-white/30 font-mono">Bitti (0)</span>
                )}
              </div>
            </div>
          )}

          {/* Rakip Açılan Normal Deste */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-mono text-slate-300 mb-0.5 font-bold">
              Sayılmış ({oppLandedCount}/{oppCards.length})
            </span>
            <div
              ref={oppOpenPileRef}
              className="relative w-[88px] h-[128px] sm:w-24 sm:h-36 rounded-xl border border-dashed border-white/20 flex items-center justify-center bg-black/20"
            >
              {oppCountedPile.length > 0 ? (
                oppCountedPile.slice(-5).map((c, idx) => {
                  const rot = ((idx * 11) % 7) - 3;
                  const ox = ((idx * 7) % 5) - 2;
                  const oy = idx * -0.8;
                  return (
                    <div
                      key={c.id}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        transform: `translate3d(${ox}px, ${oy}px, 0) rotate(${rot}deg)`
                      }}
                      className="rounded-xl overflow-hidden shadow-2xl"
                    >
                      <CardFrontSurface card={c} theme={theme} />
                    </div>
                  );
                })
              ) : (
                <span className="text-[10px] text-white/30 font-mono">Açık Deste</span>
              )}
            </div>
          </div>

          {/* Rakip Ayıklanan Değerli Puan Kartları */}
          <div className="flex flex-col items-start pl-2 sm:pl-3 border-l border-white/15 min-w-[96px] sm:min-w-[140px]">
            <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider mb-1">
              💎 Puanlar (+{oppCardScore}P)
            </span>
            <div
              ref={oppPointsBoxRef}
              className="relative flex items-center -space-x-5 sm:-space-x-7 min-w-[88px] min-h-[128px] sm:min-w-24 sm:min-h-36"
            >
              {oppPointCards.length === 0 ? (
                <span className="text-[10px] text-slate-500 italic">Henüz yok</span>
              ) : (
                oppPointCards.map((pc, idx) => (
                  <div
                    key={`opp-pc-${pc.id}-${idx}`}
                    className="relative w-[88px] h-[128px] sm:w-24 sm:h-36 rounded-xl shadow-2xl border-2 border-rose-400 overflow-hidden shrink-0"
                  >
                    <CardFrontSurface card={pc} theme={theme} />
                    <div className="absolute top-0 right-0 px-1.5 py-0.5 rounded-bl bg-rose-500 text-white font-black text-[10px]">
                      +{pc.basePoints}P
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Rakip Skor Özeti Rozeti (DÜZ 0°!) */}
          <div className="flex flex-col items-center px-3 py-1.5 rounded-2xl bg-slate-950/90 border border-rose-400/60 shadow-xl">
            <span className="text-[11px] text-rose-300 font-bold">{opp?.name || 'Rakip'}</span>
            <span className="text-xl sm:text-2xl font-black font-cyber text-rose-300">+{oppTotalPts}P</span>
            {isDone && countState.oppMajority && (
              <span className="text-[9px] font-black text-amber-300">🏆 +3P Çoğunluk</span>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. MASA MERKEZİ: ÇOĞUNLUK & SONRAKİ EL BUTONU ── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-40">
        {isDone && (
          <div className="flex flex-col items-center gap-2.5 p-3.5 sm:p-5 rounded-3xl bg-slate-950/95 border-2 border-amber-400/80 shadow-[0_0_40px_rgba(245,158,11,0.35)] animate-in zoom-in-95 duration-200 pointer-events-auto">
            {/* Majority Announcement */}
            <div className="px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400 text-xs sm:text-sm font-black text-amber-300">
              {countState.userMajority
                ? `🏆 KART ÇOĞUNLUĞU (+3 PUAN) SİZİN! (${userCards.length} vs ${oppCards.length})`
                : countState.oppMajority
                ? `🏆 KART ÇOĞUNLUĞU (+3 PUAN) RAKİPTE (${oppCards.length} vs ${userCards.length})`
                : 'KART ÇOĞUNLUĞU: EŞİT (26 - 26)'}
            </div>

            {/* Match Winner or Next Round Button */}
            {isGameOver ? (
              <div className="flex flex-col items-center gap-2">
                <div className="px-5 py-2 rounded-2xl bg-gradient-to-r from-amber-500/30 via-yellow-500/20 to-amber-500/30 border-2 border-amber-400 text-amber-200 font-black text-sm shadow-xl flex items-center gap-2 animate-bounce">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>
                    {roundScores?.winner
                      ? `${roundScores.winner.name.toUpperCase()} KAZANDI!`
                      : 'MAÇ TAMAMLANDI!'}
                  </span>
                </div>
                {onRestartGame && (
                  <button
                    onClick={onRestartGame}
                    className="px-8 py-2.5 rounded-2xl text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-xl cursor-pointer transition-transform active:scale-95 flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Yeni Maç Başlat</span>
                  </button>
                )}
              </div>
            ) : isMultiplayer ? (
              <div className="flex flex-col items-center gap-2">
                {slotsReadiness.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {slotsReadiness.map(slot => (
                      <div
                        key={slot.seatIndex}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                          slot.isReady
                            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-400/80 shadow-[0_0_10px_rgba(52,211,153,0.35)]'
                            : 'bg-slate-900/85 text-slate-400 border-slate-700/60'
                        }`}
                      >
                        <span>{slot.isReady ? '✅' : '⏳'}</span>
                        <span>{slot.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={onToggleReady}
                  className={`px-8 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-xl ${
                    isReadyForNextRound
                      ? 'bg-emerald-600/90 hover:bg-emerald-500 text-white border border-emerald-300'
                      : 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 animate-pulse'
                  }`}
                >
                  {isReadyForNextRound ? (
                    <>
                      <span>✅ HAZIRSIN</span>
                      <span className="text-emerald-100 font-mono text-xs">
                        ({readySeatsCount}/{totalHumanPlayersCount} Hazır)
                      </span>
                    </>
                  ) : (
                    <>
                      <span>🔥 SONRAKİ EL (HAZIRIM)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={onNextRound}
                className="px-8 py-2.5 rounded-2xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>Sonraki Eli Başlat</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── 3. KULLANICININ MASADAKİ SAYIM İSTASYONU ── */}
      <div className="absolute bottom-24 sm:bottom-32 left-1/2 -translate-x-1/2 pointer-events-none z-30">
        <div className="flex items-center gap-3 sm:gap-5 p-2 rounded-2xl">
          {/* 4 Kişilik oyunda ortak deste kutusu; 2 kişilik oyunda mevcut collectedEls destesi kullanılır */}
          {isFourPlayers && (
            <div className="relative flex flex-col items-center">
              <span className="text-[10px] font-mono text-slate-300 mb-0.5 font-bold">
                Kalan ({userRemainingCount})
              </span>
              <div
                ref={userClosedPileRef}
                className="relative w-[88px] h-[128px] sm:w-24 sm:h-36 rounded-xl border border-dashed border-white/20 flex items-center justify-center bg-black/20"
              >
                {userRemainingCount > 0 ? (
                  <div className="relative w-full h-full">
                    {Array.from({ length: userRemainingLayers }).map((_, layerIdx) => (
                      <div
                        key={layerIdx}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          transform: `translate3d(${((layerIdx * 13) % 5) - 2}px, ${layerIdx * -1}px, 0) rotate(${((layerIdx * 17) % 7) - 3}deg)`
                        }}
                        className="rounded-xl overflow-hidden shadow-md"
                      >
                        <CardBackSurface cardBack={cardBack} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-white/30 font-mono">Bitti (0)</span>
                )}
              </div>
            </div>
          )}

          {/* Kullanıcı Açılan Normal Deste */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-mono text-slate-300 mb-0.5 font-bold">
              Sayılmış ({userLandedCount}/{userCards.length})
            </span>
            <div
              ref={userOpenPileRef}
              className="relative w-[88px] h-[128px] sm:w-24 sm:h-36 rounded-xl border border-dashed border-white/20 flex items-center justify-center bg-black/20"
            >
              {userCountedPile.length > 0 ? (
                userCountedPile.slice(-5).map((c, idx) => {
                  const rot = ((idx * 11) % 7) - 3;
                  const ox = ((idx * 7) % 5) - 2;
                  const oy = idx * -0.8;
                  return (
                    <div
                      key={c.id}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        transform: `translate3d(${ox}px, ${oy}px, 0) rotate(${rot}deg)`
                      }}
                      className="rounded-xl overflow-hidden shadow-2xl"
                    >
                      <CardFrontSurface card={c} theme={theme} />
                    </div>
                  );
                })
              ) : (
                <span className="text-[10px] text-white/30 font-mono">Açık Deste</span>
              )}
            </div>
          </div>

          {/* Kullanıcı Ayıklanan Değerli Puan Kartları */}
          <div className="flex flex-col items-start pl-2 sm:pl-3 border-l border-white/15 min-w-[96px] sm:min-w-[140px]">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1">
              💎 Puanlar (+{userCardScore}P)
            </span>
            <div
              ref={userPointsBoxRef}
              className="relative flex items-center -space-x-5 sm:-space-x-7 min-w-[88px] min-h-[128px] sm:min-w-24 sm:min-h-36"
            >
              {userPointCards.length === 0 ? (
                <span className="text-[10px] text-slate-500 italic">Henüz yok</span>
              ) : (
                userPointCards.map((pc, idx) => (
                  <div
                    key={`user-pc-${pc.id}-${idx}`}
                    className="relative w-[88px] h-[128px] sm:w-24 sm:h-36 rounded-xl shadow-2xl border-2 border-amber-400 overflow-hidden shrink-0"
                  >
                    <CardFrontSurface card={pc} theme={theme} />
                    <div className="absolute top-0 right-0 px-1.5 py-0.5 rounded-bl bg-amber-400 text-slate-950 font-black text-[10px]">
                      +{pc.basePoints}P
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Kullanıcı Skor Özeti Rozeti */}
          <div className="flex flex-col items-center px-3 py-1.5 rounded-2xl bg-slate-950/90 border border-emerald-400/60 shadow-xl">
            <span className="text-[11px] text-emerald-300 font-bold">
              {isFourPlayers ? 'Bizim Takım' : (user?.name || 'Sen')}
            </span>
            <span className="text-xl sm:text-2xl font-black font-cyber text-amber-300">+{userTotalPts}P</span>
            {isDone && countState.userMajority && (
              <span className="text-[9px] font-black text-emerald-300">🏆 +3P Çoğunluk</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

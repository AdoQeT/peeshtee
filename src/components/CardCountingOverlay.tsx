/**
 * CardCountingOverlay.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Otantik Pişti El Sonu Sayım Seremonisi (Fiziksel Deste Sayımı):
 *
 * 1. Toplanan kart destesi kullanıcının önüne masanın ortasına doğru yerleşir (kapalı deste).
 * 2. Destenin en üstünden kartlar tek tek alınarak ters döner (flip) ve yan tarafta
 *    yeni bir açık deste oluşturacak şekilde üst üste dizilir ("tık-tık" ritmi).
 * 3. Sayı kartları (Karo 10, Sinek 2, Aslar, Valeler) denk geldikçe özel bir ışıltıyla
 *    ayrılır ve sağ/sol taraftaki "Ayıklanan Sayılar" vitrinine konur, anında puan eklenir.
 * 4. Sayım bitince çoğunluk (+3 puan), piştiler ve toplam el puanı hesaplanıp sonuç sunulur.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, OnTableCountState, TableTheme, Player } from '../types/game';
import { CardFrontSurface, CardBackSurface } from './CardView';
import { DetailedRoundScore } from '../core/rules';
import { sound } from '../core/audio/soundEngine';
import confetti from 'canvas-confetti';
import { RotateCcw, ArrowRight, Trophy, Sparkles } from 'lucide-react';

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
  theme?: TableTheme;
  targetScore: number;
  isMultiplayer?: boolean;
  isReadyForNextRound?: boolean;
  readySeatsCount?: number;
  totalHumanPlayersCount?: number;
  slotsReadiness?: { seatIndex: number; name: string; isReady: boolean }[];
  onNextRound?: () => void;
  onRestartGame?: () => void;
  onToggleReady?: () => void;
  onCountingDone?: () => void;
}

export const CardCountingOverlay: React.FC<Props> = ({
  isActive,
  countState,
  userCards,
  oppCards,
  roundScores,
  players,
  theme = 'traditional',
  targetScore: _targetScore,
  isMultiplayer = false,
  isReadyForNextRound = false,
  readySeatsCount = 0,
  totalHumanPlayersCount = 0,
  slotsReadiness = [],
  onNextRound,
  onRestartGame,
  onToggleReady,
  onCountingDone,
}) => {
  // Aktif sayılan taraf: 'user' -> 'opp' -> 'summary'
  const [activeSide, setActiveSide] = useState<'user' | 'opp' | 'summary'>('user');
  const [userIndex, setUserIndex] = useState(0);
  const [oppIndex, setOppIndex] = useState(0);
  const [userPointCards, setUserPointCards] = useState<Card[]>([]);
  const [oppPointCards, setOppPointCards] = useState<Card[]>([]);
  const [userCardScore, setUserCardScore] = useState(0);
  const [oppCardScore, setOppCardScore] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [isFast, setIsFast] = useState(false);
  const [activeFlippingCard, setActiveFlippingCard] = useState<{
    card: Card;
    side: 'user' | 'opp';
    index: number;
  } | null>(null);

  const timerRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  const isFourPlayers = players.length === 4;
  const user = players[0];
  const opp = players[1];
  const isGameOver = Boolean(roundScores?.isGameOver);

  const userName = isFourPlayers ? 'Bizim Takım' : (user?.name || 'Sen');

  const userPistiPoints = countState.userPistiPoints ?? 0;
  const oppPistiPoints = countState.oppPistiPoints ?? 0;
  const userPistiCount = Math.floor(userPistiPoints / 10);
  const oppPistiCount = Math.floor(oppPistiPoints / 10);

  // Sayım hız ayarı
  const stepDelay = isFast ? 80 : 160;

  // Sıfırlama ve Başlatma
  useEffect(() => {
    if (!isActive) {
      startedRef.current = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      return;
    }

    if (startedRef.current) return;
    startedRef.current = true;

    setActiveSide(userCards.length > 0 ? 'user' : oppCards.length > 0 ? 'opp' : 'summary');
    setUserIndex(0);
    setOppIndex(0);
    setUserPointCards([]);
    setOppPointCards([]);
    setUserCardScore(0);
    setOppCardScore(0);
    setIsDone(false);
    setIsFast(false);
    setActiveFlippingCard(null);
  }, [isActive, userCards, oppCards]);

  // Sayım Motoru
  useEffect(() => {
    if (!isActive || isDone) return;

    if (activeSide === 'user') {
      if (userIndex < userCards.length) {
        timerRef.current = window.setTimeout(() => {
          const card = userCards[userIndex];
          setActiveFlippingCard({ card, side: 'user', index: userIndex });
          sound.playCountTick(1 + (userIndex % 10) * 0.04);

          if (card.basePoints > 0) {
            sound.playPointCardChime(card.basePoints);
            setUserPointCards(prev => [...prev, card]);
            setUserCardScore(prev => prev + card.basePoints);
          }

          setUserIndex(prev => prev + 1);
        }, stepDelay);
      } else {
        // Kullanıcı destesi bitti, rakip desteye geç
        timerRef.current = window.setTimeout(() => {
          setActiveFlippingCard(null);
          setActiveSide(oppCards.length > 0 ? 'opp' : 'summary');
        }, stepDelay * 2);
      }
    } else if (activeSide === 'opp') {
      if (oppIndex < oppCards.length) {
        timerRef.current = window.setTimeout(() => {
          const card = oppCards[oppIndex];
          setActiveFlippingCard({ card, side: 'opp', index: oppIndex });
          sound.playCountTick(0.9 + (oppIndex % 10) * 0.04);

          if (card.basePoints > 0) {
            sound.playPointCardChime(card.basePoints);
            setOppPointCards(prev => [...prev, card]);
            setOppCardScore(prev => prev + card.basePoints);
          }

          setOppIndex(prev => prev + 1);
        }, stepDelay);
      } else {
        // Rakip de bitti, özet ekrana geç
        timerRef.current = window.setTimeout(() => {
          setActiveFlippingCard(null);
          setActiveSide('summary');
          setIsDone(true);
          onCountingDone?.();

          if (countState.userMajority) {
            sound.playDoublePisti();
            confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
          } else {
            sound.playMatchSweep();
          }
        }, stepDelay * 2);
      }
    } else if (activeSide === 'summary') {
      setIsDone(true);
    }

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [isActive, activeSide, userIndex, oppIndex, userCards, oppCards, stepDelay, isDone, countState.userMajority, onCountingDone]);

  // Hepsini Anında Say (Skip)
  const handleSkipAll = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setUserIndex(userCards.length);
    setOppIndex(oppCards.length);
    setUserPointCards(userCards.filter(c => c.basePoints > 0));
    setOppPointCards(oppCards.filter(c => c.basePoints > 0));
    setUserCardScore(userCards.reduce((acc, c) => acc + (c.basePoints || 0), 0));
    setOppCardScore(oppCards.reduce((acc, c) => acc + (c.basePoints || 0), 0));
    setActiveSide('summary');
    setIsDone(true);
    setActiveFlippingCard(null);
    onCountingDone?.();

    if (countState.userMajority) {
      sound.playDoublePisti();
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
    }
  }, [userCards, oppCards, countState.userMajority, onCountingDone]);

  if (!isActive) return null;

  // Skor toplamları
  const userTotalPts =
    userCardScore +
    userPistiPoints +
    (isDone && countState.userMajority ? 3 : 0);
  const oppTotalPts =
    oppCardScore +
    oppPistiPoints +
    (isDone && countState.oppMajority ? 3 : 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-3 sm:p-6 bg-black/85 backdrop-blur-md select-none animate-fadeIn">
      {/* ── TOP: Mini Status Bar & Speed Controls ── */}
      <div className="w-full max-w-4xl flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
          <span className="font-cyber font-black text-xs sm:text-sm text-amber-300 tracking-wider uppercase">
            Masa Üstü Kart Sayımı
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            ({activeSide === 'user' ? 'Senin Kartların' : activeSide === 'opp' ? 'Rakibin Kartları' : 'Sayım Tamamlandı'})
          </span>
        </div>

        {!isDone && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFast(prev => !prev)}
              className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 hover:bg-amber-500/30 transition-all cursor-pointer"
            >
              {isFast ? 'Normal Hız' : '2x Hızlandır ⏩'}
            </button>
            <button
              onClick={handleSkipAll}
              className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-slate-200 border border-white/20 hover:bg-white/20 transition-all cursor-pointer"
            >
              Anında Say ⏭️
            </button>
          </div>
        )}
      </div>

      {/* ── CENTER: Realistic Tabletop Deck Flip Ceremony ── */}
      <div className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center my-auto">
        <div className="relative w-full rounded-3xl p-4 sm:p-8 bg-slate-950/80 border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col items-center">
          {/* Active Side Title */}
          <div className="mb-4 text-center">
            <h2 className="text-lg sm:text-2xl font-black font-cyber tracking-wider text-amber-300">
              {activeSide === 'user'
                ? isFourPlayers ? '🔵 BİZİM TAKIMIN KARTLARI SAYILIYOR' : '👤 SENİN KARTLARIN SAYILIYOR'
                : activeSide === 'opp'
                ? isFourPlayers ? '🔴 RAKİP TAKIMIN KARTLARI SAYILIYOR' : `👤 ${opp?.name?.toUpperCase() || 'RAKİP'} KARTLARI SAYILIYOR`
                : '🏆 KART SAYIMI TAMAMLANDI'}
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {activeSide === 'user'
                ? `${userIndex} / ${userCards.length} Kart Sayıldı`
                : activeSide === 'opp'
                ? `${oppIndex} / ${oppCards.length} Kart Sayıldı`
                : `${userCards.length + oppCards.length} Kart İncelendi`}
            </p>
          </div>

          {/* Tabletop Deck Rig: Closed Deck on Left -> Flip Arc -> Open Counted Pile on Right */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 my-2">
            {/* 1. Closed Source Pile (Kalan Kapalı Kartlar) */}
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Kapalı Deste
              </span>
              <div className="relative w-20 h-28 sm:w-28 sm:h-40 rounded-xl bg-slate-900/60 border-2 border-dashed border-slate-700 flex items-center justify-center">
                {(() => {
                  const currentTotal = activeSide === 'user' ? userCards.length : oppCards.length;
                  const currentIdx = activeSide === 'user' ? userIndex : oppIndex;
                  const remaining = Math.max(0, currentTotal - currentIdx);

                  if (remaining <= 0) {
                    return <span className="text-xs text-slate-600 font-bold">Tükendi</span>;
                  }

                  // 3D Stack layers
                  const stackLayers = Math.min(8, Math.ceil(remaining / 3));
                  return (
                    <>
                      {Array.from({ length: stackLayers }).map((_, idx) => (
                        <div
                          key={`closed-stack-${idx}`}
                          className="absolute inset-0 rounded-xl overflow-hidden shadow-md"
                          style={{
                            transform: `translate(${-idx * 1.5}px, ${-idx * 1.5}px)`,
                            zIndex: idx + 1,
                          }}
                        >
                          <CardBackSurface cardBack="classic_blue" />
                        </div>
                      ))}
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900 border border-white/20 text-[10px] font-mono font-bold text-white z-20">
                        {remaining}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* 2. Middle: Flip Arc Area (Ters Dönen Kart) */}
            <div className="relative w-20 h-28 sm:w-28 sm:h-40 flex items-center justify-center">
              {activeFlippingCard && (
                <div
                  key={`flip-${activeFlippingCard.side}-${activeFlippingCard.index}`}
                  className="w-full h-full rounded-xl shadow-2xl relative"
                  style={{
                    animation: `cardTableFlip ${stepDelay * 0.9}ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards`,
                  }}
                >
                  <CardFrontSurface card={activeFlippingCard.card} theme={theme} />
                  {activeFlippingCard.card.basePoints > 0 && (
                    <div className="absolute -top-3 -right-2 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-lg animate-bounce z-30">
                      +{activeFlippingCard.card.basePoints}P
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Open Destination Pile (Açılmış Deste) */}
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Sayılmış Deste
              </span>
              <div className="relative w-20 h-28 sm:w-28 sm:h-40 rounded-xl bg-slate-900/60 border-2 border-dashed border-slate-700 flex items-center justify-center">
                {(() => {
                  const currentIdx = activeSide === 'user' ? userIndex : oppIndex;
                  const currentCards = activeSide === 'user' ? userCards : oppCards;
                  const topCard = currentIdx > 0 ? currentCards[currentIdx - 1] : null;

                  if (!topCard) {
                    return <span className="text-xs text-slate-600 font-bold">Bekliyor</span>;
                  }

                  const stackLayers = Math.min(8, Math.ceil(currentIdx / 3));
                  return (
                    <>
                      {Array.from({ length: stackLayers - 1 }).map((_, idx) => (
                        <div
                          key={`open-stack-${idx}`}
                          className="absolute inset-0 rounded-xl bg-slate-800 border border-white/20 shadow-sm"
                          style={{
                            transform: `translate(${idx * 1.5}px, ${-idx * 1.5}px)`,
                            zIndex: idx + 1,
                          }}
                        />
                      ))}
                      <div
                        className="absolute inset-0 rounded-xl overflow-hidden shadow-xl"
                        style={{
                          transform: `translate(${(stackLayers - 1) * 1.5}px, ${-(stackLayers - 1) * 1.5}px)`,
                          zIndex: 10,
                        }}
                      >
                        <CardFrontSurface card={topCard} theme={theme} />
                      </div>
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-300 z-20">
                        {currentIdx}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* 4. Special Point Cards Showcase (Ayıklanan Sayılar Vitrini) */}
          <div className="w-full mt-6 pt-4 border-t border-white/10 flex flex-col items-center">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <span>💎</span>
              <span>Ayıklanan Değerli Kartlar (Karo 10, Sinek 2, As, Vale)</span>
            </span>

            <div className="flex flex-wrap items-center justify-center gap-2 min-h-[52px]">
              {(activeSide === 'user' || activeSide === 'summary' ? userPointCards : oppPointCards).length === 0 ? (
                <span className="text-xs text-slate-500 italic py-2">Henüz puan kartı ayıklanmadı...</span>
              ) : (
                (activeSide === 'user' || activeSide === 'summary' ? userPointCards : oppPointCards).map((pc, idx) => (
                  <div
                    key={`point-card-${pc.id}-${idx}`}
                    className="relative w-10 h-14 sm:w-12 sm:h-18 rounded-lg shadow-lg border border-amber-400/80 overflow-hidden shrink-0 animate-scaleUp"
                  >
                    <CardFrontSurface card={pc} theme={theme} />
                    <div className="absolute top-0 right-0 px-1 rounded-bl bg-amber-400 text-slate-950 font-black text-[9px]">
                      +{pc.basePoints}P
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM: Score HUD & Next Round Actions ── */}
      <div className="w-full max-w-4xl flex flex-col items-center gap-3">
        {/* Score comparison row */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
          {/* User Score Card */}
          <div
            className={`p-3 rounded-2xl border transition-all flex flex-col items-center ${
              isDone && countState.userMajority
                ? 'border-emerald-400 bg-emerald-950/80 shadow-[0_0_25px_rgba(52,211,153,0.35)]'
                : 'border-white/15 bg-slate-900/90'
            }`}
          >
            <div className="text-[11px] sm:text-xs text-emerald-300 font-bold uppercase tracking-wider">
              {isFourPlayers ? '🔵 Bizim Takım' : `👤 ${userName}`}
            </div>
            <div className="text-2xl sm:text-4xl font-black text-amber-300 font-cyber my-0.5 tracking-tight">
              +{userTotalPts}{' '}
              <span className="text-xs sm:text-sm font-sans font-black uppercase tracking-widest text-amber-400">
                Puan
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-300">
              <span className="font-bold text-white">{userIndex} / {userCards.length} Kart</span>
              {userPistiCount > 0 && (
                <span className="text-amber-400 ml-1 font-bold">({userPistiCount} Pişti)</span>
              )}
            </div>
            {isDone && countState.userMajority && (
              <span className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                🏆 +3P ÇOĞUNLUK
              </span>
            )}
          </div>

          {/* Opponent Score Card */}
          <div
            className={`p-3 rounded-2xl border transition-all flex flex-col items-center ${
              isDone && countState.oppMajority
                ? 'border-rose-400 bg-rose-950/80 shadow-[0_0_25px_rgba(251,113,133,0.35)]'
                : 'border-white/15 bg-slate-900/90'
            }`}
          >
            <div className="text-[11px] sm:text-xs text-rose-300 font-bold uppercase tracking-wider">
              {isFourPlayers ? '🔴 Rakip Takım' : `👤 ${opp?.name || 'Rakip'}`}
            </div>
            <div className="text-2xl sm:text-4xl font-black text-rose-300 font-cyber my-0.5 tracking-tight">
              +{oppTotalPts}{' '}
              <span className="text-xs sm:text-sm font-sans font-black uppercase tracking-widest text-rose-400">
                Puan
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-300">
              <span className="font-bold text-white">{oppIndex} / {oppCards.length} Kart</span>
              {oppPistiCount > 0 && (
                <span className="text-amber-400 ml-1 font-bold">({oppPistiCount} Pişti)</span>
              )}
            </div>
            {isDone && countState.oppMajority && (
              <span className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-400/20 text-rose-300 border border-rose-400/40">
                🏆 +3P ÇOĞUNLUK
              </span>
            )}
          </div>
        </div>

        {/* Action Controls when Done */}
        {isDone && (
          <div className="w-full flex flex-col items-center gap-2 mt-1">
            {isGameOver ? (
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="px-5 py-2 rounded-2xl bg-gradient-to-r from-amber-500/30 via-yellow-500/20 to-amber-500/30 border-2 border-amber-400 text-amber-200 font-black text-sm shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center gap-2 animate-bounce">
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
                    className="w-full sm:w-auto px-8 py-3 rounded-2xl text-sm font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-xl cursor-pointer transition-transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Yeni Maç Başlat</span>
                  </button>
                )}
              </div>
            ) : isMultiplayer ? (
              <div className="flex flex-col items-center gap-2 w-full">
                {slotsReadiness.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {slotsReadiness.map(slot => (
                      <div
                        key={slot.seatIndex}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${
                          slot.isReady
                            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.35)]'
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
                  className={`w-full sm:w-auto px-8 py-3 rounded-2xl text-sm font-black transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-xl ${
                    isReadyForNextRound
                      ? 'bg-emerald-600/90 hover:bg-emerald-500 text-white border border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
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
                className="w-full sm:w-auto px-8 py-3 rounded-2xl text-sm font-black bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Sonraki Eli Başlat</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Keyframe Stilleri ── */}
      <style>{`
        @keyframes cardTableFlip {
          0% {
            opacity: 0.2;
            transform: translateX(-40px) translateY(10px) rotateY(180deg) scale(0.85);
          }
          40% {
            opacity: 1;
            transform: translateX(0px) translateY(-25px) rotateY(90deg) scale(1.15);
          }
          100% {
            opacity: 1;
            transform: translateX(40px) translateY(0px) rotateY(0deg) scale(1);
          }
        }
        @keyframes scaleUp {
          0% { transform: scale(0.6); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

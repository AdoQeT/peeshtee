/**
 * CardCountingOverlay.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Otantik Pişti 52 Fiziksel Kart Masa İçi Canlı Sayım Sistemi:
 *
 * 1. SIFIR PENCERE / SIFIR KARARTMA: Oyun alanı, çuha ve masa olduğu gibi kalır (`pointer-events-none`).
 * 2. HAVUZDAN MASAYA FİZİKSEL KAYMA (Physical Deck Glide):
 *    Sayım başladığında, toplanan kart destesi sol köşedeki havuzdan ('collectedEls')
 *    çuhanın üzerinden fiziksel olarak kayarak oyuncunun önüne süzülür (Işınlanma 0).
 * 3. FERAH VE ORTADA MASA DÜZENİ:
 *    - Sayım istasyonları masa kenarlarına yapışık değildir; çuhanın merkezine doğru
 *      ferah bir mesafede (`bottom-28 sm:bottom-36` ve `top-28 sm:top-36`) toplanır.
 * 4. DÜZ METİN VE ROZETLER (Zero Inversion):
 *    - Tüm isim, skor, rozet ve sayaç metinleri ekrana göre %100 DÜZ (0°) okunur;
 *      hiçbir metin ters/baş aşağı kalmaz!
 * 5. 52 FİZİKSEL KART KORUNUMU:
 *    - Kart silme / baştan üretme (spawn/delete) YOKTUR.
 *    - Kapalı deste tepe kartını verir (`userIndex`), kart çuha üzerinde yana süzülerek
 *      180° döner ve açık desteye ("tık-tık") veya Değerli Puanlar sırasına oturur.
 * 6. BİTİŞ: Masa merkezinde çoğunluk rozeti (+3P) ve "Sonraki El" butonu belirir.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { Card, OnTableCountState, TableTheme, Player } from '../types/game';
import { CardFrontSurface, CardBackSurface } from './CardView';
import { DetailedRoundScore } from '../core/rules';
import { TableDomRefs } from './TableSurface';
import { sound } from '../core/audio/soundEngine';
import confetti from 'canvas-confetti';
import { RotateCcw, ArrowRight, Trophy } from 'lucide-react';

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
  tableRefs,
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
  // Masaya ilerleme animasyon fazı: 'sliding_in' (havuzdan süzülüş) -> 'counting' -> 'completed'
  const [phase, setPhase] = useState<'sliding_in' | 'counting' | 'completed'>('sliding_in');
  const [isGliding, setIsGliding] = useState(true);

  // Eşzamanlı Deste İndeksleri
  const [userIndex, setUserIndex] = useState(0);
  const [oppIndex, setOppIndex] = useState(0);

  // Ayrılan Değerli Sayı Kartları
  const [userPointCards, setUserPointCards] = useState<Card[]>([]);
  const [oppPointCards, setOppPointCards] = useState<Card[]>([]);

  // Canlı Puanlar
  const [userCardScore, setUserCardScore] = useState(0);
  const [oppCardScore, setOppCardScore] = useState(0);

  const [isDone, setIsDone] = useState(false);
  const [isFast, setIsFast] = useState(false);

  // O an ters dönmekte olan kartlar
  const [userFlippingCard, setUserFlippingCard] = useState<{ card: Card; index: number; isPoint: boolean } | null>(null);
  const [oppFlippingCard, setOppFlippingCard] = useState<{ card: Card; index: number; isPoint: boolean } | null>(null);

  // Havuzdan istasyona fiziksel başlangıç delta koordinatları (px)
  const [userPoolOffset, setUserPoolOffset] = useState({ x: -180, y: 50 });
  const [oppPoolOffset, setOppPoolOffset] = useState({ x: -180, y: -50 });

  const timerRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  const userStationRef = useRef<HTMLDivElement | null>(null);
  const oppStationRef = useRef<HTMLDivElement | null>(null);

  const isFourPlayers = players.length === 4;
  const user = players[0];
  const opp = isFourPlayers ? players[2] : players[1];
  const isGameOver = Boolean(roundScores?.isGameOver);

  const userPistiPoints = countState.userPistiPoints ?? 0;
  const oppPistiPoints = countState.oppPistiPoints ?? 0;

  const stepDelay = isFast ? 85 : 180;

  // Havuzdaki destelerin başlangıç konumunu tam olarak ölç
  useLayoutEffect(() => {
    if (!isActive) return;

    try {
      const userPoolEl = tableRefs?.current?.collectedEls?.[0];
      const oppPoolIdx = isFourPlayers ? 2 : 1;
      const oppPoolEl = tableRefs?.current?.collectedEls?.[oppPoolIdx];

      if (userPoolEl && userStationRef.current) {
        const poolRect = userPoolEl.getBoundingClientRect();
        const stationRect = userStationRef.current.getBoundingClientRect();
        setUserPoolOffset({
          x: poolRect.left - stationRect.left,
          y: poolRect.top - stationRect.top
        });
      }

      if (oppPoolEl && oppStationRef.current) {
        const poolRect = oppPoolEl.getBoundingClientRect();
        const stationRect = oppStationRef.current.getBoundingClientRect();
        setOppPoolOffset({
          x: poolRect.left - stationRect.left,
          y: poolRect.top - stationRect.top
        });
      }
    } catch {
      // Fallback relative pool offsets
    }
  }, [isActive, isFourPlayers, tableRefs]);

  // Başlatma ve Havuzdan Masaya Süzülme (Physical Glide)
  useEffect(() => {
    if (!isActive) {
      startedRef.current = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      return;
    }

    if (startedRef.current) return;
    startedRef.current = true;

    setPhase('sliding_in');
    setIsGliding(true);
    setUserIndex(0);
    setOppIndex(0);
    setUserPointCards([]);
    setOppPointCards([]);
    setUserCardScore(0);
    setOppCardScore(0);
    setIsDone(false);
    setIsFast(false);
    setUserFlippingCard(null);
    setOppFlippingCard(null);

    // Havuzdan masaya geliş süzülüşü (540ms)
    sound.playSweepGather();

    const glideTimer = window.setTimeout(() => {
      setIsGliding(false);
    }, 50);

    const readyTimer = window.setTimeout(() => {
      setPhase('counting');
    }, 580);

    return () => {
      window.clearTimeout(glideTimer);
      window.clearTimeout(readyTimer);
    };
  }, [isActive]);

  // Eşzamanlı Masada Tıkır Tıkır Sayma Motoru
  useEffect(() => {
    if (!isActive || phase !== 'counting' || isDone) return;

    const userHasMore = userIndex < userCards.length;
    const oppHasMore = oppIndex < oppCards.length;

    if (!userHasMore && !oppHasMore) {
      setPhase('completed');
      setIsDone(true);
      setUserFlippingCard(null);
      setOppFlippingCard(null);
      onCountingDone?.();

      if (countState.userMajority) {
        sound.playDoublePisti();
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.55 } });
      } else {
        sound.playMatchSweep();
      }
      return;
    }

    timerRef.current = window.setTimeout(() => {
      // 1. Kullanıcı kartı açılıyor
      if (userHasMore) {
        const uCard = userCards[userIndex];
        const isPoint = (uCard.basePoints || 0) > 0;
        setUserFlippingCard({ card: uCard, index: userIndex, isPoint });
        sound.playCountTick(1 + (userIndex % 10) * 0.04);

        if (isPoint) {
          sound.playPointCardChime(uCard.basePoints);
          setUserPointCards(prev => [...prev, uCard]);
          setUserCardScore(prev => prev + uCard.basePoints);
        }
        setUserIndex(prev => prev + 1);
      }

      // 2. Rakip kartı eşzamanlı açılıyor
      if (oppHasMore) {
        const oCard = oppCards[oppIndex];
        const isPoint = (oCard.basePoints || 0) > 0;
        setOppFlippingCard({ card: oCard, index: oppIndex, isPoint });

        if (isPoint) {
          setOppPointCards(prev => [...prev, oCard]);
          setOppCardScore(prev => prev + oCard.basePoints);
        }
        setOppIndex(prev => prev + 1);
      }
    }, stepDelay);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [isActive, phase, userIndex, oppIndex, userCards, oppCards, stepDelay, isDone, countState.userMajority, onCountingDone]);

  // Hepsini Anında Say (Skip)
  const handleSkipAll = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setUserIndex(userCards.length);
    setOppIndex(oppCards.length);
    setUserPointCards(userCards.filter(c => (c.basePoints || 0) > 0));
    setOppPointCards(oppCards.filter(c => (c.basePoints || 0) > 0));
    setUserCardScore(userCards.reduce((acc, c) => acc + (c.basePoints || 0), 0));
    setOppCardScore(oppCards.reduce((acc, c) => acc + (c.basePoints || 0), 0));
    setPhase('completed');
    setIsDone(true);
    setUserFlippingCard(null);
    setOppFlippingCard(null);
    onCountingDone?.();

    if (countState.userMajority) {
      sound.playDoublePisti();
      confetti({ particleCount: 75, spread: 65, origin: { y: 0.55 } });
    }
  }, [userCards, oppCards, countState.userMajority, onCountingDone]);

  if (!isActive) return null;

  const userTotalPts =
    userCardScore +
    userPistiPoints +
    (isDone && countState.userMajority ? 3 : 0);
  const oppTotalPts =
    oppCardScore +
    oppPistiPoints +
    (isDone && countState.oppMajority ? 3 : 0);

  // Açılmış Normal Kartlar (Puan kartları ayrıldığı için destede kalanlar)
  const userCountedPile = userCards.slice(0, userIndex).filter(c => (c.basePoints || 0) === 0);
  const oppCountedPile = oppCards.slice(0, oppIndex).filter(c => (c.basePoints || 0) === 0);

  const userTopCard = userCountedPile.length > 0 ? userCountedPile[userCountedPile.length - 1] : null;
  const oppTopCard = oppCountedPile.length > 0 ? oppCountedPile[oppCountedPile.length - 1] : null;

  const userRemainingCount = Math.max(0, userCards.length - userIndex);
  const oppRemainingCount = Math.max(0, oppCards.length - oppIndex);

  const userRemainingLayers = Math.min(12, Math.max(userRemainingCount > 0 ? 1 : 0, Math.ceil(userRemainingCount / 2.2)));
  const oppRemainingLayers = Math.min(12, Math.max(oppRemainingCount > 0 ? 1 : 0, Math.ceil(oppRemainingCount / 2.2)));

  return (
    <div className="fixed inset-0 z-40 pointer-events-none select-none overflow-hidden">
      {/* ── TOP RIGHT: Minik Sayım Kontrol Butonları (Pencere/banner YOK!) ── */}
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

      {/* ── 1. RAKİBİN MASADAKİ DESTESİ (MASANIN ÇUHASINDA ORTAYA YAKIN, TÜM YAZILAR DÜZ!) ── */}
      <div
        ref={oppStationRef}
        className="absolute top-24 sm:top-32 left-1/2 -translate-x-1/2 pointer-events-none z-30"
      >
        <div
          className="flex items-center gap-3 sm:gap-5 p-2 rounded-2xl"
          style={{
            transform: isGliding
              ? `translate3d(${oppPoolOffset.x}px, ${oppPoolOffset.y}px, 0)`
              : 'translate3d(0, 0, 0)',
            transition: 'transform 540ms cubic-bezier(0.20, 1.0, 0.35, 1.0)'
          }}
        >
          {/* Rakip Kapalı Deste Kutusu */}
          <div className="relative flex flex-col items-center">
            <span className="text-[10px] font-mono text-slate-300 mb-0.5 font-bold">
              Kalan ({oppRemainingCount})
            </span>
            <div className="relative w-[88px] h-[128px] sm:w-24 sm:h-36 rounded-xl border border-dashed border-white/20 flex items-center justify-center bg-black/20">
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
                      <CardBackSurface cardBack="classic_blue" />
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] text-white/30 font-mono">Bitti (0)</span>
              )}

              {/* Rakip Çuha Üzerinde Yana Kayıp Dönen Kart */}
              {oppFlippingCard && (
                <div
                  key={`opp-flip-${oppFlippingCard.index}`}
                  className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl z-30 pointer-events-none"
                  style={{
                    animation: `${oppFlippingCard.isPoint ? 'deckSlideToPoints' : 'deckSlideToOpen'} ${stepDelay * 0.9}ms cubic-bezier(0.25, 1, 0.5, 1) forwards`
                  }}
                >
                  <CardFrontSurface card={oppFlippingCard.card} theme={theme} />
                  {oppFlippingCard.isPoint && (
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-black text-[9px] shadow-lg animate-bounce z-40">
                      +{oppFlippingCard.card.basePoints}P
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Rakip Açılan Normal Deste */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-mono text-slate-300 mb-0.5 font-bold">
              Sayılmış ({oppCountedPile.length})
            </span>
            <div className="relative w-[88px] h-[128px] sm:w-24 sm:h-36 rounded-xl border border-dashed border-white/20 flex items-center justify-center bg-black/20">
              {oppTopCard ? (
                <div className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl">
                  <CardFrontSurface card={oppTopCard} theme={theme} />
                </div>
              ) : (
                <span className="text-[10px] text-white/30 font-mono">Açık Deste</span>
              )}
            </div>
          </div>

          {/* Rakip Ayıklanan Değerli Puan Kartları (Tek Başına Yan Tarafta!) */}
          <div className="flex flex-col items-start pl-2 sm:pl-3 border-l border-white/15 min-w-[80px] sm:min-w-[130px]">
            <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider mb-1">
              💎 Puanlar (+{oppCardScore}P)
            </span>
            <div className="flex items-center -space-x-5 sm:-space-x-7">
              {oppPointCards.length === 0 ? (
                <span className="text-[10px] text-slate-500 italic">Henüz yok</span>
              ) : (
                oppPointCards.map((pc, idx) => (
                  <div
                    key={`opp-pc-${pc.id}-${idx}`}
                    className="relative w-[88px] h-[128px] sm:w-24 sm:h-36 rounded-xl shadow-2xl border-2 border-rose-400 overflow-hidden shrink-0 animate-scaleUp"
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

          {/* Rakip Skor Özeti Rozeti (YAZILAR DÜZ 0°!) */}
          <div className="flex flex-col items-center px-3 py-1.5 rounded-2xl bg-slate-950/90 border border-rose-400/60 shadow-xl">
            <span className="text-[11px] text-rose-300 font-bold">{opp?.name || 'Rakip'}</span>
            <span className="text-xl sm:text-2xl font-black font-cyber text-rose-300">+{oppTotalPts}P</span>
            {isDone && countState.oppMajority && (
              <span className="text-[9px] font-black text-amber-300">🏆 +3P Çoğunluk</span>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. MASA MERKEZİ: ÇOĞUNLUK & SONRAKİ EL BUTONU (Doğrudan Çuhanın Üstünde) ── */}
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

      {/* ── 3. KULLANICININ DESTESİ (SANA DÖNÜK, ELİN İLERİSİNDE ÇUHANIN FERAH BÖLGESİNDE) ── */}
      <div
        ref={userStationRef}
        className="absolute bottom-24 sm:bottom-32 left-1/2 -translate-x-1/2 pointer-events-none z-30"
      >
        <div
          className="flex items-center gap-3 sm:gap-5 p-2 rounded-2xl"
          style={{
            transform: isGliding
              ? `translate3d(${userPoolOffset.x}px, ${userPoolOffset.y}px, 0)`
              : 'translate3d(0, 0, 0)',
            transition: 'transform 540ms cubic-bezier(0.20, 1.0, 0.35, 1.0)'
          }}
        >
          {/* Kullanıcı Kapalı Deste Kutusu */}
          <div className="relative flex flex-col items-center">
            <span className="text-[10px] font-mono text-slate-300 mb-0.5 font-bold">
              Kalan ({userRemainingCount})
            </span>
            <div className="relative w-[88px] h-[128px] sm:w-24 sm:h-36 rounded-xl border border-dashed border-white/20 flex items-center justify-center bg-black/20">
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
                      <CardBackSurface cardBack="classic_blue" />
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] text-white/30 font-mono">Bitti (0)</span>
              )}

              {/* Kullanıcı Çuha Üzerinde Yana Kayıp Dönen Kart */}
              {userFlippingCard && (
                <div
                  key={`user-flip-${userFlippingCard.index}`}
                  className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl z-30 pointer-events-none"
                  style={{
                    animation: `${userFlippingCard.isPoint ? 'deckSlideToPoints' : 'deckSlideToOpen'} ${stepDelay * 0.9}ms cubic-bezier(0.25, 1, 0.5, 1) forwards`
                  }}
                >
                  <CardFrontSurface card={userFlippingCard.card} theme={theme} />
                  {userFlippingCard.isPoint && (
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] shadow-lg animate-bounce z-40">
                      +{userFlippingCard.card.basePoints}P
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Kullanıcı Açılan Normal Deste */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-mono text-slate-300 mb-0.5 font-bold">
              Sayılmış ({userCountedPile.length})
            </span>
            <div className="relative w-[88px] h-[128px] sm:w-24 sm:h-36 rounded-xl border border-dashed border-white/20 flex items-center justify-center bg-black/20">
              {userTopCard ? (
                <div className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl">
                  <CardFrontSurface card={userTopCard} theme={theme} />
                </div>
              ) : (
                <span className="text-[10px] text-white/30 font-mono">Açık Deste</span>
              )}
            </div>
          </div>

          {/* Kullanıcı Ayıklanan Değerli Puan Kartları (Tek Başına Yan Tarafta!) */}
          <div className="flex flex-col items-start pl-2 sm:pl-3 border-l border-white/15 min-w-[80px] sm:min-w-[130px]">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1">
              💎 Puanlar (+{userCardScore}P)
            </span>
            <div className="flex items-center -space-x-5 sm:-space-x-7">
              {userPointCards.length === 0 ? (
                <span className="text-[10px] text-slate-500 italic">Henüz yok</span>
              ) : (
                userPointCards.map((pc, idx) => (
                  <div
                    key={`user-pc-${pc.id}-${idx}`}
                    className="relative w-[88px] h-[128px] sm:w-24 sm:h-36 rounded-xl shadow-2xl border-2 border-amber-400 overflow-hidden shrink-0 animate-scaleUp"
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
            <span className="text-[11px] text-emerald-300 font-bold">{isFourPlayers ? 'Bizim Takım' : (user?.name || 'Sen')}</span>
            <span className="text-xl sm:text-2xl font-black font-cyber text-amber-300">+{userTotalPts}P</span>
            {isDone && countState.userMajority && (
              <span className="text-[9px] font-black text-emerald-300">🏆 +3P Çoğunluk</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Keyframe Stilleri: Doğal Elle Kart Kaydırma & Masaya Oturma ── */}
      <style>{`
        @keyframes deckSlideToOpen {
          0% {
            opacity: 0.9;
            transform: translate3d(0, 0, 0) scale(1) rotateY(180deg);
          }
          45% {
            opacity: 1;
            transform: translate3d(52px, -8px, 12px) scale(1.03) rotateY(90deg);
          }
          100% {
            opacity: 1;
            transform: translate3d(104px, 0, 0) scale(1) rotateY(0deg);
          }
        }
        @keyframes deckSlideToPoints {
          0% {
            opacity: 0.9;
            transform: translate3d(0, 0, 0) scale(1) rotateY(180deg);
          }
          45% {
            opacity: 1;
            transform: translate3d(105px, -12px, 16px) scale(1.05) rotateY(90deg);
          }
          100% {
            opacity: 1;
            transform: translate3d(215px, 0, 0) scale(1) rotateY(0deg);
          }
        }
        @keyframes scaleUp {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

/**
 * CardCountingOverlay.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * El-sonu kart sayma animasyon overlay'i.
 * Mevcut `OnTableCountState` verisini kullanır; kartlar deste konumlarından
 * (sol alt = kullanıcı, sağ üst = rakip) masanın ortasına animasyonla gelir,
 * sırayla sayılır, puan artar, bitince "Sonraki El" butonu belirir.
 *
 * Yalnızca görsel – oyun state'ini değiştirmez.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef, useState } from 'react';
import { Card, OnTableCountState, TableTheme, Player } from '../types/game';
import { CardFrontSurface } from './CardView';
import { DetailedRoundScore } from '../core/rules';
import { RotateCcw, ArrowRight, Trophy } from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const CARD_INTERVAL_MS = 140;    // her kart arasındaki gecikme (ms)
const CARD_FLY_MS     = 520;     // uçuş animasyonu süresi (ms)
const SETTLE_DELAY_MS = 60;      // yerleşme öncesi ek gecikme

/* ─── types ───────────────────────────────────────────────────────────────── */
interface Props {
  /** Sayma aktif olduğunda true */
  isActive: boolean;
  /** Sayma state'i (App.tsx'ten gelir) */
  countState: OnTableCountState;
  /** Her iki tarafın ham kart listeleri (sıralı, sayım sırasına göre) */
  userCards: Card[];
  oppCards: Card[];
  /** El puanları özeti */
  roundScores: {
    user: DetailedRoundScore;
    opp: DetailedRoundScore;
    winner: Player | null;
    isGameOver: boolean;
  } | null;
  /** Oyuncu bilgileri */
  players: Player[];
  /** Masa teması */
  theme?: TableTheme;
  /** Maç hedef puanı */
  targetScore: number;
  /** Çok oyunculu mu? */
  isMultiplayer?: boolean;
  /** Hazır mı? */
  isReadyForNextRound?: boolean;
  readySeatsCount?: number;
  totalHumanPlayersCount?: number;
  slotsReadiness?: { seatIndex: number; name: string; isReady: boolean }[];
  /** Buton geri çağrıları */
  onNextRound?: () => void;
  onRestartGame?: () => void;
  onToggleReady?: () => void;
  /** Sayma tamamlandığında çağrılır */
  onCountingDone?: () => void;
}

interface FlyingCardEntry {
  id: string;
  card: Card;
  side: 'user' | 'opp';
  /** Başlangıç konumu (viewport %) */
  fromX: number;
  fromY: number;
  /** Bitiş – masa ortası (viewport %) */
  toX: number;
  toY: number;
  /** Ne zaman uçmaya başlar */
  startMs: number;
  /** Artık görünmez mi? (sayıldı) */
  counted: boolean;
  isSpecial: boolean;
  points: number;
}

/* ─── component ───────────────────────────────────────────────────────────── */
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
  /* ── local state ── */
  const [flyingCards, setFlyingCards] = useState<FlyingCardEntry[]>([]);
  const [userPts, setUserPts]       = useState(0);
  const [oppPts, setOppPts]         = useState(0);
  const [userCount, setUserCount]   = useState(0);
  const [oppCount, setOppCount]     = useState(0);
  const [localDone, setLocalDone]   = useState(false);
  const [entered, setEntered]       = useState(false);  // fade-in
  const [lastSpecial, setLastSpecial] = useState<{ side: 'user' | 'opp'; label: string } | null>(null);

  const timerRef  = useRef<number | null>(null);
  const startedRef = useRef(false);

  /* ── derived ── */
  const isFourPlayers = players.length === 4;
  const user    = players[0];
  const opp     = players[1];
  const isGameOver = Boolean(roundScores?.isGameOver);

  /* ── entrance animation ── */
  useEffect(() => {
    if (isActive) {
      const t = window.setTimeout(() => setEntered(true), 30);
      return () => window.clearTimeout(t);
    } else {
      setEntered(false);
    }
  }, [isActive]);

  /* ── main counting loop ── */
  useEffect(() => {
    if (!isActive || startedRef.current) return;
    startedRef.current = true;

    // Sıfırla
    setFlyingCards([]);
    setUserPts(0);
    setOppPts(0);
    setUserCount(0);
    setOppCount(0);
    setLocalDone(false);
    setLastSpecial(null);

    const allCards: FlyingCardEntry[] = [];
    const maxLen = Math.max(userCards.length, oppCards.length);

    /* Başlangıç konumları: kullanıcı sol alt (~10%, ~80%), rakip sağ üst (~90%, ~15%) */
    for (let i = 0; i < maxLen; i++) {
      if (i < userCards.length) {
        const c = userCards[i];
        allCards.push({
          id: `u-${i}-${c.id}`,
          card: c,
          side: 'user',
          fromX: 8 + Math.random() * 4,
          fromY: 72 + Math.random() * 6,
          toX: 46 + Math.random() * 3,
          toY: 44 + Math.random() * 5,
          startMs: i * CARD_INTERVAL_MS,
          counted: false,
          isSpecial: c.isSpecial,
          points: c.basePoints,
        });
      }
      if (i < oppCards.length) {
        const c = oppCards[i];
        allCards.push({
          id: `o-${i}-${c.id}`,
          card: c,
          side: 'opp',
          fromX: 86 + Math.random() * 5,
          fromY: 10 + Math.random() * 6,
          toX: 51 + Math.random() * 3,
          toY: 44 + Math.random() * 5,
          startMs: i * CARD_INTERVAL_MS,
          counted: false,
          isSpecial: c.isSpecial,
          points: c.basePoints,
        });
      }
    }

    const totalDuration = maxLen * CARD_INTERVAL_MS + CARD_FLY_MS + SETTLE_DELAY_MS + 200;

    /* Her kart için sayaç güncelleme */
    let uPts = 0, oPts = 0, uCnt = 0, oCnt = 0;

    allCards.forEach(entry => {
      const t1 = window.setTimeout(() => {
        // Kartı görsel olarak "sayıldı" yap (solar)
        setFlyingCards(prev => prev.map(fc => fc.id === entry.id ? { ...fc, counted: true } : fc));

        if (entry.side === 'user') {
          uCnt++;
          uPts += entry.points;
          setUserCount(uCnt);
          setUserPts(uPts);
          if (entry.isSpecial && entry.points > 0) {
            setLastSpecial({ side: 'user', label: `+${entry.points}P` });
            window.setTimeout(() => setLastSpecial(null), 700);
          }
        } else {
          oCnt++;
          oPts += entry.points;
          setOppCount(oCnt);
          setOppPts(oPts);
          if (entry.isSpecial && entry.points > 0) {
            setLastSpecial({ side: 'opp', label: `+${entry.points}P` });
            window.setTimeout(() => setLastSpecial(null), 700);
          }
        }
      }, entry.startMs + CARD_FLY_MS + SETTLE_DELAY_MS);

      timerRef.current = t1;
    });

    /* Kartları tek seferde render'a ekle (animasyonlar CSS ile) */
    setFlyingCards(allCards);

    /* Tamamlanma */
    const doneTimer = window.setTimeout(() => {
      setLocalDone(true);
      onCountingDone?.();
    }, totalDuration);

    timerRef.current = doneTimer;

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  /* Overlay kapatıldığında temizle */
  useEffect(() => {
    if (!isActive) {
      startedRef.current = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    }
  }, [isActive]);

  if (!isActive) return null;

  /* ── puan hesabı (pişti dahil çoğunluk) ── */
  const uTotalPts =
    userPts +
    (countState.userPistiPoints ?? 0) +
    (localDone && countState.userMajority ? 3 : 0);
  const oTotalPts =
    oppPts +
    (countState.oppPistiPoints ?? 0) +
    (localDone && countState.oppMajority ? 3 : 0);

  const userPistiCount = Math.floor((countState.userPistiPoints ?? 0) / 10);
  const oppPistiCount  = Math.floor((countState.oppPistiPoints ?? 0) / 10);

  /* ── render ─────────────────────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      style={{
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        opacity: entered ? 1 : 0,
        transition: 'opacity 300ms ease',
        pointerEvents: 'all',
      }}
    >
      {/* ── Flying cards layer ── */}
      {flyingCards.map(fc => (
        <FlyingCard key={fc.id} entry={fc} theme={theme} />
      ))}

      {/* ── Special point pop ── */}
      {lastSpecial && (
        <div
          className="fixed z-50 font-black text-2xl pointer-events-none"
          style={{
            left: lastSpecial.side === 'user' ? '22%' : '70%',
            top: '46%',
            color: lastSpecial.side === 'user' ? '#fbbf24' : '#f87171',
            textShadow: '0 0 16px rgba(0,0,0,0.9)',
            animation: 'floatUpFade 700ms ease forwards',
          }}
        >
          {lastSpecial.label}
        </div>
      )}

      {/* ── Centre HUD ── */}
      <div
        className="relative flex flex-col items-center gap-3 w-full max-w-lg px-4"
        style={{ zIndex: 45 }}
      >
        {/* Title */}
        <div className="text-center">
          <span className="text-[11px] font-cyber uppercase tracking-widest text-amber-400 font-black">
            ✦ EL SAYIMI ✦
          </span>
        </div>

        {/* Score cards row */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {/* User side */}
          <ScorePanel
            label={isFourPlayers ? '🔵 Bizim Takım' : `👤 ${user?.name ?? 'Sen'}`}
            totalPts={uTotalPts}
            cardPoints={userPts}
            pistiCount={userPistiCount}
            pistiPts={countState.userPistiPoints ?? 0}
            hasMajority={localDone && countState.userMajority}
            counted={userCount}
            total={countState.userTotal}
            isDone={localDone}
            color="emerald"
          />
          {/* Opp side */}
          <ScorePanel
            label={isFourPlayers ? '🔴 Rakip Takım' : `👤 ${opp?.name ?? 'Rakip'}`}
            totalPts={oTotalPts}
            cardPoints={oppPts}
            pistiCount={oppPistiCount}
            pistiPts={countState.oppPistiPoints ?? 0}
            hasMajority={localDone && countState.oppMajority}
            counted={oppCount}
            total={countState.oppTotal}
            isDone={localDone}
            color="rose"
          />
        </div>

        {/* Majority banner */}
        {localDone && (
          <div className="text-[11px] font-black text-amber-300 bg-amber-950/90 border border-amber-500/60 px-4 py-1.5 rounded-full text-center">
            {countState.userMajority
              ? `🏆 KART ÇOĞUNLUĞU (+3P) SİZİN! (${countState.userTotal} kart)`
              : countState.oppMajority
              ? `KART ÇOĞUNLUĞU (+3P) RAKİPTE (${countState.oppTotal} kart)`
              : 'KART ÇOĞUNLUĞU: EŞİT (26 – 26)'}
          </div>
        )}

        {/* Match scores */}
        {localDone && (
          <div className="flex items-center gap-3 text-xs">
            <div className="px-3 py-1 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 font-bold flex items-center gap-1.5">
              <span>{isFourPlayers ? '🔵 Bizim Takım' : '👤 Sen'}:</span>
              <span className="font-arcade font-black text-white text-sm">{players[0]?.score ?? 0}</span>
              {roundScores?.user && (
                <span className="text-emerald-400 font-mono font-bold text-[11px]">
                  (+{roundScores.user.totalRoundPoints}P)
                </span>
              )}
            </div>
            <div className="px-3 py-1 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-300 font-bold flex items-center gap-1.5">
              <span>{isFourPlayers ? '🔴 Rakip' : `👤 ${players[1]?.name ?? 'Rakip'}`}:</span>
              <span className="font-arcade font-black text-white text-sm">{players[1]?.score ?? 0}</span>
              {roundScores?.opp && (
                <span className="text-rose-400 font-mono font-bold text-[11px]">
                  (+{roundScores.opp.totalRoundPoints}P)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {localDone && (
          <div className="mt-1 w-full flex flex-col items-center gap-2">
            {isGameOver ? (
              <>
                <div className="px-5 py-2 rounded-2xl bg-gradient-to-r from-amber-500/30 via-yellow-500/20 to-amber-500/30 border-2 border-amber-400 text-amber-200 font-black text-sm shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center gap-2 animate-bounce">
                  <Trophy className="w-4 h-4" />
                  <span>
                    {roundScores?.winner
                      ? `${roundScores.winner.name.toUpperCase()} KAZANDI!`
                      : 'MAÇ TAMAMLANDI!'}
                  </span>
                </div>
                <div className="flex gap-3">
                  {onRestartGame && (
                    <button
                      onClick={onRestartGame}
                      className="px-5 py-2.5 rounded-xl text-sm font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg cursor-pointer transition-transform active:scale-95 flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Yeni Maç Başlat
                    </button>
                  )}
                </div>
              </>
            ) : isMultiplayer ? (
              <div className="flex flex-col items-center gap-2">
                {slotsReadiness.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {slotsReadiness.map(slot => (
                      <div
                        key={slot.seatIndex}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${
                          slot.isReady
                            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-400/80'
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
                  className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-lg ${
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
                      <span>🔥 SONRAKİ EL</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={onNextRound}
                className="px-7 py-3 rounded-xl text-sm font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>Sonraki Eli Başlat</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes floatUpFade {
          0%   { opacity:1; transform: translateY(0) scale(1); }
          100% { opacity:0; transform: translateY(-40px) scale(1.3); }
        }
        @keyframes cardFlyIn {
          0%   { opacity:0; transform: translate(var(--dx), var(--dy)) scale(0.7) rotate(var(--rot)); }
          30%  { opacity:1; }
          85%  { transform: translate(0,0) scale(1.08) rotate(0deg); }
          100% { transform: translate(0,0) scale(1) rotate(0deg); opacity:1; }
        }
        @keyframes cardFadeOut {
          0%   { opacity:1; transform: scale(1); }
          100% { opacity:0; transform: scale(0.6); }
        }
      `}</style>
    </div>
  );
};

/* ─── FlyingCard sub-component ──────────────────────────────────────────────── */
interface FlyingCardProps {
  entry: FlyingCardEntry;
  theme: TableTheme;
}

const FlyingCard: React.FC<FlyingCardProps> = ({ entry, theme }) => {
  const [phase, setPhase] = useState<'idle' | 'flying' | 'counted'>('idle');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => {
      setVisible(true);
      setPhase('flying');
    }, entry.startMs);

    const t2 = window.setTimeout(() => {
      setPhase('counted');
    }, entry.startMs + CARD_FLY_MS + SETTLE_DELAY_MS);

    const t3 = window.setTimeout(() => {
      setVisible(false);
    }, entry.startMs + CARD_FLY_MS + SETTLE_DELAY_MS + 250);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [entry.startMs]);

  if (!visible) return null;

  const dx = `${(entry.fromX - entry.toX) * window.innerWidth / 100}px`;
  const dy = `${(entry.fromY - entry.toY) * window.innerHeight / 100}px`;
  const rot = entry.side === 'user' ? '-12deg' : '12deg';

  return (
    <div
      className="fixed pointer-events-none z-48"
      style={{
        left: `${entry.toX}%`,
        top: `${entry.toY}%`,
        width: 56,
        height: 80,
        marginLeft: -28,
        marginTop: -40,
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: entry.isSpecial
          ? '0 0 20px 4px rgba(245,158,11,0.7), 0 4px 20px rgba(0,0,0,0.6)'
          : '0 4px 20px rgba(0,0,0,0.55)',
        ['--dx' as string]: dx,
        ['--dy' as string]: dy,
        ['--rot' as string]: rot,
        animation:
          phase === 'flying'
            ? `cardFlyIn ${CARD_FLY_MS}ms cubic-bezier(0.22,1,0.36,1) forwards`
            : phase === 'counted'
            ? 'cardFadeOut 250ms ease forwards'
            : 'none',
      }}
    >
      <CardFrontSurface card={entry.card} theme={theme} />
      {entry.isSpecial && entry.points > 0 && (
        <div
          className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] z-10"
        >
          +{entry.points}P
        </div>
      )}
    </div>
  );
};

/* ─── ScorePanel sub-component ──────────────────────────────────────────────── */
interface ScorePanelProps {
  label: string;
  totalPts: number;
  cardPoints: number;
  pistiCount: number;
  pistiPts: number;
  hasMajority: boolean;
  counted: number;
  total: number;
  isDone: boolean;
  color: 'emerald' | 'rose';
}

const ScorePanel: React.FC<ScorePanelProps> = ({
  label, totalPts, cardPoints: _cardPoints, pistiCount, pistiPts,
  hasMajority, counted, total, isDone, color,
}) => {
  const borderCls = hasMajority
    ? color === 'emerald' ? 'border-emerald-400 bg-emerald-950/80 shadow-[0_0_24px_rgba(52,211,153,0.4)]'
                         : 'border-rose-400 bg-rose-950/80 shadow-[0_0_24px_rgba(251,113,133,0.4)]'
    : 'border-white/15 bg-slate-900/80';

  const ptColor = color === 'emerald' ? 'text-emerald-300' : 'text-rose-300';
  const labelColor = color === 'emerald' ? 'text-emerald-300' : 'text-rose-300';

  return (
    <div className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${borderCls}`}>
      <div className={`text-[11px] font-bold uppercase tracking-wider ${labelColor}`}>{label}</div>
      {/* Big score */}
      <div className={`text-3xl font-black font-cyber tracking-tight ${ptColor}`}>
        +{totalPts}
        <span className="text-xs font-sans font-black uppercase tracking-widest ml-0.5">P</span>
      </div>
      {/* Card progress */}
      <div className="text-[10px] text-slate-300">
        <span className="font-bold text-white">{counted}</span>
        {' / '}{total} kart
        {pistiCount > 0 && (
          <span className="text-amber-400 ml-1 font-bold">({pistiCount} Pişti +{pistiPts}P)</span>
        )}
      </div>
      {/* Majority chip */}
      {hasMajority && isDone && (
        <div className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
          color === 'emerald' ? 'bg-emerald-400/20 text-emerald-300' : 'bg-rose-400/20 text-rose-300'
        }`}>
          🏆 +3P ÇOĞUNLUK
        </div>
      )}
    </div>
  );
};

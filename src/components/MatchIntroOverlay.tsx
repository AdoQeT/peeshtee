import React, { useEffect, useState, useRef } from 'react';
import { CardBackSurface } from './CardView';
import { AvatarBadge } from './AvatarBadge';
import { TableTheme } from '../types/game';
import { sound } from '../core/audio/soundEngine';

export interface MatchIntroPlayer {
  name: string;
  avatar: string;
  avatarId?: string;
  customAvatarUrl?: string;
  isMe?: boolean;
}

interface MatchIntroOverlayProps {
  label: string;
  gameType?: 'pisti' | 'uno';
  players: MatchIntroPlayer[];
  theme?: TableTheme;
  cardBack?: string;
  reducedMotion?: boolean;
  onReveal: () => void;
  onDone: () => void;
}

const TIPS = [
  "Kartları dikkatle say, Pişti fırsatını kaçırma!",
  "Valeleri doğru zamanda oynayarak masadaki potu temizle.",
  "Karo 10 tam 3 puan, Sinek 2 ise 2 puan kazandırır.",
  "Son eli alan oyuncu yerdeki tüm kalan kartları toplar.",
  "Aslar 1'er puandır; çoğunluk kartı alan hanesine 3 puan yazar.",
  "RenQ modunda renk değişimlerini ve özel kartları akıllıca kullan!",
  "Stratejini kur, rakibinin elindeki son kartı tahmin etmeye çalış."
];

export const MatchIntroOverlay: React.FC<MatchIntroOverlayProps> = ({
  label,
  gameType = 'pisti',
  players,
  theme = 'traditional',
  cardBack = 'classic_blue',
  reducedMotion = false,
  onReveal,
  onDone
}) => {
  const [fanned, setFanned] = useState(reducedMotion);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);

  const onRevealRef = useRef(onReveal);
  const onDoneRef = useRef(onDone);
  onRevealRef.current = onReveal;
  onDoneRef.current = onDone;

  useEffect(() => {
    // Sound effect on intro start
    sound.playSweepGather();

    // Trigger fan-out after short mount delay
    const fanTimer = window.setTimeout(() => {
      setFanned(true);
    }, 120);

    // 1950ms: start fade out and trigger onReveal
    const revealTimer = window.setTimeout(() => {
      setIsFadingOut(true);
      onRevealRef.current?.();
    }, 1950);

    // 2400ms: finish and clean up
    const doneTimer = window.setTimeout(() => {
      onDoneRef.current?.();
    }, 2400);

    return () => {
      window.clearTimeout(fanTimer);
      window.clearTimeout(revealTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  // Theme-aware dark backdrop background
  const getThemeBackground = () => {
    switch (theme) {
      case 'monaco_velvet':
        return 'from-purple-950 via-slate-950 to-black';
      case 'melbourne_red':
        return 'from-red-950 via-zinc-950 to-black';
      case 'estoril_blue':
        return 'from-blue-950 via-slate-950 to-black';
      case 'alpine_white':
        return 'from-slate-900 via-zinc-950 to-black';
      case 'traditional':
      default:
        return 'from-emerald-950 via-slate-950 to-black';
    }
  };

  const p1 = players[0] || { name: 'Oyuncu 1', avatar: '🦁', avatarId: 'lion' };
  const p2 = players[1] || { name: 'Rakip', avatar: '🐺', avatarId: 'wolf' };

  // 5 card fan rotations and offsets
  const fanStyles = [
    { rot: -24, x: -55, y: 8 },
    { rot: -12, x: -27, y: 2 },
    { rot: 0, x: 0, y: 0 },
    { rot: 12, x: 27, y: 2 },
    { rot: 24, x: 55, y: 8 }
  ];

  return (
    <div
      className={`fixed inset-0 z-[120] flex flex-col items-center justify-between py-12 px-6 select-none bg-radial ${getThemeBackground()} transition-all duration-450 ${
        isFadingOut ? 'opacity-0 scale-102 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(245,158,11,0.12),transparent_70%)] pointer-events-none" />

      {/* Top Header: Game mode badge */}
      <div className="relative z-10 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
        <span className="px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-bold tracking-widest uppercase text-amber-300 shadow-lg">
          {label || (gameType === 'uno' ? 'RenQ Arenası' : 'Pişti Masası')}
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 tracking-wider drop-shadow-md">
          {gameType === 'uno' ? 'RENQ' : 'PİŞTİ'}
        </h1>
      </div>

      {/* Centerpiece: Fanned 5 Cards Backs */}
      <div className="relative z-10 my-auto flex items-center justify-center h-48 sm:h-56">
        <div className="relative w-28 h-40 flex items-center justify-center">
          {[0, 1, 2, 3, 4].map(idx => {
            const fan = fanStyles[idx];
            const transform = fanned && !reducedMotion
              ? `translateX(${fan.x}px) translateY(${fan.y}px) rotate(${fan.rot}deg)`
              : 'translateX(0px) translateY(0px) rotate(0deg)';

            return (
              <div
                key={idx}
                className="absolute inset-0 rounded-xl shadow-2xl transition-transform ease-out"
                style={{
                  transform,
                  transitionDuration: reducedMotion ? '0ms' : '600ms',
                  transitionDelay: reducedMotion ? '0ms' : `${idx * 80}ms`,
                  zIndex: idx
                }}
              >
                <div className="w-full h-full rounded-xl overflow-hidden border border-white/20 shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
                  <CardBackSurface cardBack={cardBack} className="w-full h-full" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: VS Roster & Tip & Progress */}
      <div className="relative z-10 w-full max-w-lg flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* VS Player Cards */}
        <div className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-white/10 shadow-xl">
          {/* Player 1 */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <AvatarBadge
              avatarId={p1.avatarId}
              customAvatarUrl={p1.customAvatarUrl}
              size="md"
              className={p1.isMe ? 'ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]' : ''}
            />
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-bold text-white block truncate">
                {p1.name} {p1.isMe && <span className="text-[10px] text-amber-400 font-normal">(Sen)</span>}
              </span>
              <span className="text-[10px] text-slate-400 block">Hazır</span>
            </div>
          </div>

          {/* VS Divider */}
          <div className="mx-3 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-black text-xs sm:text-sm shadow-md tracking-wider">
            VS
          </div>

          {/* Player 2 */}
          <div className="flex items-center justify-end gap-3 min-w-0 flex-1 text-right">
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-bold text-white block truncate">
                {p2.name} {!p1.isMe && p2.isMe && <span className="text-[10px] text-amber-400 font-normal">(Sen)</span>}
              </span>
              <span className="text-[10px] text-slate-400 block">Hazır</span>
            </div>
            <AvatarBadge
              avatarId={p2.avatarId}
              customAvatarUrl={p2.customAvatarUrl}
              size="md"
              className={!p1.isMe && p2.isMe ? 'ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]' : ''}
            />
          </div>
        </div>

        {/* Tip & Progress Bar */}
        <div className="w-full space-y-2 text-center">
          <p className="text-xs text-slate-400 font-medium italic min-h-[1.25rem]">
            "{tip}"
          </p>

          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden relative shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 rounded-full transition-all ease-linear"
              style={{
                width: '100%',
                transitionDuration: reducedMotion ? '0ms' : '2200ms'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

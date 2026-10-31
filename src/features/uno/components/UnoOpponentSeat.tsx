import React from 'react';
import { Flame, ShieldAlert } from 'lucide-react';
import { UnoPlayer } from '../unoTypes';
import { UnoCardBack } from '../../../components/UnoCardView';
import { AvatarBadge } from '../../../components/AvatarBadge';
import { getAvatarPreset } from '../../profile/profileManager';
import { ActiveEmote } from '../../../components/UnoGameView';
import { translations } from '../../../utils/i18n';

export interface UnoOpponentSeatProps {
  playerIdx: number;
  position: 'top' | 'left' | 'right';
  player: UnoPlayer;
  isTurn: boolean;
  isSkipped: boolean;
  bubbleText?: string;
  activeEmotes: ActiveEmote[];
  handRefCallback: (el: HTMLDivElement | null) => void;
  cardRackRefCallback: (el: HTMLDivElement | null) => void;
  lang: string;
  t: typeof translations.tr;
}

export const UnoOpponentSeat: React.FC<UnoOpponentSeatProps> = ({
  playerIdx,
  position,
  player,
  isTurn,
  isSkipped,
  bubbleText,
  activeEmotes,
  handRefCallback,
  cardRackRefCallback,
  lang,
  t
}) => {
  const visibleCardsCount = Math.min(player.hand.length, 8);

  return (
    <div
      ref={handRefCallback}
      className={`relative flex flex-col items-center transition-all duration-300 ${
        isTurn ? 'scale-105 z-20' : 'opacity-90 z-10'
      }`}
    >
      {/* Live Speech / Action Bubble */}
      {bubbleText && (
        <div className="absolute -top-9 z-40 px-3 py-1 rounded-2xl bg-slate-900/95 border-2 border-cyan-400 text-cyan-200 font-black text-[11px] whitespace-nowrap shadow-[0_6px_20px_rgba(0,0,0,0.75)] animate-bounce">
          {bubbleText}
        </div>
      )}

      {/* Floating Active Emotes for Opponent */}
      {activeEmotes
        ?.filter(e => e.playerIdx === playerIdx)
        .map(e => (
          <div
            key={e.id}
            style={{ animation: 'emotePop2s 2000ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards' }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
          >
            <div className="px-3.5 py-1.5 rounded-2xl bg-slate-900/95 border-2 border-amber-400 text-3xl shadow-[0_10px_35px_rgba(0,0,0,0.9)] flex items-center justify-center animate-bounce">
              {e.emoji}
            </div>
          </div>
        ))}

      {/* Active Turn Glowing Beacon */}
      {isTurn && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-40 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.95)] animate-bounce flex items-center gap-1 whitespace-nowrap">
          ⚡ {t.renqYourTurnTitle ? t.renqYourTurnTitle.slice(0, 10).toUpperCase() : 'SIRADA'}
        </div>
      )}

      {/* 1 Card Left Danger Warning Beacon */}
      {player.hand.length === 1 && !isTurn && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-40 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white font-cyber text-[9px] font-black uppercase tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.95)] animate-bounce flex items-center gap-1 whitespace-nowrap border border-white">
          <Flame className="w-3 h-3 text-yellow-300 fill-yellow-300 animate-pulse" />
          <span>
            {lang === 'tr'
              ? '⚠️ 1 KART KALDI!'
              : lang === 'de'
              ? '⚠️ NUR 1 KARTE!'
              : lang === 'es'
              ? '⚠️ ¡ÚLTIMA CARTA!'
              : '⚠️ LAST CARD!'}
          </span>
        </div>
      )}

      {/* Skipped Laser Barrier Stamp */}
      {isSkipped && (
        <div className="absolute -top-3 z-30 px-3 py-1 rounded-full bg-red-600 text-white font-black text-xs border-2 border-white shadow-[0_0_25px_rgba(239,68,68,0.95)] animate-bounce flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5" />
          {t.renqPassBtn ? t.renqPassBtn.toUpperCase() : 'PAS'}!
        </div>
      )}

      {/* Opponent Badge Card */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all duration-200 ${
          isTurn
            ? 'bg-amber-500/35 border-amber-300 ring-4 ring-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.95)] scale-105'
            : player.hand.length === 1
            ? 'bg-rose-950/70 border-rose-400 ring-4 ring-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.9)] animate-pulse'
            : 'bg-slate-950/80 border-white/15'
        }`}
      >
        <div className="relative">
          <AvatarBadge
            avatarId={player.avatarId}
            customAvatarUrl={player.customAvatarUrl}
            size="sm"
          />
          {isTurn && (
            <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-ping" />
          )}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-white max-w-[105px] truncate">
              {player.name}
            </span>
            {player.hasCalledUno && (
              <span className="px-1.5 py-0.5 rounded bg-gradient-to-r from-red-600 to-amber-500 text-[9px] font-black text-white animate-pulse">
                🔥 RENQ!
              </span>
            )}
          </div>
          <span className="text-[9px] font-bold text-amber-300/90 truncate max-w-[110px]">
            {player.customTitle || getAvatarPreset(player.avatarId || 'wolf').title}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span className="text-amber-300 font-bold">{player.score}{t.renqPointSuffix}</span>
            <span className="text-slate-400">•</span>
            <span
              className={`font-black ${
                player.hand.length === 1 ? 'text-red-400 animate-pulse' : 'text-cyan-300'
              }`}
            >
              {player.hand.length} {t.renqCardCountSuffix}
            </span>
          </div>
        </div>
      </div>

      {/* Opponent's Fanned Card Backs */}
      <div
        ref={cardRackRefCallback}
        className={`flex items-center justify-center ${
          position === 'top' ? '-space-x-8 mt-1.5 min-h-[74px]' : '-space-x-9 mt-1 min-h-[68px]'
        }`}
      >
        {Array.from({ length: visibleCardsCount }).map((_, i) => {
          const tilt = (i - (visibleCardsCount - 1) / 2) * 5;
          return (
            <div
              key={i}
              style={{
                transform: `rotate(${tilt}deg) translateY(${Math.abs(tilt) * 0.35}px)`
              }}
              className="transition-transform duration-200"
            >
              <UnoCardBack size="sm" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

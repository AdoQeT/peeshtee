import React from 'react';
import { Card, Suit, TableTheme } from '../types/game';

interface CardViewProps {
  card: Card;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  isPlayable?: boolean;
  isOpponent?: boolean;
  isHiddenInFlight?: boolean;
  tiltAngle?: number;
  cardBack?: string;
  theme?: TableTheme;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

const SUIT_ICONS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  spades: '♠',
  clubs: '♣'
};

export const CARD_DIMENSIONS = {
  sm: { width: 56, height: 80, classes: 'w-14 h-20 text-xs rounded-lg' },
  md: { width: 88, height: 128, classes: 'w-[88px] h-[128px] sm:w-24 sm:h-36 text-sm rounded-xl' },
  lg: { width: 112, height: 160, classes: 'w-28 h-40 sm:w-32 sm:h-48 text-base rounded-2xl' }
};

function getCardThemeConfig(theme: TableTheme = 'traditional') {
  switch (theme) {
    case 'cyberpunk':
      return {
        bg: 'bg-gradient-to-b from-[#090d18] via-[#050811] to-[#020409] border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.25)]',
        innerFrame: 'border-cyan-500/35 bg-cyan-950/20',
        fontClass: 'font-cyber',
        getSuitColor: (suit: Suit) =>
          suit === 'hearts' || suit === 'diamonds'
            ? 'text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.85)]'
            : 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.85)]',
        courtBg: 'border-cyan-400/60 bg-gradient-to-b from-indigo-950 via-slate-900 to-black text-cyan-300'
      };
    case 'sakura':
      return {
        bg: 'bg-gradient-to-b from-[#fffafd] via-[#faedf5] to-[#f4e2ee] border border-pink-300/80 shadow-md',
        innerFrame: 'border-pink-300/50 bg-pink-50/20',
        fontClass: 'font-serif',
        getSuitColor: (suit: Suit) =>
          suit === 'hearts' || suit === 'diamonds'
            ? 'text-rose-600'
            : 'text-purple-950',
        courtBg: 'border-pink-300/60 bg-gradient-to-b from-pink-50 via-rose-50 to-pink-100 text-rose-900'
      };
    case 'luxury_gold':
      return {
        bg: 'bg-gradient-to-b from-[#1c120a] via-[#100905] to-[#080402] border border-amber-400/70 shadow-[0_0_15px_rgba(245,158,11,0.25)]',
        innerFrame: 'border-amber-400/40 bg-amber-950/20',
        fontClass: 'font-serif',
        getSuitColor: (suit: Suit) =>
          suit === 'hearts' || suit === 'diamonds'
            ? 'text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.7)]'
            : 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]',
        courtBg: 'border-amber-400/60 bg-gradient-to-b from-amber-950 via-stone-900 to-black text-amber-300'
      };
    case 'cosmic':
      return {
        bg: 'bg-gradient-to-b from-[#0d0b21] via-[#060414] to-[#020108] border border-indigo-400/60 shadow-[0_0_15px_rgba(99,102,241,0.25)]',
        innerFrame: 'border-indigo-400/40 bg-indigo-950/20',
        fontClass: 'font-mono',
        getSuitColor: (suit: Suit) =>
          suit === 'hearts' || suit === 'diamonds'
            ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.75)]'
            : 'text-indigo-300 drop-shadow-[0_0_8px_rgba(129,140,248,0.75)]',
        courtBg: 'border-indigo-400/60 bg-gradient-to-b from-purple-950 via-slate-900 to-black text-indigo-200'
      };
    default:
      return {
        bg: 'bg-gradient-to-b from-[#fffdf9] via-[#faf6f0] to-[#f1eae0] border border-stone-300 shadow-md',
        innerFrame: 'border-stone-300/50',
        fontClass: 'font-sans',
        getSuitColor: (suit: Suit) =>
          suit === 'hearts' || suit === 'diamonds' ? 'text-rose-600' : 'text-slate-900',
        courtBg: 'border-amber-500/40 bg-gradient-to-b from-amber-50/80 via-stone-100/90 to-amber-50/80 text-amber-800/80'
      };
  }
}

/**
 * 5-Petal Sakura Flower SVG Emblem
 */
const SakuraFlowerSvg: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="currentColor">
    {[0, 72, 144, 216, 288].map(deg => (
      <g key={deg} transform={`rotate(${deg} 50 50)`}>
        <path d="M50 46 C38 34, 36 16, 45 9 L50 15 L55 9 C64 16, 62 34, 50 46 Z" />
      </g>
    ))}
    <circle cx="50" cy="50" r="7" className="text-amber-300" fill="currentColor" />
  </svg>
);

export const CardBackSurface: React.FC<{ cardBack?: string; className?: string }> = ({
  cardBack = 'sakura_blossom',
  className = ''
}) => {
  const isSakura = cardBack === 'sakura_blossom';
  const isCyber = cardBack === 'cyber_neon';
  const isGold = cardBack === 'gold_dragon';

  const themeStyles = isSakura
    ? 'bg-gradient-to-br from-[#3b0a28] via-[#1f0726] to-[#0f0318] border-2 border-pink-300/90'
    : isCyber
    ? 'bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-950 border-2 border-cyan-400'
    : isGold
    ? 'bg-gradient-to-br from-amber-900 via-red-950 to-stone-950 border-2 border-amber-400'
    : 'bg-gradient-to-br from-blue-800 via-blue-950 to-slate-950 border-2 border-white/90';

  return (
    <div
      className={`w-full h-full relative select-none overflow-hidden rounded-[inherit] shadow-md ${themeStyles} ${className}`}
    >
      {/* Inner ornate border */}
      <div
        className={`absolute inset-1.5 rounded-lg flex items-center justify-center overflow-hidden border ${
          isSakura ? 'border-pink-300/40' : 'border-white/30'
        }`}
      >
        {/* Geometric lattice pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: isSakura
              ? 'radial-gradient(circle at 50% 50%, rgba(244,114,182,0.35) 1px, transparent 1px), repeating-linear-gradient(45deg, rgba(251,207,232,0.12) 0px, rgba(251,207,232,0.12) 1px, transparent 1px, transparent 7px)'
              : 'repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 2px, transparent 2px, transparent 6px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 2px, transparent 2px, transparent 6px)',
            backgroundSize: isSakura ? '10px 10px, auto' : 'auto'
          }}
        />

        {/* Corner mini accents */}
        <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-current opacity-40 text-pink-200" />
        <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-current opacity-40 text-pink-200" />
        <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-current opacity-40 text-pink-200" />
        <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-current opacity-40 text-pink-200" />

        {/* Central Medallion */}
        <div
          className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center shadow-inner ${
            isSakura
              ? 'border-pink-300/60 bg-pink-950/60 text-pink-300 shadow-[0_0_15px_rgba(244,114,182,0.4)]'
              : 'border-white/40 bg-black/30 text-amber-400'
          }`}
        >
          {isSakura ? (
            <SakuraFlowerSvg className="w-6 h-6 sm:w-7 sm:h-7 text-pink-300" />
          ) : (
            <span className="font-arcade text-xs select-none">P</span>
          )}
        </div>
      </div>

      {/* Subtle Foil Glint */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.06] to-transparent pointer-events-none" />
    </div>
  );
};

export const CardFrontSurface: React.FC<{
  card: Card;
  theme?: TableTheme;
  className?: string;
}> = ({ card, theme = 'traditional', className = '' }) => {
  const themeConfig = getCardThemeConfig(theme);
  const suitColor = themeConfig.getSuitColor(card.suit);
  const suitIcon = SUIT_ICONS[card.suit];
  const isCourt = ['J', 'Q', 'K'].includes(card.symbol);
  const isAce = card.value === 1;
  const isJack = card.value === 11;
  const isHighValueSpecial =
    (card.suit === 'diamonds' && card.value === 10) ||
    (card.suit === 'clubs' && card.value === 2);

  return (
    <div
      className={`w-full h-full relative select-none overflow-hidden rounded-[inherit] ${themeConfig.bg} ${className}`}
    >
      {/* Subtle Inner Ornamental Frame */}
      <div
        className={`absolute inset-1.5 rounded-lg border pointer-events-none ${
          isHighValueSpecial
            ? 'border-amber-400/80 bg-amber-500/15'
            : isJack
            ? 'border-indigo-400/70 bg-indigo-500/10'
            : themeConfig.innerFrame
        }`}
      />

      {/* Top Left Corner Index */}
      <div
        className={`absolute top-1.5 left-2 flex flex-col items-center leading-none z-10 ${suitColor}`}
      >
        <span
          className={`font-black text-sm sm:text-base tracking-tighter ${themeConfig.fontClass}`}
        >
          {card.symbol}
        </span>
        <span className="text-xs sm:text-sm -mt-0.5">{suitIcon}</span>
      </div>

      {/* Center Art / Pip */}
      <div
        className={`absolute inset-0 flex items-center justify-center ${suitColor} pointer-events-none`}
      >
        {isCourt ? (
          <div
            className={`w-12 h-18 sm:w-14 sm:h-22 rounded-lg border flex flex-col items-center justify-between py-1.5 shadow-inner relative overflow-hidden ${themeConfig.courtBg}`}
          >
            <span className="text-[8px] font-black tracking-widest uppercase opacity-80">
              {card.symbol === 'J' ? 'VALE' : card.symbol === 'Q' ? 'KIZ' : 'PAPAZ'}
            </span>
            <span
              className={`text-2xl sm:text-3xl tracking-wider ${themeConfig.fontClass}`}
            >
              {card.symbol}
            </span>
            <span className="text-sm sm:text-base leading-none">{suitIcon}</span>
          </div>
        ) : isAce ? (
          <div className="relative flex items-center justify-center">
            <div className="absolute w-12 h-12 sm:w-14 sm:h-14 rounded-full border border-dashed border-current opacity-25" />
            <span className="text-4xl sm:text-5xl">{suitIcon}</span>
          </div>
        ) : (
          <div className="relative flex flex-col items-center justify-center">
            <span className="text-4xl sm:text-5xl">{suitIcon}</span>
          </div>
        )}
      </div>

      {/* Bottom Right Corner Index (Inverted) */}
      <div
        className={`absolute bottom-1.5 right-2 flex flex-col items-center leading-none rotate-180 z-10 ${suitColor}`}
      >
        <span
          className={`font-black text-sm sm:text-base tracking-tighter ${themeConfig.fontClass}`}
        >
          {card.symbol}
        </span>
        <span className="text-xs sm:text-sm -mt-0.5">{suitIcon}</span>
      </div>

      {/* Subtle Finish Sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/[0.04] via-transparent to-white/40 pointer-events-none rounded-[inherit]" />
    </div>
  );
};

export const CardView: React.FC<CardViewProps> = ({
  card,
  onClick,
  isPlayable = false,
  isOpponent = false,
  isHiddenInFlight = false,
  tiltAngle = 0,
  cardBack = 'sakura_blossom',
  theme = 'traditional',
  size = 'md',
  className = '',
  style
}) => {
  const sizeClasses = CARD_DIMENSIONS[size].classes;
  const showBack = card.devForceFaceUp ? false : (!card.faceUp || isOpponent);
  const origin = Math.abs(tiltAngle) >= 45 ? 'center center' : 'bottom center';

  return (
    <div
      onClick={isPlayable && !isHiddenInFlight ? onClick : undefined}
      style={{
        transform: `rotate(${tiltAngle}deg)`,
        transformOrigin: origin,
        ...style
      }}
      className={`relative select-none shrink-0 ${sizeClasses} ${
        card.devForceFaceUp ? 'ring-2 ring-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)]' : ''
      } ${
        isHiddenInFlight
          ? 'opacity-0 pointer-events-none'
          : isPlayable
          ? 'cursor-pointer transition-transform duration-150 will-change-transform hover:-translate-y-5 hover:scale-105 hover:z-30 hover:shadow-[0_18px_35px_rgba(0,0,0,0.65)] active:scale-95 shadow-[0_8px_20px_rgba(0,0,0,0.45)]'
          : 'cursor-default shadow-[0_6px_16px_rgba(0,0,0,0.45)]'
      } ${className}`}
    >
      {showBack ? (
        <CardBackSurface cardBack={cardBack} />
      ) : (
        <CardFrontSurface card={card} theme={theme} />
      )}
    </div>
  );
};

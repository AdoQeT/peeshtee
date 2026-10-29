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
    case 'estoril_blue':
      return {
        bg: 'bg-gradient-to-b from-[#f0f6ff] via-[#e2edfa] to-[#c9def4] border-2 border-sky-600/70 shadow-[0_4px_14px_rgba(2,132,199,0.25)]',
        innerFrame: 'border-sky-500/35 bg-sky-50/20',
        fontClass: 'font-mono font-black tracking-tight',
        watermarkColor: 'text-sky-600/[0.08]',
        getSuitColor: (suit: Suit) =>
          suit === 'hearts' || suit === 'diamonds'
            ? 'text-[#dc2626] drop-shadow-[0_1px_2px_rgba(220,38,38,0.2)]'
            : 'text-[#0a3560] drop-shadow-[0_1px_2px_rgba(10,53,96,0.2)]',
        courtBg:
          'border-sky-500/60 bg-gradient-to-b from-[#e0effe] via-[#cfe5fc] to-[#bae0fc] text-[#0a3560]'
      };
    case 'alpine_white':
      return {
        bg: 'bg-gradient-to-b from-[#ffffff] via-[#f8fafc] to-[#e2e8f0] border-2 border-slate-300 shadow-[0_4px_14px_rgba(0,0,0,0.18)]',
        innerFrame: 'border-slate-400/40 bg-slate-50/30',
        fontClass: 'font-sans font-black tracking-normal',
        watermarkColor: 'text-slate-400/[0.08]',
        getSuitColor: (suit: Suit) =>
          suit === 'hearts' || suit === 'diamonds'
            ? 'text-[#c2185b] drop-shadow-[0_1px_2px_rgba(194,24,91,0.2)]'
            : 'text-slate-900 drop-shadow-[0_1px_2px_rgba(15,23,42,0.2)]',
        courtBg:
          'border-slate-400/60 bg-gradient-to-b from-white via-slate-100 to-slate-200 text-slate-800'
      };
    case 'melbourne_red':
      return {
        bg: 'bg-gradient-to-b from-[#fff5f5] via-[#ffe8e8] to-[#fecaca] border-2 border-red-500/80 shadow-[0_4px_14px_rgba(220,38,38,0.25)]',
        innerFrame: 'border-red-500/40 bg-red-50/25',
        fontClass: 'font-cyber font-black',
        watermarkColor: 'text-red-500/[0.08]',
        getSuitColor: (suit: Suit) =>
          suit === 'hearts' || suit === 'diamonds'
            ? 'text-[#dc2626] drop-shadow-[0_1px_2px_rgba(220,38,38,0.25)]'
            : 'text-[#18181b] drop-shadow-[0_1px_2px_rgba(24,24,27,0.25)]',
        courtBg:
          'border-red-500/70 bg-gradient-to-b from-red-50 via-red-100 to-red-200 text-[#742a2a]'
      };
    case 'monaco_velvet':
      return {
        bg: 'bg-gradient-to-b from-[#fbfdfa] via-[#f0f7f2] to-[#dcf0e4] border-2 border-emerald-600/80 shadow-[0_4px_14px_rgba(5,150,105,0.25)]',
        innerFrame: 'border-emerald-600/35 bg-emerald-50/20',
        fontClass: 'font-serif font-black',
        watermarkColor: 'text-emerald-600/[0.08]',
        getSuitColor: (suit: Suit) =>
          suit === 'hearts' || suit === 'diamonds'
            ? 'text-[#be123c] drop-shadow-[0_1px_2px_rgba(190,18,60,0.2)]'
            : 'text-[#064e3b] drop-shadow-[0_1px_2px_rgba(6,78,59,0.2)]',
        courtBg:
          'border-emerald-600/60 bg-gradient-to-b from-[#ecfdf5] via-[#d1fae5] to-[#a7f3d0] text-[#064e3b]'
      };
    case 'sakura':
      return {
        bg: 'bg-gradient-to-b from-[#fff5f7] via-[#fce7f3] to-[#fbcfe8] border-2 border-pink-400/80 shadow-[0_4px_14px_rgba(244,114,182,0.25)]',
        innerFrame: 'border-pink-400/40 bg-pink-50/30',
        fontClass: 'font-serif font-bold',
        watermarkColor: 'text-pink-400/[0.08]',
        getSuitColor: (suit: Suit) =>
          suit === 'hearts' || suit === 'diamonds' ? 'text-[#db2777]' : 'text-[#4c0519]',
        courtBg:
          'border-pink-400/60 bg-gradient-to-b from-pink-50 via-pink-100 to-pink-200 text-[#831843]'
      };
    case 'luxury_gold':
      return {
        bg: 'bg-gradient-to-b from-[#fffbeb] via-[#fef3c7] to-[#fde68a] border-2 border-amber-500/80 shadow-[0_4px_14px_rgba(245,158,11,0.3)]',
        innerFrame: 'border-amber-600/40 bg-amber-50/20',
        fontClass: 'font-serif font-bold',
        watermarkColor: 'text-amber-500/[0.08]',
        getSuitColor: (suit: Suit) =>
          suit === 'hearts' || suit === 'diamonds' ? 'text-[#b91c1c]' : 'text-[#451a03]',
        courtBg:
          'border-amber-500/70 bg-gradient-to-b from-amber-100 via-amber-200 to-amber-300 text-[#78350f]'
      };
    case 'traditional':
    default:
      return {
        bg: 'bg-gradient-to-b from-[#fffefa] via-[#faf5ec] to-[#f0e6d6] border-2 border-stone-300 shadow-md',
        innerFrame: 'border-amber-700/25 bg-amber-50/15',
        fontClass: 'font-sans font-bold',
        watermarkColor: 'text-amber-900/[0.05]',
        getSuitColor: (suit: Suit) =>
          suit === 'hearts' || suit === 'diamonds' ? 'text-rose-600' : 'text-slate-900',
        courtBg:
          'border-amber-500/50 bg-gradient-to-b from-amber-100/80 via-stone-100/90 to-amber-50/90 text-amber-900'
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
  cardBack = 'classic_blue',
  className = ''
}) => {
  const isEstoril = cardBack === 'estoril_sport';
  const isAlpine = cardBack === 'alpine_platinum';
  const isMelbourne = cardBack === 'melbourne_speed';
  const isMonaco = cardBack === 'monaco_royal';
  const isSakura = cardBack === 'sakura_blossom';
  const isGold = cardBack === 'gold_dragon';

  const themeStyles = isEstoril
    ? 'bg-gradient-to-br from-[#123e70] via-[#092548] to-[#031124] border-2 border-sky-300/80 shadow-[0_4px_16px_rgba(56,189,248,0.2)]'
    : isAlpine
    ? 'bg-gradient-to-br from-[#f8fafc] via-[#e2e8f0] to-[#cbd5e1] border-2 border-white shadow-[0_4px_16px_rgba(255,255,255,0.4)]'
    : isMelbourne
    ? 'bg-gradient-to-br from-[#8a0e1b] via-[#57050e] to-[#2b0206] border-2 border-red-400/80 shadow-[0_4px_16px_rgba(239,68,68,0.25)]'
    : isMonaco
    ? 'bg-gradient-to-br from-[#0c4028] via-[#062919] to-[#02130b] border-2 border-amber-400/80 shadow-[0_4px_16px_rgba(16,185,129,0.25)]'
    : isSakura
    ? 'bg-gradient-to-br from-[#3b0a28] via-[#1f0726] to-[#0f0318] border-2 border-pink-300/90 shadow-[0_4px_16px_rgba(244,114,182,0.25)]'
    : isGold
    ? 'bg-gradient-to-br from-amber-900 via-stone-900 to-black border-2 border-amber-400 shadow-[0_4px_16px_rgba(245,158,11,0.35)]'
    : 'bg-gradient-to-br from-blue-900 via-slate-900 to-black border-2 border-blue-400/80 shadow-md';

  const innerBorderClass = isEstoril
    ? 'border-sky-300/40 text-sky-200'
    : isAlpine
    ? 'border-slate-400/50 text-slate-700'
    : isMelbourne
    ? 'border-red-300/40 text-amber-300'
    : isMonaco
    ? 'border-amber-400/50 text-amber-300'
    : isSakura
    ? 'border-pink-300/45 text-pink-300'
    : isGold
    ? 'border-amber-400/55 text-amber-300'
    : 'border-blue-300/40 text-blue-200';

  return (
    <div
      className={`w-full h-full relative select-none overflow-hidden rounded-[inherit] shadow-md ${themeStyles} ${className}`}
    >
      {/* Inner ornate border */}
      <div
        className={`absolute inset-1.5 rounded-lg flex items-center justify-center overflow-hidden border ${innerBorderClass}`}
      >
        {/* Geometric lattice pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: isSakura
              ? 'radial-gradient(circle at 50% 50%, rgba(244,114,182,0.35) 1px, transparent 1px), repeating-linear-gradient(45deg, rgba(251,207,232,0.12) 0px, rgba(251,207,232,0.12) 1px, transparent 1px, transparent 7px)'
              : isEstoril
              ? 'repeating-linear-gradient(45deg, rgba(56,189,248,0.2) 0px, rgba(56,189,248,0.2) 1px, transparent 1px, transparent 8px)'
              : isAlpine
              ? 'repeating-linear-gradient(45deg, rgba(71,85,105,0.2) 0px, rgba(71,85,105,0.2) 1px, transparent 1px, transparent 6px), repeating-linear-gradient(-45deg, rgba(71,85,105,0.2) 0px, rgba(71,85,105,0.2) 1px, transparent 1px, transparent 6px)'
              : isMelbourne
              ? 'repeating-linear-gradient(45deg, rgba(239,68,68,0.2) 0px, rgba(239,68,68,0.2) 1px, transparent 1px, transparent 7px)'
              : isMonaco
              ? 'repeating-linear-gradient(45deg, rgba(16,185,129,0.2) 0px, rgba(16,185,129,0.2) 1px, transparent 1px, transparent 8px)'
              : 'repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 2px, transparent 2px, transparent 6px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 2px, transparent 2px, transparent 6px)',
            backgroundSize: isSakura ? '10px 10px, auto' : 'auto'
          }}
        />

        {/* Corner mini accents */}
        <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t border-l border-current opacity-60" />
        <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t border-r border-current opacity-60" />
        <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b border-l border-current opacity-60" />
        <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b border-r border-current opacity-60" />

        {/* Central Medallion */}
        <div
          className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center shadow-inner ${
            isSakura
              ? 'border-pink-300/60 bg-pink-950/60 text-pink-300 shadow-[0_0_15px_rgba(244,114,182,0.4)]'
              : isEstoril
              ? 'border-sky-300/70 bg-sky-950/70 text-sky-200 shadow-[0_0_15px_rgba(56,189,248,0.3)]'
              : isAlpine
              ? 'border-slate-400 bg-white/90 text-slate-800 shadow-sm'
              : isMelbourne
              ? 'border-red-400/80 bg-red-950/70 text-amber-300 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
              : isMonaco
              ? 'border-amber-400/80 bg-emerald-950/80 text-amber-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : isGold
              ? 'border-amber-400/80 bg-amber-950/70 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
              : 'border-blue-300/60 bg-blue-950/70 text-blue-200'
          }`}
        >
          {isSakura ? (
            <SakuraFlowerSvg className="w-6 h-6 sm:w-7 sm:h-7 text-pink-300" />
          ) : isEstoril ? (
            <span className="font-cyber font-black text-xs text-sky-200 select-none">M</span>
          ) : isAlpine ? (
            <span className="font-cyber font-black text-xs text-slate-800 select-none">A</span>
          ) : isMelbourne ? (
            <span className="font-arcade text-xs text-amber-300 select-none">R</span>
          ) : isMonaco ? (
            <span className="text-sm select-none">👑</span>
          ) : isGold ? (
            <span className="text-sm select-none">⚜️</span>
          ) : (
            <span className="font-arcade text-xs select-none">P</span>
          )}
        </div>
      </div>

      {/* Subtle Foil Glint */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.08] to-transparent pointer-events-none" />
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
  const isDiamond10 = card.suit === 'diamonds' && card.value === 10;
  const isClub2 = card.suit === 'clubs' && card.value === 2;
  const isHighValueSpecial = isDiamond10 || isClub2;

  return (
    <div
      className={`w-full h-full relative select-none overflow-hidden rounded-[inherit] ${themeConfig.bg} ${className}`}
    >
      {/* Subtle Inner Ornamental Frame */}
      <div
        className={`absolute inset-1.5 rounded-lg border pointer-events-none ${
          isDiamond10
            ? 'border-amber-400/90 bg-amber-500/15 shadow-[inset_0_0_15px_rgba(245,158,11,0.25)]'
            : isClub2
            ? 'border-emerald-400/85 bg-emerald-500/12 shadow-[inset_0_0_12px_rgba(16,185,129,0.2)]'
            : isJack
            ? 'border-indigo-400/75 bg-indigo-500/10'
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
            className={`w-12 h-[72px] sm:w-14 sm:h-[88px] rounded-lg border flex flex-col items-center justify-between py-1.5 relative overflow-hidden ${themeConfig.courtBg}`}
          >
            <span className="text-[8px] font-black tracking-widest uppercase opacity-90">
              {card.symbol === 'J' ? 'VALE' : card.symbol === 'Q' ? 'KIZ' : 'PAPAZ'}
            </span>
            <span
              className={`text-2xl sm:text-3xl font-black tracking-wider ${themeConfig.fontClass}`}
            >
              {card.symbol}
            </span>
            <span className="text-sm sm:text-base leading-none">{suitIcon}</span>
          </div>
        ) : isAce ? (
          <div className="relative flex items-center justify-center">
            <div className="absolute w-12 h-12 sm:w-15 sm:h-15 rounded-full border-2 border-dashed border-current opacity-30" />
            <span className="text-4xl sm:text-5xl drop-shadow">{suitIcon}</span>
          </div>
        ) : (
          <div className="relative flex flex-col items-center justify-center">
            <span className="text-4xl sm:text-5xl drop-shadow">{suitIcon}</span>
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

      {/* Holographic Sheen for Special Cards & Subtle Finish Sheen */}
      <div
        className={`absolute inset-0 pointer-events-none rounded-[inherit] ${
          isHighValueSpecial || isJack
            ? 'bg-gradient-to-tr from-amber-400/[0.08] via-white/25 to-cyan-300/[0.08]'
            : 'bg-gradient-to-tr from-black/[0.04] via-transparent to-white/35'
        }`}
      />
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
  cardBack = 'classic_blue',
  theme = 'traditional',
  size = 'md',
  className = '',
  style
}) => {
  const sizeClasses = CARD_DIMENSIONS[size].classes;
  const showBack = card.devForceFaceUp ? false : !card.faceUp || isOpponent;
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
          ? 'cursor-pointer transition-all duration-200 will-change-transform hover:-translate-y-4 hover:scale-105 hover:z-30 hover:shadow-[0_20px_35px_rgba(0,0,0,0.65)] active:scale-95 shadow-[0_8px_20px_rgba(0,0,0,0.45)]'
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

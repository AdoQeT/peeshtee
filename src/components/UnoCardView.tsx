import React from 'react';
import { UnoCard, UnoColor } from '../features/uno/unoTypes';

interface UnoCardViewProps {
  card?: UnoCard;
  isBack?: boolean;
  isPlayable?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
  elevation?: number;
}

const COLOR_CLASSES: Record<
  UnoColor,
  {
    cardBg: string;
    textClass: string;
    borderColor: string;
    glowShadow: string;
    badgeBg: string;
  }
> = {
  red: {
    cardBg: 'bg-gradient-to-br from-red-500 via-rose-600 to-red-700',
    textClass: 'text-red-600',
    borderColor: 'border-red-300/80',
    glowShadow: 'shadow-[0_0_20px_rgba(239,68,68,0.65)] ring-red-400',
    badgeBg: 'bg-white'
  },
  blue: {
    cardBg: 'bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700',
    textClass: 'text-blue-600',
    borderColor: 'border-sky-300/80',
    glowShadow: 'shadow-[0_0_20px_rgba(59,130,246,0.65)] ring-sky-400',
    badgeBg: 'bg-white'
  },
  green: {
    cardBg: 'bg-gradient-to-br from-emerald-400 via-green-600 to-teal-700',
    textClass: 'text-emerald-600',
    borderColor: 'border-emerald-300/80',
    glowShadow: 'shadow-[0_0_20px_rgba(16,185,129,0.65)] ring-emerald-400',
    badgeBg: 'bg-white'
  },
  yellow: {
    cardBg: 'bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-500',
    textClass: 'text-amber-500',
    borderColor: 'border-amber-200/90',
    glowShadow: 'shadow-[0_0_20px_rgba(245,158,11,0.7)] ring-amber-300',
    badgeBg: 'bg-white'
  },
  wild: {
    cardBg: 'bg-gradient-to-br from-zinc-900 via-slate-900 to-black',
    textClass: 'text-white',
    borderColor: 'border-purple-400/80',
    glowShadow: 'shadow-[0_0_24px_rgba(168,85,247,0.75)] ring-purple-400',
    badgeBg: 'bg-slate-900'
  }
};

const SIZE_CLASSES = {
  sm: 'w-12 h-[72px] sm:w-14 sm:h-[84px] text-xs rounded-lg',
  md: 'w-20 h-[116px] sm:w-24 sm:h-[140px] text-sm rounded-xl',
  lg: 'w-28 h-[162px] sm:w-32 sm:h-[186px] text-base rounded-2xl'
};

export const UnoCardBack: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string; style?: React.CSSProperties }> = ({
  size = 'md',
  className = '',
  style
}) => {
  const sizeClass = SIZE_CLASSES[size];

  return (
    <div
      style={style}
      className={`relative select-none shrink-0 overflow-hidden rounded-[inherit] bg-gradient-to-br from-neutral-900 via-zinc-950 to-black border-2 border-white/90 shadow-[0_8px_20px_rgba(0,0,0,0.5)] flex items-center justify-center ${sizeClass} ${className}`}
    >
      {/* Outer border groove */}
      <div className="absolute inset-1.5 rounded-lg border border-red-500/60 flex items-center justify-center">
        {/* Angled Red Oval Logo with golden outline */}
        <div className="w-[82%] h-[56%] rounded-full bg-gradient-to-r from-red-600 via-red-500 to-rose-700 border-2 border-amber-300 shadow-md transform -rotate-25 flex items-center justify-center">
          <span className="font-black italic tracking-tighter text-amber-300 text-xs sm:text-base font-sans drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            RENQ
          </span>
        </div>
      </div>
      {/* Holographic foil gloss sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none" />
    </div>
  );
};

export const UnoCardView: React.FC<UnoCardViewProps> = ({
  card,
  isBack = false,
  isPlayable = false,
  onClick,
  size = 'md',
  className = '',
  style
}) => {
  if (isBack || !card) {
    return <UnoCardBack size={size} className={className} style={style} />;
  }

  const theme = COLOR_CLASSES[card.color];
  const sizeClass = SIZE_CLASSES[size];

  const renderSymbol = () => {
    switch (card.value) {
      case 'skip':
        return (
          <div className="flex items-center justify-center">
            <span className="text-2xl sm:text-4xl font-black drop-shadow">🚫</span>
          </div>
        );
      case 'reverse':
        return (
          <div className="flex items-center justify-center text-2xl sm:text-4xl font-black tracking-tight drop-shadow">
            ⇄
          </div>
        );
      case 'draw2':
        return (
          <div className="flex flex-col items-center justify-center leading-none">
            <span className="text-2xl sm:text-4xl font-black font-sans tracking-tighter drop-shadow">
              +2
            </span>
          </div>
        );
      case 'wild':
        return (
          <div className="w-9 h-9 sm:w-13 sm:h-13 rounded-full grid grid-cols-2 grid-rows-2 overflow-hidden shadow-md border-2 border-white/80 transform -rotate-12">
            <div className="bg-red-500" />
            <div className="bg-blue-500" />
            <div className="bg-amber-400" />
            <div className="bg-emerald-500" />
          </div>
        );
      case 'wild_draw4':
        return (
          <div className="flex flex-col items-center justify-center leading-none">
            <span className="text-xl sm:text-3xl font-black font-sans drop-shadow text-white tracking-tighter">
              +4
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full grid grid-cols-2 grid-rows-2 overflow-hidden border border-white/70 shadow mt-0.5 transform -rotate-12">
              <div className="bg-red-500" />
              <div className="bg-blue-500" />
              <div className="bg-amber-400" />
              <div className="bg-emerald-500" />
            </div>
          </div>
        );
      default:
        return (
          <span className="text-3xl sm:text-5xl font-black font-sans tracking-tight drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]">
            {card.value}
          </span>
        );
    }
  };

  const cornerLabel =
    card.value === 'draw2'
      ? '+2'
      : card.value === 'skip'
      ? '🚫'
      : card.value === 'reverse'
      ? '⇄'
      : card.value === 'wild'
      ? '🌈'
      : card.value === 'wild_draw4'
      ? '+4'
      : card.value;

  const colorNames: Record<UnoColor, string> = {
    red: 'Kırmızı',
    blue: 'Mavi',
    green: 'Yeşil',
    yellow: 'Sarı',
    wild: 'Joker'
  };
  const label = `${colorNames[card.color]} ${cornerLabel}`;

  return (
    <div
      role={isPlayable ? 'button' : undefined}
      tabIndex={isPlayable ? 0 : undefined}
      aria-label={label}
      onClick={isPlayable ? e => onClick?.(e) : undefined}
      onKeyDown={
        isPlayable && onClick
          ? (e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={style}
      className={`relative select-none shrink-0 overflow-hidden rounded-[inherit] border-2 shadow-lg transition-all duration-150 ${
        theme.cardBg
      } ${theme.borderColor} ${sizeClass} ${
        isPlayable
          ? `cursor-pointer ring-2 ${theme.glowShadow} hover:brightness-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-300`
          : 'cursor-default opacity-85 brightness-95'
      } ${className}`}
    >
      {/* Outer White Contour Line */}
      <div className="absolute inset-1 rounded-lg border border-white/50 pointer-events-none" />

      {/* Top Left Corner Index */}
      <div className="absolute top-1 left-1.5 leading-none font-black text-white text-[11px] sm:text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] z-10">
        {cornerLabel}
      </div>

      {/* Center Angled Oval Badge */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`w-[82%] h-[68%] rounded-[50%] ${
            card.color === 'wild'
              ? 'bg-gradient-to-br from-slate-900 to-black border-2 border-purple-300/40 shadow-inner'
              : 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]'
          } flex items-center justify-center transform -rotate-25`}
        >
          <div className={`${theme.textClass} transform rotate-25`}>
            {renderSymbol()}
          </div>
        </div>
      </div>

      {/* Bottom Right Inverted Corner Index */}
      <div className="absolute bottom-1 right-1.5 leading-none font-black text-white text-[11px] sm:text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] rotate-180 z-10">
        {cornerLabel}
      </div>

      {/* Premium Glass Glint Highlight */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
    </div>
  );
};

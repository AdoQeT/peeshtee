import React from 'react';
import { UnoCard, UnoColor } from '../features/uno/unoTypes';

interface UnoCardViewProps {
  card?: UnoCard;
  isBack?: boolean;
  isPlayable?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

const COLOR_CLASSES: Record<UnoColor, { cardBg: string; textClass: string; borderColor: string }> = {
  red: {
    cardBg: 'bg-gradient-to-br from-red-500 via-red-600 to-rose-700',
    textClass: 'text-red-600',
    borderColor: 'border-red-400/80'
  },
  blue: {
    cardBg: 'bg-gradient-to-br from-blue-500 via-blue-600 to-sky-700',
    textClass: 'text-blue-600',
    borderColor: 'border-blue-400/80'
  },
  green: {
    cardBg: 'bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700',
    textClass: 'text-emerald-600',
    borderColor: 'border-emerald-400/80'
  },
  yellow: {
    cardBg: 'bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500',
    textClass: 'text-amber-500',
    borderColor: 'border-amber-300'
  },
  wild: {
    cardBg: 'bg-gradient-to-br from-slate-900 via-zinc-900 to-black',
    textClass: 'text-white',
    borderColor: 'border-purple-400/80'
  }
};

const SIZE_CLASSES = {
  sm: 'w-12 h-18 text-xs rounded-lg',
  md: 'w-20 h-28 sm:w-24 sm:h-36 text-sm rounded-xl',
  lg: 'w-28 h-40 sm:w-32 sm:h-48 text-base rounded-2xl'
};

export const UnoCardBack: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = ''
}) => {
  const sizeClass = SIZE_CLASSES[size];

  return (
    <div
      className={`relative select-none shrink-0 overflow-hidden rounded-[inherit] bg-gradient-to-br from-zinc-900 via-black to-slate-950 border-2 border-white/80 shadow-lg flex items-center justify-center ${sizeClass} ${className}`}
    >
      {/* Outer border groove */}
      <div className="absolute inset-1.5 rounded-lg border border-red-500/50 flex items-center justify-center">
        {/* Angled Red Oval Logo */}
        <div className="w-14 sm:w-18 h-8 sm:h-10 rounded-full bg-red-600 border-2 border-amber-400 shadow-md transform -rotate-25 flex items-center justify-center">
          <span className="font-black italic tracking-tighter text-amber-300 text-xs sm:text-base font-sans drop-shadow-md">
            UNO
          </span>
        </div>
      </div>
      {/* Gloss glare */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
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
    return <UnoCardBack size={size} className={className} />;
  }

  const theme = COLOR_CLASSES[card.color];
  const sizeClass = SIZE_CLASSES[size];

  const renderSymbol = () => {
    switch (card.value) {
      case 'skip':
        return <span className="text-xl sm:text-3xl font-black">🚫</span>;
      case 'reverse':
        return <span className="text-xl sm:text-3xl font-black">⇄</span>;
      case 'draw2':
        return <span className="text-xl sm:text-3xl font-black font-sans">+2</span>;
      case 'wild':
        return (
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full grid grid-cols-2 grid-rows-2 overflow-hidden shadow-inner border border-white/50 transform -rotate-12">
            <div className="bg-red-500" />
            <div className="bg-blue-500" />
            <div className="bg-yellow-400" />
            <div className="bg-green-500" />
          </div>
        );
      case 'wild_draw4':
        return (
          <div className="flex flex-col items-center justify-center">
            <span className="text-xl sm:text-2xl font-black font-sans drop-shadow">+4</span>
            <div className="w-6 h-6 rounded-full grid grid-cols-2 grid-rows-2 overflow-hidden border border-white/60 -mt-0.5">
              <div className="bg-red-500" />
              <div className="bg-blue-500" />
              <div className="bg-yellow-400" />
              <div className="bg-green-500" />
            </div>
          </div>
        );
      default:
        return (
          <span className="text-2xl sm:text-4xl font-black font-sans tracking-tight">
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

  return (
    <div
      onClick={isPlayable ? onClick : undefined}
      style={style}
      className={`relative select-none shrink-0 overflow-hidden rounded-[inherit] border-2 shadow-md transition-all duration-150 ${
        theme.cardBg
      } ${theme.borderColor} ${sizeClass} ${
        isPlayable
          ? 'cursor-pointer hover:-translate-y-4 hover:scale-105 active:scale-95 ring-2 ring-emerald-300 shadow-[0_12px_28px_rgba(16,185,129,0.45)]'
          : 'cursor-default opacity-90'
      } ${className}`}
    >
      {/* Outer White Border Line */}
      <div className="absolute inset-1 rounded-lg border border-white/40 pointer-events-none" />

      {/* Top Left Index */}
      <div className="absolute top-1 left-1.5 leading-none font-black text-white text-[11px] sm:text-xs drop-shadow z-10">
        {cornerLabel}
      </div>

      {/* Center White Ellipse Badge */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[78%] h-[68%] rounded-[50%] bg-white/95 shadow-md flex items-center justify-center transform -rotate-25 border border-black/10">
          <div className={`${theme.textClass} transform rotate-25`}>
            {renderSymbol()}
          </div>
        </div>
      </div>

      {/* Bottom Right Inverted Index */}
      <div className="absolute bottom-1 right-1.5 leading-none font-black text-white text-[11px] sm:text-xs drop-shadow rotate-180 z-10">
        {cornerLabel}
      </div>

      {/* Top Foil Glint */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none" />
    </div>
  );
};

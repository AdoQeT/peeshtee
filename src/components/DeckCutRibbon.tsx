import React, { useState, useEffect } from 'react';
import { Scissors, Sparkles } from 'lucide-react';
import { sound } from '../core/audio/soundEngine';

interface DeckCutRibbonProps {
  isOpen: boolean;
  cutterName: string;
  isHumanCutter: boolean;
  onCutDeck: (cutIndex: number) => void;
  cardCount?: number;
}

export const DeckCutRibbon: React.FC<DeckCutRibbonProps> = ({
  isOpen,
  cutterName,
  isHumanCutter,
  onCutDeck,
  cardCount = 52
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isCutting, setIsCutting] = useState(false);

  // If bot is the cutter, automatically pick a cut point after a short delay
  useEffect(() => {
    if (!isOpen || isHumanCutter || isCutting) return;

    const timer = window.setTimeout(() => {
      // Pick a random cut between card 10 and 42
      const randomCut = Math.floor(10 + Math.random() * 32);
      setHoverIndex(randomCut);
      window.setTimeout(() => {
        handleCut(randomCut);
      }, 500);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [isOpen, isHumanCutter, isCutting]);

  if (!isOpen) return null;

  const handleCut = (index: number) => {
    if (isCutting) return;
    setIsCutting(true);
    sound.playClick();
    sound.playCardDeal();

    window.setTimeout(() => {
      onCutDeck(index);
      setIsCutting(false);
      setHoverIndex(null);
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto">
      {/* Informative Header / Instruction */}
      <div className="text-center mb-6 max-w-lg space-y-1.5 animate-in slide-in-from-top-4 duration-300">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-cyber font-black text-xs sm:text-sm tracking-wide shadow-lg">
          <Scissors className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>DESTEYİ KES</span>
        </div>
        <h2 className="text-base sm:text-xl font-black text-white drop-shadow-md">
          {isHumanCutter ? 'Desteden bir karta tıklayarak desteyi ikiye böl!' : `${cutterName} desteyi kesiyor...`}
        </h2>
        <p className="text-[11px] sm:text-xs text-slate-300 max-w-md mx-auto">
          👑 <strong>Geleneksel Kural:</strong> Masaya açılan kart <strong>Vale (J)</strong> olursa kesen oyuncunun olur!
        </p>
      </div>

      {/* Horizontal Ribbon Spread of 52 Cards */}
      <div className="relative w-full max-w-5xl h-36 sm:h-44 flex items-center justify-center px-4 overflow-x-auto no-scrollbar py-4">
        <div className="relative flex items-center justify-center -space-x-12 sm:-space-x-15 min-w-[750px] sm:min-w-[950px]">
          {Array.from({ length: cardCount }).map((_, idx) => {
            const isHovered = hoverIndex === idx;
            const isLeftOfCut = hoverIndex !== null && idx < hoverIndex;
            const isRightOfCut = hoverIndex !== null && idx >= hoverIndex;

            let transform = 'translateY(0px)';
            if (isCutting) {
              if (idx < (hoverIndex || 26)) {
                transform = 'translate3d(-20px, -24px, 0) rotate(-6deg)';
              } else {
                transform = 'translate3d(20px, 24px, 0) rotate(6deg)';
              }
            } else if (isHovered) {
              transform = 'translate3d(0, -22px, 0) scale(1.12)';
            } else if (isLeftOfCut) {
              transform = 'translate3d(-6px, 0, 0)';
            } else if (isRightOfCut) {
              transform = 'translate3d(6px, 0, 0)';
            }

            return (
              <div
                key={idx}
                onMouseEnter={() => {
                  if (isHumanCutter && !isCutting) {
                    setHoverIndex(idx);
                  }
                }}
                onClick={() => {
                  if (isHumanCutter && !isCutting) {
                    handleCut(idx);
                  }
                }}
                style={{
                  transform,
                  zIndex: isHovered ? 60 : idx + 1
                }}
                className={`relative shrink-0 transition-transform duration-200 select-none ${
                  isHumanCutter && !isCutting ? 'cursor-pointer hover:brightness-110 active:scale-95' : 'pointer-events-none'
                }`}
                title={`Kart #${idx + 1}`}
              >
                {/* Scissors Cut Indicator directly above hovered card */}
                {isHovered && !isCutting && (
                  <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-50 px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[10px] whitespace-nowrap shadow-xl flex items-center gap-1 animate-bounce">
                    <Scissors className="w-3 h-3" />
                    <span>Buradan Kes ({idx + 1})</span>
                  </div>
                )}

                {/* 3D Classic Card Back */}
                <div className="w-14 sm:w-16 h-22 sm:h-26 rounded-xl bg-gradient-to-br from-blue-700 via-indigo-900 to-slate-950 border-2 border-white/30 shadow-[0_4px_14px_rgba(0,0,0,0.6)] flex items-center justify-center overflow-hidden">
                  <div className="w-full h-full border border-white/20 rounded-lg flex items-center justify-center p-1 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent">
                    <Sparkles className="w-4 h-4 text-amber-300/40" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Random Cut Button for Human */}
      {isHumanCutter && !isCutting && (
        <button
          onClick={() => {
            const randomIdx = Math.floor(10 + Math.random() * 32);
            handleCut(randomIdx);
          }}
          className="mt-4 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all active:scale-95 cursor-pointer shadow-md flex items-center gap-2"
        >
          <Scissors className="w-3.5 h-3.5 text-amber-400" />
          <span>Ortadan Rastgele Kes</span>
        </button>
      )}
    </div>
  );
};

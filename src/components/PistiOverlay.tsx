import React, { useEffect } from 'react';
import { SlamEvent } from '../types/game';

interface PistiOverlayProps {
  slam: SlamEvent | null;
  onComplete: () => void;
}

export const PistiOverlay: React.FC<PistiOverlayProps> = ({ slam, onComplete }) => {
  useEffect(() => {
    if (!slam) return;

    // Calibrated duration (850ms) perfectly matching the 800ms bannerPop keyframe so the final exit frame is never chopped
    const duration = slam.type === 'five_slam_instant_win' ? 1300 : 850;
    const timer = setTimeout(() => {
      onComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [slam, onComplete]);

  if (!slam) return null;

  const isDouble = slam.type === 'double_pisti';
  const isFiveWin = slam.type === 'five_slam_instant_win';
  const isPisti = slam.type === 'pisti' || isDouble || isFiveWin;
  const isJack = slam.type === 'jack_sweep';

  return (
    <div className="fixed inset-x-0 top-16 sm:top-20 pointer-events-none z-50 flex flex-col items-center justify-start overflow-hidden px-4">
      {/* Subtle Peripheral Screen Flash (leaves center crystal clear) */}
      <div
        className={`fixed inset-0 pointer-events-none transition-opacity duration-200 -z-10 ${
          isFiveWin
            ? 'shadow-[inset_0_0_90px_rgba(239,68,68,0.45)]'
            : isDouble
            ? 'shadow-[inset_0_0_80px_rgba(217,70,239,0.35)]'
            : isPisti
            ? 'shadow-[inset_0_0_80px_rgba(245,158,11,0.35)]'
            : 'shadow-[inset_0_0_60px_rgba(56,189,248,0.25)]'
        }`}
      />

      {/* Floating Arcade Banner (positioned above center pot) */}
      <div onAnimationEnd={onComplete} className="relative flex flex-col items-center animate-banner-pop max-w-md w-full">
        {/* Subtle Player Badge */}
        <div className="mb-1 bg-slate-950/85 border border-white/20 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase text-slate-300 shadow-lg backdrop-blur-md">
          {slam.playerName} Hamlesi!
        </div>

        {/* Slam Notification Content */}
        {isFiveWin ? (
          <div className="flex flex-col items-center text-center px-6 py-2 rounded-2xl bg-slate-950/90 border border-red-500/50 shadow-[0_0_35px_rgba(239,68,68,0.7)] backdrop-blur-md">
            <h1 className="text-3xl sm:text-5xl font-arcade tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-red-500 to-amber-600 drop-shadow-[0_4px_15px_rgba(239,68,68,0.9)]">
              5'E BASTI!
            </h1>
            <span className="text-xs sm:text-sm font-black font-cyber text-amber-300 tracking-widest text-glow-gold mt-0.5">
              🔥 MAÇ ANINDA BİTTİ & KAZANILDI! 🔥
            </span>
          </div>
        ) : isDouble ? (
          <div className="flex flex-col items-center text-center px-6 py-2 rounded-2xl bg-slate-950/90 border border-fuchsia-500/50 shadow-[0_0_30px_rgba(217,70,239,0.6)] backdrop-blur-md">
            <h1 className="text-3xl sm:text-5xl font-arcade tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-fuchsia-400 to-purple-500 drop-shadow-[0_4px_15px_rgba(217,70,239,0.8)]">
              ÇİFT PİŞTİ!
            </h1>
            <span className="text-xs sm:text-sm font-black font-cyber text-amber-300 tracking-widest text-glow-gold">
              +20 PUAN
            </span>
          </div>
        ) : isPisti ? (
          <div className="flex flex-col items-center text-center px-6 py-2 rounded-2xl bg-slate-950/90 border border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.6)] backdrop-blur-md">
            <h1 className="text-3xl sm:text-5xl font-arcade tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-400 to-red-500 drop-shadow-[0_4px_15px_rgba(245,158,11,0.8)]">
              P İ Ş T İ !
            </h1>
            <span className="text-xs sm:text-sm font-black font-cyber text-yellow-300 tracking-widest text-glow-gold">
              +10 PUAN
            </span>
          </div>
        ) : isJack ? (
          <div className="flex flex-col items-center text-center px-5 py-1.5 rounded-2xl bg-slate-950/90 border border-cyan-500/40 shadow-[0_0_25px_rgba(56,189,248,0.5)] backdrop-blur-md">
            <h1 className="text-2xl sm:text-4xl font-arcade tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 via-blue-400 to-indigo-500 drop-shadow-[0_4px_12px_rgba(56,189,248,0.8)]">
              VALE DARBESİ!
            </h1>
            <span className="text-[11px] sm:text-xs font-black font-cyber text-cyan-300 tracking-widest text-glow-cyan">
              MASA TEMİZLENDİ
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center px-4 py-1 rounded-xl bg-slate-950/85 border border-white/20 shadow-md">
            <h1 className="text-xl sm:text-2xl font-arcade tracking-wider text-amber-300">
              EŞLEŞME!
            </h1>
          </div>
        )}
      </div>
    </div>
  );
};

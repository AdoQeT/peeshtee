import React, { useEffect, useState } from 'react';
import { SlamEvent } from '../types/game';
import { getLanguage, onLanguageChange, Language } from '../utils/i18n';

interface PistiOverlayProps {
  slam: SlamEvent | null;
  onComplete: () => void;
}

export const PistiOverlay: React.FC<PistiOverlayProps> = ({ slam, onComplete }) => {
  const [lang, setLang] = useState<Language>(getLanguage());

  useEffect(() => {
    return onLanguageChange(setLang);
  }, []);

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

  const texts = {
    tr: {
      move: `${slam.playerName} Hamlesi!`,
      fiveTitle: "5'E BASTI!",
      fiveSub: '🔥 MAÇ ANINDA BİTTİ & KAZANILDI! 🔥',
      doubleTitle: 'ÇİFT PİŞTİ!',
      doubleSub: '+20 PUAN',
      pistiTitle: 'P İ Ş T İ !',
      pistiSub: '+10 PUAN',
      jackTitle: 'VALE DARBESİ!',
      jackSub: 'MASA TEMİZLENDİ',
      matchTitle: 'EŞLEŞME!'
    },
    en: {
      move: `${slam.playerName}'s Move!`,
      fiveTitle: 'FIVE SLAM!',
      fiveSub: '🔥 INSTANT MATCH WIN! 🔥',
      doubleTitle: 'DOUBLE PİŞTİ!',
      doubleSub: '+20 POINTS',
      pistiTitle: 'P E E S H T E E !',
      pistiSub: '+10 POINTS',
      jackTitle: 'JACK SWEEP!',
      jackSub: 'TABLE CLEARED',
      matchTitle: 'MATCH SWEEP!'
    },
    de: {
      move: `Zug von ${slam.playerName}!`,
      fiveTitle: 'FÜNFER-SCHLAG!',
      fiveSub: '🔥 SOFORTIGER MATCH-SIEG! 🔥',
      doubleTitle: 'DOPPEL-PIŞTI!',
      doubleSub: '+20 PUNKTE',
      pistiTitle: 'P I S C H T I !',
      pistiSub: '+10 PUNKTE',
      jackTitle: 'BUBEN-SCHWUNG!',
      jackSub: 'TISCH GERÄUMT',
      matchTitle: 'TREFFER!'
    },
    es: {
      move: `¡Jugada de ${slam.playerName}!`,
      fiveTitle: '¡GOLPE DE CINCO!',
      fiveSub: '🔥 ¡VICTORIA INSTANTÁNEA! 🔥',
      doubleTitle: '¡DOBLE PİŞTİ!',
      doubleSub: '+20 PUNTOS',
      pistiTitle: '¡ P I S H T I !',
      pistiSub: '+10 PUNTOS',
      jackTitle: '¡BARRIDA DE SOTA!',
      jackSub: 'MESA LIMPIA',
      matchTitle: '¡COINCIDENCIA!'
    }
  }[lang];

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
          {texts.move}
        </div>

        {/* Slam Notification Content */}
        {isFiveWin ? (
          <div className="flex flex-col items-center text-center px-6 py-2 rounded-2xl bg-slate-950/90 border border-red-500/50 shadow-[0_0_35px_rgba(239,68,68,0.7)] backdrop-blur-md">
            <h1 className="text-3xl sm:text-5xl font-arcade tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-red-500 to-amber-600 drop-shadow-[0_4px_15px_rgba(239,68,68,0.9)]">
              {texts.fiveTitle}
            </h1>
            <span className="text-xs sm:text-sm font-black font-cyber text-amber-300 tracking-widest text-glow-gold mt-0.5">
              {texts.fiveSub}
            </span>
          </div>
        ) : isDouble ? (
          <div className="flex flex-col items-center text-center px-6 py-2 rounded-2xl bg-slate-950/90 border border-fuchsia-500/50 shadow-[0_0_30px_rgba(217,70,239,0.6)] backdrop-blur-md">
            <h1 className="text-3xl sm:text-5xl font-arcade tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-fuchsia-400 to-purple-500 drop-shadow-[0_4px_15px_rgba(217,70,239,0.8)]">
              {texts.doubleTitle}
            </h1>
            <span className="text-xs sm:text-sm font-black font-cyber text-amber-300 tracking-widest text-glow-gold">
              {texts.doubleSub}
            </span>
          </div>
        ) : isPisti ? (
          <div className="flex flex-col items-center text-center px-6 py-2 rounded-2xl bg-slate-950/90 border border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.6)] backdrop-blur-md">
            <h1 className="text-3xl sm:text-5xl font-arcade tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-400 to-red-500 drop-shadow-[0_4px_15px_rgba(245,158,11,0.8)]">
              {texts.pistiTitle}
            </h1>
            <span className="text-xs sm:text-sm font-black font-cyber text-yellow-300 tracking-widest text-glow-gold">
              {texts.pistiSub}
            </span>
          </div>
        ) : isJack ? (
          <div className="flex flex-col items-center text-center px-5 py-1.5 rounded-2xl bg-slate-950/90 border border-cyan-500/40 shadow-[0_0_25px_rgba(56,189,248,0.5)] backdrop-blur-md">
            <h1 className="text-2xl sm:text-4xl font-arcade tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 via-blue-400 to-indigo-500 drop-shadow-[0_4px_12px_rgba(56,189,248,0.8)]">
              {texts.jackTitle}
            </h1>
            <span className="text-[11px] sm:text-xs font-black font-cyber text-cyan-300 tracking-widest text-glow-cyan">
              {texts.jackSub}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center px-4 py-1 rounded-xl bg-slate-950/85 border border-white/20 shadow-md">
            <h1 className="text-xl sm:text-2xl font-arcade tracking-wider text-amber-300">
              {texts.matchTitle}
            </h1>
          </div>
        )}
      </div>
    </div>
  );
};

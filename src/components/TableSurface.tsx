import React, { useMemo } from 'react';
import { Card, TableTheme, Player, OnTableCountState } from '../types/game';
import { CardView, CardBackSurface, CardFrontSurface, CARD_DIMENSIONS } from './CardView';
import { AvatarBadge } from './AvatarBadge';
import { Flame, Clock, Sparkles, RotateCcw, Scissors } from 'lucide-react';
import { DetailedRoundScore } from '../core/rules';
import { AmbientParticles } from './AmbientParticles';
import { getAvatarPreset } from '../features/profile/profileManager';
import { cardDomElements } from '../hooks/useCardFlightState';
import { getLanguage, onLanguageChange, translations, Language } from '../utils/i18n';

export interface TableDomRefs {
  deckEl: HTMLDivElement | null;
  potEl: HTMLDivElement | null;
  handEls: (HTMLDivElement | null)[];
  collectedEls: (HTMLDivElement | null)[];
  pistiEls: (HTMLDivElement | null)[];
}

export interface ActiveEmote {
  playerIdx: number;
  emoji: string;
  id: string;
}

export interface RecentCaptureFeedback {
  id: string;
  playerIdx: number;
  isPisti: boolean;
  label: string;
  subLabel?: string;
}

const TableAtmosphere: React.FC<{ theme: TableTheme }> = ({ theme }) => {
  switch (theme) {
    case 'traditional':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
          {/* Casino Grade Card Baize Felt Weave Pattern */}
          <div
            className="absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #fef08a 0, #fef08a 1px, transparent 1px, transparent 6px), repeating-linear-gradient(-45deg, #15803d 0, #15803d 1px, transparent 1px, transparent 6px)'
            }}
          />
          {/* Dual Inlaid Brass Stitched Rail */}
          <div className="absolute inset-2 sm:inset-3 rounded-2xl border-2 border-amber-500/35 shadow-[inset_0_0_30px_rgba(0,0,0,0.65),0_0_15px_rgba(245,158,11,0.15)]" />
          <div className="absolute inset-3.5 sm:inset-5 rounded-xl border border-dashed border-amber-400/20" />

          {/* Classical Turkish Seljuk / Ottoman 8-Point Star Medallion in Center */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.09] pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-80 h-80 sm:w-[26rem] sm:h-[26rem] text-amber-300" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="100" cy="100" r="94" strokeDasharray="4 3" strokeWidth="1" />
              <circle cx="100" cy="100" r="88" strokeWidth="1.5" />
              <circle cx="100" cy="100" r="76" strokeDasharray="2 2" />
              {/* Outer 8-point geometric star */}
              <polygon points="100,24 118,66 162,48 144,92 186,100 144,108 162,152 118,134 100,176 82,134 38,152 56,108 14,100 56,92 38,48 82,66" strokeWidth="1.8" />
              {/* Inner 8-point star */}
              <polygon points="100,42 120,80 160,100 120,120 100,160 80,120 40,100 80,80" strokeWidth="1.2" fill="currentColor" opacity="0.15" />
              <circle cx="100" cy="100" r="28" strokeWidth="1.5" />
              <circle cx="100" cy="100" r="12" fill="currentColor" opacity="0.35" />
            </svg>
          </div>

          {/* Classical Corner Brass Ornaments */}
          <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-amber-400/50 rounded-tl-lg" />
          <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-amber-400/50 rounded-tr-lg" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-amber-400/50 rounded-bl-lg" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-amber-400/50 rounded-br-lg" />

          {/* Central Casino Table Spotlight Highlight */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(254,240,138,0.12)_0%,_transparent_55%)]" />
          {/* Vintage Felt Edge Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_35%,_rgba(2,18,8,0.85)_100%)]" />
        </div>
      );

    case 'sakura':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
          {/* Subtle Japanese Seigaiha / Petal Silk Texture */}
          <div
            className="absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 50%, rgba(244,114,182,0.7) 1.2px, transparent 1.2px), repeating-linear-gradient(45deg, rgba(251,113,133,0.3) 0, rgba(251,113,133,0.3) 1px, transparent 1px, transparent 8px)',
              backgroundSize: '16px 16px, 100% 100%'
            }}
          />
          {/* Rose-Gold Inlaid Border Rail */}
          <div className="absolute inset-2 sm:inset-3 rounded-2xl border-2 border-pink-400/40 shadow-[inset_0_0_30px_rgba(244,114,182,0.2),0_0_18px_rgba(244,114,182,0.15)]" />
          <div className="absolute inset-3.5 sm:inset-5 rounded-xl border border-dashed border-pink-300/25" />

          {/* Corner Sakura Petal Accents */}
          <div className="absolute top-3.5 left-3.5 w-6 h-6 border-t-2 border-l-2 border-pink-400/60 rounded-tl-lg" />
          <div className="absolute top-3.5 right-3.5 w-6 h-6 border-t-2 border-r-2 border-pink-400/60 rounded-tr-lg" />
          <div className="absolute bottom-3.5 left-3.5 w-6 h-6 border-b-2 border-l-2 border-pink-400/60 rounded-bl-lg" />
          <div className="absolute bottom-3.5 right-3.5 w-6 h-6 border-b-2 border-r-2 border-pink-400/60 rounded-br-lg" />

          {/* Central Sacred Sakura Crest Mon */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.12] pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-80 h-80 sm:w-[26rem] sm:h-[26rem] text-pink-300" fill="currentColor">
              <circle cx="100" cy="100" r="94" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 4" />
              <circle cx="100" cy="100" r="84" fill="none" stroke="currentColor" strokeWidth="1.5" />
              {[0, 72, 144, 216, 288].map(deg => (
                <g key={deg} transform={`rotate(${deg} 100 100)`}>
                  <path d="M100 85 C80 52, 75 22, 92 10 L100 20 L108 10 C125 22, 120 52, 100 85 Z" opacity="0.85" />
                </g>
              ))}
              <circle cx="100" cy="100" r="18" fill="currentColor" opacity="0.6" />
            </svg>
          </div>

          {/* Warm Cherry Blossom Center Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(244,114,182,0.14)_0%,_transparent_60%)]" />
          {/* Deep Velvet Edge Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(15,1,18,0.88)_100%)]" />
        </div>
      );

    case 'estoril_blue':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
          {/* High-Tech Carbon Fiber Sport Weave */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #38bdf8 0, #38bdf8 1.5px, transparent 1.5px, transparent 5px), repeating-linear-gradient(-45deg, #0284c7 0, #0284c7 1.5px, transparent 1.5px, transparent 5px)'
            }}
          />

          {/* Dynamic Ambient Electric Pulse Wave */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.22)_0%,_transparent_65%)] animate-estoril-pulse" />

          {/* Aerodynamic Overdrive Neon Laser Rails */}
          <div className="absolute inset-2 sm:inset-3 rounded-2xl p-[2px] estoril-laser-rail opacity-90 shadow-[0_0_30px_rgba(56,189,248,0.45)]">
            <div className="w-full h-full rounded-[inherit] border border-sky-300/50" />
          </div>
          <div className="absolute inset-3.5 sm:inset-5 rounded-xl border border-dashed border-sky-400/40 shadow-[inset_0_0_24px_rgba(14,165,233,0.3)]" />

          {/* Corner Aerodynamic Speed Fins & HUD Accents */}
          <div className="absolute top-3.5 left-3.5 flex items-center gap-1 text-sky-400/90 animate-pulse">
            <div className="w-6 h-6 border-t-2 border-l-2 border-sky-400 rounded-tl-md shadow-[0_0_10px_#38bdf8]" />
            <div className="w-10 h-[2px] bg-gradient-to-r from-sky-400 to-transparent" />
          </div>
          <div className="absolute top-3.5 right-3.5 flex items-center gap-1 text-sky-400/90 animate-pulse">
            <div className="w-10 h-[2px] bg-gradient-to-l from-sky-400 to-transparent" />
            <div className="w-6 h-6 border-t-2 border-r-2 border-sky-400 rounded-tr-md shadow-[0_0_10px_#38bdf8]" />
          </div>
          <div className="absolute bottom-3.5 left-3.5 flex items-center gap-1 text-sky-400/90 animate-pulse">
            <div className="w-6 h-6 border-b-2 border-l-2 border-sky-400 rounded-bl-md shadow-[0_0_10px_#38bdf8]" />
            <div className="w-10 h-[2px] bg-gradient-to-r from-sky-400 to-transparent" />
          </div>
          <div className="absolute bottom-3.5 right-3.5 flex items-center gap-1 text-sky-400/90 animate-pulse">
            <div className="w-10 h-[2px] bg-gradient-to-l from-sky-400 to-transparent" />
            <div className="w-6 h-6 border-b-2 border-r-2 border-sky-400 rounded-br-md shadow-[0_0_10px_#38bdf8]" />
          </div>

          {/* Central Estoril M-Power Animated Tachometer / Racing Crest */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.20] pointer-events-none">
            {/* Outer Slow Rotating Energy Dial */}
            <svg viewBox="0 0 200 200" className="w-80 h-80 sm:w-[28rem] sm:h-[28rem] text-sky-400 animate-estoril-spin" fill="none" stroke="currentColor">
              <circle cx="100" cy="100" r="92" strokeWidth="1.8" strokeDasharray="8 6" />
              <circle cx="100" cy="100" r="82" strokeWidth="1.2" strokeDasharray="3 4" />
            </svg>

            {/* Inner Counter-Rotating Hex Speed Lattice */}
            <svg viewBox="0 0 200 200" className="absolute w-72 h-72 sm:w-96 sm:h-96 text-sky-300 animate-estoril-spin-reverse" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="100,18 175,55 175,145 100,182 25,145 25,55" strokeWidth="2.2" strokeDasharray="12 4" />
              <polygon points="100,34 158,64 158,136 100,166 42,136 42,64" strokeWidth="1.2" />
            </svg>

            {/* Core Speed HUD Needle & Bullseye */}
            <div className="absolute w-28 h-28 rounded-full border-2 border-sky-300/70 shadow-[0_0_35px_rgba(56,189,248,0.6)] flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-sky-300 shadow-[0_0_18px_#38bdf8]" />
            </div>
          </div>

          {/* Deep Sapphire Edge Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_38%,_rgba(2,9,20,0.92)_100%)]" />
        </div>
      );

    case 'alpine_white':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
          {/* Luxury White Marble / Swiss Platinum Silk Weave */}
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 50%, #94a3b8 1.2px, transparent 1.2px), repeating-linear-gradient(45deg, #64748b 0, #64748b 1px, transparent 1px, transparent 8px)'
            }}
          />
          {/* Brushed Platinum & Prismatic Titanium Dual Rail */}
          <div className="absolute inset-2 sm:inset-3 rounded-2xl border-2 border-slate-300/60 shadow-[inset_0_0_25px_rgba(255,255,255,0.1),0_0_15px_rgba(203,213,225,0.2)]" />
          <div className="absolute inset-3.5 sm:inset-5 rounded-xl border border-dashed border-slate-400/35" />

          {/* Minimal Platinum Corner Brackets */}
          <div className="absolute top-3.5 left-3.5 w-6 h-6 border-t-2 border-l-2 border-slate-300/80 rounded-tl-md shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
          <div className="absolute top-3.5 right-3.5 w-6 h-6 border-t-2 border-r-2 border-slate-300/80 rounded-tr-md shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
          <div className="absolute bottom-3.5 left-3.5 w-6 h-6 border-b-2 border-l-2 border-slate-300/80 rounded-bl-md shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
          <div className="absolute bottom-3.5 right-3.5 w-6 h-6 border-b-2 border-r-2 border-slate-300/80 rounded-br-md shadow-[0_0_8px_rgba(255,255,255,0.4)]" />

          {/* Central Alpine Platinum Diamond Monogram */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.11] pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-80 h-80 sm:w-[26rem] sm:h-[26rem] text-slate-200" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="100,20 180,100 100,180 20,100" strokeWidth="2.2" strokeDasharray="4 2" />
              <polygon points="100,38 162,100 100,162 38,100" strokeWidth="1.4" />
              <circle cx="100" cy="100" r="34" strokeWidth="1.5" />
              <circle cx="100" cy="100" r="14" fill="currentColor" opacity="0.4" />
            </svg>
          </div>

          {/* Prismatic Ice Glow Center */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(241,245,249,0.12)_0%,_transparent_55%)]" />
          {/* Soft Anthracite Edge Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_44%,_rgba(15,23,42,0.85)_100%)]" />
        </div>
      );

    case 'melbourne_red':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
          {/* Melbourne Sport Red Honeycomb Diamond Weave */}
          <div
            className="absolute inset-0 opacity-[0.055]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #f87171 0, #f87171 1.2px, transparent 1.2px, transparent 6px), repeating-linear-gradient(-45deg, #dc2626 0, #dc2626 1.2px, transparent 1.2px, transparent 6px)'
            }}
          />
          {/* Metallic Bronze & Crimson Inlay Rail */}
          <div className="absolute inset-2 sm:inset-3 rounded-2xl border-2 border-red-500/50 shadow-[inset_0_0_28px_rgba(220,38,38,0.25),0_0_18px_rgba(239,68,68,0.2)]" />
          <div className="absolute inset-3.5 sm:inset-5 rounded-xl border border-dashed border-red-400/35" />

          {/* Dynamic Corner Speed Fins */}
          <div className="absolute top-3.5 left-3.5 w-6 h-6 border-t-2 border-l-2 border-amber-400/70 rounded-tl-md shadow-[0_0_8px_#f59e0b]" />
          <div className="absolute top-3.5 right-3.5 w-6 h-6 border-t-2 border-r-2 border-amber-400/70 rounded-tr-md shadow-[0_0_8px_#f59e0b]" />
          <div className="absolute bottom-3.5 left-3.5 w-6 h-6 border-b-2 border-l-2 border-amber-400/70 rounded-bl-md shadow-[0_0_8px_#f59e0b]" />
          <div className="absolute bottom-3.5 right-3.5 w-6 h-6 border-b-2 border-r-2 border-amber-400/70 rounded-br-md shadow-[0_0_8px_#f59e0b]" />

          {/* Central Melbourne Speed Emblem */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.13] pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-80 h-80 sm:w-[26rem] sm:h-[26rem] text-red-300" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="100" cy="100" r="90" strokeWidth="2.2" strokeDasharray="5 3" />
              <polygon points="100,26 174,70 174,130 100,174 26,130 26,70" strokeWidth="1.8" />
              <circle cx="100" cy="100" r="32" strokeWidth="1.5" />
              <polygon points="100,52 128,122 72,122" fill="currentColor" opacity="0.5" />
            </svg>
          </div>

          {/* Fiery Center Radial Spotlight */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.16)_0%,_transparent_60%)]" />
          {/* Deep Crimson Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_38%,_rgba(15,2,4,0.92)_100%)]" />
        </div>
      );

    case 'luxury_gold':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
          {/* Fine Cognac Damask / Handcrafted Leather Grain */}
          <div
            className="absolute inset-0 opacity-[0.055]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(30deg, #d97706 0, #d97706 1.2px, transparent 1.2px, transparent 7px), repeating-linear-gradient(-30deg, #d97706 0, #d97706 1.2px, transparent 1.2px, transparent 7px)'
            }}
          />
          {/* 24k Beveled Gold Double Rail */}
          <div className="absolute inset-2 sm:inset-3 rounded-2xl border-2 border-amber-400/55 shadow-[inset_0_0_35px_rgba(245,158,11,0.25),0_0_20px_rgba(245,158,11,0.2)]" />
          <div className="absolute inset-3.5 sm:inset-5 rounded-xl border border-dashed border-amber-300/35" />

          {/* Corner Baroque Flourish Accents */}
          <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-amber-400/70 rounded-tl-lg shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
          <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-amber-400/70 rounded-tr-lg shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
          <div className="absolute bottom-4 left-4 w-7 h-7 border-b-2 border-l-2 border-amber-400/70 rounded-bl-lg shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
          <div className="absolute bottom-4 right-4 w-7 h-7 border-b-2 border-r-2 border-amber-400/70 rounded-br-lg shadow-[0_0_8px_rgba(245,158,11,0.4)]" />

          {/* Central Casino Royale Medallion */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.13] pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-80 h-80 sm:w-[26rem] sm:h-[26rem] text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="100" cy="100" r="94" strokeWidth="2.8" />
              <circle cx="100" cy="100" r="84" strokeDasharray="4 2" strokeWidth="1.5" />
              <circle cx="100" cy="100" r="68" strokeWidth="1.5" />
              {/* Crown Emblem in center */}
              <path d="M80 115 L74 90 L88 98 L100 84 L112 98 L126 90 L120 115 Z" fill="currentColor" opacity="0.8" />
              <rect x="78" y="118" width="44" height="6" rx="2" fill="currentColor" opacity="0.9" />
              <circle cx="74" cy="88" r="2.8" fill="currentColor" />
              <circle cx="100" cy="82" r="3.2" fill="currentColor" />
              <circle cx="126" cy="88" r="2.8" fill="currentColor" />
            </svg>
          </div>

          {/* Warm Golden Amber Center Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(245,158,11,0.15)_0%,_transparent_55%)]" />
          {/* Warm Cognac Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(12,4,6,0.92)_100%)]" />
        </div>
      );

    case 'monaco_velvet':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
          {/* Royal Midnight Purple & Imperial Gold Luxury Velvet Weave */}
          <div
            className="absolute inset-0 opacity-[0.065]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 50%, #fbbf24 1.2px, transparent 1.2px), repeating-linear-gradient(45deg, #a855f7 0, #a855f7 1px, transparent 1px, transparent 8px)'
            }}
          />
          {/* Monte Carlo Royale 24K Inlaid Gold Rail */}
          <div className="absolute inset-2 sm:inset-3 rounded-2xl border-2 border-amber-400/70 shadow-[inset_0_0_35px_rgba(245,158,11,0.3),0_0_22px_rgba(245,158,11,0.25)]" />
          <div className="absolute inset-3.5 sm:inset-5 rounded-xl border border-dashed border-amber-300/45" />

          {/* Corner Baroque Gold Accents */}
          <div className="absolute top-3.5 left-3.5 w-7 h-7 border-t-2 border-l-2 border-amber-400/90 rounded-tl-lg shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
          <div className="absolute top-3.5 right-3.5 w-7 h-7 border-t-2 border-r-2 border-amber-400/90 rounded-tr-lg shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
          <div className="absolute bottom-3.5 left-3.5 w-7 h-7 border-b-2 border-l-2 border-amber-400/90 rounded-bl-lg shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
          <div className="absolute bottom-3.5 right-3.5 w-7 h-7 border-b-2 border-r-2 border-amber-400/90 rounded-br-lg shadow-[0_0_10px_rgba(245,158,11,0.5)]" />

          {/* Central Casino Royale Fleur-de-Lis Gold Crest */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.18] pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-80 h-80 sm:w-[26rem] sm:h-[26rem] text-amber-300" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="100" cy="100" r="92" strokeDasharray="4 3" strokeWidth="2.2" />
              <circle cx="100" cy="100" r="76" strokeWidth="1.5" />
              <polygon points="100,32 118,78 168,78 128,108 144,158 100,128 56,158 72,108 32,78 82,78" fill="currentColor" opacity="0.75" />
              <circle cx="100" cy="100" r="22" strokeWidth="2" />
            </svg>
          </div>

          {/* Royal Purple Center Specular Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.18)_0%,_transparent_55%)]" />
          {/* Deep Royal Midnight Purple Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_38%,_rgba(10,2,20,0.96)_100%)]" />
        </div>
      );
  }
};

export interface SlotReadinessInfo {
  seatIndex: number;
  name: string;
  isReady: boolean;
  isAI: boolean;
}

export const RoleChip: React.FC<{ role: 'dealer' | 'cutter'; className?: string }> = () => {
  return null;
};

interface TableSurfaceProps {
  theme: TableTheme;
  cardBack: string;
  tableCards: Card[];
  players: Player[];
  currentTurn: number;
  deckCount: number;
  dealerIndex?: number;
  cutterIndex?: number;
  isBusy: boolean;
  isShuffling: boolean;
  hiddenCardIds?: Set<string>;
  recentCapture?: RecentCaptureFeedback | null;
  turnTimeRemaining: number; // 0 to 15 seconds (Multiplayer only)
  isMultiplayer?: boolean;
  activeEmotes?: ActiveEmote[];
  onSendEmote?: (emoji: string) => void;
  onTableCountState?: OnTableCountState | null;
  onSkipCounting?: () => void;
  onToggleFastCounting?: () => void;
  onFinishCounting?: () => void;
  tableRefs: React.MutableRefObject<TableDomRefs>;
  onPlayCard: (card: Card, rect: DOMRect, tiltAngle: number) => void;

  // Dev peek & On-table Round/Game Over controls
  devSeeAllHands?: boolean;
  isGameOver?: boolean;
  gameOverWinner?: Player | null;
  roundScores?: {
    user: DetailedRoundScore;
    opp: DetailedRoundScore;
    winner: Player | null;
    isGameOver: boolean;
  } | null;
  onNextRound?: () => void;
  onRestartGame?: () => void;
  onExitToMenu?: () => void;
  isReadyForNextRound?: boolean;
  readySeatsCount?: number;
  totalHumanPlayersCount?: number;
  slotsReadiness?: SlotReadinessInfo[];
  onToggleReady?: () => void;

  // In-table physical deck cut
  deckCutState?: {
    isActive: boolean;
    cutterSeat: number;
    cutterName: string;
    isHumanCutter: boolean;
    step: 'waiting_cut' | 'splitting' | 'dealing_pot' | 'merging' | 'stowing';
    cutIndex?: number;
    pileACount: number;
    pileBCount: number;
    revealedJackCards?: Card[];
  } | null;
  onCutDeck?: (cutIndex: number) => void;
}

export const TableSurface: React.FC<TableSurfaceProps> = ({
  theme,
  cardBack,
  tableCards,
  players,
  currentTurn,
  deckCount,
  dealerIndex = -1,
  cutterIndex = -1,
  isBusy,
  isShuffling,
  hiddenCardIds,
  recentCapture: _recentCapture,
  turnTimeRemaining,
  isMultiplayer = false,
  activeEmotes,
  onSendEmote,
  onTableCountState = null,
  onSkipCounting: _onSkipCounting,
  onToggleFastCounting: _onToggleFastCounting,
  onFinishCounting: _onFinishCounting,
  tableRefs,
  onPlayCard,
  devSeeAllHands = false,
  isGameOver = false,
  gameOverWinner = null,
  roundScores: _roundScores = null,
  onNextRound: _onNextRound,
  onRestartGame,
  onExitToMenu,
  isReadyForNextRound: _isReadyForNextRound = false,
  readySeatsCount: _readySeatsCount = 0,
  totalHumanPlayersCount: _totalHumanPlayersCount = 0,
  slotsReadiness: _slotsReadiness = [],
  onToggleReady: _onToggleReady,
  deckCutState = null,
  onCutDeck
}) => {
  const [lang, setLang] = React.useState<Language>(getLanguage());
  React.useEffect(() => {
    return onLanguageChange(setLang);
  }, []);
  const t = translations[lang];

  const [showEmotePicker, setShowEmotePicker] = React.useState(false);
  const [hoveredHandCardId, setHoveredHandCardId] = React.useState<string | null>(null);
  const [hoveredCutIndex, setHoveredCutIndex] = React.useState<number | null>(null);
  const [isSpread, setIsSpread] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (deckCutState?.isActive && deckCutState.step === 'waiting_cut') {
      const timer = window.setTimeout(() => setIsSpread(true), 60);
      return () => window.clearTimeout(timer);
    } else if (!deckCutState?.isActive) {
      setIsSpread(false);
    }
  }, [deckCutState?.isActive, deckCutState?.step]);
  const isFourPlayers = players.length === 4;
  const user = players[0];
  const isCountingActive = Boolean(onTableCountState?.isActive || onTableCountState?.isDone);
  const isPlayerTurn = currentTurn === 0 && !isBusy && !isCountingActive;

  // Visible table cards (excluding cards currently in mid-air flight to the pot)
  const visibleTableCards = useMemo(
    () => tableCards.filter(c => !hiddenCardIds?.has(c.id)),
    [tableCards, hiddenCardIds]
  );

  const topVisibleTableCard =
    visibleTableCards.length > 0 ? visibleTableCards[visibleTableCards.length - 1] : null;

  const hoveredHandCard = useMemo(
    () => user.hand.find(c => c.id === hoveredHandCardId) || null,
    [user.hand, hoveredHandCardId]
  );

  const isHoveredCardCapturing = Boolean(
    isPlayerTurn &&
      topVisibleTableCard &&
      hoveredHandCard &&
      (hoveredHandCard.value === topVisibleTableCard.value || hoveredHandCard.value === 11)
  );

  const isSingleCardPistiChance =
    !isCountingActive &&
    !isShuffling &&
    visibleTableCards.length === 1 &&
    visibleTableCards[0].faceUp;

  const getThemeBg = () => {
    switch (theme) {
      case 'sakura':
        return 'bg-[#0f0212] bg-[radial-gradient(ellipse_at_center,_#4a0e38_0%,_#220627_50%,_#09010b_100%)] border-pink-500/70 shadow-[inset_0_0_140px_rgba(244,114,182,0.25),0_0_45px_rgba(244,114,182,0.2),0_25px_70px_rgba(0,0,0,0.95)]';
      case 'estoril_blue':
        return 'bg-[#020b17] bg-[radial-gradient(ellipse_at_center,_#12589e_0%,_#07284f_48%,_#01060f_100%)] border-sky-400/80 shadow-[inset_0_0_150px_rgba(14,165,233,0.45),0_0_55px_rgba(56,189,248,0.3),0_25px_70px_rgba(0,0,0,0.98)]';
      case 'alpine_white':
        return 'bg-[#12161f] bg-[radial-gradient(ellipse_at_center,_#404c5c_0%,_#222a38_50%,_#0a0d12_100%)] border-slate-200/70 shadow-[inset_0_0_130px_rgba(255,255,255,0.12),0_0_40px_rgba(203,213,225,0.18),0_25px_70px_rgba(0,0,0,0.92)]';
      case 'melbourne_red':
        return 'bg-[#170305] bg-[radial-gradient(ellipse_at_center,_#6e0d19_0%,_#36060c_50%,_#0a0102_100%)] border-red-500/70 shadow-[inset_0_0_140px_rgba(220,38,38,0.35),0_0_45px_rgba(239,68,68,0.25),0_25px_70px_rgba(0,0,0,0.95)]';
      case 'monaco_velvet':
        return 'bg-[#10021c] bg-[radial-gradient(ellipse_at_center,_#510b8c_0%,_#2e0652_52%,_#080111_100%)] border-amber-400/80 shadow-[inset_0_0_150px_rgba(245,158,11,0.38),0_0_50px_rgba(168,85,247,0.3),0_25px_70px_rgba(0,0,0,0.98)]';
      case 'luxury_gold':
        return 'bg-[#120507] bg-[radial-gradient(ellipse_at_center,_#522013_0%,_#260d13_55%,_#060203_100%)] border-amber-400/80 shadow-[inset_0_0_150px_rgba(245,158,11,0.32),0_0_45px_rgba(245,158,11,0.25),0_25px_70px_rgba(0,0,0,0.95)]';
      case 'traditional':
      default:
        return 'bg-[#041c13] bg-[radial-gradient(ellipse_at_center,_#12593d_0%,_#093827_52%,_#02130d_100%)] border-amber-700/70 shadow-[inset_0_0_150px_rgba(0,0,0,0.92),0_0_40px_rgba(245,158,11,0.2),0_25px_70px_rgba(0,0,0,0.95)]';
    }
  };

  const handleCardClick = (
    card: Card,
    tiltAngle: number,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!isPlayerTurn) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onPlayCard(card, rect, tiltAngle);
  };

  // 1. Regular Collected Cards Pile (Toplanan Normal Kartlar)
  // During On-Table Counting: shows shrinking closed stack + 3D flipping face-up counted pile + Point Cards Showcase!
  const renderCollectedPile = (
    player: Player,
    playerIdx: number,
    _labelPos: 'top' | 'bottom' = 'bottom',
    compact: boolean = false
  ) => {
    const teamUserCounted = onTableCountState?.userCountedIndex ?? 0;
    const teamOppCounted = onTableCountState?.oppCountedIndex ?? 0;
    const rivalMainIdx = 1;
    const count = !isCountingActive
      ? player.collectedCards.length
      : playerIdx === 0
      ? Math.max(
          0,
          (onTableCountState?.userTotal ?? player.collectedCards.length) - teamUserCounted
        )
      : playerIdx === rivalMainIdx
      ? Math.max(
          0,
          (onTableCountState?.oppTotal ?? player.collectedCards.length) - teamOppCounted
        )
      : 0;
    const visibleLayers = Math.min(18, Math.max(count > 0 ? 1 : 0, Math.ceil(count / 2.2)));

    const isSideSeat = isFourPlayers && (playerIdx === 1 || playerIdx === 3);
    const sideRotDeg = playerIdx === 3 ? 90 : playerIdx === 1 ? -90 : 0;
    const boxSize = compact || isSideSeat
      ? 'w-[64px] h-[92px] sm:w-[70px] sm:h-[100px]'
      : 'w-[88px] h-[128px] sm:w-24 sm:h-36';

    return (
      <div className="relative flex items-center justify-center">
        <div
          ref={el => {
            tableRefs.current.collectedEls[playerIdx] = el;
          }}
          className={`relative flex items-center justify-center ${boxSize} rounded-xl shrink-0 transition-transform duration-200`}
        >
          {count > 0 && (
            <div
              className="relative w-full h-full"
              style={isSideSeat ? { transform: `rotate(${sideRotDeg}deg)` } : undefined}
            >
              {Array.from({ length: visibleLayers }).map((_, layerIdx) => {
                const jitterRot = ((layerIdx * 17) % 11) - 5;
                const jitterX = ((layerIdx * 13) % 7) - 3;
                const jitterY = layerIdx * -1.2;

                return (
                  <div
                    key={layerIdx}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      transform: `translate3d(${jitterX}px, ${jitterY}px, 0) rotate(${jitterRot}deg)`
                    }}
                    className="rounded-lg shadow-md"
                  >
                    <CardBackSurface cardBack={cardBack} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 2. Separate Crossed 90-Degree Pişti Stack (Tersli Düzlü 90 Derece Pişti Yığını!)
  // Bottom card face-down (ters, 0°), top card face-up (düz, 90° crossed facing us!)
  const renderPistiPile = (
    player: Player,
    playerIdx: number,
    labelPos: 'top' | 'bottom' = 'bottom',
    compact: boolean = false
  ) => {
    const totalPistiCount = isCountingActive
      ? 0
      : (player.pistiCount || 0) + (player.doublePistiCount || 0);
    const pistiCount = totalPistiCount;
    const pairs = isCountingActive ? [] : player.pistiPairs || [];
    const visiblePairs = pairs.slice(-8);

    const isSideSeat = isFourPlayers && (playerIdx === 1 || playerIdx === 3);
    const sideRotDeg = playerIdx === 3 ? 90 : playerIdx === 1 ? -90 : 0;
    const boxSize = compact || isSideSeat
      ? 'w-[64px] h-[92px] sm:w-[70px] sm:h-[100px]'
      : 'w-[88px] h-[128px] sm:w-24 sm:h-36';

    return (
      <div
        ref={el => {
          tableRefs.current.pistiEls[playerIdx] = el;
        }}
        className={`relative flex flex-col items-center justify-center ${boxSize} rounded-xl shrink-0 transition-transform duration-200`}
        title={pistiCount > 0 ? `${player.name} Pişti: ${pistiCount}` : undefined}
      >
        {pistiCount > 0 && (
          <div
            className="relative w-full h-full flex items-center justify-center"
            style={isSideSeat ? { transform: `rotate(${sideRotDeg}deg)` } : undefined}
          >
            {visiblePairs.map((pair, pairIdx) => {
              const count = visiblePairs.length;
              const offset = pairIdx - (count - 1);
              const xShift = offset * 7;
              const yShift = offset * -2;
              const rot = (pairIdx % 2 === 0 ? 1 : -1) * (2 + Math.min(pairIdx * 1.5, 8));

              return (
                <div
                  key={pairIdx}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    transform: `translate3d(${xShift}px, ${yShift}px, 0) rotate(${rot}deg)`,
                    zIndex: pairIdx + 1
                  }}
                  className="rounded-lg shadow-xl border border-amber-400/80 overflow-hidden pointer-events-none"
                >
                  <CardFrontSurface card={pair.topCard} theme={theme} />
                </div>
              );
            })}
          </div>
        )}

        {pistiCount > 0 && (
          <div
            className={`absolute ${
              labelPos === 'bottom' ? '-bottom-3.5' : '-top-3.5'
            } bg-amber-500 border border-amber-200 text-slate-950 text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-0.5 whitespace-nowrap z-20`}
          >
            <Flame className="w-2.5 h-2.5 fill-slate-950" />
            <span>
              {pistiCount} Pişti
              {player.doublePistiCount > 0 ? ` (${player.doublePistiCount} ${t.doubleLabel})` : ''}
            </span>
          </div>
        )}
      </div>
    );
  };

  const topOpponentIdx = isFourPlayers ? 2 : 1;
  const topOpponent = players[topOpponentIdx] || players[1];

  return (
    <div
      className={`relative flex-1 w-full max-w-6xl mx-auto flex flex-col justify-between items-center py-2 sm:py-3 px-2 sm:px-6 select-none rounded-3xl border-4 shadow-[inset_0_0_80px_rgba(0,0,0,0.75),0_25px_60px_rgba(0,0,0,0.8)] transition-colors duration-500 ${getThemeBg()}`}
    >
      {/* Keyframes for On-Table 3D Card Count Flip & Emote Pop */}
      <style>{`
        @keyframes cardCountFlip {
          0% {
            transform: perspective(900px) rotateY(140deg) translateY(-8px) scale(1.12);
            opacity: 0.3;
          }
          65% {
            transform: perspective(900px) rotateY(-3deg) translateY(-2px) scale(1.03);
            opacity: 1;
          }
          100% {
            transform: perspective(900px) rotateY(0deg) translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes emotePop2s {
          0% {
            transform: translate(-50%, 8px) scale(0.4);
            opacity: 0;
          }
          14% {
            transform: translate(-50%, -6px) scale(1.18);
            opacity: 1;
          }
          24% {
            transform: translate(-50%, -4px) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -8px) scale(1.03);
            opacity: 1;
          }
          80% {
            transform: translate(-50%, -5px) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -22px) scale(0.8);
            opacity: 0;
          }
        }
      `}</style>

      {/* Enriched Theme Atmosphere, Felt Textures & Ambient Watermarks */}
      <TableAtmosphere theme={theme} />

      {/* Dynamic 60/120 FPS Ambient Particles Motor */}
      <AmbientParticles theme={theme} intensity="dense" />

      {/* =========================================================
          0. EXTERNAL PERIMETER PLAYER PROFILE BANNERS (Outside Table Edge)
         ========================================================= */}
      {/* Top Player External Banner */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <span
          className={`text-xs font-bold px-3 py-1 rounded-full border-2 transition-colors flex items-center gap-1.5 shadow-xl whitespace-nowrap ${
            currentTurn === topOpponentIdx && !isCountingActive
              ? isFourPlayers
                ? 'bg-emerald-950/95 text-emerald-300 border-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.45)]'
                : 'bg-rose-950/95 text-rose-300 border-rose-400 shadow-[0_0_16px_rgba(251,113,133,0.45)]'
              : 'bg-slate-950/95 text-slate-200 border-white/20'
          }`}
        >
          <AvatarBadge
            avatarId={topOpponent.avatarId}
            customAvatarUrl={topOpponent.customAvatarUrl}
            fallbackEmoji={topOpponent.avatar}
            size="xs"
            showBorder={false}
          />
          {dealerIndex === topOpponentIdx && <RoleChip role="dealer" />}
          {cutterIndex === topOpponentIdx && <RoleChip role="cutter" />}
          <span>{topOpponent.name}</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30 truncate max-w-[110px]">
            {topOpponent.customTitle || getAvatarPreset(topOpponent.avatarId || 'wolf').title}
          </span>
          {isFourPlayers && (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/40">
              {t.yourPartner}
            </span>
          )}
        </span>
      </div>

      {/* Bottom User External Banner */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <span
          className={`text-xs font-bold px-3 py-1 rounded-full border-2 transition-colors flex items-center gap-1.5 shadow-xl whitespace-nowrap ${
            currentTurn === 0 && !isCountingActive
              ? 'bg-emerald-950/95 text-emerald-300 border-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.45)]'
              : 'bg-slate-950/95 text-slate-200 border-white/20'
          }`}
        >
          <AvatarBadge
            avatarId={user.avatarId || 'wolf'}
            customAvatarUrl={user.customAvatarUrl}
            fallbackEmoji={user.avatar}
            size="xs"
            showBorder={false}
          />
          {dealerIndex === 0 && <RoleChip role="dealer" />}
          {cutterIndex === 0 && <RoleChip role="cutter" />}
          <span>{user.name}</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30 truncate max-w-[110px]">
            {user.customTitle || getAvatarPreset(user.avatarId || 'wolf').title}
          </span>
        </span>
      </div>

      {/* Left Player External Horizontal Banner (4-Player Seat 3) */}
      {isFourPlayers && players[3] && (
        <div className="absolute left-2 sm:-left-3 top-1/2 -translate-y-[185px] sm:-translate-y-[205px] z-30 pointer-events-none">
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border-2 transition-colors flex items-center gap-1.5 shadow-xl whitespace-nowrap ${
              currentTurn === 3 && !isCountingActive
                ? 'bg-rose-950/95 text-rose-300 border-rose-400 shadow-[0_0_16px_rgba(251,113,133,0.45)]'
                : 'bg-slate-950/95 text-slate-200 border-white/20'
            }`}
          >
            <AvatarBadge
              avatarId={players[3].avatarId}
              customAvatarUrl={players[3].customAvatarUrl}
              fallbackEmoji={players[3].avatar}
              size="xs"
              showBorder={false}
            />
            {dealerIndex === 3 && <RoleChip role="dealer" />}
            {cutterIndex === 3 && <RoleChip role="cutter" />}
            <span>{players[3].name}</span>
          </span>
        </div>
      )}

      {/* Right Player External Horizontal Banner (4-Player Seat 1) */}
      {isFourPlayers && players[1] && (
        <div className="absolute right-2 sm:-right-3 top-1/2 -translate-y-[185px] sm:-translate-y-[205px] z-30 pointer-events-none">
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full border-2 transition-colors flex items-center gap-1.5 shadow-xl whitespace-nowrap ${
              currentTurn === 1 && !isCountingActive
                ? 'bg-rose-950/95 text-rose-300 border-rose-400 shadow-[0_0_16px_rgba(251,113,133,0.45)]'
                : 'bg-slate-950/95 text-slate-200 border-white/20'
            }`}
          >
            <AvatarBadge
              avatarId={players[1].avatarId}
              customAvatarUrl={players[1].customAvatarUrl}
              fallbackEmoji={players[1].avatar}
              size="xs"
              showBorder={false}
            />
            {dealerIndex === 1 && <RoleChip role="dealer" />}
            {cutterIndex === 1 && <RoleChip role="cutter" />}
            <span>{players[1].name}</span>
          </span>
        </div>
      )}

      {/* =========================================================
          1. TOP OPPONENT / 2v2 PARTNER AREA (Fixed 3-Column Lock)
         ========================================================= */}
      <div className="relative z-10 flex items-center justify-center gap-6 sm:gap-12 w-full max-w-4xl mx-auto px-2 pt-2">
        {/* Left: Top Opponent Collected Pile */}
        <div className="w-24 sm:w-28 flex justify-end shrink-0">
          {renderCollectedPile(topOpponent, topOpponentIdx, 'bottom')}
        </div>

        {/* Center: Top Opponent / Partner Hand */}
        <div className="max-w-[calc(100vw-20px)] w-full sm:w-[340px] flex flex-col items-center shrink-0 relative">
          {/* Floating Active Emote for Top Opponent */}
          {activeEmotes
            ?.filter(e => e.playerIdx === topOpponentIdx)
            .map(e => (
              <div
                key={e.id}
                style={{ animation: 'emotePop2s 2000ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards' }}
                className="absolute top-1 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
              >
                <div className="px-3.5 py-1.5 rounded-2xl bg-slate-900/95 border-2 border-amber-400 text-3xl shadow-[0_10px_35px_rgba(0,0,0,0.9)] flex items-center justify-center animate-bounce">
                  {e.emoji}
                </div>
              </div>
            ))}

          <div
            ref={el => {
              tableRefs.current.handEls[topOpponentIdx] = el;
            }}
            className="flex justify-center items-center min-h-[96px] sm:min-h-[116px] min-w-[170px] -space-x-6 sm:-space-x-7"
          >
            {topOpponent.hand.map((card, idx) => {
              const tilt = (idx - (topOpponent.hand.length - 1) / 2) * 5;
              const isHidden = hiddenCardIds?.has(card.id) ?? false;
              return (
                <div
                  key={card.id}
                  data-card-id={card.id}
                  ref={el => {
                    if (el) cardDomElements.set(card.id, el);
                    else cardDomElements.delete(card.id);
                  }}
                  className="transition-transform duration-200 ease-out"
                >
                  <CardView
                    card={devSeeAllHands ? { ...card, faceUp: true, devForceFaceUp: true } : card}
                    isOpponent={true}
                    isHiddenInFlight={isHidden}
                    tiltAngle={tilt}
                    cardBack={cardBack}
                    theme={theme}
                    size={isFourPlayers ? 'sm' : 'md'}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Top Opponent Pişti Pile */}
        <div className="w-24 sm:w-28 flex justify-start shrink-0">
          {renderPistiPile(topOpponent, topOpponentIdx, 'bottom')}
        </div>
      </div>

      {/* =========================================================
          2. MIDDLE AREA: POT/DECK OR ON-TABLE LIVE COUNTING CEREMONY
         ========================================================= */}
      <div className="relative z-10 w-full flex items-center justify-between px-1 sm:px-4 my-auto">
        {/* Left Player (Seat 3 in 4-Player mode — Pools on top/bottom along edge, NOT in front!) */}
        {isFourPlayers && players[3] ? (
          <div
            className={`flex flex-col items-center justify-center gap-2 relative transition-opacity duration-300 ${
              isCountingActive ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            {/* Floating Active Emote for Left Player */}
            {activeEmotes
              ?.filter(e => e.playerIdx === 3)
              .map(e => (
                <div
                  key={e.id}
                  style={{ animation: 'emotePop2s 2000ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards' }}
                  className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                >
                  <div className="px-3.5 py-1.5 rounded-2xl bg-slate-900/95 border-2 border-rose-400 text-3xl shadow-[0_10px_35px_rgba(0,0,0,0.9)] flex items-center justify-center animate-bounce">
                    {e.emoji}
                  </div>
                </div>
              ))}

            {/* Top Flank: Seat 3 Collected Pile */}
            {renderCollectedPile(players[3], 3, 'bottom', true)}

            {/* Center: Seat 3 Hand */}
            <div
              ref={el => {
                tableRefs.current.handEls[3] = el;
              }}
              className="flex flex-col items-center justify-center min-h-[110px] min-w-[68px] -space-y-11 my-1"
            >
              {players[3].hand.map((card, idx) => {
                const isHidden = hiddenCardIds?.has(card.id) ?? false;
                const tilt = 90 + (idx - (players[3].hand.length - 1) / 2) * 4;
                return (
                  <div
                    key={card.id}
                    data-card-id={card.id}
                    ref={el => {
                      if (el) cardDomElements.set(card.id, el);
                      else cardDomElements.delete(card.id);
                    }}
                    className="transition-transform duration-200"
                  >
                    <CardView
                      card={devSeeAllHands ? { ...card, faceUp: true, devForceFaceUp: true } : card}
                      isOpponent={true}
                      isHiddenInFlight={isHidden}
                      tiltAngle={tilt}
                      cardBack={cardBack}
                      theme={theme}
                      size="sm"
                    />
                  </div>
                );
              })}
            </div>

            {/* Bottom Flank: Seat 3 Pişti Pile */}
            {renderPistiPile(players[3], 3, 'bottom', true)}
          </div>
        ) : (
          <div className="w-4 sm:w-12" />
        )}

        {/* CENTER TABLE: Deck + Pot (counting overlay handled by CardCountingOverlay in App.tsx) */}
        {(
          <div className="relative w-full flex flex-col items-center justify-center min-h-[170px] sm:min-h-[200px]">
            {/* IN-TABLE PHYSICAL DECK CUT VIEW (MASADA YAYILAN FİZİKİ DESTE KESME) */}
            {deckCutState?.isActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center select-none z-30 pointer-events-none">
                {/* Instruction Banner on table felt */}
                <div className="absolute -top-7 sm:-top-9 px-4 py-1.5 rounded-full bg-slate-950/95 border-2 border-amber-400 text-amber-300 font-cyber text-xs font-black tracking-wide flex items-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.6)] z-40 animate-pulse pointer-events-auto">
                  <Scissors className="w-4 h-4 text-amber-400 animate-bounce" />
                  <span>
                    {deckCutState.step === 'waiting_cut'
                      ? deckCutState.isHumanCutter
                        ? t.cutDeckPrompt
                        : `✂️ ${deckCutState.cutterName} ${t.cuttingDeck}`
                      : deckCutState.step === 'splitting'
                      ? `${t.splittingDeck} ${deckCutState.pileACount} & ${deckCutState.pileBCount} ${t.cardsUnit}`
                      : deckCutState.step === 'dealing_pot'
                      ? t.dealingPot
                      : deckCutState.step === 'merging'
                      ? t.mergingDeck
                      : t.stowingDeck}
                  </span>
                </div>

                {/* FANNED / SPLIT / MERGING 52 PHYSICAL CARDS SPREAD ACROSS TABLE FELT */}
                <div className="relative w-full h-36 sm:h-44 flex items-center justify-center">
                  {Array.from({ length: 52 }).map((_, idx) => {
                    const isSm = typeof window !== 'undefined' && window.innerWidth >= 640;
                    const pileOffset = isSm ? 140 : 105;
                    const cutIdx = deckCutState.cutIndex ?? 26;
                    const isLeftPile = idx < cutIdx;

                    let cardLeft = '50%';
                    let cardTransform = 'translate(-50%, 0) rotate(0deg)';
                    let cardZIndex = idx + 1;
                    let cardTransition =
                      'left 0.65s cubic-bezier(0.16, 1, 0.3, 1), transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)';

                    if (deckCutState.step === 'waiting_cut') {
                      const maxOffset = isSm ? 44 : 38;
                      const offsetPercent = isSpread ? ((idx - 25.5) / 26) * maxOffset : 0;
                      const rotDeg = isSpread ? ((idx - 25.5) / 26) * 12 : 0;
                      const isHovered = hoveredCutIndex === idx;

                      cardLeft = isSpread ? `calc(50% + ${offsetPercent}%)` : `calc(50% - ${pileOffset}px)`;
                      cardTransform = `translate(-50%, ${isHovered ? '-16px' : '0px'}) rotate(${rotDeg}deg) scale(${
                        isHovered ? 1.08 : 1
                      })`;
                      cardZIndex = isHovered ? 60 : idx + 1;
                      cardTransition = isSpread
                        ? 'left 0.65s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s ease-out'
                        : 'none';
                    } else if (
                      deckCutState.step === 'splitting' ||
                      deckCutState.step === 'dealing_pot'
                    ) {
                      if (isLeftPile) {
                        const layer = idx;
                        cardLeft = `calc(50% - ${pileOffset}px)`;
                        cardTransform = `translate(-50%, ${
                          (layer - cutIdx / 2) * -0.6
                        }px) rotate(${(layer - cutIdx / 2) * 0.25}deg)`;
                        cardZIndex = layer + 1;
                      } else {
                        const layer = idx - cutIdx;
                        cardLeft = `calc(50% + ${pileOffset}px)`;
                        cardTransform = `translate(-50%, ${
                          (layer - (52 - cutIdx) / 2) * -0.6
                        }px) rotate(${(layer - (52 - cutIdx) / 2) * 0.25}deg)`;
                        cardZIndex = layer + 1;
                      }
                      cardTransition =
                        'left 0.55s cubic-bezier(0.25, 1, 0.5, 1), transform 0.55s cubic-bezier(0.25, 1, 0.5, 1)';
                    } else if (deckCutState.step === 'merging') {
                      if (isLeftPile) {
                        const layer = idx;
                        cardLeft = `calc(50% - ${pileOffset}px)`;
                        cardTransform = `translate(-50%, ${
                          (layer - cutIdx / 2) * -0.5
                        }px) rotate(0deg)`;
                        cardZIndex = layer + 1;
                      } else {
                        // Pile B glides and lands on top of Pile A!
                        const layerOnTop = idx - cutIdx + cutIdx;
                        cardLeft = `calc(50% - ${pileOffset}px)`;
                        cardTransform = `translate(-50%, ${
                          (layerOnTop - 26) * -0.6
                        }px) rotate(0deg)`;
                        cardZIndex = 40 + idx;
                      }
                      cardTransition =
                        'left 0.65s cubic-bezier(0.25, 1, 0.45, 1), transform 0.65s cubic-bezier(0.25, 1, 0.45, 1)';
                    } else if (deckCutState.step === 'stowing') {
                      const deckSlotOffset = isSm ? 72 : 56;
                      cardLeft = `calc(50% - ${deckSlotOffset}px)`;
                      cardTransform = `translate(-50%, ${(idx - 26) * -0.6}px) scale(1)`;
                      cardZIndex = idx + 1;
                      cardTransition = 'all 0.45s cubic-bezier(0.25, 1, 0.5, 1)';
                    }

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (
                            deckCutState.step === 'waiting_cut' &&
                            deckCutState.isHumanCutter &&
                            onCutDeck
                          ) {
                            onCutDeck(idx);
                          }
                        }}
                        onMouseEnter={() =>
                          deckCutState.step === 'waiting_cut' &&
                          deckCutState.isHumanCutter &&
                          setHoveredCutIndex(idx)
                        }
                        onMouseLeave={() =>
                          deckCutState.step === 'waiting_cut' &&
                          deckCutState.isHumanCutter &&
                          setHoveredCutIndex(null)
                        }
                        style={{
                          position: 'absolute',
                          left: cardLeft,
                          transform: cardTransform,
                          zIndex: cardZIndex,
                          transition: cardTransition
                        }}
                        className={`${CARD_DIMENSIONS.md.classes} ${
                          deckCutState.step === 'waiting_cut' && deckCutState.isHumanCutter
                            ? 'cursor-pointer hover:shadow-[0_0_20px_rgba(245,158,11,0.9)] ring-1 hover:ring-2 ring-amber-400/80 pointer-events-auto'
                            : 'pointer-events-none'
                        }`}
                      >
                        <CardBackSurface cardBack={cardBack} />
                      </div>
                    );
                  })}
                </div>

                {/* Pile Badges under the piles during splitting & dealing */}
                {(deckCutState.step === 'splitting' || deckCutState.step === 'dealing_pot') && (
                  <div className="absolute -bottom-7 sm:-bottom-8 flex items-center justify-between w-full max-w-sm px-6 animate-in fade-in duration-300">
                    <span className="text-[10px] font-cyber text-amber-300 font-bold bg-slate-950/90 px-2.5 py-0.5 rounded-full border border-amber-400/40 shadow-md">
                      {t.cutterPile} {deckCutState.pileACount}
                    </span>
                    <span className="text-[10px] font-cyber text-cyan-300 font-bold bg-slate-950/90 px-2.5 py-0.5 rounded-full border border-cyan-400/40 shadow-md">
                      {t.remainingPile} {deckCutState.pileBCount}
                    </span>
                  </div>
                )}

                {deckCutState.step === 'merging' && (
                  <div className="absolute -bottom-7 sm:-bottom-8 flex items-center justify-center animate-in fade-in duration-200">
                    <span className="text-[10px] font-cyber text-emerald-300 font-bold bg-slate-950/90 px-3 py-0.5 rounded-full border border-emerald-400/40 shadow-md">
                      {t.deckMerged}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div
              className={`flex items-center justify-center gap-6 sm:gap-12 mx-auto transition-opacity duration-300 ${
                (deckCutState?.isActive && deckCutState.step !== 'stowing') || isCountingActive
                  ? 'opacity-0 pointer-events-none'
                  : 'opacity-100'
              }`}
            >
            {/* Physical Deck Stack on the Left of the Pot (Exact scale(1) to match shuffle end) */}
            <div className="flex flex-col items-center">
              <div
                ref={el => {
                  tableRefs.current.deckEl = el;
                }}
                className={`relative ${CARD_DIMENSIONS.md.classes} flex items-center justify-center rounded-xl`}
              >
                {deckCutState?.isActive ? (
                  <div className="flex flex-col items-center justify-center text-amber-200/40 text-[10px] font-bold text-center px-1 select-none animate-pulse">
                    <Scissors className="w-3.5 h-3.5 mb-1 text-amber-400/60" />
                    <span>{t.deckOnTable}</span>
                  </div>
                ) : isShuffling ? (
                  <div className="flex flex-col items-center justify-center text-amber-300/70 text-[10px] font-bold text-center px-2">
                    <Sparkles className="w-4 h-4 mb-1 animate-spin text-amber-400" />
                    <span>{t.shuffling}</span>
                  </div>
                ) : deckCount > 0 ? (
                  <div className="relative w-full h-full">
                    {Array.from({ length: Math.min(8, Math.ceil(deckCount / 6)) }).map(
                      (_, layerIdx) => (
                        <div
                          key={layerIdx}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            transform: `translate3d(${layerIdx * -1.2}px, ${
                              layerIdx * -1.5
                            }px, 0)`
                          }}
                          className="rounded-xl shadow-md"
                        >
                          <CardBackSurface cardBack={cardBack} />
                        </div>
                      )
                    )}
                  </div>
                ) : null}
              </div>
              {deckCount > 0 || deckCutState?.isActive ? (
                <span className="mt-1.5 text-[10px] font-cyber text-slate-200 font-bold bg-slate-950/90 px-2.5 py-0.5 rounded-full border border-white/15 shadow-md">
                  {deckCutState?.isActive ? t.deckOnTableBadge : `${t.deck}: ${deckCount}`}
                </span>
              ) : null}
            </div>

            {/* Center Pot Pile (Where cards are dealt & thrown) */}
            <div className="relative flex flex-col items-center justify-center">
              <div
                ref={el => {
                  tableRefs.current.potEl = el;
                }}
                className={`relative ${CARD_DIMENSIONS.md.classes} flex items-center justify-center rounded-2xl transition-all duration-300 ${
                  isHoveredCardCapturing
                    ? 'border-2 border-emerald-400 bg-emerald-500/20 ring-4 ring-emerald-400/50 shadow-[0_0_40px_rgba(16,185,129,0.65)] scale-105'
                    : isSingleCardPistiChance
                    ? 'border-2 border-amber-400/80 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.25)]'
                    : ''
                }`}
              >
                {visibleTableCards.length === 0 && tableCards.length === 0 ? null : (
                  tableCards.slice(-14).map((card, idx) => {
                    const ox = card.tableOffsetX ?? 0;
                    const oy = card.tableOffsetY ?? 0;
                    const rot = card.tableRotation ?? 0;
                    const isHidden = hiddenCardIds?.has(card.id) ?? false;

                    return (
                      <div
                        key={card.id}
                        data-card-id={card.id}
                        ref={el => {
                          if (el) cardDomElements.set(card.id, el);
                          else cardDomElements.delete(card.id);
                        }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          transform: `translate3d(${ox}px, ${oy}px, 0) rotate(${rot}deg)`,
                          zIndex: idx + 1
                        }}
                      >
                        <CardView
                          card={card}
                          isOpponent={!card.faceUp}
                          isHiddenInFlight={isHidden}
                          tiltAngle={0}
                          cardBack={cardBack}
                          theme={theme}
                          size="md"
                        />
                      </div>
                    );
                  })
                )}
              </div>

              {/* Table Card Counter Badge */}
              {visibleTableCards.length > 0 && (
                <div className="mt-1.5 bg-slate-950/90 border border-white/20 text-slate-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-lg">
                  {t.onFloor} {visibleTableCards.length} {t.cardsUnit}
                </div>
              )}

              {/* Instant Game Over Overlay if ended before counting */}
              {isGameOver && !isCountingActive && (
                <div className="absolute inset-0 -inset-x-8 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-2xl p-4 shadow-2xl animate-in fade-in duration-300">
                  <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500/30 via-yellow-500/20 to-amber-500/30 border-2 border-amber-400 text-amber-200 font-black text-sm shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center gap-2 mb-3 animate-pulse">
                    <span>🏆</span>
                    <span>
                      {gameOverWinner ? `${gameOverWinner.name.toUpperCase()} ${t.wonMatch}` : t.matchCompleted}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {onRestartGame && (
                      <button
                        onClick={onRestartGame}
                        className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg cursor-pointer transition-transform active:scale-95 flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{t.newMatchShort}</span>
                      </button>
                    )}
                    {onExitToMenu && (
                      <button
                        onClick={onExitToMenu}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 cursor-pointer transition-all active:scale-95"
                      >
                        {t.mainMenu}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Right Player (Seat 1 in 4-Player mode — Pools on top/bottom along edge, NOT in front!) */}
        {isFourPlayers && players[1] ? (
          <div
            className={`flex flex-col items-center justify-center gap-2 relative transition-opacity duration-300 ${
              isCountingActive ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            {/* Floating Active Emote for Right Player */}
            {activeEmotes
              ?.filter(e => e.playerIdx === 1)
              .map(e => (
                <div
                  key={e.id}
                  style={{ animation: 'emotePop2s 2000ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards' }}
                  className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                >
                  <div className="px-3.5 py-1.5 rounded-2xl bg-slate-900/95 border-2 border-rose-400 text-3xl shadow-[0_10px_35px_rgba(0,0,0,0.9)] flex items-center justify-center animate-bounce">
                    {e.emoji}
                  </div>
                </div>
              ))}

            {/* Top Flank: Seat 1 Collected Pile */}
            {renderCollectedPile(players[1], 1, 'bottom', true)}

            {/* Center: Seat 1 Hand */}
            <div
              ref={el => {
                tableRefs.current.handEls[1] = el;
              }}
              className="flex flex-col items-center justify-center min-h-[110px] min-w-[68px] -space-y-11 my-1"
            >
              {players[1].hand.map((card, idx) => {
                const isHidden = hiddenCardIds?.has(card.id) ?? false;
                const tilt = -90 + (idx - (players[1].hand.length - 1) / 2) * 4;
                return (
                  <div
                    key={card.id}
                    data-card-id={card.id}
                    ref={el => {
                      if (el) cardDomElements.set(card.id, el);
                      else cardDomElements.delete(card.id);
                    }}
                    className="transition-transform duration-200"
                  >
                    <CardView
                      card={devSeeAllHands ? { ...card, faceUp: true, devForceFaceUp: true } : card}
                      isOpponent={true}
                      isHiddenInFlight={isHidden}
                      tiltAngle={tilt}
                      cardBack={cardBack}
                      theme={theme}
                      size="sm"
                    />
                  </div>
                );
              })}
            </div>

            {/* Bottom Flank: Seat 1 Pişti Pile */}
            {renderPistiPile(players[1], 1, 'bottom', true)}
          </div>
        ) : (
          <div className="w-4 sm:w-12" />
        )}
      </div>

      {/* =========================================================
          3. BOTTOM HUMAN PLAYER HAND AREA & CONTROLS (Fixed 3-Column Lock with Wider Spacing)
         ========================================================= */}
      <div className="relative z-10 flex items-center justify-center gap-6 sm:gap-14 w-full max-w-4xl mx-auto px-2 pb-2">
        {/* Left: User Collected Pile */}
        <div className="w-24 sm:w-28 flex flex-col items-end gap-1 shrink-0">
          {renderCollectedPile(user, 0, 'top')}
        </div>

        {/* Center: User Hand with Turn Status */}
        <div className="max-w-[calc(100vw-20px)] w-full sm:w-[340px] flex flex-col items-center shrink-0 relative">
          {/* Floating Active Emote for User */}
          {activeEmotes
            ?.filter(e => e.playerIdx === 0)
            .map(e => (
              <div
                key={e.id}
                style={{ animation: 'emotePop2s 2000ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards' }}
                className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
              >
                <div className="px-3.5 py-1.5 rounded-2xl bg-slate-900/95 border-2 border-emerald-400 text-3xl shadow-[0_10px_35px_rgba(0,0,0,0.9)] flex items-center justify-center animate-bounce">
                  {e.emoji}
                </div>
              </div>
            ))}

          {/* Turn Status: Timer ONLY appears if isMultiplayer === true! */}
          <div className="mb-1 flex flex-col items-center w-full max-w-xs">
            {isMultiplayer ? (
              <>
                <div className="flex items-center justify-between w-full px-2 mb-0.5 text-[11px]">
                  {isPlayerTurn ? (
                    <span className="font-bold text-emerald-300 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      {t.yourTurnSelect}
                    </span>
                  ) : (
                    <span className="text-slate-300 font-medium">
                      {`${players[currentTurn]?.name || t.opponent} ${t.isPlaying}`}
                    </span>
                  )}

                  {/* Countdown Number in Multiplayer */}
                  <span
                    className={`font-cyber font-bold flex items-center gap-1 ${
                      turnTimeRemaining <= 5 ? 'text-red-400 animate-pulse' : 'text-slate-200'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    {turnTimeRemaining}s
                  </span>
                </div>

                {/* Visual 15s Countdown Progress Bar in Multiplayer */}
                <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/15">
                  <div
                    style={{ width: `${(turnTimeRemaining / 15) * 100}%` }}
                    className={`h-full transition-all duration-300 ${
                      turnTimeRemaining <= 5
                        ? 'bg-gradient-to-r from-red-600 to-amber-500'
                        : isPlayerTurn
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                    }`}
                  />
                </div>
              </>
            ) : (
              /* Singleplayer: Clean Relaxing Indicator (NO Timer, NO Countdown!) */
              <div className="flex items-center justify-center w-full py-0.5">
                {isPlayerTurn ? (
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 px-3.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/50 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    {t.yourTurnSelect}
                  </span>
                ) : (
                  <span className="text-xs text-slate-300 px-3.5 py-0.5 rounded-full bg-slate-950/80 border border-white/15">
                    {`${players[currentTurn]?.name || t.opponent} ${t.isThinking}`}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Cards Hand with Tactical Auto-Lift & Hover Physics */}
          <div
            ref={el => {
              tableRefs.current.handEls[0] = el;
            }}
            className="flex justify-center items-center min-h-[140px] sm:min-h-[156px] min-w-[240px] -space-x-2.5 sm:-space-x-3.5 pt-4 pb-1"
          >
            {user.hand.map((card, idx) => {
              const baseTilt = (idx - (user.hand.length - 1) / 2) * 5;
              const isHidden = hiddenCardIds?.has(card.id) ?? false;
              const isHovered = hoveredHandCardId === card.id;

              const isPistiMatch = Boolean(
                isPlayerTurn &&
                  !isHidden &&
                  topVisibleTableCard &&
                  visibleTableCards.length === 1 &&
                  card.value === topVisibleTableCard.value
              );
              const isCaptureMatch = Boolean(
                isPlayerTurn &&
                  !isHidden &&
                  topVisibleTableCard &&
                  visibleTableCards.length > 1 &&
                  card.value === topVisibleTableCard.value
              );
              const isJackSweep = Boolean(
                isPlayerTurn &&
                  !isHidden &&
                  topVisibleTableCard &&
                  card.value === 11 &&
                  card.value !== topVisibleTableCard.value
              );

              // Neighbor parting when hovering a card
              let displaceX = 0;
              if (hoveredHandCardId && !isHovered) {
                const hovIdx = user.hand.findIndex(c => c.id === hoveredHandCardId);
                if (hovIdx !== -1) {
                  displaceX = idx < hovIdx ? -12 : 12;
                }
              }

              // Auto-elevation for matching / tactical cards
              let liftY = 0;
              if (isPistiMatch) liftY = -22;
              else if (isCaptureMatch) liftY = -16;
              else if (isJackSweep) liftY = -12;

              const activeTilt = isHovered ? 0 : baseTilt;

              return (
                <div
                  key={card.id}
                  data-card-id={card.id}
                  ref={el => {
                    if (el) cardDomElements.set(card.id, el);
                    else cardDomElements.delete(card.id);
                  }}
                  onMouseEnter={() => setHoveredHandCardId(card.id)}
                  onMouseLeave={() => setHoveredHandCardId(null)}
                  style={{
                    transform: `translate3d(${displaceX}px, ${liftY}px, 0)`,
                    zIndex: isHovered ? 40 : isPistiMatch || isCaptureMatch ? 20 + idx : idx + 1
                  }}
                  className="relative transition-all duration-200 ease-out"
                >
                  <CardView
                    card={card}
                    isPlayable={isPlayerTurn && !isHidden}
                    isHiddenInFlight={isHidden}
                    onClick={e => handleCardClick(card, activeTilt, e)}
                    tiltAngle={activeTilt}
                    cardBack={cardBack}
                    theme={theme}
                    size="md"
                    className={
                      isPistiMatch
                        ? 'ring-2 ring-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.75)]'
                        : isCaptureMatch
                        ? 'ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.65)]'
                        : isJackSweep
                        ? 'ring-2 ring-indigo-400 shadow-[0_0_18px_rgba(99,102,241,0.6)]'
                        : ''
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Pişti Pile & True Radial Emote Wheel */}
        <div className="w-24 sm:w-28 flex items-center justify-start gap-2.5 shrink-0">
          {renderPistiPile(user, 0, 'top')}

          {/* Minimalist Quick Emote Reaction Trigger & Radial Wheel */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowEmotePicker(prev => !prev)}
              title={t.sendReaction}
              className="p-2.5 rounded-2xl bg-slate-950/85 hover:bg-slate-900 border border-white/20 hover:border-amber-400/60 text-amber-300 shadow-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            >
              <span className="text-lg">💬</span>
            </button>

            {showEmotePicker && (
              <div className="absolute bottom-14 right-0 z-50 w-44 h-44 rounded-full bg-slate-950/95 border-2 border-amber-400/80 shadow-[0_12px_40px_rgba(0,0,0,0.9),0_0_24px_rgba(245,158,11,0.35)] backdrop-blur-xl animate-in zoom-in-95 duration-200 flex items-center justify-center">
                {/* Center Close / Label Hub */}
                <button
                  type="button"
                  onClick={() => setShowEmotePicker(false)}
                  className="w-11 h-11 rounded-full bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/60 text-amber-300 text-xs font-black flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>

                {[
                  { emoji: '🔥', name: 'Alev' },
                  { emoji: '😎', name: 'Usta İşi' },
                  { emoji: '☕', name: 'Çay Molası' },
                  { emoji: '👏', name: 'Tebrikler' },
                  { emoji: '🃏', name: 'Vale miydi!' },
                  { emoji: '😅', name: 'Balına' },
                  { emoji: '😡', name: 'Olur mu böyle!' },
                  { emoji: '👑', name: 'Masa Hükümdarı' }
                ].map((item, idx, arr) => {
                  const angle = (idx / arr.length) * Math.PI * 2 - Math.PI / 2;
                  const radius = 58;
                  const x = Math.round(Math.cos(angle) * radius);
                  const y = Math.round(Math.sin(angle) * radius);

                  return (
                    <button
                      key={item.emoji}
                      type="button"
                      onClick={() => {
                        onSendEmote?.(item.emoji);
                        setShowEmotePicker(false);
                      }}
                      title={item.name}
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
                      }}
                      className="w-10 h-10 rounded-full bg-slate-900 hover:bg-amber-400/25 border border-white/15 hover:border-amber-400 flex items-center justify-center text-xl transition-transform hover:scale-125 active:scale-90 cursor-pointer shadow-md"
                    >
                      {item.emoji}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

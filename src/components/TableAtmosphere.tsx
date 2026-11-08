import React from 'react';
import { TableTheme } from '../types/game';

export const TableAtmosphere: React.FC<{ theme: TableTheme }> = ({ theme }) => {
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

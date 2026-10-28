import React, { useState } from 'react';
import {
  Play,
  Users,
  BookOpen,
  Settings as SettingsIcon,
  Sparkles,
  Volume2,
  VolumeX,
  Palette,
  Swords,
  Shield,
  SlidersHorizontal,
  Flame,
  Trophy,
  Globe
} from 'lucide-react';
import { sound } from '../core/audio/soundEngine';
import { Card, GameSetupConfig, TableTheme } from '../types/game';
import { CardView } from './CardView';
import { AvatarBadge } from './AvatarBadge';
import { UserProfile } from '../features/profile/profileManager';

interface MainMenuProps {
  theme: TableTheme;
  cardBack: string;
  soundEnabled: boolean;
  defaultSetup: GameSetupConfig;
  userProfile: UserProfile;
  onSelectTheme: (theme: TableTheme, matchingCardBack?: string) => void;
  onToggleSound: () => void;
  onQuickStartGame: (config: GameSetupConfig) => void;
  onStartSinglePlayer: () => void;
  onOpenMultiplayer: () => void;
  onOpenRules: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onStartUnoGame: () => void;
}

const SHOWCASE_LEFT_CARDS: Card[] = [
  { id: 'demo-d10', suit: 'diamonds', value: 10, symbol: '10', basePoints: 3, isSpecial: true, faceUp: true },
  { id: 'demo-hj', suit: 'hearts', value: 11, symbol: 'J', basePoints: 1, isSpecial: true, faceUp: true }
];

const SHOWCASE_RIGHT_CARDS: Card[] = [
  { id: 'demo-c2', suit: 'clubs', value: 2, symbol: '2', basePoints: 2, isSpecial: true, faceUp: true },
  { id: 'demo-sa', suit: 'spades', value: 1, symbol: 'A', basePoints: 1, isSpecial: true, faceUp: true }
];

const THEME_PILLS: { id: TableTheme; label: string; icon: string; cardBack: string }[] = [
  { id: 'sakura', label: 'Sakura Spirit', icon: '🌸', cardBack: 'sakura_blossom' },
  { id: 'traditional', label: 'Zümrüt Çuha', icon: '🌲', cardBack: 'classic_blue' },
  { id: 'cyberpunk', label: 'Siber Neon', icon: '⚡', cardBack: 'cyber_neon' },
  { id: 'cosmic', label: 'Kozmik Ruh', icon: '🌌', cardBack: 'cyber_neon' },
  { id: 'luxury_gold', label: 'Altın Varak', icon: '👑', cardBack: 'gold_dragon' }
];

const TARGET_SCORES = [51, 101, 151, 201];

export const MainMenu: React.FC<MainMenuProps> = ({
  theme,
  cardBack,
  soundEnabled,
  defaultSetup,
  userProfile,
  onSelectTheme,
  onToggleSound,
  onQuickStartGame,
  onStartSinglePlayer,
  onOpenMultiplayer,
  onOpenRules,
  onOpenSettings,
  onOpenProfile,
  onStartUnoGame
}) => {
  const [targetScore, setTargetScore] = useState<number>(defaultSetup.targetScore || 101);
  const [fiveRuleEnabled, setFiveRuleEnabled] = useState<boolean>(defaultSetup.fiveRuleEnabled ?? true);
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'medium' | 'hard'>(
    defaultSetup.botDifficulty || 'medium'
  );

  const handleClick = (action: () => void) => {
    sound.playClick();
    action();
  };

  const isSakura = theme === 'sakura';

  const bgGradient =
    theme === 'sakura'
      ? 'bg-[radial-gradient(circle_at_50%_20%,_#4a0e36_0%,_#190520_52%,_#07020a_100%)]'
      : theme === 'cyberpunk'
      ? 'bg-[radial-gradient(circle_at_50%_20%,_#1e1b4b_0%,_#090d16_55%,_#020408_100%)]'
      : theme === 'traditional'
      ? 'bg-[radial-gradient(circle_at_50%_20%,_#064e3b_0%,_#041f17_55%,_#020c09_100%)]'
      : theme === 'luxury_gold'
      ? 'bg-[radial-gradient(circle_at_50%_20%,_#451a03_0%,_#1c1917_55%,_#090807_100%)]'
      : 'bg-[radial-gradient(circle_at_50%_20%,_#3b0764_0%,_#0f172a_55%,_#030712_100%)]';

  return (
    <div
      className={`relative min-h-screen w-full flex flex-col items-center justify-between p-4 sm:p-6 overflow-hidden select-none ${bgGradient}`}
    >
      {/* Pure CSS GPU-Friendly Ambient Glow (Zero Filter Blur Lag) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isSakura
            ? 'radial-gradient(circle at 50% 45%, rgba(244, 114, 182, 0.14) 0%, rgba(225, 29, 72, 0.05) 38%, transparent 68%)'
            : 'radial-gradient(circle at 50% 45%, rgba(245, 158, 11, 0.12) 0%, rgba(56, 189, 248, 0.04) 38%, transparent 68%)'
        }}
      />

      {/* Decorative Geometric Rings */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.06]">
        <div className="w-[680px] h-[680px] rounded-full border-2 border-white" />
        <div className="absolute w-[500px] h-[500px] rounded-full border border-dashed border-white" />
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-20 w-full max-w-6xl flex flex-wrap items-center justify-between gap-3 px-2 py-1">
        <div className="flex items-center gap-1 bg-slate-950/85 border border-white/15 rounded-full p-1 shadow-lg">
          <span className="text-[11px] font-bold text-slate-300 px-2.5 flex items-center gap-1">
            <Palette className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden md:inline">Tema:</span>
          </span>
          {THEME_PILLS.map(tp => {
            const active = theme === tp.id;
            return (
              <button
                key={tp.id}
                onClick={() => {
                  sound.playClick();
                  onSelectTheme(tp.id, tp.cardBack);
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-transform duration-150 flex items-center gap-1 ${
                  active
                    ? tp.id === 'sakura'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md scale-105'
                      : 'bg-amber-500 text-slate-950 shadow-md scale-105'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{tp.icon}</span>
                <span className="hidden sm:inline">{tp.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Profile & Avatar Selector Button */}
          <button
            onClick={() => handleClick(onOpenProfile)}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/90 hover:bg-slate-900 border border-amber-400/40 hover:border-amber-400 text-xs font-bold text-slate-200 transition-all shadow-md group cursor-pointer"
            title="Oyuncu Profilini ve Sabit PP'yi Düzenle"
          >
            <AvatarBadge avatarId={userProfile.avatarId} size="xs" />
            <span className="text-amber-300 font-cyber font-black max-w-[90px] sm:max-w-[120px] truncate">
              {userProfile.name}
            </span>
            <span className="hidden sm:inline text-[10px] text-slate-400 group-hover:text-white">
              Profil
            </span>
          </button>

          <button
            onClick={() => handleClick(onOpenRules)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 hover:bg-slate-900 border border-white/15 text-xs font-bold text-slate-200 transition-colors shadow-md"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Kurallar</span>
          </button>

          <button
            onClick={() => handleClick(onOpenSettings)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-950/85 hover:bg-slate-900 border border-white/15 text-xs font-bold text-slate-200 transition-colors shadow-md"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-pink-400" />
            <span>Ayarlar</span>
          </button>

          <button
            onClick={onToggleSound}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-950/85 hover:bg-slate-900 border border-white/15 text-xs font-bold text-slate-200 transition-colors shadow-md"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Ses Açık</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Ses Kapalı</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Hero & Command Dashboard */}
      <main className="relative z-10 w-full max-w-6xl flex flex-col items-center my-auto py-2">
        {/* Title & Emblem Header */}
        <div className="flex items-center justify-center gap-8 lg:gap-12 w-full mb-5">
          {/* Left Showcase Cards */}
          <div className="hidden xl:flex items-center relative w-36 h-44 pointer-events-none">
            <div className="absolute top-2 left-0 -rotate-12 transition-transform duration-500">
              <CardView card={SHOWCASE_LEFT_CARDS[0]} cardBack={cardBack} size="md" />
            </div>
            <div className="absolute top-6 left-12 rotate-12 transition-transform duration-500">
              <CardView card={SHOWCASE_LEFT_CARDS[1]} cardBack={cardBack} size="md" />
            </div>
          </div>

          {/* Center Title Block */}
          <div className="flex flex-col items-center text-center">
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-widest mb-2 ${
                isSakura
                  ? 'bg-pink-950/80 border-pink-400/40 text-pink-200'
                  : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-300" />
              <span>{isSakura ? '🌸 桜の魂 • Sakura Spirit Final Edition' : 'Overdrive • Final Edition'}</span>
            </div>

            <h1
              className={`text-5xl sm:text-7xl font-arcade tracking-wider text-transparent bg-clip-text ${
                isSakura
                  ? 'bg-gradient-to-b from-white via-pink-200 to-rose-400'
                  : 'bg-gradient-to-b from-white via-amber-200 to-amber-500'
              }`}
            >
              P İ Ş T İ
            </h1>
            <p
              className={`text-sm sm:text-base font-cyber tracking-[0.32em] font-black -mt-1 ${
                isSakura ? 'text-pink-300' : 'text-cyan-400'
              }`}
            >
              {isSakura ? 'BLOSSOM SPIRIT' : 'OVERDRIVE'}
            </p>
          </div>

          {/* Right Showcase Cards */}
          <div className="hidden xl:flex items-center relative w-36 h-44 pointer-events-none">
            <div className="absolute top-2 right-12 -rotate-12 transition-transform duration-500">
              <CardView card={SHOWCASE_RIGHT_CARDS[0]} cardBack={cardBack} size="md" />
            </div>
            <div className="absolute top-6 right-0 rotate-12 transition-transform duration-500">
              <CardView
                card={{ ...SHOWCASE_RIGHT_CARDS[1], faceUp: false }}
                cardBack={cardBack}
                size="md"
              />
            </div>
          </div>
        </div>

        {/* Quick Match Rule Bar (Instant Pre-Game Configuration) */}
        <div className="w-full max-w-4xl bg-slate-950/90 border border-white/15 rounded-2xl p-3 sm:px-5 mb-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
          {/* Target Score Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Hedef:
            </span>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10">
              {TARGET_SCORES.map(score => (
                <button
                  key={score}
                  onClick={() => {
                    sound.playClick();
                    setTargetScore(score);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black font-cyber transition-colors ${
                    targetScore === score
                      ? isSakura
                        ? 'bg-pink-500 text-slate-950'
                        : 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>

          {/* 5'e Basmalı Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                setFiveRuleEnabled(prev => !prev);
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-colors ${
                fiveRuleEnabled
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                  : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${fiveRuleEnabled ? 'text-amber-400' : 'text-slate-500'}`} />
              <span>5'e Basmalı (+5P):</span>
              <span className="font-black uppercase">{fiveRuleEnabled ? 'AÇIK' : 'KAPALI'}</span>
            </button>
          </div>

          {/* Bot Difficulty Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 hidden sm:inline">
              Zorluk:
            </span>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10">
              {(
                [
                  { id: 'easy', label: 'Rahat' },
                  { id: 'medium', label: 'Normal' },
                  { id: 'hard', label: 'Usta AI' }
                ] as const
              ).map(diff => (
                <button
                  key={diff.id}
                  onClick={() => {
                    sound.playClick();
                    setBotDifficulty(diff.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    botDifficulty === diff.id
                      ? 'bg-cyan-500 text-slate-950 font-black'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {diff.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4 Main Game Mode Cards (1v1 Pişti, 4P Pişti, UNO Modu, Online Lobi) */}
        <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: 2 Kişilik Teke Tek Düello */}
          <div className="flex flex-col justify-between rounded-3xl bg-slate-950/90 border border-pink-400/30 hover:border-pink-400/70 p-4 sm:p-5 shadow-2xl transition-transform duration-150 hover:-translate-y-1">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-slate-950 shadow-md">
                  <Swords className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-400/30">
                  1v1 Düello
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white font-cyber tracking-wide mb-1">
                2 KİŞİLİK TEKE TEK
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Kurnaz Bot'a karşı klasik Pişti düellosu. Hızlı tempolu, kart saymalı masa.
              </p>
            </div>

            <button
              onClick={() =>
                handleClick(() =>
                  onQuickStartGame({
                    playerCount: 2,
                    targetScore,
                    fiveRuleEnabled,
                    botDifficulty
                  })
                )
              }
              className={`w-full py-3 px-3 rounded-2xl font-black text-xs font-cyber uppercase tracking-wider flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer ${
                isSakura
                  ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 text-slate-950 shadow-lg'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>BAŞLAT (1v1)</span>
            </button>
          </div>

          {/* Card 2: 4 Kişilik Eşli Masa (2v2 Takım) */}
          <div className="flex flex-col justify-between rounded-3xl bg-slate-950/90 border border-amber-400/30 hover:border-amber-400/70 p-4 sm:p-5 shadow-2xl transition-transform duration-150 hover:-translate-y-1">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 shadow-md">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Eşli Takım
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white font-cyber tracking-wide mb-1">
                4 KİŞİLİK MASA
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Ortağın <strong className="text-emerald-300">Dayı</strong> ile takım ol; Bot ve Muhtar'a karşı 4 köşeli eşli mücadele!
              </p>
            </div>

            <button
              onClick={() =>
                handleClick(() =>
                  onQuickStartGame({
                    playerCount: 4,
                    targetScore,
                    fiveRuleEnabled,
                    botDifficulty
                  })
                )
              }
              className="w-full py-3 px-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 font-black text-xs font-cyber uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>4 KİŞİLİK BAŞLAT</span>
            </button>
          </div>

          {/* Card 3: 🌈 UNO MODU (Tam Bağımsız 108 Kart UNO) */}
          <div className="flex flex-col justify-between rounded-3xl bg-slate-950/90 border border-red-500/40 hover:border-red-400 p-4 sm:p-5 shadow-[0_0_30px_rgba(239,68,68,0.15)] transition-transform duration-150 hover:-translate-y-1 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 via-amber-500 to-blue-600 flex items-center justify-center text-white shadow-md font-black italic text-sm">
                  UNO
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-400/40 animate-pulse">
                  Yeni Mod!
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white font-cyber tracking-wide mb-1">
                🌈 UNO MODU
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                108 kartlık tam Uno! +2, Pas, Yön Değiştir, Joker ve +4. Tek kart kalınca <strong>"UNO!"</strong> demeyi unutma!
              </p>
            </div>

            <button
              onClick={() => handleClick(onStartUnoGame)}
              className="w-full py-3 px-3 rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 hover:from-red-500 hover:to-emerald-400 text-white font-black text-xs font-cyber uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-transform active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>UNO OYNA</span>
            </button>
          </div>

          {/* Card 4: Online Çok Oyunculu Lobi */}
          <div className="flex flex-col justify-between rounded-3xl bg-slate-950/90 border border-cyan-400/30 hover:border-cyan-400/70 p-4 sm:p-5 shadow-2xl transition-transform duration-150 hover:-translate-y-1">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 shadow-md">
                  <Globe className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  Online Canlı
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white font-cyber tracking-wide mb-1">
                ONLINE ARKADAŞLA
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                6 haneli oda koduyla ister arkadaşınla yan yana ister farklı şehirlerden canlı oyna!
              </p>
            </div>

            <button
              onClick={() => handleClick(onOpenMultiplayer)}
              className="w-full py-3 px-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black text-xs font-cyber uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>ONLINE LOBİ</span>
            </button>
          </div>
        </div>

        {/* Secondary Detailed Setup Button */}
        <div className="mt-4 flex items-center justify-center">
          <button
            onClick={() => handleClick(onStartSinglePlayer)}
            className="px-4 py-2 rounded-full bg-slate-950/80 hover:bg-slate-900 border border-white/15 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-pink-400" />
            <span>Detaylı Masa Kurulum Penceresini Aç</span>
          </button>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 text-center text-[11px] text-slate-400/80 font-medium py-1">
        Sıfır Işınlanma 3D Kart Fiziği • Canlı Masa Üstü Kart Sayımı • WebRTC Küresel Online Lobi
      </footer>
    </div>
  );
};

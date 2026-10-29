import React, { useState } from 'react';
import {
  Play,
  Users,
  BookOpen,
  Settings as SettingsIcon,
  Sparkles,
  Volume2,
  VolumeX,
  Swords,
  SlidersHorizontal,
  Flame,
  Trophy,
  Globe,
  UserPlus
} from 'lucide-react';
import { sound } from '../core/audio/soundEngine';
import { Card, GameSetupConfig, TableTheme } from '../types/game';
import { CardView } from './CardView';
import { AvatarBadge } from './AvatarBadge';
import { UserProfile } from '../features/profile/profileManager';

import { AmbientParticles } from './AmbientParticles';

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
  onOpenFriends: () => void;
  isFriendsOpen?: boolean;
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

const TARGET_SCORES = [51, 101, 151];

export const MainMenu: React.FC<MainMenuProps> = ({
  theme,
  cardBack,
  soundEnabled,
  defaultSetup,
  userProfile,
  onToggleSound,
  onQuickStartGame,
  onStartSinglePlayer,
  onOpenMultiplayer,
  onOpenFriends,
  isFriendsOpen: _isFriendsOpen = false,
  onOpenRules,
  onOpenSettings,
  onOpenProfile,
  onStartUnoGame
}) => {
  const [targetScore, setTargetScore] = useState<number>(defaultSetup.targetScore || 101);
  const [fiveRuleEnabled] = useState<boolean>(defaultSetup.fiveRuleEnabled ?? false);
  const [botDifficulty] = useState<'easy' | 'medium' | 'hard'>(
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
      : theme === 'estoril_blue'
      ? 'bg-[radial-gradient(circle_at_50%_20%,_#163758_0%,_#0c2136_55%,_#06111c_100%)]'
      : theme === 'alpine_white'
      ? 'bg-[radial-gradient(circle_at_50%_20%,_#2c323b_0%,_#171b21_55%,_#0c0e12_100%)]'
      : theme === 'melbourne_red'
      ? 'bg-[radial-gradient(circle_at_50%_20%,_#4d0b13_0%,_#240509_55%,_#0f0204_100%)]'
      : theme === 'monaco_velvet'
      ? 'bg-[radial-gradient(circle_at_50%_20%,_#0d4229_0%,_#062316_55%,_#020d08_100%)]'
      : theme === 'traditional'
      ? 'bg-[radial-gradient(circle_at_50%_20%,_#064e3b_0%,_#041f17_55%,_#020c09_100%)]'
      : 'bg-[radial-gradient(circle_at_50%_20%,_#451a03_0%,_#1c1917_55%,_#090807_100%)]';

  return (
    <div
      className={`relative min-h-screen w-full flex flex-col items-center justify-between p-4 sm:p-6 overflow-hidden select-none ${bgGradient}`}
    >
      {/* High-Performance Theme Particle Engine */}
      <AmbientParticles theme={theme} intensity="normal" />
      {/* Pure CSS GPU Ambient Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isSakura
            ? 'radial-gradient(circle at 50% 45%, rgba(244, 114, 182, 0.12) 0%, rgba(225, 29, 72, 0.04) 38%, transparent 68%)'
            : 'radial-gradient(circle at 50% 45%, rgba(245, 158, 11, 0.10) 0%, rgba(56, 189, 248, 0.04) 38%, transparent 68%)'
        }}
      />

      {/* Decorative Geometric Rings */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.05]">
        <div className="w-[680px] h-[680px] rounded-full border-2 border-white" />
        <div className="absolute w-[500px] h-[500px] rounded-full border border-dashed border-white" />
      </div>

      {/* Clean Top Navigation Bar */}
      <header className="relative z-20 w-full max-w-6xl flex items-center justify-between gap-3 px-2 py-1">
        {/* Brand Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/90 border border-white/15 shadow-lg">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-slate-950 font-black text-xs shadow-sm">
            🂡
          </div>
          <span className="font-cyber font-black text-xs sm:text-sm tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-cyan-300">
            PEESHTEE
          </span>
          <span className="hidden sm:inline text-xs font-mono text-slate-400 border-l border-white/10 pl-2">
            PİŞTİ & RENQ
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Profile & Avatar Selector */}
          <button
            onClick={() => handleClick(onOpenProfile)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/90 hover:bg-slate-900 border border-amber-400/40 hover:border-amber-400 text-xs font-bold text-slate-200 transition-all shadow-md group cursor-pointer"
            title="Oyuncu Profilini ve Sabit PP'yi Düzenle"
          >
            <AvatarBadge
              avatarId={userProfile.avatarId}
              customAvatarUrl={userProfile.customAvatarDataUrl}
              size="xs"
              isOwner={userProfile.isOwner}
            />
            <span className="text-amber-300 font-cyber font-black max-w-[85px] sm:max-w-[120px] truncate">
              {userProfile.name}
            </span>
            {userProfile.isOwner && (
              <span
                title="Kurucu"
                className="text-amber-400 select-none text-sm drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]"
              >
                👑
              </span>
            )}
            <span className="hidden sm:inline text-[10px] font-mono text-cyan-400">
              #{userProfile.friendCode}
            </span>
          </button>



          {/* Nasıl Oynanır (Rules) Modal Button */}
          <button
            onClick={() => handleClick(onOpenRules)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 hover:bg-slate-900 border border-white/15 text-xs font-bold text-slate-200 transition-colors shadow-md cursor-pointer"
            title="Nasıl Oynanır & Oyun Kuralları"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Nasıl Oynanır</span>
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={() => handleClick(onOpenSettings)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 hover:bg-slate-900 border border-white/15 text-xs font-bold text-slate-200 transition-colors shadow-md cursor-pointer"
            title="Temalar, Kart Arkaları, Sesler ve Oyun Ayarları"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Ayarlar</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-slate-950/85 hover:bg-slate-900 border border-white/15 text-xs font-bold text-slate-200 transition-colors shadow-md cursor-pointer"
            title={soundEnabled ? 'Sesi Kapat' : 'Sesi Aç'}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            )}
          </button>

          {/* Social (Friends, Requests & Invites) Drawer Button */}
          <button
            onClick={() => handleClick(onOpenFriends)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-400/50 hover:border-emerald-300 text-xs font-black text-emerald-200 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer"
            title="Sosyal — Arkadaşlar, İstekler & Canlı Maç Davetleri"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Sosyal</span>
            {userProfile.incomingFriendRequests && userProfile.incomingFriendRequests.length > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black animate-pulse">
                {userProfile.incomingFriendRequests.length}
              </span>
            ) : userProfile.friends && userProfile.friends.length > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black">
                {userProfile.friends.length}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      {/* Main Hero & Clean 3-Card Mode Selector */}
      <main className="relative z-10 w-full max-w-5xl flex flex-col items-center my-auto py-4">
        {/* Title & Emblem Header */}
        <div className="flex items-center justify-center gap-8 lg:gap-12 w-full mb-6">
          {/* Left Showcase Cards */}
          <div className="hidden xl:flex items-center relative w-32 h-40 pointer-events-none">
            <div className="absolute top-2 left-0 -rotate-12 transition-transform duration-500">
              <CardView card={SHOWCASE_LEFT_CARDS[0]} cardBack={cardBack} size="md" />
            </div>
            <div className="absolute top-6 left-10 rotate-12 transition-transform duration-500">
              <CardView card={SHOWCASE_LEFT_CARDS[1]} cardBack={cardBack} size="md" />
            </div>
          </div>

          {/* Center Title Block */}
          <div className="flex flex-col items-center text-center">
            <div
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest mb-2 shadow-sm ${
                isSakura
                  ? 'bg-pink-950/80 border-pink-400/40 text-pink-200'
                  : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
              }`}
            >
              <Sparkles className="w-3 h-3 text-pink-300" />
              <span>{isSakura ? '🌸 SAKURA SPIRIT • ULTRA HD' : 'PEESHTEE OVERDRIVE'}</span>
            </div>

            <h1
              className={`text-5xl sm:text-7xl font-arcade tracking-wider text-transparent bg-clip-text drop-shadow-[0_4px_25px_rgba(0,0,0,0.8)] ${
                isSakura
                  ? 'bg-gradient-to-b from-white via-pink-200 to-rose-400'
                  : 'bg-gradient-to-b from-white via-amber-200 to-amber-500'
              }`}
            >
              PEESHTEE
            </h1>
            <p
              className={`text-xs sm:text-sm font-cyber tracking-[0.28em] font-black -mt-1 ${
                isSakura ? 'text-pink-300' : 'text-cyan-400'
              }`}
            >
              {isSakura ? 'BLOSSOM SPIRIT & RENQ' : 'PİŞTİ & 108 KART RENQ'}
            </p>
          </div>

          {/* Right Showcase Cards */}
          <div className="hidden xl:flex items-center relative w-32 h-40 pointer-events-none">
            <div className="absolute top-2 right-10 -rotate-12 transition-transform duration-500">
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

        {/* 3 Master Game Mode Cards (Sade, Modern ve Güçlü Düzen) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: TEK OYUNCULU PİŞTİ */}
          <div className="flex flex-col justify-between rounded-3xl bg-slate-950/90 border border-amber-400/30 hover:border-amber-400/70 p-5 sm:p-6 shadow-2xl transition-all duration-200 hover:-translate-y-1 relative group">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 shadow-md">
                  <Swords className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Botlara Karşı
                </span>
              </div>
              <h2 className="text-lg font-black text-white font-cyber tracking-wide mb-1.5">
                TEK OYUNCULU PİŞTİ
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Kurnaz Bot ve Muhtar'a karşı 1v1 veya Dayı ile 4 kişilik eşli masa. 3D kart sayma ve sıfır ışınlanma fiziği!
              </p>

              {/* Target Score Selector inside card */}
              <div className="mb-4 flex items-center justify-between bg-slate-900/90 p-2 rounded-2xl border border-white/10">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  Hedef:
                </span>
                <div className="flex items-center gap-1">
                  {TARGET_SCORES.map(score => (
                    <button
                      key={score}
                      onClick={() => {
                        sound.playClick();
                        setTargetScore(score);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-xs font-black font-cyber transition-colors ${
                        targetScore === score
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dual Action Buttons (1v1 & 4P) */}
            <div className="grid grid-cols-2 gap-2 pt-1">
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
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs font-cyber uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>1v1 DÜELLO</span>
              </button>

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
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-400/40 hover:border-amber-400 font-black text-xs font-cyber uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>4 KİŞİLİK</span>
              </button>
            </div>
          </div>

          {/* Card 2: ONLINE ÇOK OYUNCULU LOBİ */}
          <div className="flex flex-col justify-between rounded-3xl bg-slate-950/90 border border-cyan-400/30 hover:border-cyan-400/70 p-5 sm:p-6 shadow-2xl transition-all duration-200 hover:-translate-y-1 relative group">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 shadow-md">
                  <Globe className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  Online Lobi
                </span>
              </div>
              <h2 className="text-lg font-black text-white font-cyber tracking-wide mb-1.5">
                ONLINE ÇOK OYUNCULU
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                6 haneli oda koduyla arkadaşlarınla canlı oyna! Pişti ve Renq destekli online lobi, canlı sohbet ve emote sistemi.
              </p>
            </div>

            <button
              onClick={() => handleClick(onOpenMultiplayer)}
              className="w-full py-3 px-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs font-cyber uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-transform active:scale-95 cursor-pointer mt-4"
            >
              <Globe className="w-4 h-4" />
              <span>ONLINE LOBİYE KATIL</span>
            </button>
          </div>

          {/* Card 3: 🌈 TAM BAĞIMSIZ RENQ MODU */}
          <div className="flex flex-col justify-between rounded-3xl bg-slate-950/90 border border-red-500/40 hover:border-red-400 p-5 sm:p-6 shadow-[0_0_30px_rgba(239,68,68,0.15)] transition-all duration-200 hover:-translate-y-1 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-28 h-28 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 via-amber-500 to-blue-600 flex items-center justify-center text-white shadow-md font-black italic text-base">
                  RENQ
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-400/40 animate-pulse">
                  Özel Mod
                </span>
              </div>
              <h2 className="text-lg font-black text-white font-cyber tracking-wide mb-1.5">
                🌈 RENQ (Renk Savaşı)
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                108 kartlık efsanevi renk kapışması! +2, +4 Joker, Pas, Yön Değiştir ve 3D kavisli el. Tek kart kalınca <strong>"RENQ!"</strong> demeyi unutma!
              </p>
            </div>

            <button
              onClick={() => handleClick(onStartUnoGame)}
              className="w-full py-3 px-3 rounded-2xl bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 hover:from-red-500 hover:to-emerald-400 text-white font-black text-xs font-cyber uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(239,68,68,0.45)] transition-transform active:scale-95 cursor-pointer mt-4"
            >
              <Flame className="w-4 h-4 text-yellow-300" />
              <span>RENQ OYNA</span>
            </button>
          </div>
        </div>

        {/* Minimal Setup Option Button */}
        <div className="mt-5 flex items-center justify-center">
          <button
            onClick={() => handleClick(onStartSinglePlayer)}
            className="px-4 py-2 rounded-full bg-slate-950/80 hover:bg-slate-900 border border-white/10 hover:border-white/25 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-pink-400" />
            <span>Detaylı Özel Masa Kurulumu</span>
          </button>
        </div>
      </main>

      {/* True Bottom-Right Corner Version Tag */}
      <div className="fixed bottom-3 right-4 sm:bottom-4 sm:right-6 z-30 pointer-events-none select-none">
        <span className="text-xs sm:text-sm font-mono font-bold tracking-widest text-slate-300/80 bg-slate-950/70 px-2.5 py-1 rounded-lg border border-white/10 shadow-md backdrop-blur-sm">
          v1.14.2
        </span>
      </div>
    </div>
  );
};

import React from 'react';
import { Player, TableTheme } from '../types/game';
import { Volume2, VolumeX, Home, Settings, Flame, Shield } from 'lucide-react';
import { AvatarBadge } from './AvatarBadge';
import { getUserProfile } from '../features/profile/profileManager';

interface ScoreBoardProps {
  players: Player[];
  currentTurn: number;
  remainingDeckCount: number;
  targetScore: number;
  round: number;
  soundEnabled: boolean;
  theme: TableTheme;
  fiveRuleEnabled: boolean;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onExitToMenu: () => void;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  players,
  currentTurn,
  remainingDeckCount,
  targetScore,
  round,
  soundEnabled,
  fiveRuleEnabled,
  onToggleSound,
  onOpenSettings,
  onExitToMenu
}) => {
  const user = players[0];
  const isFourPlayers = players.length === 4;

  // In 4-player mode: players[0] and players[1] already hold their team's canonical aggregate scores!
  // Both players[0] and players[2] share userTeamScore; do NOT sum them together to avoid doubling!
  const userTeamScore = user.score;
  const userTeamCards = isFourPlayers
    ? players[0].collectedCards.length + (players[2]?.collectedCards.length || 0)
    : user.collectedCards.length;
  const userTeamPistis = isFourPlayers
    ? players[0].pistiCount + (players[2]?.pistiCount || 0)
    : user.pistiCount;

  const rivalTeamScore = players[1]?.score || 0;
  const rivalTeamCards = isFourPlayers
    ? (players[1]?.collectedCards.length || 0) + (players[3]?.collectedCards.length || 0)
    : players[1]?.collectedCards.length || 0;
  const rivalTeamPistis = isFourPlayers
    ? (players[1]?.pistiCount || 0) + (players[3]?.pistiCount || 0)
    : players[1]?.pistiCount || 0;

  const isUserTeamTurn = currentTurn === 0 || (isFourPlayers && currentTurn === 2);
  const isRivalTeamTurn = currentTurn === 1 || (isFourPlayers && currentTurn === 3);

  return (
    <header className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-1.5 flex items-center justify-between z-20 gap-2">
      {/* Left Side: User / User Team Status Card */}
      <div
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-slate-950/85 border transition-all duration-200 ${
          isUserTeamTurn
            ? 'border-emerald-400/90 shadow-[0_0_18px_rgba(52,211,153,0.3)] bg-emerald-950/60'
            : 'border-white/15 opacity-90'
        }`}
      >
        <div className="relative flex items-center -space-x-2">
          <AvatarBadge
            avatarId={user.avatarId}
            customAvatarUrl={user.customAvatarUrl}
            fallbackEmoji={user.avatar}
            size="md"
            className="z-10 shadow-md"
          />
          {isFourPlayers && players[2] && (
            <AvatarBadge
              avatarId={players[2].avatarId}
              customAvatarUrl={players[2].customAvatarUrl}
              fallbackEmoji={players[2].avatar}
              size="sm"
              className="border-emerald-300/40"
            />
          )}
          {isUserTeamTurn && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping z-20" />
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-xs text-slate-100">
              {isFourPlayers
                ? `Bizim Takım (${user.name} & ${players[2]?.name || 'Ortak'})`
                : user.name}
            </span>
            {(user.customTitle || getUserProfile().customTitle) && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30">
                {user.customTitle || getUserProfile().customTitle}
              </span>
            )}
            {userTeamPistis > 0 && (
              <span className="flex items-center text-[10px] bg-amber-500/30 text-amber-300 px-1.5 py-0.2 rounded-full font-black border border-amber-500/40">
                <Flame className="w-2.5 h-2.5 text-amber-400 mr-0.5 fill-amber-400" />
                {userTeamPistis}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-lg font-arcade text-amber-400 leading-none">
              {userTeamScore}
              <span className="text-[10px] text-slate-400 font-sans font-medium">
                /{targetScore}
              </span>
            </span>
            <span className="text-[10px] text-slate-300 font-semibold bg-black/35 px-1.5 py-0.2 rounded-md border border-white/10">
              📦 {userTeamCards}
            </span>
          </div>
        </div>
      </div>

      {/* Center Match Stats & Quick Actions */}
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-1.5 bg-slate-950/90 border border-white/15 px-3 py-0.5 rounded-full text-[11px] font-semibold shadow-lg">
          <span className="text-amber-400 font-cyber font-black">EL {round}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-200">Deste: {remainingDeckCount}</span>
          {isFourPlayers && (
            <>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-300 font-bold flex items-center gap-0.5 text-[10px]">
                <Shield className="w-2.5 h-2.5" /> 4 Kişilik Eşli
              </span>
            </>
          )}
          {fiveRuleEnabled && (
            <>
              <span className="text-slate-500 hidden sm:inline">•</span>
              <span className="hidden sm:flex text-amber-300 font-bold items-center gap-0.5 text-[10px]">
                <Flame className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> 5'e Basmalı
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-1">
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Sesi Kapat' : 'Sesi Aç'}
            className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors border border-white/15"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            )}
          </button>
          <button
            onClick={onOpenSettings}
            title="Ayarlar"
            className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors border border-white/15"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onExitToMenu}
            title="Menüye Dön"
            className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors border border-white/15"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right Side: Opponent / Rival Team Status Card */}
      <div
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-slate-950/85 border transition-all duration-200 ${
          isRivalTeamTurn
            ? 'border-rose-400/90 shadow-[0_0_18px_rgba(251,113,133,0.3)] bg-rose-950/60'
            : 'border-white/15 opacity-90'
        }`}
      >
        <div className="flex flex-col text-right">
          <div className="flex items-center justify-end gap-1.5">
            {rivalTeamPistis > 0 && (
              <span className="flex items-center text-[10px] bg-amber-500/30 text-amber-300 px-1.5 py-0.2 rounded-full font-black border border-amber-500/40">
                <Flame className="w-2.5 h-2.5 text-amber-400 mr-0.5 fill-amber-400" />
                {rivalTeamPistis}
              </span>
            )}
            <span className="font-bold text-xs text-slate-100">
              {isFourPlayers
                ? `Rakip Takım (${players[1]?.name || 'Rakip'} & ${players[3]?.name || '2. Rakip'})`
                : players[1]?.name || 'Rakip'}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-[10px] text-slate-300 font-semibold bg-black/35 px-1.5 py-0.2 rounded-md border border-white/10">
              {rivalTeamCards} 📦
            </span>
            <span className="text-sm sm:text-lg font-arcade text-rose-400 leading-none">
              {rivalTeamScore}
              <span className="text-[10px] text-slate-400 font-sans font-medium">
                /{targetScore}
              </span>
            </span>
          </div>
        </div>

        <div className="relative flex items-center -space-x-2">
          {players[1] && (
            <AvatarBadge
              avatarId={players[1].avatarId}
              customAvatarUrl={players[1].customAvatarUrl}
              fallbackEmoji={players[1].avatar}
              size="md"
              className="z-10 shadow-md"
            />
          )}
          {isFourPlayers && players[3] && (
            <AvatarBadge
              avatarId={players[3].avatarId}
              customAvatarUrl={players[3].customAvatarUrl}
              fallbackEmoji={players[3].avatar}
              size="sm"
              className="border-rose-300/40"
            />
          )}
          {isRivalTeamTurn && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-400 rounded-full animate-ping z-20" />
          )}
        </div>
      </div>
    </header>
  );
};

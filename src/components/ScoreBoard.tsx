import React from 'react';
import { Player, TableTheme } from '../types/game';
import { Volume2, VolumeX, Home, Settings, Flame, Shield } from 'lucide-react';

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

  // In 4-player mode: Team A = players[0] (Sen) + players[2] (Dayı), Team B = players[1] + players[3]
  const userTeamScore = isFourPlayers
    ? players[0].score + (players[2]?.score || 0)
    : user.score;
  const userTeamCards = isFourPlayers
    ? players[0].collectedCards.length + (players[2]?.collectedCards.length || 0)
    : user.collectedCards.length;
  const userTeamPistis = isFourPlayers
    ? players[0].pistiCount + (players[2]?.pistiCount || 0)
    : user.pistiCount;

  const rivalTeamScore = isFourPlayers
    ? (players[1]?.score || 0) + (players[3]?.score || 0)
    : players[1]?.score || 0;
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
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-base sm:text-lg shadow-md border border-white/25 z-10">
            {user.avatar || '😎'}
          </div>
          {isFourPlayers && players[2] && (
            <div
              title={`Ortağın: ${players[2].name}`}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-800 flex items-center justify-center text-sm shadow-md border border-emerald-300/40"
            >
              {players[2].avatar || '🧔🏻'}
            </div>
          )}
          {isUserTeamTurn && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping z-20" />
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs text-slate-100">
              {isFourPlayers ? 'Bizim Takım (Sen & Dayı)' : user.name}
            </span>
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
              {isFourPlayers ? 'Rakip Takım (Bot & Muhtar)' : players[1]?.name || 'Rakip'}
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
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-rose-600 to-purple-800 flex items-center justify-center text-base sm:text-lg shadow-md border border-white/25 z-10">
            {players[1]?.avatar || '🤖'}
          </div>
          {isFourPlayers && players[3] && (
            <div
              title={`Rakip: ${players[3].name}`}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-purple-700 to-indigo-900 flex items-center justify-center text-sm shadow-md border border-rose-300/40"
            >
              {players[3].avatar || '🦊'}
            </div>
          )}
          {isRivalTeamTurn && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-400 rounded-full animate-ping z-20" />
          )}
        </div>
      </div>
    </header>
  );
};

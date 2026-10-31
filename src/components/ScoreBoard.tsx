import React, { useState, useEffect } from 'react';
import { Player, TableTheme } from '../types/game';
import { Volume2, VolumeX, Home, Settings, Flame, Shield, Layers } from 'lucide-react';
import { AvatarBadge } from './AvatarBadge';
import { getUserProfile, getAvatarPreset } from '../features/profile/profileManager';
import { getLanguage, onLanguageChange, translations, Language } from '../utils/i18n';

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
  const [lang, setLang] = useState<Language>(getLanguage());
  useEffect(() => {
    return onLanguageChange(setLang);
  }, []);
  const t = translations[lang];

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
    <header className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-1.5 min-h-[64px] flex items-center justify-between z-20 gap-2 shrink-0">
      {/* Left Side: User / User Team Status Card */}
      <div
        className={`flex items-center gap-3 px-3.5 py-2 rounded-2xl border-2 backdrop-blur-md transition-colors duration-300 ${
          isUserTeamTurn
            ? 'border-emerald-400/90 shadow-[0_0_24px_rgba(52,211,153,0.35)] bg-emerald-950/70'
            : 'border-white/15 bg-slate-950/80 opacity-90'
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
                ? `${t.ourTeam} (${user.name} & ${players[2]?.name || t.partner})`
                : user.name}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold border border-amber-400/30">
              {user.customTitle || getUserProfile().customTitle || getAvatarPreset(user.avatarId || 'wolf').title}
            </span>
            {userTeamPistis > 0 && (
              <span className="flex items-center text-[10px] bg-amber-500/25 text-amber-300 px-2 py-0.5 rounded-full font-black border border-amber-500/40 shadow-sm">
                <Flame className="w-2.5 h-2.5 text-amber-400 mr-0.5 fill-amber-400" />
                {userTeamPistis}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5 mt-0.5">
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black font-cyber text-amber-300 tracking-tight leading-none">
                {userTeamScore}
              </span>
              <span className="text-[11px] font-bold text-slate-400/80">
                /{targetScore}
              </span>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
              <Layers className="w-3 h-3 text-slate-400" />
              {userTeamCards}
            </span>
          </div>
        </div>
      </div>

      {/* Center Match Stats & Quick Actions */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md border border-white/15 px-3.5 py-1 rounded-full text-xs font-semibold shadow-lg">
          <span className="text-amber-400 font-cyber font-black tracking-wider">{t.roundLabel} {round}</span>
          <span className="text-white/20">•</span>
          <span className="text-slate-200 flex items-center gap-1 font-medium">
            <span className="text-slate-400">{t.deck}:</span> {remainingDeckCount}
          </span>
          {isFourPlayers && (
            <>
              <span className="text-white/20">•</span>
              <span className="text-emerald-300 font-bold flex items-center gap-1 text-[11px]">
                <Shield className="w-3 h-3 text-emerald-400" /> {t.fourPlayerTeam}
              </span>
            </>
          )}
          {fiveRuleEnabled && (
            <>
              <span className="text-white/20 hidden sm:inline">•</span>
              <span className="hidden sm:flex text-amber-300 font-bold items-center gap-1 text-[11px]">
                <Flame className="w-3 h-3 fill-amber-400 text-amber-400" /> {t.instantFives}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleSound}
            title={soundEnabled ? t.soundOff : t.soundOn}
            className="p-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-all border border-white/10 hover:border-white/30 cursor-pointer shadow-sm active:scale-95"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            )}
          </button>
          <button
            onClick={onOpenSettings}
            title={t.settings}
            className="p-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-all border border-white/10 hover:border-white/30 cursor-pointer shadow-sm active:scale-95"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onExitToMenu}
            title={t.exitToMenu}
            className="p-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-all border border-white/10 hover:border-white/30 cursor-pointer shadow-sm active:scale-95"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right Side: Opponent / Rival Team Status Card */}
      <div
        className={`flex items-center gap-3 px-3.5 py-2 rounded-2xl border-2 backdrop-blur-md transition-colors duration-300 ${
          isRivalTeamTurn
            ? 'border-rose-400/90 shadow-[0_0_24px_rgba(251,113,133,0.35)] bg-rose-950/70'
            : 'border-white/15 bg-slate-950/80 opacity-90'
        }`}
      >
        <div className="flex flex-col text-right">
          <div className="flex items-center justify-end gap-1.5 flex-wrap">
            {rivalTeamPistis > 0 && (
              <span className="flex items-center text-[10px] bg-amber-500/25 text-amber-300 px-2 py-0.5 rounded-full font-black border border-amber-500/40 shadow-sm">
                <Flame className="w-2.5 h-2.5 text-amber-400 mr-0.5 fill-amber-400" />
                {rivalTeamPistis}
              </span>
            )}
            <span className="font-bold text-xs text-slate-100">
              {isFourPlayers
                ? `${t.rivalTeam} (${players[1]?.name || t.opponent} & ${players[3]?.name || t.opponent2})`
                : players[1]?.name || t.opponent}
            </span>
            {players[1] && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold border border-amber-400/30">
                {players[1].customTitle || getAvatarPreset(players[1].avatarId || 'lion').title}
              </span>
            )}
          </div>
          <div className="flex items-center justify-end gap-2.5 mt-0.5">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
              {rivalTeamCards}
              <Layers className="w-3 h-3 text-slate-400" />
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black font-cyber text-rose-400 tracking-tight leading-none">
                {rivalTeamScore}
              </span>
              <span className="text-[11px] font-bold text-slate-400/80">
                /{targetScore}
              </span>
            </div>
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

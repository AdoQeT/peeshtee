import React from 'react';
import { UnoCard, UnoColor, UnoPlayer, UnoGameState } from '../unoTypes';
import { getColorName } from '../unoFormatters';
import { AvatarBadge } from '../../../components/AvatarBadge';
import { Language, translations } from '../../../utils/i18n';
import { sound } from '../../../core/audio/soundEngine';
import { AlertTriangle, Trophy, Zap } from 'lucide-react';

interface UnoModalsLayerProps {
  lang: Language;
  wildPickerCard: UnoCard | null;
  userHand: UnoCard[];
  onCancelWildPicker: () => void;
  onSelectWildColor: (color: UnoColor) => void;
  isSurrenderModalOpen: boolean;
  isMultiplayer: boolean;
  onCloseSurrenderModal: () => void;
  onConfirmSurrender: () => void;
  matchAbortedReason: string | null;
  onConfirmMatchAborted: () => void;
  gameState: UnoGameState;
  players: UnoPlayer[];
  isHost: boolean;
  onExitToMenu: () => void;
  onNextRound: () => void;
  onRematch: () => void;
}

export const UnoModalsLayer: React.FC<UnoModalsLayerProps> = ({
  lang,
  wildPickerCard,
  userHand,
  onCancelWildPicker,
  onSelectWildColor,
  isSurrenderModalOpen,
  isMultiplayer,
  onCloseSurrenderModal,
  onConfirmSurrender,
  matchAbortedReason,
  onConfirmMatchAborted,
  gameState,
  players,
  isHost,
  onExitToMenu,
  onNextRound,
  onRematch
}) => {
  const t = translations[lang] || translations.tr;

  return (
    <>
      {/* FLOATING HUD COLOR SELECTOR (Click outside or 'Vazgeç' to cancel) */}
      {wildPickerCard && (
        <div
          onClick={() => {
            sound.playClick();
            onCancelWildPicker();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] cursor-pointer animate-in fade-in duration-150"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="p-5 sm:p-6 rounded-3xl bg-slate-950/95 border-2 border-white/25 shadow-[0_0_80px_rgba(0,0,0,0.95)] backdrop-blur-md text-center max-w-xs sm:max-w-sm w-full animate-in zoom-in-95 duration-200 cursor-default"
          >
            <div className="inline-flex p-2.5 rounded-2xl bg-purple-500/25 border border-purple-400/40 text-purple-300 mb-2 shadow-inner">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>

            <h3 className="text-base sm:text-lg font-black text-white font-cyber mb-0.5">
              {t.renqWildPickerTitle}
            </h3>
            <p className="text-[11px] text-slate-300 mb-4">{t.renqWildPickerSub}</p>

            <div className="grid grid-cols-2 gap-3">
              {(['red', 'blue', 'green', 'yellow'] as UnoColor[]).map(color => {
                const count = userHand.filter(c => c.color === color).length;
                return (
                  <button
                    key={color}
                    onClick={() => onSelectWildColor(color)}
                    className={`py-3 px-2 rounded-2xl text-xs sm:text-sm font-black text-white shadow-xl transition-all duration-150 active:scale-95 cursor-pointer border-2 hover:scale-105 flex flex-col items-center justify-center gap-0.5 ${
                      color === 'red'
                        ? 'bg-gradient-to-br from-red-500 to-rose-700 border-red-300 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                        : color === 'blue'
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-700 border-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.5)]'
                        : color === 'green'
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-700 border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                        : 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 border-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                    }`}
                  >
                    <span>{getColorName(color, lang)}</span>
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        color === 'yellow' ? 'text-slate-900/80' : 'text-white/80'
                      }`}
                    >
                      ({count} {t.renqCardCountSuffix.toLowerCase()})
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onCancelWildPicker();
              }}
              className="mt-3.5 w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-bold transition-all border border-white/10 cursor-pointer"
            >
              {t.renqWildPickerCancel}
            </button>
          </div>
        </div>
      )}

      {/* SURRENDER CONFIRMATION MODAL */}
      {isSurrenderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="p-6 rounded-3xl bg-slate-900 border-2 border-rose-500/80 shadow-[0_0_50px_rgba(244,63,94,0.4)] text-center max-w-sm w-full">
            <div className="inline-flex p-3 rounded-2xl bg-rose-500/20 text-rose-400 mb-3">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mb-2">
              {t.renqSurrenderTitle}
            </h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              {isMultiplayer ? t.renqSurrenderSubMp : t.renqSurrenderSubSolo}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onCloseSurrenderModal}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              >
                {t.renqStayAtTable}
              </button>
              <button
                onClick={onConfirmSurrender}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg cursor-pointer transition-colors"
              >
                {t.renqLeaveMatch}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MATCH ABORTED MODAL */}
      {matchAbortedReason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="p-6 rounded-3xl bg-slate-900 border-2 border-amber-400/80 shadow-[0_0_50px_rgba(245,158,11,0.4)] text-center max-w-sm w-full">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 text-amber-300 mb-3">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mb-2">
              {t.renqMatchAbortedTitle}
            </h3>
            <p className="text-xs text-slate-300 mb-6">{matchAbortedReason}</p>
            <button
              onClick={onConfirmMatchAborted}
              className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-lg cursor-pointer"
            >
              {t.renqReturnToMenu}
            </button>
          </div>
        </div>
      )}

      {/* ROUND END & GAME OVER SUMMARY MODAL */}
      {gameState.isRoundOver && gameState.roundWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border-2 border-amber-400/80 shadow-[0_0_50px_rgba(245,158,11,0.4)] text-center max-w-md w-full">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 mb-3">
              <Trophy className="w-8 h-8" />
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white font-cyber tracking-tight">
              {gameState.isGameOver
                ? `🏆 ${t.renqGameOverTitle}`
                : `🏆 ${gameState.roundWinner.name.toUpperCase()} ${t.renqWinnerSuffix}`}
            </h3>

            <p className="text-xs text-slate-300 mt-2 mb-5">{gameState.lastActionMessage}</p>

            {/* Scoreboard table */}
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 mb-6 space-y-2">
              {players.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-900/60"
                >
                  <div className="flex items-center gap-2">
                    <AvatarBadge
                      avatarId={p.avatarId}
                      customAvatarUrl={p.customAvatarUrl}
                      size="xs"
                    />
                    <span className="font-bold text-white">
                      {p.name} {idx === 0 ? `(${t.youLabel})` : ''}
                    </span>
                  </div>
                  <span className="font-cyber font-black text-amber-300">
                    {p.score} {t.renqPointSuffix}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-3">
              {!gameState.isGameOver ? (
                isMultiplayer && !isHost ? (
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-amber-300 border border-amber-500/30 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span>{t.renqWaitingHostNextRound}</span>
                    </div>
                    <button
                      onClick={() => {
                        sound.playClick();
                        onExitToMenu();
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-slate-300 cursor-pointer"
                    >
                      {t.renqReturnToMenu}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onNextRound}
                    className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-lg cursor-pointer transition-transform active:scale-95"
                  >
                    {t.renqNextRoundBtn}
                  </button>
                )
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={onRematch}
                    className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-lg cursor-pointer transition-transform active:scale-95"
                  >
                    {t.rematchBtn}
                  </button>
                  <button
                    onClick={() => {
                      sound.playClick();
                      onExitToMenu();
                    }}
                    className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-slate-800 hover:bg-slate-700 text-white shadow-lg cursor-pointer transition-transform active:scale-95 border border-white/10"
                  >
                    {t.renqReturnToMenu}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

import React from 'react';
import { IncomingGameInvite } from '../features/friends/friendNetwork';
import { AlertTriangle, Bell, Play, X } from 'lucide-react';

interface GlobalNotificationsLayerProps {
  incomingInvite: IncomingGameInvite | null;
  onDismissInvite: () => void;
  onAcceptInvite: (invite: IncomingGameInvite) => void;
  devToast: string | null;
  onDismissDevToast: () => void;
  devSeeAllHands: boolean;
  isMultiplayerGame: boolean;
  onDisableDevPeek: () => void;
  isSurrenderModalOpen: boolean;
  onCloseSurrenderModal: () => void;
  onConfirmSurrender: () => void;
  matchAbortedInfo: { senderName: string; reason: 'surrender' | 'disconnect' } | null;
  onConfirmMatchAborted: () => void;
}

export const GlobalNotificationsLayer: React.FC<GlobalNotificationsLayerProps> = ({
  incomingInvite,
  onDismissInvite,
  onAcceptInvite,
  devToast,
  onDismissDevToast,
  devSeeAllHands,
  isMultiplayerGame,
  onDisableDevPeek,
  isSurrenderModalOpen,
  onCloseSurrenderModal,
  onConfirmSurrender,
  matchAbortedInfo,
  onConfirmMatchAborted
}) => {
  return (
    <>
      {/* Real-Time Incoming Friend Game Invite Banner */}
      {incomingInvite && (
        <div className="fixed top-4 right-4 z-[60] max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-4 rounded-2xl bg-slate-900/95 border-2 border-emerald-400/90 shadow-[0_15px_45px_rgba(16,185,129,0.45)] backdrop-blur-xl flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shrink-0">
                  <Bell className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white">
                      {incomingInvite.fromName}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                      #{incomingInvite.fromFriendCode}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-300 font-bold mt-0.5">
                    Seni {incomingInvite.gameType === 'uno' ? 'UNO!' : 'PİŞTİ'} masasına davet ediyor!
                  </p>
                </div>
              </div>
              <button
                onClick={onDismissInvite}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onDismissInvite}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Reddet
              </button>
              <button
                onClick={() => onAcceptInvite(incomingInvite)}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Odaya Katıl ({incomingInvite.roomCode})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dev Macro & Game Notification Toast */}
      {devToast && (
        <div
          onClick={onDismissDevToast}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto cursor-pointer animate-in fade-in slide-in-from-top-4 duration-300"
          title="Kapatmak için tıkla"
        >
          <div className="px-4 py-2 rounded-full bg-slate-900/95 border-2 border-cyan-400 text-cyan-300 font-mono text-xs font-black shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center gap-2 hover:bg-slate-800 transition-colors">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            {devToast}
          </div>
        </div>
      )}

      {/* Dev Peek Active Indicator Pill (Clickable to deactivate) */}
      {devSeeAllHands && !isMultiplayerGame && (
        <button
          onClick={onDisableDevPeek}
          title="Kapatmak için tıkla (veya Ctrl+Shift+X / Alt+X)"
          className="fixed bottom-3 right-3 z-40 px-3 py-1.5 rounded-lg bg-cyan-950/90 border border-cyan-400/70 text-cyan-300 font-mono text-[10px] sm:text-xs font-black shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-cyan-900 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>👁️ DEV PEEK AKTİF (Alt+X)</span>
        </button>
      )}

      {/* Surrender Confirmation Modal for Online Multiplayer */}
      {isSurrenderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="p-6 rounded-3xl bg-slate-900 border-2 border-rose-500/80 shadow-[0_0_50px_rgba(244,63,94,0.4)] text-center max-w-sm w-full">
            <div className="inline-flex p-3 rounded-2xl bg-rose-500/20 text-rose-400 mb-3">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mb-2">
              Maçı Terk Etmek İstiyor Musunuz?
            </h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Masadan ayrılırsanız devam eden online maç iptal edilecek ve rakip oyuncu bilgilendirilecektir.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onCloseSurrenderModal}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              >
                Masada Kal
              </button>
              <button
                onClick={onConfirmSurrender}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg cursor-pointer transition-colors"
              >
                Maçı Terk Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Aborted Overlay (When Opponent Surrenders or Disconnects) */}
      {matchAbortedInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="p-6 rounded-3xl bg-slate-900 border-2 border-amber-400/80 shadow-[0_0_50px_rgba(245,158,11,0.4)] text-center max-w-sm w-full">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 text-amber-300 mb-3">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mb-2">
              Maç İptal Edildi
            </h3>
            <p className="text-xs text-slate-300 mb-6">
              {matchAbortedInfo.senderName}{' '}
              {matchAbortedInfo.reason === 'surrender'
                ? 'maçı terk etti.'
                : 'masadan ayrıldı veya bağlantısı koptu.'}
            </p>
            <button
              onClick={onConfirmMatchAborted}
              className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-lg cursor-pointer"
            >
              Ana Menüye Dön
            </button>
          </div>
        </div>
      )}
    </>
  );
};

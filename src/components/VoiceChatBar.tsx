import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, Headphones } from 'lucide-react';
import { voiceChatManager, VoiceState } from '../features/voice/voiceChatManager';
import { sound } from '../core/audio/soundEngine';

interface VoiceChatBarProps {
  isMultiplayer: boolean;
}

export const VoiceChatBar: React.FC<VoiceChatBarProps> = React.memo(({ isMultiplayer }) => {
  const [voice, setVoice] = useState<VoiceState>(voiceChatManager.getState());

  useEffect(() => {
    const unsub = voiceChatManager.subscribe(setVoice);
    return () => {
      unsub();
      if (voiceChatManager.getState().isJoined) {
        voiceChatManager.leaveVoice();
      }
    };
  }, []);

  if (!isMultiplayer) return null;

  return (
    <div className="fixed bottom-3 left-3 z-40 flex items-center gap-1.5">
      {!voice.isJoined ? (
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            void voiceChatManager.joinVoice();
          }}
          className="px-3 py-1.5 rounded-2xl bg-slate-950/80 hover:bg-emerald-950/90 border border-emerald-400/40 text-emerald-300 text-xs font-bold shadow-lg backdrop-blur-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          title="WebRTC Sesli Sohbete Katıl"
        >
          <Headphones className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sesli Sohbet</span>
        </button>
      ) : (
        <div className="flex items-center gap-1 px-2 py-1 rounded-2xl bg-slate-950/90 border border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.25)] backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
          <span className="text-[10px] font-mono font-bold text-emerald-300 pr-1">
            {voice.connectedPeers.length + 1}
          </span>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              voiceChatManager.toggleMute();
            }}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              voice.isMuted
                ? 'bg-rose-600/30 text-rose-300 border border-rose-400/50'
                : 'bg-white/10 hover:bg-white/20 text-emerald-300'
            }`}
            title={voice.isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Sustur'}
          >
            {voice.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              voiceChatManager.toggleDeafen();
            }}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              voice.isDeafened
                ? 'bg-amber-600/30 text-amber-300 border border-amber-400/50'
                : 'bg-white/10 hover:bg-white/20 text-slate-200'
            }`}
            title={voice.isDeafened ? 'Sesi Aç' : 'Gelen Sesi Sustur'}
          >
            {voice.isDeafened ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              voiceChatManager.leaveVoice();
            }}
            className="p-1.5 rounded-xl bg-rose-600/25 hover:bg-rose-600/45 text-rose-300 transition-colors cursor-pointer"
            title="Sesli Sohbetten Ayrıl"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {voice.error && (
        <span className="px-2.5 py-1 rounded-xl bg-rose-950/90 border border-rose-500/40 text-rose-200 text-[10px] font-bold">
          {voice.error}
        </span>
      )}
    </div>
  );
});

import React, { useState } from 'react';
import { X, Users, Target, Flame, Play, Bot } from 'lucide-react';
import { GameSettings, AIDifficulty } from '../types/game';
import { sound } from '../core/audio/soundEngine';

interface GameSetupModalProps {
  isOpen: boolean;
  initialSettings: GameSettings;
  onStartGame: (configuredSettings: GameSettings) => void;
  onClose: () => void;
}

export const GameSetupModal: React.FC<GameSetupModalProps> = ({
  isOpen,
  initialSettings,
  onStartGame,
  onClose
}) => {
  const [playerCount, setPlayerCount] = useState<2 | 4>(initialSettings.playerCount || 2);
  const [targetScore, setTargetScore] = useState<number>(initialSettings.targetScore || 101);
  const [fiveRuleEnabled, setFiveRuleEnabled] = useState<boolean>(
    initialSettings.fiveRuleEnabled ?? false
  );
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>(
    initialSettings.aiDifficulty || 'medium'
  );

  if (!isOpen) return null;

  const handleStart = () => {
    sound.playClick();
    onStartGame({
      ...initialSettings,
      playerCount,
      targetScore,
      fiveRuleEnabled,
      aiDifficulty
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn select-none">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto glass-panel-glow rounded-3xl p-5 sm:p-6 text-slate-100 shadow-2xl border border-white/10">
        {/* Close Button */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Play className="w-4 h-4 fill-amber-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">MASA KURULUMU</h2>
            <p className="text-[11px] text-slate-400">Oyun Modu ve Kural Tercihleri</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* 1. Oyuncu Sayısı */}
          <div>
            <label className="font-bold text-slate-300 mb-2 flex items-center gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              Oyuncu Sayısı
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setPlayerCount(2);
                }}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  playerCount === 2
                    ? 'border-cyan-400 bg-cyan-950/60 ring-1 ring-cyan-400/50 text-white'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <span className="font-bold text-xs">1v1 Düello</span>
                <span className="text-[10px] opacity-75">Sen vs Kurnaz Bot</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setPlayerCount(4);
                }}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  playerCount === 4
                    ? 'border-cyan-400 bg-cyan-950/60 ring-1 ring-cyan-400/50 text-white'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <span className="font-bold text-xs">4 Kişilik Eşli</span>
                <span className="text-[10px] opacity-75">Dayı & Muhtar Masası</span>
              </button>
            </div>
          </div>

          {/* 2. Hedef Puan */}
          <div>
            <label className="font-bold text-slate-300 mb-2 flex items-center gap-1.5 text-xs">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              Hedef Puan
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[51, 101, 151, 201].map(pts => (
                <button
                  key={pts}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setTargetScore(pts);
                  }}
                  className={`py-2 rounded-lg border font-mono font-bold text-xs transition-all cursor-pointer ${
                    targetScore === pts
                      ? 'border-amber-400 bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/60'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {pts}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Bot Zorluğu */}
          <div>
            <label className="font-bold text-slate-300 mb-2 flex items-center gap-1.5 text-xs">
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              Bot Zekası
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'easy', label: 'Rahat' },
                { id: 'medium', label: 'Normal' },
                { id: 'hard', label: 'Usta' }
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setAiDifficulty(d.id as AIDifficulty);
                  }}
                  className={`py-2 rounded-lg border font-bold text-xs transition-all cursor-pointer ${
                    aiDifficulty === d.id
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/50'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. 5'e Basmalı Kuralı */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <span className="font-bold text-white text-xs flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                5'e Basmalı Özel Kuralı
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Yerde tek 5 varken 5 basılırsa Pişti & anında galibiyet (50 Puan). Yerde kart varken +5 ek puan.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setFiveRuleEnabled(!fiveRuleEnabled);
              }}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                fiveRuleEnabled ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  fiveRuleEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Start Game Action Button */}
        <div className="mt-5 pt-3 border-t border-white/10">
          <button
            onClick={handleStart}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:opacity-95 text-slate-950 font-bold text-xs font-cyber tracking-wider transition-all shadow-md cursor-pointer"
          >
            OYUNU BAŞLAT
          </button>
        </div>
      </div>
    </div>
  );
};

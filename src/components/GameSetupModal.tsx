import React, { useState } from 'react';
import { X, Users, Target, Flame, Play, ShieldAlert, Cpu } from 'lucide-react';
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
    initialSettings.fiveRuleEnabled || false
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto glass-panel-glow rounded-3xl p-6 sm:p-8 text-slate-100 shadow-2xl border-amber-500/40">
        {/* Close Button */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 mb-2 shadow-lg">
            <Play className="w-7 h-7 fill-amber-400 ml-0.5" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-cyber text-white">MASA KURULUMU</h2>
          <p className="text-xs text-amber-400/90 font-medium">Oyun kurallarını ve masa dinamiklerini belirle</p>
        </div>

        <div className="space-y-5 text-sm">
          {/* 1. Kaç Kişilik? */}
          <div>
            <label className="font-bold text-white mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Kaç Kişilik Oyun?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setPlayerCount(2);
                }}
                className={`p-3.5 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                  playerCount === 2
                    ? 'border-cyan-400 bg-cyan-950/60 ring-2 ring-cyan-400/50 shadow-lg text-white'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-xl">👥</span>
                <span className="font-black font-cyber text-sm">2 Kişilik</span>
                <span className="text-[11px] opacity-75">Teke Tek (Sen vs Bot)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setPlayerCount(4);
                }}
                className={`p-3.5 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                  playerCount === 4
                    ? 'border-cyan-400 bg-cyan-950/60 ring-2 ring-cyan-400/50 shadow-lg text-white'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <span className="text-xl">👨‍👩‍👧‍👦</span>
                <span className="font-black font-cyber text-sm">4 Kişilik</span>
                <span className="text-[11px] opacity-75">4 Oyuncu Masa Etrafında</span>
              </button>
            </div>
          </div>

          {/* 2. Hedef Puan? */}
          <div>
            <label className="font-bold text-white mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              Hedef Puan Kaç Olsun?
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[51, 101, 151, 201].map(pts => (
                <button
                  key={pts}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setTargetScore(pts);
                  }}
                  className={`py-2.5 rounded-xl border font-cyber font-bold text-xs sm:text-sm transition-all ${
                    targetScore === pts
                      ? 'border-amber-400 bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/60 shadow-md'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {pts} Puan
                </button>
              ))}
            </div>
          </div>

          {/* 3. 5'e Basmalı mı? (Özel Kural) */}
          <div className="bg-gradient-to-r from-red-950/40 via-amber-950/30 to-slate-900 border border-red-500/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-black text-amber-300 flex items-center gap-2 text-sm sm:text-base">
                <Flame className="w-5 h-5 text-red-500 fill-red-500" />
                5'e Basmalı mı?
              </label>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setFiveRuleEnabled(!fiveRuleEnabled);
                }}
                className={`w-14 h-7 rounded-full transition-colors relative flex items-center px-1 ${
                  fiveRuleEnabled ? 'bg-red-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    fiveRuleEnabled ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mt-1">
              {fiveRuleEnabled ? (
                <span className="text-red-300 font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                  <strong>AÇIK:</strong> Yerde tek bir 5 varken, 5 atan oyuncu anında PİŞTİ yapar ve skora bakılmaksızın <strong>maçı direkt KAZANIR!</strong>
                </span>
              ) : (
                <span className="text-slate-400">
                  <strong>KAPALI:</strong> Standart kurallar geçerli. 5 ile pişti yapılsa bile standart 10 puan yazılır.
                </span>
              )}
            </p>
          </div>

          {/* 4. Bot Zorluğu */}
          <div>
            <label className="font-bold text-white mb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              Bot Seviyesi
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'easy', label: 'Acemi' },
                { id: 'medium', label: 'Kurnaz' },
                { id: 'hard', label: 'Şampiyon' }
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setAiDifficulty(d.id as AIDifficulty);
                  }}
                  className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                    aiDifficulty === d.id
                      ? 'border-purple-400 bg-purple-500/20 text-purple-300'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="mt-7">
          <button
            type="button"
            onClick={handleStart}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-slate-950 font-black font-cyber text-base tracking-wider uppercase shadow-[0_0_25px_rgba(245,158,11,0.5)] hover:shadow-[0_0_35px_rgba(245,158,11,0.8)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>MASAYA GEÇ & BAŞLA</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Flame, Zap, Award, BookOpen } from 'lucide-react';
import { sound } from '../core/audio/soundEngine';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'pisti' | 'uno'>('pisti');
  if (!isOpen) return null;

  const handleClose = () => {
    sound.playClick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn select-none">
      <div className="relative w-full max-w-xl max-h-[88vh] overflow-y-auto glass-panel-glow rounded-3xl p-5 sm:p-6 text-slate-100 shadow-2xl border border-white/10">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">OYUN KURALLARI</h2>
            <p className="text-[11px] text-slate-400">Pişti & UNO Puanlama ve Mekanik Rehberi</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-white/10 mb-4">
          <button
            onClick={() => {
              sound.playClick();
              setTab('pisti');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === 'pisti'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🎴 Pişti Kuralları
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setTab('uno');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tab === 'uno'
                ? 'bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🌈 UNO Kuralları
          </button>
        </div>

        {/* Content */}
        {tab === 'pisti' ? (
          <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5 text-xs text-cyan-300">
                <Zap className="w-3.5 h-3.5" />
                Dağıtım & Kart Toplama
              </span>
              <p className="text-slate-400">
                Masanın ortasına 4 kart konulur (ilk 3 kapalı, en üst açık). Herkese 4'er kart dağıtılır. Yerdeki kartla aynı değerde kart atan veya Vale atan yerdeki tüm kartları toplar.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5 text-xs text-purple-300">
                <Award className="w-3.5 h-3.5" />
                Vale (J) Gücü & Pişti
              </span>
              <p className="text-slate-400">
                <strong>Vale:</strong> Yerde kaç kart olursa olsun hepsini süpürür. Yerde tek bir kart varken aynısını atarsan <strong>Pişti (10 Puan)</strong>, Vale üstüne Vale atarsan <strong>Çift Pişti (20 Puan)</strong> kazanırsın.
              </p>
            </div>

            {/* Puan Tablosu */}
            <div>
              <span className="font-bold text-white block mb-2 text-xs">Puanlama Tablosu</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] text-slate-400 block">Karo 10</span>
                  <span className="text-sm font-bold text-amber-300">+3 Puan</span>
                </div>
                <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] text-slate-400 block">Sinek 2</span>
                  <span className="text-sm font-bold text-cyan-300">+2 Puan</span>
                </div>
                <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] text-slate-400 block">As & Vale</span>
                  <span className="text-sm font-bold text-emerald-300">+1 Puan</span>
                </div>
                <div className="bg-slate-900/90 border border-rose-500/30 rounded-xl p-2.5 text-center col-span-3">
                  <span className="text-[10px] text-slate-400 block">Kart Çoğunluğu (27+ Kart Toplayan)</span>
                  <span className="text-sm font-bold text-rose-300">+3 Puan</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5 text-xs text-red-400">
                <Flame className="w-3.5 h-3.5" />
                Kart Eşleştirme & Yön
              </span>
              <p className="text-slate-400">
                Yerdeki kartla aynı renk veya aynı sayıdaki kartı at. Uygun kartın yoksa desteden 1 kart çek.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5 text-xs text-amber-300">
                +2 & +4 Cezaları Birikir (Stacking)
              </span>
              <p className="text-slate-400">
                Birisi +2 attığında elinde +2 veya +4 varsa üstüne basabilirsin! Ceza birikerek sonraki oyuncuya aktarılır.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1">
              <span className="font-bold text-white flex items-center gap-1.5 text-xs text-yellow-300">
                ⚡ Son Karta Düşerken "UNO!"
              </span>
              <p className="text-slate-400">
                Elinde 2 kart varken birini oynayıp tek karta düşeceğin zaman UNO butonuna basmayı unutma! Unutursan 2 kart ceza çekersin.
              </p>
            </div>
          </div>
        )}

        {/* Simple Return Button */}
        <div className="mt-5 pt-3 border-t border-white/10">
          <button
            onClick={handleClose}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Tamam, Anladım
          </button>
        </div>
      </div>
    </div>
  );
};

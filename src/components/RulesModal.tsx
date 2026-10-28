import React from 'react';
import { X, Trophy, Flame, Zap, Award } from 'lucide-react';
import { sound } from '../core/audio/soundEngine';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleClose = () => {
    sound.playClick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-panel-glow rounded-3xl p-6 sm:p-8 text-slate-100 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black font-cyber text-white">PİŞTİ KURALLARI</h2>
            <p className="text-xs text-amber-400 font-medium">Klasik Türk İskambil Oyunu Kural ve Puan Rehberi</p>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
          {/* Dağıtım & Amaç */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <h3 className="font-bold text-white text-base mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Dağıtım ve Tur Akışı
            </h3>
            <p>
              Oyun standart 52 kartlık tek deste ile oynanır. Masanın ortasına 4 kart konulur (ilk 3 kart kapalı, en üstteki 4. kart açık). Her oyuncuya 4'er kart dağıtılır.
            </p>
            <p className="mt-2 text-slate-400">
              Sırası gelen oyuncu elinden bir kart atar. Yerdeki en üstteki kart ile aynı değerde kart atan oyuncu yerdeki tüm kartları toplar!
            </p>
          </div>

          {/* Vale Kuralı */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <h3 className="font-bold text-white text-base mb-2 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              Vale (J) Gücü
            </h3>
            <p>
              <strong>Vale</strong> yerdeki kartların değeri ne olursa olsun masadaki tüm kartları tek hamlede süpürür ve oyuncunun hanesine katar.
            </p>
          </div>

          {/* Pişti Nedir? */}
          <div className="bg-gradient-to-r from-amber-500/10 via-red-500/10 to-transparent border border-amber-500/30 rounded-2xl p-4">
            <h3 className="font-bold text-amber-300 text-base mb-2 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
              Pişti & Çift Pişti
            </h3>
            <ul className="space-y-2">
              <li>
                <span className="text-amber-400 font-bold">Normal Pişti (10 Puan):</span> Yerde sadece <strong>tek bir kart</strong> varken, rakip aynı değerde bir kart atarsa Pişti gerçekleşir.
              </li>
              <li>
                <span className="text-rose-400 font-bold">Çift Pişti (20 Puan):</span> Yerde sadece <strong>tek bir Vale</strong> varken, rakip Vale ile karşılık verirse bu Süper / Çift Pişti sayılır!
              </li>
            </ul>
          </div>

          {/* Puanlama Tablosu */}
          <div>
            <h3 className="font-bold text-white text-base mb-3">Puan Tablosu</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-3 text-center">
                <span className="text-xs text-slate-400 block">Karo 10</span>
                <span className="text-xl font-cyber font-black text-amber-400">+3 Puan</span>
              </div>
              <div className="bg-slate-900/80 border border-cyan-500/30 rounded-xl p-3 text-center">
                <span className="text-xs text-slate-400 block">Sinek 2</span>
                <span className="text-xl font-cyber font-black text-cyan-400">+2 Puan</span>
              </div>
              <div className="bg-slate-900/80 border border-emerald-500/30 rounded-xl p-3 text-center">
                <span className="text-xs text-slate-400 block">Her Bir As (A)</span>
                <span className="text-xl font-cyber font-black text-emerald-400">+1 Puan</span>
              </div>
              <div className="bg-slate-900/80 border border-purple-500/30 rounded-xl p-3 text-center">
                <span className="text-xs text-slate-400 block">Her Bir Vale (J)</span>
                <span className="text-xl font-cyber font-black text-purple-400">+1 Puan</span>
              </div>
              <div className="bg-slate-900/80 border border-rose-500/30 rounded-xl p-3 text-center col-span-2 sm:col-span-2">
                <span className="text-xs text-slate-400 block">Kart Çoğunluğu (27+ Kart)</span>
                <span className="text-xl font-cyber font-black text-rose-400">+3 Puan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Understand Button */}
        <div className="mt-8">
          <button
            onClick={handleClose}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black font-cyber tracking-wider hover:opacity-90 transition-opacity"
          >
            ANLADIM, MASAYA DÖN
          </button>
        </div>
      </div>
    </div>
  );
};

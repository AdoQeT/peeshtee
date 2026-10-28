import React from 'react';
import { DetailedRoundScore } from '../core/rules';
import { Player } from '../types/game';
import { Trophy, Flame, Award, ArrowRight, RotateCcw } from 'lucide-react';
import { sound } from '../core/audio/soundEngine';

interface RoundSummaryModalProps {
  isOpen: boolean;
  user: Player;
  opponent: Player;
  userBreakdown: DetailedRoundScore;
  oppBreakdown: DetailedRoundScore;
  targetScore: number;
  isGameOver: boolean;
  winner: Player | null;
  onNextRound: () => void;
  onRestartGame: () => void;
}

export const RoundSummaryModal: React.FC<RoundSummaryModalProps> = ({
  isOpen,
  user,
  opponent,
  userBreakdown,
  oppBreakdown,
  targetScore,
  isGameOver,
  winner,
  onNextRound,
  onRestartGame
}) => {
  if (!isOpen) return null;

  const isUserWinner = winner?.id === user.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto glass-panel-glow rounded-3xl p-6 sm:p-8 text-slate-100 shadow-2xl">
        {/* Header Banner */}
        <div className="text-center mb-6">
          {isGameOver ? (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 shadow-[0_0_40px_rgba(245,158,11,0.8)] mb-3 animate-bounce">
                <Trophy className="w-8 h-8" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-arcade tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-200 to-amber-500">
                {isUserWinner ? 'TEBRİKLER! ZAFER SENİN!' : `${opponent.name.toUpperCase()} KAZANDI!`}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-cyber mt-1">
                Hedef {targetScore} puana ilk ulaşıldı!
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <h2 className="text-2xl sm:text-3xl font-arcade tracking-wider text-amber-400">
                EL TAMAMLANDI!
              </h2>
              <p className="text-xs text-slate-400 font-cyber">Puan Tablosu ve Tur Özeti</p>
            </div>
          )}
        </div>

        {/* Breakdown Comparison Grid */}
        <div className="space-y-2.5 text-xs sm:text-sm">
          {/* Header Row */}
          <div className="grid grid-cols-3 py-2 px-3 rounded-xl bg-white/5 font-bold text-slate-400 border border-white/5">
            <span>Kategori</span>
            <span className="text-center text-emerald-400">{user.name}</span>
            <span className="text-center text-rose-400">{opponent.name}</span>
          </div>

          {/* Row: Collected Cards & Majority */}
          <div className="grid grid-cols-3 py-2 px-3 rounded-xl bg-slate-900/60 border border-white/5 items-center">
            <span className="text-slate-300">Toplanan Kart</span>
            <span className="text-center font-bold">
              {userBreakdown.cardCount} kart {userBreakdown.majorityPoints > 0 && <span className="text-amber-400 text-xs">(+3)</span>}
            </span>
            <span className="text-center font-bold">
              {oppBreakdown.cardCount} kart {oppBreakdown.majorityPoints > 0 && <span className="text-amber-400 text-xs">(+3)</span>}
            </span>
          </div>

          {/* Row: Piştiler */}
          <div className="grid grid-cols-3 py-2 px-3 rounded-xl bg-slate-900/60 border border-white/5 items-center">
            <span className="flex items-center gap-1 text-slate-300">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Normal Pişti (10p)
            </span>
            <span className="text-center font-bold text-amber-400">
              +{userBreakdown.pistiPoints} p ({user.pistiCount} adet)
            </span>
            <span className="text-center font-bold text-amber-400">
              +{oppBreakdown.pistiPoints} p ({opponent.pistiCount} adet)
            </span>
          </div>

          {/* Row: Çift Pişti */}
          <div className="grid grid-cols-3 py-2 px-3 rounded-xl bg-slate-900/60 border border-white/5 items-center">
            <span className="flex items-center gap-1 text-slate-300">
              <Award className="w-3.5 h-3.5 text-fuchsia-400" /> Çift Pişti (20p)
            </span>
            <span className="text-center font-bold text-fuchsia-400">
              +{userBreakdown.doublePistiPoints} p ({user.doublePistiCount} adet)
            </span>
            <span className="text-center font-bold text-fuchsia-400">
              +{oppBreakdown.doublePistiPoints} p ({opponent.doublePistiCount} adet)
            </span>
          </div>

          {/* Row: Karo 10 & Sinek 2 */}
          <div className="grid grid-cols-3 py-2 px-3 rounded-xl bg-slate-900/60 border border-white/5 items-center">
            <span className="text-slate-300">♦10 (+3) & ♣2 (+2)</span>
            <span className="text-center font-bold text-cyan-300">
              +{userBreakdown.diamonds10Points + userBreakdown.clubs2Points} p
            </span>
            <span className="text-center font-bold text-cyan-300">
              +{oppBreakdown.diamonds10Points + oppBreakdown.clubs2Points} p
            </span>
          </div>

          {/* Row: Aslar & Valeler */}
          <div className="grid grid-cols-3 py-2 px-3 rounded-xl bg-slate-900/60 border border-white/5 items-center">
            <span className="text-slate-300">Aslar (+1) & Valeler (+1)</span>
            <span className="text-center font-bold">
              +{userBreakdown.acesPoints + userBreakdown.jacksPoints} p
            </span>
            <span className="text-center font-bold">
              +{oppBreakdown.acesPoints + oppBreakdown.jacksPoints} p
            </span>
          </div>

          {/* Tur Puanı Toplamı */}
          <div className="grid grid-cols-3 py-2.5 px-3 rounded-xl bg-amber-500/15 border border-amber-500/30 font-bold items-center">
            <span className="text-amber-300 font-cyber">Bu El Alınan:</span>
            <span className="text-center text-emerald-400 font-arcade text-base">
              +{userBreakdown.totalRoundPoints} P
            </span>
            <span className="text-center text-rose-400 font-arcade text-base">
              +{oppBreakdown.totalRoundPoints} P
            </span>
          </div>

          {/* Genel Skor */}
          <div className="grid grid-cols-3 py-3 px-3 rounded-2xl bg-slate-950 border border-white/20 font-black items-center mt-3">
            <span className="text-white font-cyber text-sm">GENEL SKOR:</span>
            <span className="text-center text-emerald-400 font-arcade text-xl">
              {user.score} / {targetScore}
            </span>
            <span className="text-center text-rose-400 font-arcade text-xl">
              {opponent.score} / {targetScore}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8">
          {isGameOver ? (
            <button
              onClick={() => {
                sound.playClick();
                onRestartGame();
              }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black font-cyber tracking-wider text-base uppercase hover:opacity-90 flex items-center justify-center gap-2 shadow-xl"
            >
              <RotateCcw className="w-5 h-5" />
              <span>YENİ OYUN BAŞLAT</span>
            </button>
          ) : (
            <button
              onClick={() => {
                sound.playClick();
                onNextRound();
              }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black font-cyber tracking-wider text-base uppercase hover:opacity-90 flex items-center justify-center gap-2 shadow-xl"
            >
              <span>SONRAKİ ELE GEÇ</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

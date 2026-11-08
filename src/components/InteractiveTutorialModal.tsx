import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle2, ArrowRight, RotateCcw, Trophy, GraduationCap } from 'lucide-react';
import { Card } from '../types/game';
import { CardView } from './CardView';
import { sound } from '../core/audio/soundEngine';
import { getLanguage, onLanguageChange, Language } from '../utils/i18n';
import { getUserProfile, saveUserProfile, UserProfile } from '../features/profile/profileManager';

interface InteractiveTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdate?: (updated: UserProfile) => void;
}

interface TutorialStepConfig {
  id: number;
  titleTr: string;
  titleEn: string;
  descTr: string;
  descEn: string;
  hintTr: string;
  hintEn: string;
  tableCards: Card[];
  handCards: Card[];
  correctCardId: string;
  successBannerTr: string;
  successBannerEn: string;
  pointsLabel: string;
}

const TUTORIAL_STEPS: TutorialStepConfig[] = [
  {
    id: 1,
    titleTr: 'Adım 1/4: Kart Eşleştirme',
    titleEn: 'Step 1/4: Matching Cards',
    descTr:
      'Masadaki en üstteki kartla aynı sayı/sembole sahip bir kart atarsan yerdeki tüm kartları toplarsın.',
    descEn:
      'Play a card with the same rank as the top card on the table to capture the entire pile.',
    hintTr: 'İpucu: Yerdeki ♥ K (Papaz) kartını almak için elindeki ♠ K kartına tıkla!',
    hintEn: 'Hint: Click the ♠ K in your hand to match the ♥ K on the table!',
    tableCards: [
      { id: 'tut-1-t1', suit: 'clubs', value: 4, symbol: '4', basePoints: 0, isSpecial: false, faceUp: false },
      { id: 'tut-1-t2', suit: 'diamonds', value: 8, symbol: '8', basePoints: 0, isSpecial: false, faceUp: false },
      { id: 'tut-1-t3', suit: 'hearts', value: 13, symbol: 'K', basePoints: 0, isSpecial: false, faceUp: true }
    ],
    handCards: [
      { id: 'tut-1-h1', suit: 'spades', value: 13, symbol: 'K', basePoints: 0, isSpecial: false, faceUp: true },
      { id: 'tut-1-h2', suit: 'hearts', value: 6, symbol: '6', basePoints: 0, isSpecial: false, faceUp: true },
      { id: 'tut-1-h3', suit: 'clubs', value: 9, symbol: '9', basePoints: 0, isSpecial: false, faceUp: true }
    ],
    correctCardId: 'tut-1-h1',
    successBannerTr: 'Harika! Aynı sayıyı atarak yerdeki tüm desteyi topladın.',
    successBannerEn: 'Great! You matched the top card and swept the pile.',
    pointsLabel: '+4 Kart'
  },
  {
    id: 2,
    titleTr: 'Adım 2/4: Pişti Vuruşu (+10 Puan)',
    titleEn: 'Step 2/4: Pişti Strike (+10 Pts)',
    descTr:
      'Yerde SADECE TEK BİR KART varken aynı sayıyı atarsan "PİŞTİ" olur ve anında +10 puan kazanırsın!',
    descEn:
      'When there is ONLY ONE card on the table, matching its rank scores a "PİŞTİ" for +10 points!',
    hintTr: 'İpucu: Yerde tek başına duran ♦ 7 kartının üstüne ♣ 7 atarak Pişti yap!',
    hintEn: 'Hint: Play your ♣ 7 onto the single ♦ 7 on the table to score a Pişti!',
    tableCards: [
      { id: 'tut-2-t1', suit: 'diamonds', value: 7, symbol: '7', basePoints: 0, isSpecial: false, faceUp: true }
    ],
    handCards: [
      { id: 'tut-2-h1', suit: 'spades', value: 3, symbol: '3', basePoints: 0, isSpecial: false, faceUp: true },
      { id: 'tut-2-h2', suit: 'clubs', value: 7, symbol: '7', basePoints: 0, isSpecial: false, faceUp: true },
      { id: 'tut-2-h3', suit: 'hearts', value: 12, symbol: 'Q', basePoints: 0, isSpecial: false, faceUp: true }
    ],
    correctCardId: 'tut-2-h2',
    successBannerTr: '🔥 PİŞTİ! Tek karta eşleştiğin için +10 Puan kazandın!',
    successBannerEn: '🔥 PİŞTİ! You matched a single card on the table for +10 Points!',
    pointsLabel: '🔥 +10 Puan PİŞTİ!'
  },
  {
    id: 3,
    titleTr: 'Adım 3/4: Vale (J) ile Süpürme',
    titleEn: 'Step 3/4: Jack (J) Sweep',
    descTr:
      'Vale (J) joker gibidir: Yerde hangi kart olursa olsun, Vale attığında yerdeki tüm kartları süpürürsün!',
    descEn:
      'Jacks (J) are wild sweepers: playing a Jack captures all cards on the table regardless of the top rank!',
    hintTr: 'İpucu: Yerdeki birikmiş kartları toplamak için elindeki ♠ J (Vale) kartını oyna!',
    hintEn: 'Hint: Play the ♠ J (Jack) from your hand to sweep the entire table!',
    tableCards: [
      { id: 'tut-3-t1', suit: 'hearts', value: 1, symbol: 'A', basePoints: 1, isSpecial: true, faceUp: false },
      { id: 'tut-3-t2', suit: 'clubs', value: 2, symbol: '2', basePoints: 2, isSpecial: true, faceUp: false },
      { id: 'tut-3-t3', suit: 'spades', value: 10, symbol: '10', basePoints: 0, isSpecial: false, faceUp: true }
    ],
    handCards: [
      { id: 'tut-3-h1', suit: 'diamonds', value: 5, symbol: '5', basePoints: 0, isSpecial: false, faceUp: true },
      { id: 'tut-3-h2', suit: 'spades', value: 11, symbol: 'J', basePoints: 1, isSpecial: true, faceUp: true },
      { id: 'tut-3-h3', suit: 'hearts', value: 8, symbol: '8', basePoints: 0, isSpecial: false, faceUp: true }
    ],
    correctCardId: 'tut-3-h2',
    successBannerTr: '🃏 VALE SÜPÜRDÜ! Yerdeki değerli kartların hepsini hanene kattın.',
    successBannerEn: '🃏 JACK SWEEP! You collected all the cards on the table.',
    pointsLabel: '🃏 Vale Süpürdü (+4p)'
  },
  {
    id: 4,
    titleTr: 'Adım 4/4: Özel Puanlı Kartlar',
    titleEn: 'Step 4/4: High-Value Point Cards',
    descTr:
      'Karo 10 (♦10) = +3 Puan, Sinek 2 (♣2) = +2 Puan, As (A) ve Vale (J) = +1 Puan değerindedir. Ayrıca el sonunda en çok kart toplayan +3 Kart Çoğunluğu puanı alır!',
    descEn:
      '♦10 is worth +3 pts, ♣2 is worth +2 pts, and each Ace (A) or Jack (J) is worth +1 pt. Collecting the most cards at round end awards +3 Majority points!',
    hintTr: 'İpucu: Yerdeki ♦10 (+3 Puan) kartını kaçırmamak için elindeki ♥10 ile eşleştir!',
    hintEn: 'Hint: Match the ♦10 (+3 Points) on the table by playing your ♥10!',
    tableCards: [
      { id: 'tut-4-t1', suit: 'clubs', value: 2, symbol: '2', basePoints: 2, isSpecial: true, faceUp: false },
      { id: 'tut-4-t2', suit: 'diamonds', value: 10, symbol: '10', basePoints: 3, isSpecial: true, faceUp: true }
    ],
    handCards: [
      { id: 'tut-4-h1', suit: 'hearts', value: 10, symbol: '10', basePoints: 0, isSpecial: false, faceUp: true },
      { id: 'tut-4-h2', suit: 'spades', value: 4, symbol: '4', basePoints: 0, isSpecial: false, faceUp: true }
    ],
    correctCardId: 'tut-4-h1',
    successBannerTr: '💎 Süper! Hem ♦10 (+3p) hem de altındaki ♣2 (+2p) kartını topladın!',
    successBannerEn: '💎 Awesome! You captured both ♦10 (+3p) and ♣2 (+2p) underneath!',
    pointsLabel: '💎 +5 Puan Hazine!'
  }
];

const TUTORIAL_STORAGE_KEY = 'project_p_tutorial_completed_v1';

export const InteractiveTutorialModal: React.FC<InteractiveTutorialModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdate
}) => {
  const [lang, setLang] = useState<Language>(getLanguage());
  const [stepIdx, setStepIdx] = useState(0);
  const [stepCompleted, setStepCompleted] = useState(false);
  const [wrongFeedback, setWrongFeedback] = useState(false);
  const [allFinished, setAllFinished] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);

  useEffect(() => {
    return onLanguageChange(setLang);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStepIdx(0);
      setStepCompleted(false);
      setWrongFeedback(false);
      setAllFinished(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isTr = lang === 'tr';
  const currentStep = TUTORIAL_STEPS[stepIdx];

  const handleCardClick = (card: Card) => {
    if (stepCompleted) return;
    if (card.id === currentStep.correctCardId) {
      setWrongFeedback(false);
      setStepCompleted(true);
      if (currentStep.id === 2) {
        sound.playPistiSlam();
      } else if (currentStep.id === 3) {
        sound.playJackSweep();
      } else {
        sound.playMatchSweep();
      }
    } else {
      sound.playClick();
      setWrongFeedback(true);
      window.setTimeout(() => setWrongFeedback(false), 1200);
    }
  };

  const handleNextStep = () => {
    sound.playClick();
    if (stepIdx < TUTORIAL_STEPS.length - 1) {
      setStepIdx(prev => prev + 1);
      setStepCompleted(false);
      setWrongFeedback(false);
    } else {
      // Complete tutorial & grant one-time +100 XP bonus
      try {
        const alreadyDone = localStorage.getItem(TUTORIAL_STORAGE_KEY);
        if (!alreadyDone) {
          localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
          const profile = getUserProfile();
          const newXp = (profile.xp || 0) + 100;
          const updated: UserProfile = {
            ...profile,
            xp: newXp,
            level: Math.max(profile.level || 1, Math.floor(newXp / 200) + 1)
          };
          saveUserProfile(updated);
          onProfileUpdate?.(updated);
          setXpAwarded(true);
        }
      } catch {}
      sound.playPointCardChime(3);
      setAllFinished(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-xl rounded-3xl bg-slate-950/95 border border-amber-400/30 p-5 sm:p-6 text-slate-100 shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden">
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
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400/20 to-emerald-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white font-cyber tracking-wide">
              {isTr ? 'ETKİLEŞİMLİ PİŞTİ EĞİTİMİ' : 'INTERACTIVE PİŞTİ TUTORIAL'}
            </h2>
            <p className="text-[11px] text-amber-300/80 font-medium">
              {isTr ? 'Kartlara tıklayarak 1 dakikada ustalaş' : 'Master the rules in 1 minute by playing'}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {TUTORIAL_STEPS.map((s, idx) => (
            <div
              key={s.id}
              className={`h-1.5 rounded-full transition-all ${
                allFinished || idx < stepIdx
                  ? 'bg-emerald-400'
                  : idx === stepIdx
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-slate-800'
              }`}
            />
          ))}
        </div>

        {allFinished ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center mx-auto shadow-lg">
              <Trophy className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white font-cyber">
              {isTr ? 'Tebrikler, Eğitimi Tamamladın!' : 'Congratulations, Tutorial Complete!'}
            </h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              {isTr
                ? 'Artık kart eşleştirmeyi, Pişti (+10p) yapmayı, Vale ile masayı süpürmeyi ve özel puanlı kartları biliyorsun. Kıraathane masalarında şansın bol olsun!'
                : 'You now know how to match ranks, score Pişti (+10p), sweep with Jacks, and count special point cards. Good luck at the tables!'}
            </p>
            {xpAwarded && (
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 text-xs font-black">
                <Sparkles className="w-4 h-4" />
                <span>+100 XP Eğitim Ödülü Kazandın!</span>
              </div>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  sound.playClick();
                  setStepIdx(0);
                  setStepCompleted(false);
                  setAllFinished(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isTr ? 'Tekrar Oyna' : 'Replay'}</span>
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  onClose();
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-black text-xs font-cyber cursor-pointer shadow-lg"
              >
                {isTr ? 'Masaya Geç!' : 'Start Playing!'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Step Instruction Box */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-1">
              <div className="text-xs sm:text-sm font-black text-amber-300 font-cyber">
                {isTr ? currentStep.titleTr : currentStep.titleEn}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isTr ? currentStep.descTr : currentStep.descEn}
              </p>
            </div>

            {/* Interactive Mini Felt Table */}
            <div className="relative rounded-2xl bg-gradient-to-b from-emerald-950 via-emerald-900/90 to-slate-950 border border-emerald-500/30 p-4 flex flex-col items-center justify-between min-h-[250px] shadow-inner">
              {/* Center Table Pile */}
              <div className="flex flex-col items-center gap-1.5 my-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/80">
                  {isTr ? 'Masadaki Kartlar' : 'Table Pile'}
                </span>
                <div className="relative h-28 w-24 flex items-center justify-center">
                  {stepCompleted ? (
                    <div className="px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-200 text-xs font-black animate-bounce whitespace-nowrap">
                      {currentStep.pointsLabel}
                    </div>
                  ) : (
                    currentStep.tableCards.map((tc, i) => (
                      <div
                        key={tc.id}
                        className="absolute transition-transform"
                        style={{
                          transform: `translate(${(i - 1) * 6}px, ${(i - 1) * -3}px) rotate(${(i - 1) * 5}deg)`,
                          zIndex: i + 1
                        }}
                      >
                        <CardView card={tc} size="sm" />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Hint / Feedback Banner */}
              <div className="my-2 text-center">
                {stepCompleted ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{isTr ? currentStep.successBannerTr : currentStep.successBannerEn}</span>
                  </div>
                ) : wrongFeedback ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/25 border border-rose-400/50 text-rose-200 text-xs font-bold animate-shake">
                    <span>
                      {isTr
                        ? 'Bu kart yerdeki kartı almıyor! İpucuna göre doğru kartı seç.'
                        : 'That card does not capture the pile! Check the hint below.'}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] font-bold text-amber-300 bg-slate-950/70 px-3 py-1 rounded-full border border-amber-400/30">
                    {isTr ? currentStep.hintTr : currentStep.hintEn}
                  </span>
                )}
              </div>

              {/* Player Hand */}
              <div className="flex flex-col items-center gap-1.5 w-full pt-2 border-t border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  {isTr ? 'Senin Elin (Oynamak İçin Tıkla)' : 'Your Hand (Click to Play)'}
                </span>
                <div className="flex items-center justify-center gap-3">
                  {currentStep.handCards.map(hc => {
                    const isCorrect = hc.id === currentStep.correctCardId;
                    if (stepCompleted && isCorrect) return null;
                    return (
                      <div
                        key={hc.id}
                        className={`transition-transform ${
                          !stepCompleted && isCorrect
                            ? 'hover:-translate-y-2 ring-2 ring-amber-400 rounded-lg shadow-[0_0_15px_rgba(251,191,36,0.45)]'
                            : 'opacity-85 hover:-translate-y-1'
                        }`}
                      >
                        <CardView
                          card={hc}
                          size="sm"
                          isPlayable={!stepCompleted}
                          onClick={() => handleCardClick(hc)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400 font-mono">
                {stepIdx + 1} / {TUTORIAL_STEPS.length}
              </span>
              <button
                onClick={handleNextStep}
                disabled={!stepCompleted}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 disabled:opacity-35 text-slate-950 font-black text-xs font-cyber flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
              >
                <span>
                  {stepIdx === TUTORIAL_STEPS.length - 1
                    ? isTr
                      ? 'Eğitimi Bitir'
                      : 'Finish Tutorial'
                    : isTr
                    ? 'Sonraki Adım'
                    : 'Next Step'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

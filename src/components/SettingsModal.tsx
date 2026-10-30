import React, { useState } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Sliders,
  Palette,
  Activity,
  Sparkles,
  Trophy,
  Bot,
  Flame,
  Globe
} from 'lucide-react';
import { GameSettings, TableTheme, AIDifficulty, getCardBackForTheme } from '../types/game';
import { sound } from '../core/audio/soundEngine';
import { getLanguage, setLanguage, Language } from '../utils/i18n';

interface SettingsModalProps {
  isOpen: boolean;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'themes' | 'audio' | 'rules'>('themes');
  const [lang, setLang] = useState<Language>(getLanguage());

  if (!isOpen) return null;

  const handleClose = () => {
    sound.playClick();
    onClose();
  };

  const themes: { id: TableTheme; name: string; subtitle: string; preview: string; badge: string; cardDesc: string }[] = [
    {
      id: 'estoril_blue',
      name: 'Estoril Blue',
      subtitle: 'Safir Metalik & Dinamik Neon Efektleri',
      preview: 'from-[#0284c7] via-[#034d82] to-[#021226] border-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.5)]',
      badge: 'M-POWER',
      cardDesc: 'Estoril Sport Kart & Çift Yarış Deseni'
    },
    {
      id: 'alpine_white',
      name: 'Alpine White',
      subtitle: 'Beyaz Mermer Çuha & Platin İşleme',
      preview: 'from-[#e2e8f0] via-[#94a3b8] to-[#334155] border-slate-300 text-slate-900',
      badge: 'PLATINUM',
      cardDesc: 'Alpine Platinum Kart & Fildişi Doku'
    },
    {
      id: 'melbourne_red',
      name: 'Melbourne Red',
      subtitle: 'Derin Metalik Kırmızı & Altın Dikiş',
      preview: 'from-[#8a0e1b] via-[#57050e] to-[#1c0205] border-red-400/80',
      badge: 'SPEED',
      cardDesc: 'Melbourne Speed Kart & Yakut Bordür'
    },
    {
      id: 'monaco_velvet',
      name: 'Monaco Velvet',
      subtitle: 'Monte Carlo Royale & Gece Moru & Kraliyet Altını',
      preview: 'from-[#3b0764] via-[#240440] to-[#0f011a] border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]',
      badge: 'ROYALE',
      cardDesc: 'Monaco Royal Kart & Altın Kraliyet Tacı'
    },
    {
      id: 'traditional',
      name: 'Zümrüt Kıraathane',
      subtitle: 'Klasik Yeşil Çuha & Maun Ağacı',
      preview: 'from-[#0d422e] via-[#082a1d] to-[#04170f] border-emerald-500/60',
      badge: 'KLASİK',
      cardDesc: 'Klasik Bicycle Mavi Kart Arkası'
    },
    {
      id: 'sakura',
      name: 'Sakura Spirit',
      subtitle: 'Gece Kiraz Çiçeği & Mürdüm Kadife',
      preview: 'from-[#3b0a28] via-[#220625] to-[#120317] border-pink-400/60',
      badge: 'ZARİF',
      cardDesc: 'Sakura Çiçek Monogramı Pembe Kart'
    },
    {
      id: 'luxury_gold',
      name: 'Lüks Varak',
      subtitle: 'Casino Royale & 24k Altın İşleme',
      preview: 'from-[#381408] via-[#21090d] to-[#0d0407] border-amber-500/60',
      badge: 'VIP',
      cardDesc: '24k Altın Folyo & Varak Ejderha'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col glass-panel-glow rounded-3xl p-6 sm:p-7 text-slate-100 shadow-2xl border border-white/15 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-purple-300">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">AYARLAR</h2>
            <p className="text-[11px] text-slate-400">Masa Teması, Ses, Dil ve Oyun Tercihleri</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-white/10 mb-5 shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('themes');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'themes' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Masa & Kart</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('audio');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'audio' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Ses & Dil</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('rules');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'rules' ? 'bg-purple-500 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Kurallar & FX</span>
          </button>
        </div>

        {/* Tab Contents (Scrollable Area) */}
        <div className="overflow-y-auto space-y-5 text-sm pr-1 flex-1">
          {/* TAB 1: MASA TEMASI */}
          {activeTab === 'themes' && (
            <div className="space-y-5">
              {/* Masa Teması Seçici */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="font-bold text-white flex items-center gap-2 text-xs sm:text-sm">
                    <Palette className="w-4 h-4 text-amber-400" />
                    Masa Çuhası & Özel Tema
                  </label>
                  <span className="text-[11px] text-amber-300 font-mono font-bold">
                    {themes.find(t => t.id === settings.theme)?.name}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {themes.map(t => {
                    const isSelected = settings.theme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          sound.playClick();
                          const matchingCardBack = getCardBackForTheme(t.id);
                          onUpdateSettings({ theme: t.id, cardBack: matchingCardBack });
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden bg-gradient-to-br cursor-pointer ${t.preview} ${
                          isSelected
                            ? 'ring-2 ring-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-[1.01]'
                            : 'opacity-70 hover:opacity-100 hover:border-white/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-xs sm:text-sm text-white font-cyber tracking-wide">
                            {t.name}
                          </span>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/10 text-slate-200 border border-white/20">
                            {t.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300/80 font-sans">{t.subtitle}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Temaya Özel Kart Deseni Bilgisi */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 text-sm shadow-sm">
                    🂠
                  </div>
                  <div>
                    <span className="font-bold text-xs text-white block">
                      Otomatik Özgün Kart Seti
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {themes.find(t => t.id === settings.theme)?.cardDesc || 'Temaya özel el yapımı kart deseni'}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 text-[10px] font-mono font-bold shrink-0">
                  AKTİF EŞLEŞTİRİLDİ
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: SES & DİL */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              {/* Dil Tercihi */}
              <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-sky-400" />
                  <div>
                    <span className="font-bold text-xs sm:text-sm block text-white">Dil Seçimi / Language</span>
                    <span className="text-[11px] text-slate-400">Arayüz dili</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-white/10">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setLanguage('tr');
                      setLang('tr');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      lang === 'tr' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🇹🇷 TR
                  </button>
                  <button
                    onClick={() => {
                      sound.playClick();
                      setLanguage('en');
                      setLang('en');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      lang === 'en' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🇬🇧 EN
                  </button>
                </div>
              </div>

              {/* Master Ses Efektleri */}
              <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {settings.soundEnabled ? (
                      <Volume2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-rose-400" />
                    )}
                    <div>
                      <span className="font-bold text-xs sm:text-sm block text-white">Oyun Ses Efektleri</span>
                      <span className="text-[11px] text-slate-400">Kart atma, süpürme ve pişti sesleri</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newVal = !settings.soundEnabled;
                      sound.setEnabled(newVal);
                      if (newVal) sound.playClick();
                      onUpdateSettings({ soundEnabled: newVal });
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                      settings.soundEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Volume Slider */}
                {settings.soundEnabled && (
                  <div className="space-y-1.5 pt-2 border-t border-white/10">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span className="font-medium">Ses Düzeyi</span>
                      <span className="font-mono font-bold text-emerald-300">{Math.round(settings.sfxVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.sfxVolume}
                      onChange={e => {
                        const vol = parseFloat(e.target.value);
                        sound.setVolume(vol);
                        onUpdateSettings({ sfxVolume: vol });
                      }}
                      className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Background Ambience Selector */}
              <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs sm:text-sm text-white block">Arka Plan Ambiyansı</span>
                    <span className="text-[11px] text-slate-400">Ortam arka plan sesleri</span>
                  </div>
                  <span className="text-xs text-purple-300 font-mono font-bold">
                    {settings.ambience === 'cafe'
                      ? '☕ Kıraathane'
                      : settings.ambience === 'rain'
                      ? '🌧️ Yağmur'
                      : settings.ambience === 'jazz'
                      ? '🎷 Gece Cazı'
                      : '🔇 Sessiz'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'none', label: 'Sessiz', icon: '🔇' },
                    { id: 'cafe', label: 'Kıraathane', icon: '☕' },
                    { id: 'rain', label: 'Yağmur', icon: '🌧️' },
                    { id: 'jazz', label: 'Gece Cazı', icon: '🎷' }
                  ].map(amb => (
                    <button
                      key={amb.id}
                      onClick={() => {
                        sound.playClick();
                        const nextAmb = amb.id as any;
                        sound.setAmbience(nextAmb);
                        onUpdateSettings({ ambience: nextAmb });
                      }}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        settings.ambience === amb.id
                          ? 'border-purple-400 bg-purple-500/25 text-white shadow-md'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{amb.icon}</span>
                      <span>{amb.label}</span>
                    </button>
                  ))}
                </div>

                {settings.ambience !== 'none' && (
                  <div className="space-y-1 pt-2 border-t border-white/10">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Ambiyans Düzeyi</span>
                      <span className="font-mono font-bold text-purple-300">
                        {Math.round((settings.ambienceVolume ?? 0.25) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.ambienceVolume ?? 0.25}
                      onChange={e => {
                        const vol = parseFloat(e.target.value);
                        sound.setAmbienceVolume(vol);
                        onUpdateSettings({ ambienceVolume: vol });
                      }}
                      className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: OYUN KURALLARI & FX */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              {/* Hedef Puan */}
              <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    Varsayılan Hedef Puan
                  </span>
                  <span className="text-xs font-mono text-amber-300 font-bold">
                    {settings.targetScore} Puan
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[51, 101, 151, 201].map(pts => (
                    <button
                      key={pts}
                      onClick={() => {
                        sound.playClick();
                        onUpdateSettings({ targetScore: pts });
                      }}
                      className={`py-2 rounded-xl text-xs font-black font-cyber transition-all cursor-pointer ${
                        settings.targetScore === pts
                          ? 'bg-amber-400 text-slate-950 shadow-md scale-[1.02]'
                          : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      {pts}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bot Zorluğu */}
              <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-cyan-400" />
                    Bot Yapay Zeka Düzeyi
                  </span>
                  <span className="text-xs text-cyan-300 font-bold">
                    {settings.aiDifficulty === 'hard'
                      ? 'Usta'
                      : settings.aiDifficulty === 'medium'
                      ? 'Normal'
                      : 'Rahat'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {(
                    [
                      { id: 'easy', label: 'Rahat' },
                      { id: 'medium', label: 'Normal' },
                      { id: 'hard', label: 'Usta' }
                    ] as const
                  ).map(b => (
                    <button
                      key={b.id}
                      onClick={() => {
                        sound.playClick();
                        onUpdateSettings({ aiDifficulty: b.id as AIDifficulty });
                      }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        settings.aiDifficulty === b.id
                          ? 'bg-cyan-500 text-slate-950 font-black shadow-md scale-[1.02]'
                          : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5'e Basmalı & Görsel FX Toggles */}
              <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-3.5">
                {/* 5'e Basmalı Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5 text-white">
                      <Flame className="w-4 h-4 text-amber-400" />
                      5'e Basmalı Kuralı
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Yerde tek 5 varken 5 atılırsa Pişti & anında maç kazanılır (+50 Puan).
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      sound.playClick();
                      onUpdateSettings({ fiveRuleEnabled: !settings.fiveRuleEnabled });
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                      settings.fiveRuleEnabled ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        settings.fiveRuleEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="border-t border-white/10 pt-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5 text-white">
                      <Activity className="w-4 h-4 text-pink-400" />
                      Ekran Sarsıntısı
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Pişti anında masa sarsıntı efekti
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      sound.playClick();
                      onUpdateSettings({ screenShake: !settings.screenShake });
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                      settings.screenShake ? 'bg-pink-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        settings.screenShake ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="border-t border-white/10 pt-3.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5 text-white">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      Görsel Parçacık Efektleri
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Masa ve kart animasyon efektleri
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      sound.playClick();
                      onUpdateSettings({ particlesEnabled: !settings.particlesEnabled });
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                      settings.particlesEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        settings.particlesEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save & Return Button */}
        <div className="mt-5 pt-3 border-t border-white/10 shrink-0">
          <button
            onClick={handleClose}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Tamam, Ayarları Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

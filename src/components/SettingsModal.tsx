import React from 'react';
import { X, Volume2, VolumeX, Sliders, Palette, Zap, Activity } from 'lucide-react';
import { GameSettings, TableTheme } from '../types/game';
import { sound } from '../core/audio/soundEngine';

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
  if (!isOpen) return null;

  const handleClose = () => {
    sound.playClick();
    onClose();
  };

  const themes: { id: TableTheme; name: string; subtitle: string; preview: string; badge: string }[] = [
    {
      id: 'traditional',
      name: 'Zümrüt Kıraathane',
      subtitle: 'Klasik Yeşil Çuha & Maun Ağacı',
      preview: 'from-[#0d422e] via-[#082a1d] to-[#04170f] border-emerald-500/60',
      badge: 'KLASİK'
    },
    {
      id: 'sakura',
      name: 'Sakura Spirit',
      subtitle: 'Gece Kiraz Çiçeği & Mürdüm Kadife',
      preview: 'from-[#3b0a28] via-[#220625] to-[#120317] border-pink-400/60',
      badge: 'ZARİF'
    },
    {
      id: 'luxury_gold',
      name: 'Lüks Varak',
      subtitle: 'Casino Royale & Altın İşleme',
      preview: 'from-[#381408] via-[#21090d] to-[#0d0407] border-amber-500/60',
      badge: 'VIP'
    },
    {
      id: 'cyberpunk',
      name: 'Siber Neon',
      subtitle: 'Karanlık Sentetik Izgara & Turkuaz',
      preview: 'from-[#1e1b4b] via-[#0f172a] to-[#030712] border-cyan-400/60',
      badge: 'NEON'
    },
    {
      id: 'cosmic',
      name: 'Kozmik Derinlik',
      subtitle: 'Derin Uzay Bulutsusu & Yıldız Tozu',
      preview: 'from-[#2e1065] via-[#0f172a] to-[#020617] border-indigo-400/60',
      badge: 'UZAY'
    }
  ];

  const cardBacks = [
    {
      id: 'classic_blue',
      name: 'Klasik Mavi',
      desc: 'Geleneksel Çift Kenar',
      bg: 'bg-gradient-to-br from-blue-700 via-blue-900 to-slate-950 border-blue-400'
    },
    {
      id: 'sakura_blossom',
      name: 'Sakura Ruh',
      desc: 'Kiraz Çiçeği Rozeti',
      bg: 'bg-gradient-to-br from-[#3b0a28] via-[#1f0726] to-[#0f0318] border-pink-400'
    },
    {
      id: 'gold_dragon',
      name: 'Altın Ejder',
      desc: 'VIP Altın Folyo & Varak',
      bg: 'bg-gradient-to-br from-amber-800 via-stone-900 to-black border-amber-400'
    },
    {
      id: 'cyber_neon',
      name: 'Siber Neon',
      desc: 'Yüksek Frekanslı Devre',
      bg: 'bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-950 border-cyan-400'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto glass-panel-glow rounded-3xl p-6 sm:p-7 text-slate-100 shadow-2xl border-white/15">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-lg">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black font-cyber text-white">GENEL AYARLAR</h2>
            <p className="text-xs text-purple-300 font-medium">Görsel Atmosfer, Ses ve Efekt Tercihleri</p>
          </div>
        </div>

        <div className="space-y-6 text-sm">
          {/* 1. Masa Teması */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="font-bold text-white flex items-center gap-2 text-xs sm:text-sm">
                <Palette className="w-4 h-4 text-amber-400" />
                Masa Çuhası & Atmosfer
              </label>
              <span className="text-[11px] text-slate-400">
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
                      onUpdateSettings({ theme: t.id });
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden bg-gradient-to-br ${t.preview} ${
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

          {/* 2. Kart Arkası Deseni */}
          <div>
            <label className="font-bold text-white mb-2.5 flex items-center gap-2 text-xs sm:text-sm">
              <Zap className="w-4 h-4 text-cyan-400" />
              Deste & Kart Arkası Deseni
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {cardBacks.map(cb => {
                const isSelected = settings.cardBack === cb.id;
                return (
                  <button
                    key={cb.id}
                    onClick={() => {
                      sound.playClick();
                      onUpdateSettings({ cardBack: cb.id });
                    }}
                    className={`p-3 rounded-2xl border flex flex-col items-center text-center gap-2 transition-all ${
                      isSelected
                        ? 'border-cyan-400 ring-2 ring-cyan-400/50 bg-cyan-950/40 shadow-lg'
                        : 'border-white/10 hover:border-white/30 bg-white/5 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className={`w-10 h-14 rounded-lg ${cb.bg} border-2 shadow-md flex items-center justify-center`}>
                      <span className="font-arcade text-[10px] text-white/70">P</span>
                    </div>
                    <div>
                      <span className="font-bold text-xs text-white block">{cb.name}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{cb.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Ses & Akustik Ayarları */}
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                )}
                <div>
                  <span className="font-bold text-xs sm:text-sm block">Prosedürel Masa Ses Efektleri</span>
                  <span className="text-[11px] text-slate-400">Kart hışırtısı, masaya koyma, süpürme ve pişti sesleri</span>
                </div>
              </div>
              <button
                onClick={() => {
                  const newVal = !settings.soundEnabled;
                  sound.setEnabled(newVal);
                  if (newVal) sound.playClick();
                  onUpdateSettings({ soundEnabled: newVal });
                }}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
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
                  <span className="font-medium">Ses Seviyesi (Volume)</span>
                  <span className="font-mono font-bold text-amber-300">{Math.round(settings.sfxVolume * 100)}%</span>
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
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
                />
              </div>
            )}

            {/* Background Ambience Selector */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs sm:text-sm text-slate-200">Arka Plan Ambiyansı</span>
                <span className="text-[11px] text-purple-300 font-mono">
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
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
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
                <div className="space-y-1 pt-1.5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Ambiyans Düzeyi</span>
                    <span className="font-mono text-purple-300">
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

          {/* 4. Görsel Efektler & Sarsıntı */}
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-amber-400" />
                  Pişti Ekran Sarsıntısı (Screen Shake)
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Pişti veya çifte pişti yapıldığında masanın tok sarsılması
                </span>
              </div>
              <button
                onClick={() => {
                  sound.playClick();
                  onUpdateSettings({ screenShake: !settings.screenShake });
                }}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                  settings.screenShake ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.screenShake ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Save & Close Button */}
        <div className="mt-7">
          <button
            onClick={handleClose}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 via-indigo-600 to-cyan-600 text-white font-black font-cyber tracking-wider hover:opacity-95 shadow-xl transition-all active:scale-[0.99] cursor-pointer"
          >
            AYARLARI KAYDET & DÖN
          </button>
        </div>
      </div>
    </div>
  );
};

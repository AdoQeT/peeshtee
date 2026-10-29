import React, { useState } from 'react';
import {
  UserProfile,
  PRESET_AVATARS,
  getAvatarPreset,
  saveUserProfile
} from '../features/profile/profileManager';
import { AvatarBadge } from './AvatarBadge';
import { Sparkles, Play, Check } from 'lucide-react';
import { sound } from '../core/audio/soundEngine';

interface WelcomeModalProps {
  isOpen: boolean;
  profile: UserProfile;
  onComplete: (updatedProfile: UserProfile) => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  profile,
  onComplete
}) => {
  const [name, setName] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState(profile.avatarId || 'wolf');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPreset = getAvatarPreset(selectedAvatarId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      setErrorMsg('Lütfen en az 2 karakterden oluşan bir takma ad belirleyin!');
      return;
    }

    sound.playMatchSweep();
    const updated: UserProfile = {
      ...profile,
      name: cleanName,
      avatarId: selectedAvatarId,
      customTitle: currentPreset.title
    };

    saveUserProfile(updated);
    try {
      localStorage.setItem('project_p_onboarding_completed', 'true');
    } catch {}

    onComplete(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-amber-400/50 shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden">
        {/* Banner */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 text-center relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/20 text-slate-950 font-black text-[11px] uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
            <span>Project P • v1.11</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-cyber tracking-tight">
            HOŞ GELDİN! 🎉
          </h2>
          <p className="text-xs font-bold text-slate-900/80 mt-1">
            Pişti & RENQ Dünyasına Adını Yaz
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center text-center">
            <AvatarBadge avatarId={selectedAvatarId} size="lg" />
            <span className="text-xs font-black text-amber-300 font-cyber mt-2">
              {currentPreset.name}
            </span>
            <span className="text-[11px] text-slate-400 italic">
              "{currentPreset.title}"
            </span>
          </div>

          {/* Name Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-200">
              Oyuncu Adın (Nickname):
            </label>
            <input
              type="text"
              maxLength={18}
              value={name}
              onChange={e => {
                setName(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Adını veya lakabını yaz..."
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/20 text-white font-bold text-sm focus:outline-none focus:border-amber-400 transition-colors"
              autoFocus
            />
            {errorMsg && (
              <p className="text-xs text-rose-400 font-semibold">{errorMsg}</p>
            )}
          </div>

          {/* Quick Avatar Grid */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              Avatarını Seç:
            </label>
            <div className="grid grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1.5 rounded-xl bg-black/40 border border-white/10">
              {PRESET_AVATARS.slice(0, 12).map(av => {
                const isSelected = selectedAvatarId === av.id;
                return (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setSelectedAvatarId(av.id);
                    }}
                    className={`relative p-1.5 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/25 border-2 border-amber-400 scale-105'
                        : 'bg-slate-800/40 hover:bg-slate-800 border border-white/10'
                    }`}
                  >
                    <AvatarBadge avatarId={av.id} size="xs" />
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow">
                        <Check className="w-2 h-2 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm font-cyber flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>OYUNA BAŞLA 🚀</span>
          </button>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import {
  UserProfile,
  PRESET_AVATARS,
  getAvatarPreset,
  saveUserProfile,
  grantOwnerAccess
} from '../features/profile/profileManager';
import { AvatarBadge } from './AvatarBadge';
import {
  User,
  Trophy,
  Flame,
  Zap,
  Award,
  Check,
  X,
  Sparkles,
  Upload,
  Trash2,
  Camera,
  KeyRound
} from 'lucide-react';
import { sound } from '../core/audio/soundEngine';

interface ProfileModalProps {
  isOpen: boolean;
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  profile,
  onUpdateProfile,
  onClose
}) => {
  const [name, setName] = useState(profile.name);
  const [selectedAvatarId, setSelectedAvatarId] = useState(profile.avatarId);
  const [customAvatarDataUrl, setCustomAvatarDataUrl] = useState<string | undefined>(
    profile.customAvatarDataUrl
  );
  const [customTitle, setCustomTitle] = useState(profile.customTitle || '');
  const [showOwnerPrompt, setShowOwnerPrompt] = useState(false);
  const [ownerPasscode, setOwnerPasscode] = useState('');
  const [ownerFeedback, setOwnerFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const currentPreset = getAvatarPreset(selectedAvatarId);
  const winRate =
    profile.stats.matchesPlayed > 0
      ? Math.round((profile.stats.wins / profile.stats.matchesPlayed) * 100)
      : 0;

  const handleVerifyOwner = async () => {
    sound.playClick();
    if (!ownerPasscode.trim()) return;
    const ok = await grantOwnerAccess(ownerPasscode);
    if (ok) {
      setOwnerFeedback('👑 Kurucu doğrulaması başarılı! Hoş geldin Ado.');
      setName('Ado');
      onUpdateProfile({
        ...profile,
        name: 'Ado',
        isOwner: true,
        customTitle: '👑 Kurucu'
      });
      window.setTimeout(() => {
        setShowOwnerPrompt(false);
        setOwnerFeedback(null);
      }, 1600);
    } else {
      setOwnerFeedback('❌ Geçersiz şifre veya imza.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Fotoğraf boyutu çok büyük (Maksimum 10MB)!');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 128, 128);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          setCustomAvatarDataUrl(dataUrl);
          sound.playClick();
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleClearCustomAvatar = () => {
    sound.playClick();
    setCustomAvatarDataUrl(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    sound.playClick();
    const updated: UserProfile = {
      ...profile,
      name: name.trim() || 'Usta Oyuncu',
      avatarId: selectedAvatarId,
      customAvatarDataUrl: customAvatarDataUrl,
      customTitle: customTitle.trim() || currentPreset.title
    };
    saveUserProfile(updated);
    onUpdateProfile(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/80 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="relative px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                OYUNCU PROFİLİ
              </h2>
              <p className="text-[11px] text-slate-400">
                İsim ve Profil Fotoğrafı Tercihleri
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Active Profile Card Preview */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-white/10 shadow-lg flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group">
              <AvatarBadge
                avatarId={selectedAvatarId}
                customAvatarUrl={customAvatarDataUrl}
                size="xl"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Fotoğraf Yükle"
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-amber-300"
              >
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-bold">Değiştir</span>
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 justify-center sm:justify-start">
                <h3 className="text-lg sm:text-xl font-black text-white font-cyber tracking-tight flex items-center gap-1.5">
                  <span>{name || 'İsimsiz Oyuncu'}</span>
                  {profile.isOwner ? (
                    <span
                      title="Doğrulanmış Kurucu"
                      className="text-amber-400 select-none text-base drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                    >
                      👑
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowOwnerPrompt(!showOwnerPrompt)}
                      className="text-slate-600 hover:text-amber-400 text-xs px-1 cursor-pointer transition-colors"
                      title="Kurucu Yetkilendirmesi"
                    >
                      👑
                    </button>
                  )}
                </h3>
                <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-mono font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                  #{profile.friendCode}
                </span>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                  {customTitle || currentPreset.title}
                </span>
              </div>

              {/* Founder Passcode Verification prompt */}
              {showOwnerPrompt && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-black/60 border border-amber-500/40 flex flex-wrap items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <input
                    type="password"
                    value={ownerPasscode}
                    onChange={e => setOwnerPasscode(e.target.value)}
                    placeholder="Kurucu Şifresi..."
                    className="flex-1 min-w-[120px] px-2.5 py-1 rounded-lg bg-slate-900 border border-white/20 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOwner}
                    className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer"
                  >
                    Doğrula
                  </button>
                  {ownerFeedback && (
                    <span className="text-[11px] font-bold text-amber-300 block w-full mt-1">
                      {ownerFeedback}
                    </span>
                  )}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-1 italic">
                "{currentPreset.description}"
              </p>

              {/* Upload custom photo quick actions */}
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 hover:bg-amber-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Fotoğraf Yükle (PP)</span>
                </button>
                {customAvatarDataUrl && (
                  <button
                    type="button"
                    onClick={handleClearCustomAvatar}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Yüklenen fotoğrafı kaldır, sabit karaktere dön"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kaldır</span>
                  </button>
                )}
              </div>

              {/* Quick stats ribbon */}
              <div className="flex items-center justify-center sm:justify-start gap-4 mt-3 text-xs">
                <span className="text-slate-300 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <strong className="text-white">{profile.stats.wins}</strong> Galibiyet
                </span>
                <span className="text-slate-300 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <strong className="text-white">{profile.stats.pistiCount}</strong> Pişti
                </span>
                <span className="text-slate-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <strong className="text-emerald-300">%{winRate}</strong> Kazanma
                </span>
              </div>
            </div>
          </div>

          {/* Name & Title Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Oyuncu Adı (Nickname)
              </label>
              <input
                type="text"
                value={name}
                maxLength={18}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-sm focus:outline-none focus:border-amber-400 transition-colors"
                placeholder="Adınızı girin..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Özel Ünvan / Lakap
              </label>
              <input
                type="text"
                value={customTitle}
                maxLength={24}
                onChange={e => setCustomTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium text-sm focus:outline-none focus:border-amber-400 transition-colors"
                placeholder={currentPreset.title}
              />
            </div>
          </div>

          {/* Preset Avatars Library */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-black text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Sabit Profil Karakteri Seç (16 Karakter)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {currentPreset.name} seçili
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 max-h-52 overflow-y-auto p-1.5 rounded-2xl bg-black/40 border border-white/5">
              {PRESET_AVATARS.map(avatar => {
                const isSelected = selectedAvatarId === avatar.id && !customAvatarDataUrl;
                return (
                  <button
                    key={avatar.id}
                    onClick={() => {
                      sound.playClick();
                      setSelectedAvatarId(avatar.id);
                      setCustomAvatarDataUrl(undefined);
                      if (!customTitle) setCustomTitle(avatar.title);
                    }}
                    className={`group relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/25 border-2 border-amber-400 scale-105 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                        : 'bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:scale-102'
                    }`}
                  >
                    <AvatarBadge avatarId={avatar.id} size="sm" />
                    <span className="text-[10px] font-bold text-slate-200 mt-1 truncate max-w-full">
                      {avatar.name.split(' ')[0]}
                    </span>
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Career Stats */}
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-3.5">
            <h4 className="text-xs font-bold text-slate-400 mb-2.5 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              <span>Kariyer İstatistikleri</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Oynanan Maç</span>
                <span className="text-base font-black text-white font-cyber">
                  {profile.stats.matchesPlayed}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Galibiyet / Yenilgi</span>
                <span className="text-base font-black text-emerald-400 font-cyber">
                  {profile.stats.wins}{' '}
                  <span className="text-xs text-rose-400 font-normal">/ {profile.stats.losses}</span>
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Normal / Çift Pişti</span>
                <span className="text-base font-black text-orange-400 font-cyber">
                  {profile.stats.pistiCount}{' '}
                  <span className="text-xs text-amber-300 font-normal">({profile.stats.doublePistiCount}x2)</span>
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">En Yüksek Skor</span>
                <span className="text-base font-black text-amber-300 font-cyber">
                  {profile.stats.highestScore}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-3">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Kaydet & Kullan</span>
          </button>
        </div>
      </div>
    </div>
  );
};

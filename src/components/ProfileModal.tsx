import React, { useState, useRef } from 'react';
import {
  UserProfile,
  PRESET_AVATARS,
  getAvatarPreset,
  saveUserProfile,
  grantOwnerAccess,
  calculateLevel,
  getOrInitDailyTasks,
  claimDailyTaskReward,
  DailyTask
} from '../features/profile/profileManager';
import { AvatarBadge } from './AvatarBadge';
import {
  User,
  Trophy,
  Flame,
  Zap,
  Check,
  X,
  Sparkles,
  Upload,
  Trash2,
  Camera,
  KeyRound,
  History,
  CalendarCheck,
  Gamepad2,
  Clock
} from 'lucide-react';
import { sound } from '../core/audio/soundEngine';

interface ProfileModalProps {
  isOpen: boolean;
  profile: UserProfile;
  inspectedProfile?: UserProfile | null;
  onUpdateProfile: (updated: UserProfile) => void;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  profile,
  inspectedProfile,
  onUpdateProfile,
  onClose
}) => {
  const isInspectingOther = Boolean(inspectedProfile && inspectedProfile.id !== profile.id);
  const activeProfile = isInspectingOther ? inspectedProfile! : profile;

  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'tasks'>('profile');
  const [name, setName] = useState(profile.name);
  const [selectedAvatarId, setSelectedAvatarId] = useState(profile.avatarId);
  const [customAvatarDataUrl, setCustomAvatarDataUrl] = useState<string | undefined>(
    profile.customAvatarDataUrl
  );
  const [customTitle, setCustomTitle] = useState(profile.customTitle || '');
  const [showOwnerPrompt, setShowOwnerPrompt] = useState(false);
  const [ownerPasscode, setOwnerPasscode] = useState('');
  const [ownerFeedback, setOwnerFeedback] = useState<string | null>(null);
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>(() => getOrInitDailyTasks());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const currentPreset = getAvatarPreset(
    isInspectingOther ? activeProfile.avatarId : selectedAvatarId
  );
  const lvlInfo = calculateLevel(activeProfile.xp || 0);

  const winRate =
    activeProfile.stats.matchesPlayed > 0
      ? Math.round((activeProfile.stats.wins / activeProfile.stats.matchesPlayed) * 100)
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

    if (!file.type.startsWith('image/')) {
      alert('Lütfen geçerli bir resim dosyası seçin (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Seçilen resim 10 MB boyutundan küçük olmalıdır.');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        sound.playCardDeal();
        // Resize avatar to a crisp 96x96 JPEG thumbnail (≤ 15-20KB) to keep RTDB and network super fast
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 96;
          canvas.height = 96;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 96, 96);
            const thumbUrl = canvas.toDataURL('image/jpeg', 0.85);
            setCustomAvatarDataUrl(thumbUrl);
          } else {
            setCustomAvatarDataUrl(dataUrl);
          }
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearCustomAvatar = () => {
    sound.playClick();
    setCustomAvatarDataUrl(undefined);
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

  const handleClaimTask = (taskId: string) => {
    sound.playClick();
    const res = claimDailyTaskReward(taskId);
    if (res) {
      sound.playMatchSweep();
      setDailyTasks([...getOrInitDailyTasks()]);
      onUpdateProfile(profile);
    }
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return isToday ? `Bugün ${timeStr}` : `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} ${timeStr}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/80 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="relative px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                {isInspectingOther ? `${activeProfile.name} Profili` : 'OYUNCU PROFİLİ'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isInspectingOther
                  ? 'Oyuncu İstatistikleri ve Maç Geçmişi'
                  : 'İsim, Fotoğraf ve Seviye İlerlemesi'}
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

        {/* Tab Selection */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('profile');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Genel Bakış</span>
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('history');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Maç Geçmişi</span>
            {activeProfile.matchHistory && activeProfile.matchHistory.length > 0 && (
              <span className="text-[10px] bg-slate-800 text-amber-300 px-1.5 py-0.2 rounded-full ml-0.5">
                {activeProfile.matchHistory.length}
              </span>
            )}
          </button>
          {!isInspectingOther && (
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('tasks');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'tasks'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Günlük Görevler</span>
              {dailyTasks.some(t => t.current >= t.target && !t.claimed) && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping ml-0.5" />
              )}
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {activeTab === 'profile' && (
            <>
              {/* Active Profile Card Preview */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-white/10 shadow-lg flex flex-col sm:flex-row items-center gap-4">
                <div className="relative group">
                  <AvatarBadge
                    avatarId={isInspectingOther ? activeProfile.avatarId : selectedAvatarId}
                    customAvatarUrl={
                      isInspectingOther ? activeProfile.customAvatarDataUrl : customAvatarDataUrl
                    }
                    size="xl"
                  />
                  {!isInspectingOther && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Fotoğraf Yükle"
                      className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-amber-300"
                    >
                      <Camera className="w-6 h-6 mb-1" />
                      <span className="text-[10px] font-bold">Değiştir</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 justify-center sm:justify-start">
                    <h3 className="text-lg sm:text-xl font-black text-white font-cyber tracking-tight flex items-center gap-1.5 justify-center sm:justify-start">
                      <span>{isInspectingOther ? activeProfile.name : name || 'İsimsiz Oyuncu'}</span>
                      {activeProfile.isOwner ? (
                        <span
                          title="Doğrulanmış Kurucu"
                          className="text-amber-400 select-none text-base drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                        >
                          👑
                        </span>
                      ) : !isInspectingOther ? (
                        <button
                          type="button"
                          onClick={() => setShowOwnerPrompt(!showOwnerPrompt)}
                          className="text-slate-600 hover:text-amber-400 text-xs px-1 cursor-pointer transition-colors"
                          title="Kurucu Yetkilendirmesi"
                        >
                          👑
                        </button>
                      ) : null}
                    </h3>
                    <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-mono font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                      #{activeProfile.friendCode}
                    </span>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                      {isInspectingOther
                        ? activeProfile.customTitle || currentPreset.title
                        : customTitle || currentPreset.title}
                    </span>
                  </div>

                  {/* Level & XP Bar */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-amber-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>SEVİYE {lvlInfo.level}</span>
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {lvlInfo.currentLevelXp} / {lvlInfo.xpForNextLevel} XP
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
                        style={{ width: `${lvlInfo.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Founder Passcode Verification prompt */}
                  {showOwnerPrompt && !isInspectingOther && (
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

                  {!isInspectingOther && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
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
                        <span>Fotoğraf Yükle</span>
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
                  )}

                  {/* Quick stats ribbon */}
                  <div className="flex items-center justify-center sm:justify-start gap-4 mt-3 text-xs">
                    <span className="text-slate-300 flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <strong className="text-white">{activeProfile.stats.wins}</strong> Galibiyet
                    </span>
                    <span className="text-slate-300 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      <strong className="text-white">{activeProfile.stats.pistiCount}</strong> Pişti
                    </span>
                    <span className="text-slate-300 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <strong className="text-emerald-300">%{winRate}</strong> Kazanma
                    </span>
                  </div>
                </div>
              </div>

              {/* Name & Title Inputs (Editable for Own Profile) */}
              {!isInspectingOther && (
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
                      placeholder="Adını yaz..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 focus:outline-none text-white text-sm font-semibold transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Özel Ünvan / Rozet (Opsiyonel)
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      maxLength={24}
                      onChange={e => setCustomTitle(e.target.value)}
                      placeholder={currentPreset.title}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 focus:outline-none text-amber-300 text-sm font-semibold transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Avatar Preset Selector */}
              {!isInspectingOther && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-300">
                      Avatar Karakterini Seç
                    </label>
                    <span className="text-[11px] text-amber-400/80 font-medium">
                      {PRESET_AVATARS.length} Karakter Mevcut
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PRESET_AVATARS.map(preset => {
                      const isSelected = selectedAvatarId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setSelectedAvatarId(preset.id);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/50 shadow-md'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                          }`}
                        >
                          <AvatarBadge avatarId={preset.id} size="sm" showBorder={false} />
                          <div className="flex-1 min-w-0">
                            <span className="block text-xs font-bold text-white truncate">
                              {preset.name}
                            </span>
                            <span className="block text-[10px] text-amber-400/90 truncate">
                              {preset.title}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Detailed Stats */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Detaylı Kariyer İstatistikleri
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Galibiyet / Mağlubiyet</span>
                    <span className="text-sm font-black text-emerald-400 font-cyber">
                      {activeProfile.stats.wins}{' '}
                      <span className="text-xs text-rose-400 font-normal">
                        / {activeProfile.stats.losses}
                      </span>
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Pişti / Çift Pişti</span>
                    <span className="text-sm font-black text-orange-400 font-cyber">
                      {activeProfile.stats.pistiCount}{' '}
                      <span className="text-xs text-amber-300 font-normal">
                        ({activeProfile.stats.doublePistiCount}x2)
                      </span>
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">En Yüksek Skor (Pişti)</span>
                    <span className="text-sm font-black text-amber-300 font-cyber">
                      {activeProfile.stats.highestScore}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">RENQ Maçları</span>
                    <span className="text-sm font-black text-cyan-400 font-cyber">
                      {activeProfile.stats.unoMatchesPlayed || 0}{' '}
                      <span className="text-xs text-slate-400 font-normal">
                        ({activeProfile.stats.unoWins || 0} Galibiyet)
                      </span>
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">En Yüksek Skor (RENQ)</span>
                    <span className="text-sm font-black text-amber-400 font-cyber">
                      {activeProfile.stats.highestUnoScore || 0}P
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Toplam XP</span>
                    <span className="text-sm font-black text-emerald-300 font-cyber">
                      {activeProfile.xp || 0} XP
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: MATCH HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-amber-400" />
                  <span>Son Tamamlanan Maçlar</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Son 30 maç kaydedilir
                </span>
              </div>

              {!activeProfile.matchHistory || activeProfile.matchHistory.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-950/60 border border-white/10 text-center space-y-2">
                  <Gamepad2 className="w-8 h-8 text-slate-600 mx-auto mb-1 animate-pulse" />
                  <p className="text-xs font-bold text-slate-300">Henüz Kayıtlı Maç Yok</p>
                  <p className="text-[11px] text-slate-500">
                    Maçları tamamladıkça sonuçlar, skorlar ve piştiler burada listelenecek!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeProfile.matchHistory.map(record => {
                    const isWin = record.result === 'win';
                    return (
                      <div
                        key={record.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                          isWin
                            ? 'bg-emerald-950/30 border-emerald-500/30 shadow-sm'
                            : 'bg-rose-950/20 border-rose-500/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                              isWin
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                            }`}
                          >
                            {record.gameType === 'uno' ? '🔥' : '🎴'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-black uppercase tracking-wider px-2 py-0.2 rounded-md ${
                                  isWin
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                                }`}
                              >
                                {isWin ? 'Galibiyet' : 'Mağlubiyet'}
                              </span>
                              <span className="text-xs font-bold text-slate-200">
                                vs {record.opponentName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {formatDate(record.date)}
                              </span>
                              {record.pistiCount !== undefined && record.pistiCount > 0 && (
                                <span className="text-amber-400 font-bold">
                                  ⚡ {record.pistiCount} Pişti
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-base font-black font-cyber ${
                              isWin ? 'text-amber-300' : 'text-slate-400'
                            }`}
                          >
                            {record.score}P
                          </span>
                          <span className="block text-[10px] text-slate-500 uppercase">
                            {record.gameType === 'uno' ? 'RENQ' : 'Pişti'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DAILY TASKS */}
          {activeTab === 'tasks' && !isInspectingOther && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-amber-400" />
                  <span>Günlük Görevler & Ödüller</span>
                </span>
                <span className="text-[11px] text-amber-400 font-medium">
                  Her gece 00:00'da yenilenir
                </span>
              </div>

              <div className="space-y-2.5">
                {dailyTasks.map(task => {
                  const isDone = task.current >= task.target;
                  const progressPct = Math.min(100, Math.round((task.current / task.target) * 100));

                  return (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        task.claimed
                          ? 'bg-slate-950/40 border-white/5 opacity-70'
                          : isDone
                          ? 'bg-amber-950/30 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-950/80 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{task.icon}</span>
                          <div>
                            <h5 className="text-xs font-bold text-white">{task.title}</h5>
                            <p className="text-[11px] text-slate-400">{task.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[11px] font-mono font-black">
                            +{task.rewardXp} XP
                          </span>
                          {task.claimed ? (
                            <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold">
                              Alındı ✓
                            </span>
                          ) : isDone ? (
                            <button
                              onClick={() => handleClaimTask(task.id)}
                              className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black shadow-md cursor-pointer animate-pulse"
                            >
                              Ödülü Al
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono font-bold">
                              {task.current}/{task.target}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isDone ? 'bg-amber-400' : 'bg-cyan-400'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
          >
            {isInspectingOther ? 'Kapat' : 'Vazgeç'}
          </button>
          {!isInspectingOther && (
            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Kaydet & Kullan</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

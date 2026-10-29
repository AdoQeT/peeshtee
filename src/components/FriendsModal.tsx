import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  UserPlus,
  Users,
  Search,
  Copy,
  Check,
  Gamepad2,
  Trash2,
  Sparkles,
  MessageCircle,
  Hash,
  ArrowRight
} from 'lucide-react';
import {
  UserProfile,
  getUserProfile,
  addOrUpdateFriend,
  removeFriend,
  FriendContact,
  getAvatarPreset
} from '../features/profile/profileManager';
import {
  friendNetwork,
  OnlinePlayerPresence
} from '../features/friends/friendNetwork';
import { AvatarBadge } from './AvatarBadge';
import { sound } from '../core/audio/soundEngine';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteFriendToMatch: (friend: {
    friendCode?: string;
    name: string;
    gameType: 'pisti' | 'uno';
  }) => void;
  onJoinFriendRoom: (roomCode: string) => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  onInviteFriendToMatch,
  onJoinFriendRoom
}) => {
  const [profile, setProfile] = useState<UserProfile>(getUserProfile);
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayerPresence[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'add' | 'online'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualNameInput, setManualNameInput] = useState('');
  const [copiedMyId, setCopiedMyId] = useState(false);
  const [inviteGameType, setInviteGameType] = useState<'pisti' | 'uno'>('pisti');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<{
    friendCode?: string;
    name: string;
    avatarId?: string;
    customAvatarUrl?: string;
    isOwner?: boolean;
    status?: string;
    roomCode?: string;
    isAlreadyFriend?: boolean;
    friendId?: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    friendNetwork.init();
    friendNetwork.announcePresence();
    setProfile(getUserProfile());
    setOnlinePlayers(friendNetwork.getOnlinePlayers());

    const unsub = friendNetwork.subscribe(() => {
      setOnlinePlayers(friendNetwork.getOnlinePlayers());
      setProfile(getUserProfile());
    });

    return unsub;
  }, [isOpen]);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    window.setTimeout(() => setFeedbackToast(null), 2600);
  };

  const handleCopyMyId = () => {
    sound.playClick();
    const txt = `#${profile.friendCode}`;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(txt).catch(() => {
        try {
          const el = document.createElement('textarea');
          el.value = txt;
          el.style.position = 'fixed';
          el.style.left = '-9999px';
          document.body.appendChild(el);
          el.select();
          document.execCommand('copy');
          document.body.removeChild(el);
        } catch {}
      });
    } else {
      try {
        const el = document.createElement('textarea');
        el.value = txt;
        el.style.position = 'fixed';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      } catch {}
    }
    setCopiedMyId(true);
    showToast(`Kimlik kodun (#${profile.friendCode}) kopyalandı!`);
    window.setTimeout(() => setCopiedMyId(false), 2000);
  };

  // Match online presence with saved friends
  const friendsList = useMemo(() => {
    return (profile.friends || []).map(f => {
      const onlineMatch = onlinePlayers.find(
        op =>
          (f.friendCode && op.friendCode === f.friendCode) ||
          op.name.toLowerCase() === f.name.toLowerCase()
      );
      return {
        ...f,
        onlinePresence: onlineMatch || null
      };
    });
  }, [profile.friends, onlinePlayers]);

  // Search results in "Add / Search" tab
  const filteredOnlineResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().replace(/^#/, '');
    if (!q) return onlinePlayers;
    return onlinePlayers.filter(
      p =>
        p.friendCode.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q)
    );
  }, [onlinePlayers, searchQuery]);

  const handleAddOnlinePlayer = (p: OnlinePlayerPresence) => {
    sound.playClick();
    const updated = addOrUpdateFriend({
      id: p.id,
      friendCode: p.friendCode,
      name: p.name,
      avatarId: p.avatarId,
      customAvatarDataUrl: p.customAvatarUrl,
      roomCode: p.roomCode
    });
    setProfile(updated);
    friendNetwork.sendFriendAddedNotice({
      friendCode: p.friendCode,
      name: p.name
    });
    showToast(`✅ ${p.name} (#${p.friendCode}) arkadaş listene eklendi!`);
  };

  const handleAddByQueryOrManual = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = searchQuery.trim();
    if (!raw) return;

    sound.playClick();
    const cleanedCode = raw.replace(/^#/, '').trim();
    const isNumericCode = /^\d{4,8}$/.test(cleanedCode);

    // Check if this player is already in onlinePlayers
    const foundOnline = onlinePlayers.find(
      p =>
        p.friendCode.toLowerCase() === cleanedCode.toLowerCase() ||
        p.name.toLowerCase() === raw.toLowerCase()
    );

    if (foundOnline) {
      handleAddOnlinePlayer(foundOnline);
      setSearchQuery('');
      setActiveTab('friends');
      return;
    }

    const displayName = isNumericCode
      ? manualNameInput.trim() || `Oyuncu #${cleanedCode}`
      : raw;
    const friendCode = isNumericCode ? cleanedCode : undefined;

    const updated = addOrUpdateFriend({
      id: `friend-${cleanedCode.toLowerCase()}-${Date.now()}`,
      friendCode,
      name: displayName,
      avatarId: 'eagle'
    });
    setProfile(updated);

    friendNetwork.sendFriendAddedNotice({
      friendCode,
      name: displayName
    });

    setSearchQuery('');
    setManualNameInput('');
    showToast(
      `✅ ${displayName}${friendCode ? ` (#${friendCode})` : ''} arkadaşlara eklendi ve istek gönderildi!`
    );
    setActiveTab('friends');
  };

  const handleRemoveFriend = (friend: FriendContact) => {
    sound.playClick();
    const updated = removeFriend(friend.id);
    setProfile(updated);
    friendNetwork.sendFriendRemovedNotice({ friendCode: friend.friendCode, name: friend.name });
    showToast(`${friend.name} arkadaş listesinden çıkarıldı.`);
  };

  const handleWhatsAppInvite = (friendName: string) => {
    sound.playClick();
    const url = window.location.origin + window.location.pathname;
    const text = `🔥 Selam ${friendName}! Pişti & RENQ masasına gel, benim Oyuncu ID'm: #${profile.friendCode}\nHemen katıl: ${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none">
      {/* Dimmed backdrop - click to close */}
      <div
        onClick={() => {
          sound.playClick();
          onClose();
        }}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Right Slide-over Drawer Menu */}
      <div className="relative w-full max-w-md sm:max-w-lg h-full bg-slate-950/98 border-l border-white/10 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250 overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-white/10 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-cyber tracking-wide">
                ARKADAŞLAR
              </h2>
              <p className="text-[11px] text-slate-400">
                Arkadaş Ekle & Canlı Maça Davet Et
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toast Feedback */}
        {feedbackToast && (
          <div className="mx-4 mt-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-medium flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{feedbackToast}</span>
          </div>
        )}

        {/* COMPACT PLAYER ID PILL */}
        <div className="mx-4 mt-3 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AvatarBadge
              avatarId={profile.avatarId}
              customAvatarUrl={profile.customAvatarDataUrl}
              size="xs"
            />
            <span className="text-xs font-bold text-white truncate max-w-[120px]">{profile.name}</span>
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-amber-300 font-mono text-[11px] font-bold">
              #{profile.friendCode}
            </span>
          </div>

          <button
            onClick={handleCopyMyId}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copiedMyId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedMyId ? 'Kopyalandı' : 'Kopyala'}</span>
          </button>
        </div>

        {/* Clean 2 Tabs */}
        <div className="px-4 pt-3 flex items-center gap-1.5">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('friends');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'friends'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Arkadaşlarım ({friendsList.length})
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('add');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'add'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            + Arkadaş Ekle
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'friends' && (
            <>
              {/* Quick Game Mode Selector for Auto-Invite */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-950/90 border border-white/10">
                <span className="text-xs font-bold text-slate-300">
                  Davet Edilecek Oyun Modu:
                </span>
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setInviteGameType('pisti');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                      inviteGameType === 'pisti'
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🎴 Pişti
                  </button>
                  <button
                    onClick={() => {
                      sound.playClick();
                      setInviteGameType('uno');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                      inviteGameType === 'uno'
                        ? 'bg-gradient-to-r from-red-600 to-amber-500 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🔥 RENQ
                  </button>
                </div>
              </div>

              {friendsList.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-950/60 border border-dashed border-white/10 text-center space-y-3">
                  <Users className="w-10 h-10 text-slate-600 mx-auto" />
                  <div>
                    <p className="text-sm font-bold text-slate-300">
                      Henüz arkadaş listen boş
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Arkadaşının 6 haneli <strong>#ID</strong> kodunu veya ismini aratarak hemen ekleyebilirsin!
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Şimdi Arkadaş Ekle</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {friendsList.map(friend => {
                    const online = friend.onlinePresence;
                    const activeRoom = online?.roomCode || friend.roomCode;

                    return (
                      <div
                        key={friend.id}
                        className="p-3.5 rounded-2xl bg-slate-950/90 border border-white/10 hover:border-emerald-500/40 flex flex-wrap items-center justify-between gap-3 transition-all"
                      >
                        <div
                          onClick={() => {
                            sound.playClick();
                            setSelectedPlayer({
                              friendCode: friend.friendCode,
                              name: friend.name,
                              avatarId: online?.avatarId || friend.avatarId,
                              customAvatarUrl:
                                friend.customAvatarDataUrl || online?.customAvatarUrl,
                              status: online?.status,
                              roomCode: activeRoom,
                              isAlreadyFriend: true,
                              friendId: friend.id
                            });
                          }}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <div className="relative group-hover:scale-105 transition-transform">
                            <AvatarBadge
                              avatarId={online?.avatarId || friend.avatarId}
                              customAvatarUrl={friend.customAvatarDataUrl || online?.customAvatarUrl}
                              size="sm"
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${
                                online ? 'bg-emerald-400' : 'bg-slate-600'
                              }`}
                              title={online ? 'Çevrimiçi' : 'Çevrimdışı'}
                            />
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs sm:text-sm font-black text-white group-hover:text-emerald-300 transition-colors">
                                {friend.name}
                              </span>
                              {friend.friendCode && (
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-amber-300">
                                  #{friend.friendCode}
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] flex items-center gap-2 mt-0.5">
                              {online ? (
                                <span className="text-emerald-400 font-bold">
                                  ●{' '}
                                  {online.status === 'lobby'
                                    ? `Lobide (${online.roomCode || 'Hazır'})`
                                    : online.status === 'playing'
                                    ? 'Şu an Maçta'
                                    : 'Çevrimiçi • Menüde'}
                                </span>
                              ) : (
                                <span className="text-slate-500">
                                  Çevrimdışı • Davet gönderilebilir
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* If friend is hosting an active lobby, allow 1-click Join */}
                          {online?.status === 'lobby' && activeRoom && (
                            <button
                              onClick={() => {
                                sound.playClick();
                                onJoinFriendRoom(activeRoom);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md cursor-pointer"
                              title="Arkadaşının açık odasına hemen katıl"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                              <span>Odasına Katıl</span>
                            </button>
                          )}

                          {/* 1-Click Auto-Lobby & Live Invite */}
                          <button
                            onClick={() => {
                              sound.playClick();
                              onInviteFriendToMatch({
                                friendCode: friend.friendCode,
                                name: friend.name,
                                gameType: inviteGameType
                              });
                            }}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md cursor-pointer"
                            title="Otomatik oda aç ve arkadaşına canlı davet gönder"
                          >
                            <Gamepad2 className="w-3.5 h-3.5" />
                            <span>Maça Çağır</span>
                          </button>

                          <button
                            onClick={() => handleWhatsAppInvite(friend.name)}
                            className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 cursor-pointer"
                            title="WhatsApp ile Çağır"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleRemoveFriend(friend)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 cursor-pointer"
                            title="Arkadaşlardan Çıkar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'add' && (
            <div className="space-y-4">
              <form
                onSubmit={handleAddByQueryOrManual}
                className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-3"
              >
                <label className="block text-xs font-black text-cyan-300 uppercase tracking-wider">
                  Oyuncu #ID Kodu veya İsim ile Ara / Ekle
                </label>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Örn: #482910 veya Oyuncu İsmi yazın..."
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/^\d{4,8}$/.test(searchQuery.trim().replace(/^#/, '')) && (
                    <input
                      type="text"
                      value={manualNameInput}
                      onChange={e => setManualNameInput(e.target.value)}
                      placeholder="Arkadaşının İsmi (İsteğe bağlı)"
                      className="sm:w-44 px-3 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                    />
                  )}

                  <button
                    type="submit"
                    disabled={!searchQuery.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-40 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>EKLE</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-400">
                  💡 İpucu: Arkadaşının 6 haneli <strong>#ID</strong> numarasını veya tam kullanıcı adını yazıp doğrudan ekleyebilirsin.
                </p>
              </form>

              {/* Live Matching Results */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 flex items-center justify-between px-1">
                  <span>Eşleşen Çevrimiçi Oyuncular</span>
                  <span className="text-[11px] text-emerald-400">
                    {filteredOnlineResults.length} kişi bulundu
                  </span>
                </div>

                {filteredOnlineResults.length === 0 ? (
                  <div className="p-5 rounded-2xl bg-slate-950/50 border border-white/5 text-center text-xs text-slate-400">
                    {searchQuery.trim()
                      ? `"${searchQuery}" ile eşleşen aktif oyuncu görünmüyor ama yukarıdaki EKLE butonuna basarak doğrudan listene kaydedebilirsin!`
                      : 'Şu anda lobide veya menüde başka çevrimiçi oyuncu bekleniyor...'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredOnlineResults.map(p => {
                      const alreadyFriend = (profile.friends || []).some(
                        f =>
                          f.friendCode === p.friendCode ||
                          f.name.toLowerCase() === p.name.toLowerCase()
                      );

                      return (
                        <div
                          key={p.friendCode}
                          className="p-3 rounded-2xl bg-slate-950/90 border border-white/10 hover:border-cyan-500/40 flex items-center justify-between gap-3 transition-colors"
                        >
                          <div
                            onClick={() => {
                              sound.playClick();
                              setSelectedPlayer({
                                friendCode: p.friendCode,
                                name: p.name,
                                avatarId: p.avatarId,
                                customAvatarUrl: p.customAvatarUrl,
                                status: p.status,
                                roomCode: p.roomCode,
                                isAlreadyFriend: alreadyFriend,
                                friendId: alreadyFriend
                                  ? (profile.friends || []).find(f => f.friendCode === p.friendCode)?.id
                                  : undefined
                              });
                            }}
                            className="flex items-center gap-2.5 cursor-pointer group"
                          >
                            <div className="group-hover:scale-105 transition-transform">
                              <AvatarBadge
                                avatarId={p.avatarId}
                                customAvatarUrl={p.customAvatarUrl}
                                size="sm"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-white group-hover:text-cyan-300 transition-colors">
                                  {p.name}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                                  #{p.friendCode}
                                </span>
                              </div>
                              <span className="text-[10px] text-emerald-400 font-semibold">
                                ● Çevrimiçi
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {alreadyFriend ? (
                              <span className="px-3 py-1.5 rounded-xl bg-white/5 text-emerald-300 text-xs font-bold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" />
                                Ekli
                              </span>
                            ) : (
                              <button
                                onClick={() => handleAddOnlinePlayer(p)}
                                className="px-3.5 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Arkadaş Ekle</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'online' && (
            <div className="space-y-2.5">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200 flex items-center gap-2">
                <Hash className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Şu anda oyunda aktif olan oyuncuları buradan görebilir, arkadaş ekleyebilir veya tek tıkla maça davet edebilirsin.
                </span>
              </div>

              {onlinePlayers.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-950/60 border border-dashed border-white/10 text-center text-xs text-slate-400">
                  Şu an senden başka çevrimiçi oyuncu görünmüyor. Arkadaşına site linkini veya <strong>#{profile.friendCode}</strong> ID kodunu gönder!
                </div>
              ) : (
                onlinePlayers.map(p => (
                  <div
                    key={p.friendCode}
                    className="p-3.5 rounded-2xl bg-slate-950/90 border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <AvatarBadge
                        avatarId={p.avatarId}
                        customAvatarUrl={p.customAvatarUrl}
                        size="sm"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-black text-white">
                            {p.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                            #{p.friendCode}
                          </span>
                        </div>
                        <span className="text-[11px] text-emerald-400 font-bold">
                          ● {p.status === 'lobby' ? `Lobide (${p.roomCode})` : p.status === 'playing' ? 'Maçta' : 'Menüde'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddOnlinePlayer(p)}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Ekle</span>
                      </button>
                      <button
                        onClick={() => {
                          sound.playClick();
                          onInviteFriendToMatch({
                            friendCode: p.friendCode,
                            name: p.name,
                            gameType: inviteGameType
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Gamepad2 className="w-3.5 h-3.5" />
                        <span>Davet Et</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Player Profile Popup */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl p-5 space-y-4">
            <button
              onClick={() => {
                sound.playClick();
                setSelectedPlayer(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-2 pt-2">
              <AvatarBadge
                avatarId={selectedPlayer.avatarId || 'wolf'}
                customAvatarUrl={selectedPlayer.customAvatarUrl}
                size="lg"
                isOwner={Boolean(selectedPlayer.isOwner)}
              />
              <div>
                <div className="flex items-center justify-center gap-1.5">
                  <h3 className="text-lg font-black text-white font-cyber tracking-tight">
                    {selectedPlayer.name}
                  </h3>
                  {Boolean(selectedPlayer.isOwner) && (
                    <span
                      title="Kurucu"
                      className="text-amber-400 select-none text-base drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]"
                    >
                      👑
                    </span>
                  )}
                </div>
                {selectedPlayer.friendCode && (
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                    #{selectedPlayer.friendCode}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 italic">
                "{getAvatarPreset(selectedPlayer.avatarId || 'wolf').title} •{' '}
                {getAvatarPreset(selectedPlayer.avatarId || 'wolf').description}"
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-900">
                <span className="text-[10px] text-slate-400 block">Durum</span>
                <span className="font-bold text-emerald-400 text-xs">
                  {selectedPlayer.status === 'playing'
                    ? 'Maçta'
                    : selectedPlayer.status === 'lobby'
                    ? 'Lobide'
                    : selectedPlayer.status === 'menu'
                    ? 'Çevrimiçi'
                    : 'Hazır'}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900">
                <span className="text-[10px] text-slate-400 block">Oyun</span>
                <span className="font-bold text-amber-300 text-xs">Pişti & RENQ</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900">
                <span className="text-[10px] text-slate-400 block">Karakter</span>
                <span className="font-bold text-white text-xs truncate">
                  {getAvatarPreset(selectedPlayer.avatarId || 'wolf').name}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {selectedPlayer.roomCode && selectedPlayer.status === 'lobby' && (
                <button
                  onClick={() => {
                    sound.playClick();
                    const code = selectedPlayer.roomCode!;
                    setSelectedPlayer(null);
                    onClose();
                    onJoinFriendRoom(code);
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Açık Odasına Katıl ({selectedPlayer.roomCode})</span>
                </button>
              )}

              <button
                onClick={() => {
                  sound.playClick();
                  const p = selectedPlayer;
                  setSelectedPlayer(null);
                  onInviteFriendToMatch({
                    friendCode: p.friendCode,
                    name: p.name,
                    gameType: inviteGameType
                  });
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Gamepad2 className="w-4 h-4" />
                <span>Canlı Maça Davet Et ({inviteGameType === 'uno' ? 'RENQ' : 'Pişti'})</span>
              </button>

              <button
                onClick={() => {
                  handleWhatsAppInvite(selectedPlayer.name);
                }}
                className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp ile Davet Et</span>
              </button>

              {selectedPlayer.isAlreadyFriend && selectedPlayer.friendId && (
                <button
                  onClick={() => {
                    const friendObj = (profile.friends || []).find(
                      f => f.id === selectedPlayer.friendId
                    );
                    if (friendObj) handleRemoveFriend(friendObj);
                    setSelectedPlayer(null);
                  }}
                  className="w-full py-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Arkadaşlarımdan Çıkar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

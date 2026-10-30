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
  UserCheck,
  UserX,
  Send
} from 'lucide-react';
import {
  UserProfile,
  getUserProfile,
  removeFriend,
  FriendContact,
  acceptIncomingFriendRequest,
  removeIncomingFriendRequest
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
  onInspectProfile?: (inspected: UserProfile) => void;
  onUpdateProfile?: (updated: UserProfile) => void;
  userProfile?: UserProfile;
  hideBackdrop?: boolean;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  onInviteFriendToMatch,
  onJoinFriendRoom,
  onInspectProfile,
  onUpdateProfile,
  userProfile,
  hideBackdrop = false
}) => {
  const [profile, setProfile] = useState<UserProfile>(getUserProfile);
  const activeProfile = userProfile || profile;
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayerPresence[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'explore'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedMyId, setCopiedMyId] = useState(false);
  const [inviteGameType, setInviteGameType] = useState<'pisti' | 'uno'>('pisti');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [selectedPlayer, setSelectedPlayer] = useState<{
    friendCode?: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    friendNetwork.init();
    setProfile(getUserProfile());
    setOnlinePlayers(friendNetwork.getOnlinePlayers());

    const unsub = friendNetwork.subscribe(() => {
      setOnlinePlayers(friendNetwork.getOnlinePlayers());
      setProfile(getUserProfile());
    });

    return unsub;
  }, [isOpen, userProfile]);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    window.setTimeout(() => setFeedbackToast(null), 2600);
  };

  const handleCopyMyId = () => {
    sound.playClick();
    const txt = `#${activeProfile.friendCode}`;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(txt).catch(() => fallbackCopy(txt));
    } else {
      fallbackCopy(txt);
    }
    setCopiedMyId(true);
    showToast(`Kimlik kodun (#${activeProfile.friendCode}) kopyalandı!`);
    window.setTimeout(() => setCopiedMyId(false), 2000);
  };

  const fallbackCopy = (text: string) => {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    } catch {}
  };

  // Match online presence with saved friends
  const friendsList = useMemo(() => {
    return (activeProfile.friends || []).map(f => {
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
  }, [activeProfile.friends, onlinePlayers]);

  const incomingRequests = activeProfile.incomingFriendRequests || [];

  // Filter online players for explore tab
  const filteredExplorePlayers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().replace(/^#/, '');
    const myCode = activeProfile.friendCode.toLowerCase();
    const existingFriendCodes = new Set((activeProfile.friends || []).map(f => f.friendCode?.toLowerCase()));

    return onlinePlayers.filter(p => {
      if (p.friendCode.toLowerCase() === myCode) return false;
      if (existingFriendCodes.has(p.friendCode.toLowerCase())) return false;
      if (!q) return true;
      return (
        p.friendCode.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q)
      );
    });
  }, [onlinePlayers, searchQuery, activeProfile]);

  const handleSendFriendRequest = (target: { friendCode: string; name?: string }) => {
    sound.playClick();
    const clean = target.friendCode.replace(/[^0-9A-Za-z]/g, '');
    friendNetwork.sendFriendRequest({ friendCode: clean, name: target.name });
    setSentRequests(prev => new Set(prev).add(clean));
    showToast(`📨 #${clean} kullanıcısına arkadaşlık isteği gönderildi!`);
  };

  const handleAcceptRequest = (req: FriendContact) => {
    sound.playClick();
    const updated = acceptIncomingFriendRequest(req);
    setProfile(updated);
    if (onUpdateProfile) onUpdateProfile(updated);
    friendNetwork.sendFriendAccept({ friendCode: req.friendCode, name: req.name });
    showToast(`🤝 ${req.name} ile artık arkadaşsınız!`);
  };

  const handleDeclineRequest = (friendCode: string) => {
    sound.playClick();
    const updated = removeIncomingFriendRequest(friendCode);
    setProfile(updated);
    if (onUpdateProfile) onUpdateProfile(updated);
    friendNetwork.sendFriendDecline(friendCode);
    showToast('İstek reddedildi.');
  };

  const handleRemoveFriend = (friendId: string, friendCode?: string, friendName?: string) => {
    sound.playClick();
    const updated = removeFriend(friendId, friendCode, friendName);
    setProfile(updated);
    if (onUpdateProfile) onUpdateProfile(updated);
    friendNetwork.sendFriendRemovedNotice({ friendCode, name: friendName });
    showToast(`${friendName || 'Arkadaş'} arkadaş listenden çıkarıldı.`);
  };

  const handleInspectPlayer = (contact: any) => {
    sound.playClick();
    if (onInspectProfile) {
      const pStats = contact.onlinePresence?.stats || contact.stats || {
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        pistiCount: 0,
        doublePistiCount: 0,
        highestScore: 0,
        unoMatchesPlayed: 0,
        unoWins: 0
      };
      const pHistory = contact.onlinePresence?.matchHistory || contact.matchHistory || [];
      const inspected: UserProfile = {
        id: contact.id,
        friendCode: contact.friendCode || '000000',
        name: contact.name,
        avatarId: contact.avatarId || 'wolf',
        customAvatarDataUrl: contact.customAvatarDataUrl,
        customTitle: contact.customTitle,
        level: contact.level || 1,
        stats: pStats,
        matchHistory: pHistory
      };
      onInspectProfile(inspected);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex justify-end select-none ${hideBackdrop ? 'pointer-events-none' : ''}`}>
      {/* Dimmed backdrop - click to close */}
      {!hideBackdrop && (
        <div
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        />
      )}

      {/* Right Slide-over Drawer Menu */}
      <div className="pointer-events-auto relative w-full max-w-[320px] sm:max-w-[340px] h-full bg-slate-950/98 border-l border-white/10 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250 overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-white/10 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-cyber tracking-wide">
                SOSYAL
              </h2>
              <p className="text-[11px] text-slate-400">
                Arkadaşlar, İstekler & Canlı Maç Davetleri
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

        {/* Feedback Banner */}
        {feedbackToast && (
          <div className="mx-4 mt-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-medium flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{feedbackToast}</span>
          </div>
        )}

        {/* User's Own ID Card */}
        <div className="m-4 p-3 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-white/10 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <AvatarBadge
              avatarId={activeProfile.avatarId}
              customAvatarUrl={activeProfile.customAvatarDataUrl}
              size="sm"
            />
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block truncate">
                {activeProfile.name}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Çevrimiçi
              </span>
            </div>
          </div>

          <button
            onClick={handleCopyMyId}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-mono font-bold border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Kodunu kopyala ve arkadaşına gönder"
          >
            {copiedMyId ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>#{activeProfile.friendCode}</span>
              </>
            )}
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 px-4 border-b border-white/10 bg-slate-950/70 shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('friends');
            }}
            className={`flex-1 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border-b-2 ${
              activeTab === 'friends'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Arkadaşlarım</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {friendsList.length}
            </span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('requests');
            }}
            className={`flex-1 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border-b-2 ${
              activeTab === 'requests'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>İstekler</span>
            {incomingRequests.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black animate-pulse">
                {incomingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('explore');
            }}
            className={`flex-1 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border-b-2 ${
              activeTab === 'explore'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Keşfet & Ekle</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* TAB 1: FRIENDS LIST */}
          {activeTab === 'friends' && (
            <>
              {friendsList.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-white/5 space-y-2">
                  <Users className="w-8 h-8 text-slate-600 mx-auto mb-1 animate-pulse" />
                  <p className="text-xs font-bold text-slate-300">Henüz Arkadaşın Yok</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    "Keşfet & Ekle" sekmesinden oyunculara arkadaşlık isteği gönder veya kodunu paylaş!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friendsList.map(friend => {
                    const isOnline = Boolean(friend.onlinePresence);
                    const isInGame = Boolean(friend.onlinePresence?.status === 'playing' && friend.onlinePresence?.roomCode);
                    const isInLobby = Boolean(friend.onlinePresence?.status === 'lobby' && friend.onlinePresence?.roomCode);

                    return (
                      <div
                        key={friend.id}
                        className="p-3 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-3 shadow-md"
                      >
                        <div 
                          onClick={() => handleInspectPlayer(friend)}
                          className="flex items-center gap-2.5 min-w-0 cursor-pointer group hover:opacity-90"
                          title="Profili İncele"
                        >
                          <div className="relative">
                            <AvatarBadge
                              avatarId={friend.avatarId}
                              customAvatarUrl={friend.customAvatarDataUrl}
                              size="md"
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                                isInGame || isInLobby
                                  ? 'bg-amber-400 animate-pulse'
                                  : isOnline
                                  ? 'bg-emerald-400'
                                  : 'bg-slate-600'
                              }`}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                                {friend.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                #{friend.friendCode}
                              </span>
                            </div>

                            <span className="text-[10px] block truncate font-medium text-amber-300/80">
                              {isInGame
                                ? '🎮 Oyunda'
                                : isInLobby
                                ? '⏳ Lobide Bekliyor'
                                : isOnline
                                ? '🟢 Çevrimiçi'
                                : '⚪ Çevrimdışı'}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Join Room if Friend is in Lobby */}
                          {(isInGame || isInLobby) && friend.onlinePresence?.roomCode ? (
                            <button
                              onClick={() => {
                                sound.playClick();
                                onJoinFriendRoom(friend.onlinePresence!.roomCode!);
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md cursor-pointer transition-transform active:scale-95"
                            >
                              Odaya Gir
                            </button>
                          ) : isOnline ? (
                            <button
                              onClick={() => {
                                sound.playClick();
                                onInviteFriendToMatch({
                                  friendCode: friend.friendCode,
                                  name: friend.name,
                                  gameType: 'pisti'
                                });
                                onClose();
                              }}
                              className="px-2 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                            >
                              <Gamepad2 className="w-3.5 h-3.5" />
                              <span>Davet</span>
                            </button>
                          ) : null}

                          <button
                            onClick={() => handleRemoveFriend(friend.id, friend.friendCode, friend.name)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Arkadaşı Sil"
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

          {/* TAB 2: INCOMING FRIEND REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-2.5">
              {incomingRequests.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-white/5 space-y-2">
                  <UserCheck className="w-8 h-8 text-slate-600 mx-auto mb-1 animate-pulse" />
                  <p className="text-xs font-bold text-slate-300">Bekleyen İstek Yok</p>
                  <p className="text-[11px] text-slate-500">
                    Sana gelen arkadaşlık istekleri burada listelenir.
                  </p>
                </div>
              ) : (
                incomingRequests.map(req => (
                  <div
                    key={req.id}
                    className="p-3 rounded-2xl bg-slate-900 border border-amber-500/30 flex items-center justify-between gap-3 shadow-md"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AvatarBadge
                        avatarId={req.avatarId}
                        customAvatarUrl={req.customAvatarDataUrl}
                        size="md"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">
                          {req.name}
                        </span>
                        <span className="text-[10px] text-amber-400 font-mono">
                          #{req.friendCode}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleAcceptRequest(req)}
                        className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-md cursor-pointer flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Kabul Et</span>
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(req.friendCode || req.id)}
                        className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 text-xs font-bold cursor-pointer"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: EXPLORE & SEND REQUEST */}
          {activeTab === 'explore' && (
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="İsim veya 6 haneli kod (#123456) ara..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 focus:border-cyan-400 focus:outline-none text-white text-xs"
                />
              </div>

              {/* Direct Code Action Card when entering a code */}
              {searchQuery.trim().length >= 4 && (
                <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-400/40 flex items-center justify-between gap-2 shadow-md animate-in fade-in">
                  <div className="min-w-0">
                    <span className="text-[10px] text-cyan-300 font-bold block">
                      #{searchQuery.trim().replace(/^#/, '')} Koduna İstek Gönder
                    </span>
                    <span className="text-xs text-white font-mono font-bold">
                      #{searchQuery.trim().replace(/^#/, '')}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const clean = searchQuery.trim().replace(/^#/, '');
                      handleSendFriendRequest({ friendCode: clean });
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs shadow-md cursor-pointer flex items-center gap-1.5 shrink-0 transition-transform active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>İstek Gönder</span>
                  </button>
                </div>
              )}

              {/* Online Players List */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <span>Aktif Oyuncular ({filteredExplorePlayers.length})</span>
                </span>

                {filteredExplorePlayers.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-slate-900/40 border border-white/5 space-y-1">
                    <p className="text-xs text-slate-400 font-medium">
                      Eşleşen aktif oyuncu bulunamadı.
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Arkadaşının kodunu yukarıdaki arama kutusuna yazarak istek gönderebilirsin.
                    </p>
                  </div>
                ) : (
                  filteredExplorePlayers.map(player => {
                    const isRequested = sentRequests.has(player.friendCode);
                    return (
                      <div
                        key={player.id}
                        className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-between gap-3 shadow-sm"
                      >
                        <div 
                          onClick={() => handleInspectPlayer(player)}
                          className="flex items-center gap-2.5 min-w-0 cursor-pointer group hover:opacity-90"
                          title="Profili İncele"
                        >
                          <AvatarBadge
                            avatarId={player.avatarId}
                            customAvatarUrl={player.customAvatarUrl}
                            size="md"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white block truncate group-hover:text-amber-300 transition-colors">
                              {player.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              #{player.friendCode}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">


                          {isRequested ? (
                            <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold">
                              İstek İletildi ✓
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSendFriendRequest(player)}
                              className="px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black shadow-md cursor-pointer flex items-center gap-1 transition-transform active:scale-95"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>İstek Gönder</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Prompt: Invite Friend to Match Modal */}
        {selectedPlayer && (
          <div className="p-4 border-t border-white/10 bg-slate-900/95 flex flex-col gap-3 animate-in slide-in-from-bottom duration-200 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Gamepad2 className="w-4 h-4 text-emerald-400" />
                <span>{selectedPlayer.name} Oyuna Davet Edilsin mi?</span>
              </span>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                İptal
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setInviteGameType('pisti')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  inviteGameType === 'pisti'
                    ? 'bg-amber-400 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                🎴 Pişti
              </button>
              <button
                onClick={() => setInviteGameType('uno')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  inviteGameType === 'uno'
                    ? 'bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                🔥 RENQ
              </button>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onInviteFriendToMatch({
                  friendCode: selectedPlayer.friendCode,
                  name: selectedPlayer.name,
                  gameType: inviteGameType
                });
                setSelectedPlayer(null);
                onClose();
              }}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-slate-950 text-xs font-black shadow-md cursor-pointer"
            >
              Lobi Oluştur & Davet Gönder →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

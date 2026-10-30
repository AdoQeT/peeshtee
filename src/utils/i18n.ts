export type Language = 'tr' | 'en';

const STORAGE_KEY = 'project_p_lang';
const listeners = new Set<(lang: Language) => void>();

export function getLanguage(): Language {
  if (typeof window === 'undefined') return 'tr';
  const saved = localStorage.getItem(STORAGE_KEY);
  return (saved === 'en' || saved === 'tr') ? saved : 'tr';
}

export function setLanguage(lang: Language): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, lang);
  listeners.forEach(cb => {
    try {
      cb(lang);
    } catch {}
  });
}

export function onLanguageChange(cb: (lang: Language) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export const translations = {
  tr: {
    // Header
    howToPlay: 'Nasıl Oynanır',
    settings: 'Ayarlar',
    social: 'Sosyal',
    comingSoon: 'Yakında',
    discord: 'Discord Topluluğu',
    founder: 'Kurucu',
    soundOn: 'Sesi Aç',
    soundOff: 'Sesi Kapat',
    profile: 'Profil & Başarımlar',
    
    // Main Menu Cards
    spTitle: 'TEK OYUNCULU PİŞTİ',
    spDesc: 'Yapay zekaya karşı tek başına pratik yap. 2 veya 4 kişilik mod, 5\'e basmalı kuralı ve ayarlanabilir bot zorluğu.',
    spBtn: 'HIZLI BAŞLA',
    againstBots: 'Botlara Karşı',
    target: 'Hedef:',
    duel1v1: '1v1 DÜELLO',
    players4: '4 KİŞİLİK',
    onlineLobbyTag: 'Online Lobi',
    discordCommunity: '💬 Discord Topluluğumuza Katıl',
    
    mpTitle: 'ONLINE ÇOK OYUNCULU',
    mpDesc: '6 haneli oda koduyla arkadaşlarınla canlı oyna! Pişti ve Renq destekli online lobi, canlı sohbet ve emote sistemi.',
    mpBtn: 'ONLINE LOBİYE KATIL',
    
    renqTitle: '🌈 RENQ (Renk Savaşı)',
    renqDesc: '108 kartlık efsanevi renk kapışması! +2, +4 Joker, Pas, Yön Değiştir ve 3D kavisli el. Tek kart kalınca "RENQ!" demeyi unutma!',
    renqBtn: 'RENQ OYNA',
    specialMode: 'Özel Mod',
    customSetup: 'Özel Oyun Kur & Başlat (Tek / Eşli)',
    
    // In-game & Table
    deck: 'Deste',
    shuffling: 'Deste Karılıyor',
    deckOnTable: 'Masada',
    pot: 'ORTA',
    empty: 'Bitti',
    nextRound: 'Sonraki Eli Başlat →',
    ready: 'HAZIRSIN',
    waitingOthers: 'Hazır — Bekleniyor...',
    startNextRoundReady: '🔥 SONRAKİ EL (HAZIRIM)',
    newMatch: 'Yeni Maç Başlat',
    mainMenu: 'Ana Menü',
    exitToMenu: 'Ana Menüye Dön',
    surrender: 'Teslim Ol & Ayrıl',
    turn: 'Sıra Sende',
    oppTurn: 'sırasında',
    
    // Coming Soon Modal
    comingSoonTitle: '🚀 GELECEK GÜNCELLEMELER (YOL HARİTASI)',
    comingSoonSubtitle: 'Project P evrenine yakında eklenecek devasa özellikler ve modlar',
    rankedTitle: '🏆 Dereceli & Lig Sistemi (Sezonluk Rekabet)',
    rankedDesc: 'Bronz, Gümüş, Altın, Platin ve Elmas ligleri. Maç kazandıkça LP puanı topla, sezon sonu özel altın çerçeve ve kurucu rozetleri kazan.',
    guildsTitle: '🛡️ Lonca & Kulüp Sistemi (Klan Savaşları)',
    guildsDesc: 'Arkadaşlarınla kendi kahvehane/kulübünü kur! Haftalık lonca görevleri, kulüpler arası turnuvalar ve ortak klan kasası.',
    skinsTitle: '🎨 Özel Masa & Çuha Tasarımcısı',
    skinsDesc: 'Kendi masa çuhanı, neon hatlarını ve özel kart arkalıklarını piksellerine kadar özelleştir.',
    voiceTitle: '🎙️ Masa İçi Canlı Sesli Sohbet (WebRTC)',
    voiceDesc: 'Düşük gecikmeli yerleşik mikrofonla masadaki arkadaşlarınla gerçek kahvehane havasında sesli sohbet et.',
    moreGamesTitle: '🃏 Yeni Kart Oyunları (Batak & King)',
    moreGamesDesc: 'Aynı lobi motoru üzerinde Koz Maça, İhaleli Batak ve King oyun modları.',
    close: 'Kapat'
  },
  en: {
    // Header
    howToPlay: 'How to Play',
    settings: 'Settings',
    social: 'Social',
    comingSoon: 'Coming Soon',
    discord: 'Discord Community',
    founder: 'Founder',
    soundOn: 'Unmute',
    soundOff: 'Mute',
    profile: 'Profile & Achievements',
    
    // Main Menu Cards
    spTitle: 'SINGLEPLAYER PIŞTI',
    spDesc: 'Practice solo against smart AI bots. 2 or 4 player modes, instant-win 5s variant, and adjustable difficulty.',
    spBtn: 'QUICK PLAY',
    againstBots: 'Against Bots',
    target: 'Target:',
    duel1v1: '1v1 DUEL',
    players4: '4 PLAYERS',
    onlineLobbyTag: 'Online Lobby',
    discordCommunity: '💬 Join our Discord Community',
    
    mpTitle: 'ONLINE MULTIPLAYER',
    mpDesc: 'Play live with friends via 6-digit room codes! Lobbies for Pişti & RENQ, real-time chat and emotes.',
    mpBtn: 'JOIN ONLINE LOBBY',
    
    renqTitle: '🌈 RENQ (Color Clash)',
    renqDesc: '108-card legendary color battle! +2, +4 Wilds, Skip, Reverse, and 3D arc hands. Remember to shout "RENQ!" on 1 card!',
    renqBtn: 'PLAY RENQ',
    specialMode: 'Special Mode',
    customSetup: 'Custom Match Setup (Solo / Teams)',
    
    // In-game & Table
    deck: 'Deck',
    shuffling: 'Shuffling Deck',
    deckOnTable: 'On Table',
    pot: 'POT',
    empty: 'Empty',
    nextRound: 'Start Next Round →',
    ready: 'READY',
    waitingOthers: 'Ready — Waiting...',
    startNextRoundReady: '🔥 NEXT ROUND (READY)',
    newMatch: 'Start New Match',
    mainMenu: 'Main Menu',
    exitToMenu: 'Exit to Menu',
    surrender: 'Surrender & Leave',
    turn: 'Your Turn',
    oppTurn: '\'s turn',
    
    // Coming Soon Modal
    comingSoonTitle: '🚀 UPCOMING FEATURES (ROADMAP)',
    comingSoonSubtitle: 'Exciting new features and modes coming soon to Project P',
    rankedTitle: '🏆 Ranked & Competitive Seasons',
    rankedDesc: 'Climb from Bronze to Diamond leagues. Earn LP, unlock season-end golden badges, exclusive card borders and titles.',
    guildsTitle: '🛡️ Guilds & Clubs (Clan Wars)',
    guildsDesc: 'Create your own club with friends! Weekly clan quests, inter-guild tournaments and collective reward vaults.',
    skinsTitle: '🎨 Custom Table Felt & Deck Designer',
    skinsDesc: 'Customize your table felt, neon borders, and holographic card backs with custom colors and effects.',
    voiceTitle: '🎙️ In-Game Live Voice Chat (WebRTC)',
    voiceDesc: 'Ultra low-latency spatial proximity voice chat to talk and bluff with your table mates.',
    moreGamesTitle: '🃏 More Card Games (Batak & King)',
    moreGamesDesc: 'Trick-taking Turkish card game classics Batak and King integrated into the same lobby network.',
    close: 'Close'
  }
};

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
    close: 'Kapat',

    // Settings Modal
    settingsTitle: 'AYARLAR',
    settingsSubtitle: 'Masa Teması, Ses, Dil ve Oyun Tercihleri',
    tabThemes: 'Masa & Kart',
    tabAudio: 'Ses & Dil',
    tabRules: 'Kurallar & FX',
    sfxTitle: 'Oyun Ses Efektleri',
    sfxDesc: 'Kart atma, süpürme ve pişti sesleri',
    sfxVolume: 'Ses Düzeyi',
    ambienceTitle: 'Arka Plan Ambiyansı',
    ambienceDesc: 'Ortam arka plan sesleri',
    ambienceVolume: 'Ambiyans Düzeyi',
    targetScoreTitle: 'Varsayılan Hedef Puan',
    aiDifficultyTitle: 'Bot Yapay Zeka Düzeyi',
    aiEasy: 'Rahat',
    aiMedium: 'Normal',
    aiHard: 'Usta',
    fiveRule: "5'e Basmalı Kuralı",
    fiveRuleDesc: 'Yerde tek 5 varken 5 atılırsa Pişti & anında maç kazanılır (+50 Puan).',
    dealTempo: 'Dağıtım Temposu',
    dealTempoDesc: 'Kartların masaya ve ellere uçuş hızı',
    dealFast: 'Hızlı',
    dealNormal: 'Normal',
    dealCinematic: 'Sinematik',
    screenShake: 'Ekran Sarsıntısı',
    screenShakeDesc: 'Pişti anında masa sarsıntı efekti',
    particleEffects: 'Görsel Parçacık Efektleri',
    particleEffectsDesc: 'Masa ve kart animasyon efektleri',
    saveSettings: 'Tamam, Ayarları Kaydet',

    // ScoreBoard & TableSurface
    ourTeam: 'Bizim Takım',
    rivalTeam: 'Rakip Takım',
    partner: 'Ortak',
    yourPartner: 'Ortağın',
    opponent: 'Rakip',
    opponent2: '2. Rakip',
    roundLabel: 'EL',
    fourPlayerTeam: '4 Kişilik Eşli',
    instantFives: "5'e Basmalı",
    collected: 'Toplanan',
    doubleLabel: 'Çift',
    cutDeckPrompt: '✂️ DESTEYİ KES: Kartlardan birine dokunarak desteyi ikiye böl (Vale kesene yarar!)',
    cuttingDeck: 'desteyi kesiyor...',
    splittingDeck: '✂️ DESTE BÖLÜNÜYOR:',
    cardsUnit: 'Kart',
    dealingPot: '🎴 ORTAYA 4 KART DAĞITILIYOR (3 Kapalı + 1 Açık)',
    mergingDeck: '✨ DESTE BİRLEŞTİRİLİYOR (Kalan parça kesenin üstüne konuyor)...',
    stowingDeck: '✨ DESTE YUVAYA YERLEŞTİRİLİYOR...',
    cutterPile: '✂️ Kesen:',
    remainingPile: '📦 Kalan:',
    deckMerged: '✨ Deste Birleştirildi (52 Kart)',
    deckOnTableBadge: 'Deste: Masada',
    onFloor: 'Yerde:',
    wonMatch: 'KAZANDI!',
    matchCompleted: 'MAÇ TAMAMLANDI!',
    newMatchShort: 'Yeni Maç',
    yourTurnSelect: 'Senin Sıran — Kartını Seç',
    isPlaying: 'oynuyor...',
    isThinking: 'düşünüyor...',
    sendReaction: 'Reaksiyon Gönder',

    // CardCountingOverlay
    normalSpeed: 'Normal ⏱️',
    fastSpeed: '2x Hızlı ⏩',
    instantCount: 'Anında Say ⏭️',
    skipCounting: 'Sayımı Atla ⏭',
    remainingCount: 'Kalan',
    finishedZero: 'Bitti (0)',
    countedLabel: 'Sayılmış',
    openDeck: 'Açık Deste',
    pointsLabel: '💎 Puanlar',
    noneYet: 'Henüz yok',
    majorityBadge: '🏆 +3P Çoğunluk',
    youLabel: 'Sen',
    ourPoints: 'Bizim Puan',
    oppPoints: 'Rakibin Puanı',
    totalScoreLabel: 'Toplam Puan',
    startNextRoundBtn: 'Sonraki El',
    readyRatio: 'Hazır',

    // GameSetupModal
    setupTitle: 'MASA KURULUMU',
    setupSubtitle: 'Oyun Modu ve Kural Tercihleri',
    playerCountLabel: 'Oyuncu Sayısı',
    duel1v1Label: '1v1 Düello',
    duel1v1Sub: 'Sen vs Kurnaz Bot',
    team4Label: '4 Kişilik Eşli',
    team4Sub: 'Dayı & Muhtar Masası',
    targetScoreLabel: 'Hedef Puan',
    botIntelligence: 'Bot Zekası',
    fiveRuleSpecial: "5'e Basmalı Özel Kuralı",
    fiveRuleSpecialDesc: 'Yerde tek 5 varken 5 basılırsa Pişti & anında galibiyet (50 Puan). Yerde kart varken +5 ek puan.',
    startGameBtn: 'OYUNU BAŞLAT',

    // MatchIntroOverlay
    youSuffix: '(Sen)',
    readyCheck: '✓ HAZIR',
    preparingMatch: 'Maç hazırlanıyor',
    renqArena: 'RenQ Arenası',
    pistiTable: 'Pişti Masası',
    teamA: 'TAKIM A',
    teamB: 'TAKIM B',
    pistiTips: [
      'Kartları dikkatle say, Pişti fırsatını kaçırma!',
      'Vale, yerdeki bütün kartları süpürür. Zamanını iyi seç.',
      'Karo 10 üç puan, Sinek 2 iki puandır.',
      'Son eli alan, yerde kalan tüm kartları toplar.',
      'Çoğunluk kartı toplayan 3 puan yazar.',
      'Rakibin son kartını tahmin etmeye çalış.'
    ],
    unoTips: [
      'Renk değiştirmeyi doğru zamana sakla.',
      'Son kartından önce RenQ demeyi unutma!',
      'Özel kartları rakibin son kartına yaklaştığında kullan.',
      'Elindeki renk dağılımını rakibe belli etme.'
    ]
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
    close: 'Close',

    // Settings Modal
    settingsTitle: 'SETTINGS',
    settingsSubtitle: 'Table Theme, Audio, Language and Game Preferences',
    tabThemes: 'Table & Cards',
    tabAudio: 'Audio & Lang',
    tabRules: 'Rules & FX',
    sfxTitle: 'Game Sound Effects',
    sfxDesc: 'Card play, sweep, and Pişti sounds',
    sfxVolume: 'Volume Level',
    ambienceTitle: 'Background Ambience',
    ambienceDesc: 'Ambient background soundscapes',
    ambienceVolume: 'Ambience Level',
    targetScoreTitle: 'Default Target Score',
    aiDifficultyTitle: 'Bot AI Difficulty',
    aiEasy: 'Casual',
    aiMedium: 'Normal',
    aiHard: 'Master',
    fiveRule: 'Instant-Win 5s Rule',
    fiveRuleDesc: 'Playing a 5 onto a single 5 on the table wins the match instantly (+50 Pts).',
    dealTempo: 'Dealing Tempo',
    dealTempoDesc: 'Flight speed of cards dealt to the table and hands',
    dealFast: 'Fast',
    dealNormal: 'Normal',
    dealCinematic: 'Cinematic',
    screenShake: 'Screen Shake',
    screenShakeDesc: 'Table shake effect on Pişti',
    particleEffects: 'Visual Particle Effects',
    particleEffectsDesc: 'Table and card animation particles',
    saveSettings: 'Done, Save Settings',

    // ScoreBoard & TableSurface
    ourTeam: 'Our Team',
    rivalTeam: 'Rival Team',
    partner: 'Partner',
    yourPartner: 'Your Partner',
    opponent: 'Opponent',
    opponent2: 'Opponent 2',
    roundLabel: 'ROUND',
    fourPlayerTeam: '4-Player Team',
    instantFives: 'Instant-5s',
    collected: 'Collected',
    doubleLabel: 'Double',
    cutDeckPrompt: '✂️ CUT THE DECK: Tap a card to split the deck in two (Bottom Jack goes to the cutter!)',
    cuttingDeck: 'is cutting the deck...',
    splittingDeck: '✂️ SPLITTING DECK:',
    cardsUnit: 'Cards',
    dealingPot: '🎴 DEALING 4 CARDS TO POT (3 Face-Down + 1 Face-Up)',
    mergingDeck: '✨ MERGING DECK (Placing bottom half onto top)...',
    stowingDeck: '✨ PLACING DECK IN SLOT...',
    cutterPile: '✂️ Cutter:',
    remainingPile: '📦 Remaining:',
    deckMerged: '✨ Deck Merged (52 Cards)',
    deckOnTableBadge: 'Deck: On Table',
    onFloor: 'Pot:',
    wonMatch: 'WON!',
    matchCompleted: 'MATCH COMPLETED!',
    newMatchShort: 'New Match',
    yourTurnSelect: 'Your Turn — Pick a Card',
    isPlaying: 'is playing...',
    isThinking: 'is thinking...',
    sendReaction: 'Send Reaction',

    // CardCountingOverlay
    normalSpeed: 'Normal ⏱️',
    fastSpeed: '2x Fast ⏩',
    instantCount: 'Instant Count ⏭️',
    skipCounting: 'Skip Counting ⏭',
    remainingCount: 'Remaining',
    finishedZero: 'Done (0)',
    countedLabel: 'Counted',
    openDeck: 'Open Pile',
    pointsLabel: '💎 Points',
    noneYet: 'None yet',
    majorityBadge: '🏆 +3P Majority',
    youLabel: 'You',
    ourPoints: 'Our Score',
    oppPoints: 'Opponent Score',
    totalScoreLabel: 'Total Score',
    startNextRoundBtn: 'Next Round',
    readyRatio: 'Ready',

    // GameSetupModal
    setupTitle: 'TABLE SETUP',
    setupSubtitle: 'Game Mode and Rule Preferences',
    playerCountLabel: 'Player Count',
    duel1v1Label: '1v1 Duel',
    duel1v1Sub: 'You vs Cunning Bot',
    team4Label: '4-Player Teams',
    team4Sub: '2v2 Partner Table',
    targetScoreLabel: 'Target Score',
    botIntelligence: 'Bot Intelligence',
    fiveRuleSpecial: 'Instant-Win 5s Special Rule',
    fiveRuleSpecialDesc: 'Playing a 5 onto a single 5 on the table wins instantly (+50 Pts). Capturing a pile with a 5 gives +5 bonus pts.',
    startGameBtn: 'START GAME',

    // MatchIntroOverlay
    youSuffix: '(You)',
    readyCheck: '✓ READY',
    preparingMatch: 'Preparing match',
    renqArena: 'RenQ Arena',
    pistiTable: 'Pişti Table',
    teamA: 'TEAM A',
    teamB: 'TEAM B',
    pistiTips: [
      'Count the cards carefully and never miss a Pişti chance!',
      'Jacks sweep the entire table. Time your Jacks wisely.',
      '♦10 is worth 3 points, ♣2 is worth 2 points.',
      'Whoever makes the final capture takes all remaining table cards.',
      'Collecting the majority of cards awards +3 bonus points.',
      'Try to predict your opponent’s last card.'
    ],
    unoTips: [
      'Save your wild color changes for the right moment.',
      'Don’t forget to shout RenQ before playing your second-to-last card!',
      'Use action cards when your opponent is down to their final card.',
      'Keep your hand’s color distribution unpredictable.'
    ]
  }
};

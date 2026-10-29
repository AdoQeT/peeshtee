import React, { useMemo } from 'react';
import { Card, TableTheme, Player, OnTableCountState } from '../types/game';
import { CardView, CardBackSurface, CardFrontSurface, CARD_DIMENSIONS } from './CardView';
import { AvatarBadge } from './AvatarBadge';
import { Flame, Clock, Sparkles, RotateCcw } from 'lucide-react';
import { DetailedRoundScore } from '../core/rules';
import { AmbientParticles } from './AmbientParticles';

export interface TableDomRefs {
  deckEl: HTMLDivElement | null;
  potEl: HTMLDivElement | null;
  handEls: (HTMLDivElement | null)[];
  collectedEls: (HTMLDivElement | null)[];
  pistiEls: (HTMLDivElement | null)[];
}

export interface ActiveEmote {
  playerIdx: number;
  emoji: string;
  id: string;
}

export interface RecentCaptureFeedback {
  id: string;
  playerIdx: number;
  isPisti: boolean;
  label: string;
  subLabel?: string;
}

const TableAtmosphere: React.FC<{ theme: TableTheme }> = ({ theme }) => {
  switch (theme) {
    case 'traditional':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
          {/* Card baize felt weave pattern */}
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 1px, transparent 5px), repeating-linear-gradient(-45deg, #fff 0, #fff 1px, transparent 1px, transparent 5px)'
            }}
          />
          {/* Inner Brass Inlaid Pinstripe Rail */}
          <div className="absolute inset-2.5 sm:inset-3.5 rounded-2xl border border-amber-500/25 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]" />
          <div className="absolute inset-4 sm:inset-5 rounded-xl border border-dashed border-amber-500/15" />
          {/* Classical Turkish Seljuk / Ottoman 8-Point Star Medallion in Center */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.07] pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-72 h-72 sm:w-96 sm:h-96 text-amber-300" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="100" cy="100" r="90" strokeDasharray="3 3" />
              <circle cx="100" cy="100" r="78" />
              <polygon points="100,28 116,68 158,52 142,94 182,100 142,106 158,148 116,132 100,172 84,132 42,148 58,106 18,100 58,94 42,52 84,68" />
              <polygon points="100,42 120,80 160,100 120,120 100,160 80,120 40,100 80,80" />
              <circle cx="100" cy="100" r="26" />
              <circle cx="100" cy="100" r="10" fill="currentColor" opacity="0.3" />
            </svg>
          </div>
          {/* Vintage Vignette Shade */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.65)_100%)]" />
        </div>
      );

    case 'sakura':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
          {/* Subtle Japanese Seigaiha / Petal Texture */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 50%, rgba(244,114,182,0.6) 1px, transparent 1px)',
              backgroundSize: '16px 16px'
            }}
          />
          {/* Rose-Gold Inlaid Border */}
          <div className="absolute inset-2.5 sm:inset-3.5 rounded-2xl border border-pink-400/30 shadow-[inset_0_0_25px_rgba(244,114,182,0.1)]" />
          <div className="absolute inset-4 sm:inset-5 rounded-xl border border-dashed border-pink-400/20" />
          {/* Central Sacred Sakura Crest Mon */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.09] pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-72 h-72 sm:w-96 sm:h-96 text-pink-300" fill="currentColor">
              <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
              <circle cx="100" cy="100" r="82" fill="none" stroke="currentColor" strokeWidth="1.5" />
              {[0, 72, 144, 216, 288].map(deg => (
                <g key={deg} transform={`rotate(${deg} 100 100)`}>
                  <path d="M100 85 C80 55, 75 25, 92 12 L100 22 L108 12 C125 25, 120 55, 100 85 Z" opacity="0.8" />
                </g>
              ))}
              <circle cx="100" cy="100" r="16" fill="currentColor" opacity="0.5" />
            </svg>
          </div>
          {/* Deep Velvet Edge Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_45%,_rgba(10,1,12,0.75)_100%)]" />
        </div>
      );

    case 'estoril_blue':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
          {/* Subtle Sport Fabric Weave */}
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #e0f2fe 0, #e0f2fe 1px, transparent 1px, transparent 6px), repeating-linear-gradient(-45deg, #bae6fd 0, #bae6fd 1px, transparent 1px, transparent 6px)'
            }}
          />
          {/* Aerodynamic Dual Silver-Sky Pinstripe Rail */}
          <div className="absolute inset-2.5 sm:inset-3.5 rounded-2xl border-2 border-sky-300/40 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]" />
          <div className="absolute inset-4 sm:inset-5 rounded-xl border border-dashed border-sky-200/25" />
          {/* Corner Aerodynamic Speed Accents */}
          <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-sky-300/60 rounded-tl-md" />
          <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-sky-300/60 rounded-tr-md" />
          <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-sky-300/60 rounded-bl-md" />
          <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-sky-300/60 rounded-br-md" />
          {/* Central Estoril M-Sport Racing Crest */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.08] pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-72 h-72 sm:w-96 sm:h-96 text-sky-200" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="100,18 175,55 175,145 100,182 25,145 25,55" strokeWidth="2" strokeDasharray="6 3" />
              <polygon points="100,32 160,62 160,138 100,168 40,138 40,62" />
              <circle cx="100" cy="100" r="42" strokeDasharray="4 2" />
              <path d="M78 100 L122 100 M100 78 L100 122" strokeWidth="2" />
              <circle cx="100" cy="100" r="16" />
            </svg>
          </div>
          {/* Deep Sapphire Felt Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_45%,_rgba(4,14,28,0.75)_100%)]" />
        </div>
      );

    case 'alpine_white':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
          {/* Luxury White Marble / Silk Baize Weave */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 50%, #475569 1px, transparent 1px), repeating-linear-gradient(45deg, #64748b 0, #64748b 1px, transparent 1px, transparent 10px)'
            }}
          />
          {/* Brushed Platinum & Anthracite Dual Rail */}
          <div className="absolute inset-2.5 sm:inset-3.5 rounded-2xl border-2 border-slate-300/50 shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]" />
          <div className="absolute inset-4 sm:inset-5 rounded-xl border border-dashed border-slate-400/30" />
          {/* Minimal Platinum Corner Brackets */}
          <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-slate-300/70 rounded-tl-md" />
          <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-slate-300/70 rounded-tr-md" />
          <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-slate-300/70 rounded-bl-md" />
          <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-slate-300/70 rounded-br-md" />
          {/* Central Alpine Platinum Diamond Monogram */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.08] pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-72 h-72 sm:w-96 sm:h-96 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="100,20 180,100 100,180 20,100" strokeWidth="2" strokeDasharray="4 2" />
              <polygon points="100,38 162,100 100,162 38,100" />
              <circle cx="100" cy="100" r="32" />
              <circle cx="100" cy="100" r="12" fill="currentColor" opacity="0.3" />
            </svg>
          </div>
          {/* Soft Anthracite Edge Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_48%,_rgba(15,23,42,0.7)_100%)]" />
        </div>
      );

    case 'melbourne_red':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
          {/* Melbourne Sport Red Diamond Weave */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, #f87171 0, #f87171 1px, transparent 1px, transparent 7px), repeating-linear-gradient(-45deg, #dc2626 0, #dc2626 1px, transparent 1px, transparent 7px)'
            }}
          />
          {/* Metallic Bronze & Crimson Inlay Rail */}
          <div className="absolute inset-2.5 sm:inset-3.5 rounded-2xl border-2 border-amber-400/40 shadow-[inset_0_0_22px_rgba(0,0,0,0.6)]" />
          <div className="absolute inset-4 sm:inset-5 rounded-xl border border-dashed border-red-300/30" />
          {/* Dynamic Corner Speed Fins */}
          <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-amber-400/60 rounded-tl-md" />
          <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-amber-400/60 rounded-tr-md" />
          <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-amber-400/60 rounded-bl-md" />
          <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-amber-400/60 rounded-br-md" />
          {/* Central Melbourne Speed Emblem */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.09] pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-72 h-72 sm:w-96 sm:h-96 text-red-300" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="100" cy="100" r="88" strokeWidth="2" strokeDasharray="5 3" />
              <polygon points="100,28 172,70 172,130 100,172 28,130 28,70" />
              <circle cx="100" cy="100" r="30" />
              <polygon points="100,55 125,120 75,120" fill="currentColor" opacity="0.4" />
            </svg>
          </div>
          {/* Deep Crimson Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_42%,_rgba(15,2,4,0.85)_100%)]" />
        </div>
      );

    case 'luxury_gold':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
          {/* Fine Damask / Leather Grain Texture */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(30deg, #d97706 0, #d97706 1px, transparent 1px, transparent 8px), repeating-linear-gradient(-30deg, #d97706 0, #d97706 1px, transparent 1px, transparent 8px)'
            }}
          />
          {/* 24k Gold Beveled Rail */}
          <div className="absolute inset-2.5 sm:inset-3.5 rounded-2xl border-2 border-amber-500/40 shadow-[inset_0_0_30px_rgba(245,158,11,0.15)]" />
          <div className="absolute inset-4 sm:inset-5 rounded-xl border border-dashed border-amber-400/25" />
          {/* Corner Baroque Flourish Accents */}
          <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-amber-400/50 rounded-tl-lg" />
          <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-amber-400/50 rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-amber-400/50 rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-amber-400/50 rounded-br-lg" />
          {/* Central Casino Royale Medallion */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.09] pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-72 h-72 sm:w-96 sm:h-96 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="100" cy="100" r="92" strokeWidth="2.5" />
              <circle cx="100" cy="100" r="84" strokeDasharray="4 2" />
              <circle cx="100" cy="100" r="68" />
              {/* Crown Emblem in center */}
              <path d="M80 115 L74 90 L88 98 L100 84 L112 98 L126 90 L120 115 Z" fill="currentColor" opacity="0.7" />
              <rect x="78" y="118" width="44" height="6" rx="2" fill="currentColor" opacity="0.8" />
              <circle cx="74" cy="88" r="2.5" fill="currentColor" />
              <circle cx="100" cy="82" r="3" fill="currentColor" />
              <circle cx="126" cy="88" r="2.5" fill="currentColor" />
            </svg>
          </div>
          {/* Warm Cognac Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_45%,_rgba(7,2,4,0.8)_100%)]" />
        </div>
      );

    case 'monaco_velvet':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
          {/* Royal Emerald Damask Weave Texture */}
          <div
            className="absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 50%, #10b981 1px, transparent 1px), repeating-linear-gradient(45deg, #059669 0, #059669 1px, transparent 1px, transparent 10px)'
            }}
          />
          {/* French Casino Mahogany & Polished Emerald Inlay Rail */}
          <div className="absolute inset-2.5 sm:inset-3.5 rounded-2xl border-2 border-emerald-400/45 shadow-[inset_0_0_25px_rgba(16,185,129,0.2)]" />
          <div className="absolute inset-4 sm:inset-5 rounded-xl border border-dashed border-emerald-300/25" />
          {/* Central Casino Royale Fleur-de-Lis Medallion */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.09] pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-72 h-72 sm:w-96 sm:h-96 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="100" cy="100" r="90" strokeDasharray="4 3" strokeWidth="2" />
              <circle cx="100" cy="100" r="74" />
              <polygon points="100,35 118,80 165,80 126,108 142,155 100,126 58,155 74,108 35,80 82,80" fill="currentColor" opacity="0.4" />
              <circle cx="100" cy="100" r="22" strokeWidth="2" />
            </svg>
          </div>
          {/* Deep Royal Noir Emerald Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_42%,_rgba(1,8,4,0.88)_100%)]" />
        </div>
      );
  }
};

export interface SlotReadinessInfo {
  seatIndex: number;
  name: string;
  isReady: boolean;
  isAI: boolean;
}

export const cardDomElements = new Map<string, HTMLElement>();

interface TableSurfaceProps {
  theme: TableTheme;
  cardBack: string;
  tableCards: Card[];
  players: Player[];
  currentTurn: number;
  deckCount: number;
  isBusy: boolean;
  isShuffling: boolean;
  hiddenCardIds?: Set<string>;
  recentCapture?: RecentCaptureFeedback | null;
  turnTimeRemaining: number; // 0 to 15 seconds (Multiplayer only)
  isMultiplayer?: boolean;
  activeEmotes?: ActiveEmote[];
  onSendEmote?: (emoji: string) => void;
  onTableCountState?: OnTableCountState | null;
  onSkipCounting?: () => void;
  onToggleFastCounting?: () => void;
  onFinishCounting?: () => void;
  tableRefs: React.MutableRefObject<TableDomRefs>;
  onPlayCard: (card: Card, rect: DOMRect, tiltAngle: number) => void;

  // Dev peek & On-table Round/Game Over controls
  devSeeAllHands?: boolean;
  isGameOver?: boolean;
  gameOverWinner?: Player | null;
  roundScores?: {
    user: DetailedRoundScore;
    opp: DetailedRoundScore;
    winner: Player | null;
    isGameOver: boolean;
  } | null;
  onNextRound?: () => void;
  onRestartGame?: () => void;
  onExitToMenu?: () => void;
  isReadyForNextRound?: boolean;
  readySeatsCount?: number;
  totalHumanPlayersCount?: number;
  slotsReadiness?: SlotReadinessInfo[];
  onToggleReady?: () => void;
}

export const TableSurface: React.FC<TableSurfaceProps> = ({
  theme,
  cardBack,
  tableCards,
  players,
  currentTurn,
  deckCount,
  isBusy,
  isShuffling,
  hiddenCardIds,
  recentCapture,
  turnTimeRemaining,
  isMultiplayer = false,
  activeEmotes,
  onSendEmote,
  onTableCountState = null,
  onSkipCounting,
  onToggleFastCounting,
  onFinishCounting: _onFinishCounting,
  tableRefs,
  onPlayCard,
  devSeeAllHands = false,
  isGameOver = false,
  gameOverWinner = null,
  roundScores = null,
  onNextRound,
  onRestartGame,
  onExitToMenu,
  isReadyForNextRound = false,
  readySeatsCount = 0,
  totalHumanPlayersCount = 0,
  slotsReadiness = [],
  onToggleReady
}) => {
  const [showEmotePicker, setShowEmotePicker] = React.useState(false);
  const [hoveredHandCardId, setHoveredHandCardId] = React.useState<string | null>(null);
  const isFourPlayers = players.length === 4;
  const user = players[0];
  const isCountingActive = Boolean(onTableCountState?.isActive);
  const isPlayerTurn = currentTurn === 0 && !isBusy && !isCountingActive;

  // Visible table cards (excluding cards currently in mid-air flight to the pot)
  const visibleTableCards = useMemo(
    () => tableCards.filter(c => !hiddenCardIds?.has(c.id)),
    [tableCards, hiddenCardIds]
  );

  const topVisibleTableCard =
    visibleTableCards.length > 0 ? visibleTableCards[visibleTableCards.length - 1] : null;

  const hoveredHandCard = useMemo(
    () => user.hand.find(c => c.id === hoveredHandCardId) || null,
    [user.hand, hoveredHandCardId]
  );

  const isHoveredCardCapturing = Boolean(
    isPlayerTurn &&
      topVisibleTableCard &&
      hoveredHandCard &&
      (hoveredHandCard.value === topVisibleTableCard.value || hoveredHandCard.value === 11)
  );

  const isSingleCardPistiChance =
    !isCountingActive &&
    !isShuffling &&
    visibleTableCards.length === 1 &&
    visibleTableCards[0].faceUp;

  const getThemeBg = () => {
    switch (theme) {
      case 'sakura':
        return 'bg-[#120414] bg-[radial-gradient(ellipse_at_center,_#360c29_0%,_#1a051d_58%,_#0a010c_100%)] border-pink-900/80 shadow-[inset_0_0_100px_rgba(0,0,0,0.85),0_25px_60px_rgba(0,0,0,0.85)]';
      case 'estoril_blue':
        return 'bg-[#061528] bg-[radial-gradient(ellipse_at_center,_#123a66_0%,_#081e36_50%,_#020b16_100%)] border-sky-400/40 shadow-[inset_0_0_100px_rgba(14,165,233,0.18),0_25px_60px_rgba(0,0,0,0.88)]';
      case 'alpine_white':
        return 'bg-[#151921] bg-[radial-gradient(ellipse_at_center,_#333c48_0%,_#1b212b_52%,_#0b0e13_100%)] border-slate-400/40 shadow-[inset_0_0_100px_rgba(255,255,255,0.06),0_25px_60px_rgba(0,0,0,0.88)]';
      case 'melbourne_red':
        return 'bg-[#1a0407] bg-[radial-gradient(ellipse_at_center,_#520912_0%,_#290408_52%,_#0d0103_100%)] border-red-500/40 shadow-[inset_0_0_100px_rgba(220,38,38,0.2),0_25px_60px_rgba(0,0,0,0.9)]';
      case 'monaco_velvet':
        return 'bg-[#03170e] bg-[radial-gradient(ellipse_at_center,_#0a3d28_0%,_#042114_55%,_#010b06_100%)] border-emerald-500/50 shadow-[inset_0_0_100px_rgba(16,185,129,0.25),0_25px_60px_rgba(0,0,0,0.9)]';
      case 'luxury_gold':
        return 'bg-[#140608] bg-[radial-gradient(ellipse_at_center,_#38150c_0%,_#1a090d_60%,_#070204_100%)] border-amber-600/50 shadow-[inset_0_0_100px_rgba(0,0,0,0.85),0_25px_60px_rgba(0,0,0,0.85)]';
      case 'traditional':
      default:
        return 'bg-[#062419] bg-[radial-gradient(ellipse_at_center,_#0d442f_0%,_#062a1d_55%,_#031710_100%)] border-amber-950/90 shadow-[inset_0_0_100px_rgba(0,0,0,0.85),0_25px_60px_rgba(0,0,0,0.85)]';
    }
  };

  const handleCardClick = (
    card: Card,
    tiltAngle: number,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!isPlayerTurn) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onPlayCard(card, rect, tiltAngle);
  };

  // 1. Regular Collected Cards Pile (Toplanan Normal Kartlar)
  // During On-Table Counting: shows shrinking closed stack + 3D flipping face-up counted pile + Point Cards Showcase!
  const renderCollectedPile = (
    player: Player,
    playerIdx: number,
    labelPos: 'top' | 'bottom' = 'bottom',
    compact: boolean = false
  ) => {
    const count = player.collectedCards.length;
    const visibleLayers = Math.min(7, Math.ceil(Math.max(count, 1) / 4));

    const hasCapturePulse =
      recentCapture && recentCapture.playerIdx === playerIdx && !recentCapture.isPisti;

    const boxSize = compact
      ? 'w-12 h-16 sm:w-14 sm:h-20'
      : 'w-14 h-20 sm:w-16 sm:h-24';

    return (
      <div className="relative flex items-center gap-2.5">
        <div
          ref={el => {
            tableRefs.current.collectedEls[playerIdx] = el;
          }}
          className={`relative flex items-center justify-center ${boxSize} rounded-xl border shrink-0 transition-transform duration-200 ${
            hasCapturePulse ? 'scale-105 border-emerald-400 bg-emerald-950/40' : ''
          } border-dashed border-white/15 bg-black/25`}
          title={`${player.name} Toplanan Kartlar: ${count}`}
        >
          {count === 0 ? (
            <span className="text-[11px] text-white/40 font-semibold text-center px-1 leading-tight">
              Toplanan
              <br />0
            </span>
          ) : (
            <div className="relative w-10 h-14 sm:w-13 sm:h-19">
              {Array.from({ length: visibleLayers }).map((_, layerIdx) => (
                <div
                  key={layerIdx}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    transform: `translate3d(${layerIdx * -1.1}px, ${layerIdx * -1.4}px, 0) rotate(${
                      (layerIdx % 2 === 0 ? 1 : -1) * 2
                    }deg)`
                  }}
                  className="rounded-lg shadow-md"
                >
                  <CardBackSurface cardBack={cardBack} />
                </div>
              ))}
            </div>
          )}

          <div
            className={`absolute ${
              labelPos === 'bottom' ? '-bottom-4' : '-top-4'
            } bg-slate-950/95 border border-white/20 text-slate-100 text-[11px] font-black px-2 py-0.5 rounded-full shadow-md whitespace-nowrap z-20`}
          >
            📦 {count}
          </div>
        </div>
      </div>
    );
  };

  // 2. Separate Crossed 90-Degree Pişti Stack (Tersli Düzlü 90 Derece Pişti Yığını!)
  // Bottom card face-down (ters, 0°), top card face-up (düz, 90° crossed facing us!)
  const renderPistiPile = (
    player: Player,
    playerIdx: number,
    labelPos: 'top' | 'bottom' = 'bottom',
    compact: boolean = false
  ) => {
    const pistiCount = player.pistiCount;
    const pairs = player.pistiPairs || [];
    const visiblePairs = pairs.slice(-6);
    const hasPistiPulse =
      recentCapture && recentCapture.playerIdx === playerIdx && recentCapture.isPisti;

    const boxSize = compact
      ? 'w-14 h-16 sm:w-16 sm:h-20'
      : 'w-16 h-20 sm:w-20 sm:h-24';

    return (
      <div
        ref={el => {
          tableRefs.current.pistiEls[playerIdx] = el;
        }}
        className={`relative flex flex-col items-center justify-center ${boxSize} rounded-xl border shrink-0 transition-transform duration-200 ${
          hasPistiPulse ? 'scale-105 border-amber-300 bg-amber-500/20' : ''
        } ${
          pistiCount > 0
            ? 'border-amber-400/70 bg-amber-950/35 shadow-[0_0_18px_rgba(245,158,11,0.3)]'
            : 'border-dashed border-white/10 bg-black/15'
        }`}
        title={`${player.name} Pişti Destesi: ${pistiCount} adet (90° Çapraz Tersli Düzlü)`}
      >
        {pistiCount === 0 ? (
          <div className="flex flex-col items-center justify-center opacity-25">
            <span className="text-base select-none font-sans font-light text-amber-200">✛</span>
          </div>
        ) : (
          <div className="relative w-11 h-15 sm:w-13 sm:h-18 flex items-center justify-center">
            {visiblePairs.map((pair, pairIdx) => (
              <div
                key={pairIdx}
                style={{
                  position: 'absolute',
                  transform: `translate3d(0, ${pairIdx * -4.5}px, 0)`
                }}
                className="w-full h-full flex items-center justify-center pointer-events-none"
              >
                {/* Bottom card: 0 degrees, face-down (ters) */}
                <div className="absolute inset-0 rounded-lg shadow-md">
                  <CardBackSurface cardBack={cardBack} />
                </div>
                {/* Top card: 90 degrees crossed perpendicular, face-up (düz, bize bakıyor!) */}
                <div
                  style={{ transform: 'rotate(90deg) scale(0.95)' }}
                  className="absolute inset-0 rounded-lg shadow-xl border-2 border-amber-400"
                >
                  <CardFrontSurface card={pair.topCard} theme={theme} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          className={`absolute ${
            labelPos === 'bottom' ? '-bottom-4' : '-top-4'
          } bg-amber-500 border border-amber-200 text-slate-950 text-[11px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-0.5 whitespace-nowrap z-20`}
        >
          <Flame className="w-2.5 h-2.5 fill-slate-950" />
          <span>{pistiCount} Pişti</span>
        </div>
      </div>
    );
  };

  const topOpponentIdx = isFourPlayers ? 2 : 1;
  const topOpponent = players[topOpponentIdx] || players[1];

  return (
    <div
      className={`relative flex-1 w-full max-w-6xl mx-auto flex flex-col justify-between items-center py-2 sm:py-3 px-2 sm:px-6 select-none overflow-hidden rounded-3xl border-4 shadow-[inset_0_0_80px_rgba(0,0,0,0.75),0_25px_60px_rgba(0,0,0,0.8)] transition-colors duration-500 ${getThemeBg()}`}
    >
      {/* Keyframes for On-Table 3D Card Count Flip & Emote Pop */}
      <style>{`
        @keyframes cardCountFlip {
          0% {
            transform: perspective(900px) rotateY(140deg) translateY(-8px) scale(1.12);
            opacity: 0.3;
          }
          65% {
            transform: perspective(900px) rotateY(-3deg) translateY(-2px) scale(1.03);
            opacity: 1;
          }
          100% {
            transform: perspective(900px) rotateY(0deg) translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes emotePop2s {
          0% {
            transform: translate(-50%, 8px) scale(0.4);
            opacity: 0;
          }
          14% {
            transform: translate(-50%, -6px) scale(1.18);
            opacity: 1;
          }
          24% {
            transform: translate(-50%, -4px) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -8px) scale(1.03);
            opacity: 1;
          }
          80% {
            transform: translate(-50%, -5px) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -22px) scale(0.8);
            opacity: 0;
          }
        }
      `}</style>

      {/* Enriched Theme Atmosphere, Felt Textures & Ambient Watermarks */}
      <TableAtmosphere theme={theme} />

      {/* Dynamic 60/120 FPS Ambient Particles Motor */}
      <AmbientParticles theme={theme} intensity="dense" />

      {/* =========================================================
          1. TOP OPPONENT / 2v2 PARTNER AREA (Fixed 3-Column Lock)
         ========================================================= */}
      <div className="relative z-10 flex items-center justify-center w-full max-w-4xl mx-auto px-2">
        {/* Left: Top Opponent Collected Pile (Fixed 100px width so it NEVER shifts!) */}
        <div className="w-24 sm:w-28 flex justify-end shrink-0">
          {renderCollectedPile(topOpponent, topOpponentIdx, 'bottom')}
        </div>

        {/* Center: Top Opponent / Partner Hand (Responsive container) */}
        <div className="max-w-[calc(100vw-20px)] w-full sm:w-[380px] flex flex-col items-center shrink-0 relative">
          {/* Floating Active Emote for Top Opponent */}
          {activeEmotes
            ?.filter(e => e.playerIdx === topOpponentIdx)
            .map(e => (
              <div
                key={e.id}
                style={{ animation: 'emotePop2s 2000ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards' }}
                className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
              >
                <div className="px-3.5 py-1.5 rounded-2xl bg-slate-900/95 border-2 border-amber-400 text-3xl shadow-[0_10px_35px_rgba(0,0,0,0.9)] flex items-center justify-center animate-bounce">
                  {e.emoji}
                </div>
              </div>
            ))}

          <div className="mb-1 flex items-center gap-1.5">
            <span
              className={`text-xs font-bold px-3 py-0.5 rounded-full border transition-all flex items-center gap-1.5 ${
                currentTurn === topOpponentIdx && !isCountingActive
                  ? isFourPlayers
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-400/70 shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                    : 'bg-rose-950/90 text-rose-300 border-rose-400/70 shadow-[0_0_12px_rgba(251,113,133,0.4)]'
                  : 'bg-slate-950/80 text-slate-300 border-white/15'
              }`}
            >
              <AvatarBadge
                avatarId={topOpponent.avatarId}
                customAvatarUrl={topOpponent.customAvatarUrl}
                fallbackEmoji={topOpponent.avatar}
                size="xs"
                showBorder={false}
              />
              <span>{topOpponent.name}</span>
              {topOpponent.customTitle && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30">
                  {topOpponent.customTitle}
                </span>
              )}
              {isFourPlayers && (
                <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/40">
                  Ortağın
                </span>
              )}
            </span>
          </div>

          <div
            ref={el => {
              tableRefs.current.handEls[topOpponentIdx] = el;
            }}
            className="flex justify-center items-center min-h-[96px] sm:min-h-[120px] min-w-[170px] -space-x-6 sm:-space-x-7"
          >
            {topOpponent.hand.map((card, idx) => {
              const tilt = (idx - (topOpponent.hand.length - 1) / 2) * 5;
              const isHidden = hiddenCardIds?.has(card.id) ?? false;
              return (
                <div
                  key={card.id}
                  data-card-id={card.id}
                  ref={el => {
                    if (el) cardDomElements.set(card.id, el);
                    else cardDomElements.delete(card.id);
                  }}
                  className="transition-transform duration-200 ease-out"
                >
                  <CardView
                    card={devSeeAllHands ? { ...card, faceUp: true, devForceFaceUp: true } : card}
                    isOpponent={true}
                    isHiddenInFlight={isHidden}
                    tiltAngle={tilt}
                    cardBack={cardBack}
                    theme={theme}
                    size={isFourPlayers ? 'sm' : 'md'}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Top Opponent Pişti Pile (Fixed 100px width so it NEVER shifts!) */}
        <div className="w-24 sm:w-28 flex justify-start shrink-0">
          {renderPistiPile(topOpponent, topOpponentIdx, 'bottom')}
        </div>
      </div>

      {/* =========================================================
          2. MIDDLE AREA: POT/DECK OR ON-TABLE LIVE COUNTING CEREMONY
         ========================================================= */}
      <div className="relative z-10 w-full flex items-center justify-between px-1 sm:px-4 my-auto">
        {/* Left Player (Seat 3 - Muhtar in 4-Player mode) */}
        {isFourPlayers && players[3] ? (
          <div className="flex items-center gap-2 relative">
            {/* Floating Active Emote for Left Player */}
            {activeEmotes
              ?.filter(e => e.playerIdx === 3)
              .map(e => (
                <div
                  key={e.id}
                  style={{ animation: 'emotePop2s 2000ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards' }}
                  className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                >
                  <div className="px-3.5 py-1.5 rounded-2xl bg-slate-900/95 border-2 border-rose-400 text-3xl shadow-[0_10px_35px_rgba(0,0,0,0.9)] flex items-center justify-center animate-bounce">
                    {e.emoji}
                  </div>
                </div>
              ))}
            <div className="flex flex-col items-center">
              <span
                className={`text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border mb-1 flex items-center gap-1.5 ${
                  currentTurn === 3 && !isCountingActive
                    ? 'bg-rose-950/90 text-rose-300 border-rose-400/70 shadow-[0_0_12px_rgba(251,113,133,0.4)]'
                    : 'bg-slate-950/80 text-slate-300 border-white/15'
                }`}
              >
                <AvatarBadge
                  avatarId={players[3].avatarId}
                  customAvatarUrl={players[3].customAvatarUrl}
                  fallbackEmoji={players[3].avatar}
                  size="xs"
                  showBorder={false}
                />
                <span>{players[3].name}</span>
                {players[3].customTitle && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30">
                    {players[3].customTitle}
                  </span>
                )}
              </span>
              <div
                ref={el => {
                  tableRefs.current.handEls[3] = el;
                }}
                className="flex flex-col items-center justify-center min-h-[110px] min-w-[68px] -space-y-11"
              >
                {players[3].hand.map((card, idx) => {
                  const isHidden = hiddenCardIds?.has(card.id) ?? false;
                  const tilt = 90 + (idx - (players[3].hand.length - 1) / 2) * 4;
                  return (
                    <div
                      key={card.id}
                      data-card-id={card.id}
                      ref={el => {
                        if (el) cardDomElements.set(card.id, el);
                        else cardDomElements.delete(card.id);
                      }}
                      className="transition-transform duration-200"
                    >
                      <CardView
                        card={devSeeAllHands ? { ...card, faceUp: true, devForceFaceUp: true } : card}
                        isOpponent={true}
                        isHiddenInFlight={isHidden}
                        tiltAngle={tilt}
                        cardBack={cardBack}
                        theme={theme}
                        size="sm"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="hidden sm:flex flex-col gap-3">
              {renderCollectedPile(players[3], 3, 'bottom', true)}
              {renderPistiPile(players[3], 3, 'bottom', true)}
            </div>
          </div>
        ) : (
          <div className="w-4 sm:w-12" />
        )}

        {/* CENTER TABLE: If Counting -> On-Table Counting Felt HUD, otherwise Deck + Pot */}
        {isCountingActive && onTableCountState ? (
          <div className="flex flex-col items-center justify-center p-3 sm:p-5 rounded-3xl bg-slate-950/95 border-2 border-amber-400/80 shadow-[0_0_50px_rgba(245,158,11,0.45)] max-w-2xl w-full text-center mx-auto my-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between w-full px-2 mb-1">
              <span className="text-[11px] sm:text-xs font-cyber text-amber-400 uppercase tracking-widest font-black flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                Masa Üstü Canlı Kart Sayımı
              </span>
              <span className="text-[10px] text-slate-400">
                {onTableCountState.isDone ? '✅ Sayım Tamamlandı' : '🔍 Kartlar taranıyor...'}
              </span>
            </div>

            {/* Counts comparison: BIG PUAN on top, smaller kart sayısı underneath + Big Visual Counting Stage */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full my-2">
              {/* USER / TEAM PODIUM */}
              {(() => {
                const userPistiPts = onTableCountState.userPistiPoints ?? 0;
                const userCardPts = onTableCountState.userCardPoints ?? 0;
                const userPts =
                  userCardPts +
                  userPistiPts +
                  (onTableCountState.isDone && onTableCountState.userMajority ? 3 : 0);
                const userPistiCount = Math.floor(userPistiPts / 10);
                const currentCard = onTableCountState.userCurrentCard;
                const pointCards = onTableCountState.userPointCards || [];

                return (
                  <div
                    className={`p-3 rounded-2xl border flex flex-col items-center transition-all ${
                      onTableCountState.isDone && onTableCountState.userMajority
                        ? 'border-emerald-400 bg-emerald-950/75 shadow-[0_0_24px_rgba(52,211,153,0.35)]'
                        : 'border-white/15 bg-slate-900/90'
                    }`}
                  >
                    <div className="text-[11px] sm:text-xs text-emerald-300 font-bold uppercase tracking-wider">
                      {isFourPlayers ? '🔵 Bizim Takım' : '👤 Senin Kartların'}
                    </div>

                    {/* BÜYÜK PUAN (İnsanın gözüne çarpan büyük sayı) */}
                    <div className="text-2xl sm:text-4xl font-black text-amber-300 font-cyber my-0.5 tracking-tight drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]">
                      +{userPts}{' '}
                      <span className="text-xs sm:text-sm font-black text-amber-400 uppercase tracking-widest font-sans">
                        Puan
                      </span>
                    </div>

                    {/* Altındaki küçük yazı: Kart sayısı ve detaylar */}
                    <div className="text-[10px] sm:text-[11px] text-slate-300 font-medium">
                      <span className="font-bold text-white">
                        {onTableCountState.userCountedIndex} / {onTableCountState.userTotal} Kart
                      </span>
                      {userPistiCount > 0 && (
                        <span className="text-amber-400 ml-1 font-bold">
                          ({userPistiCount} Pişti)
                        </span>
                      )}
                    </div>

                    {/* LARGE ACTIVE FLIPPING CARD IN FRONT OF USER */}
                    <div className="mt-2.5 flex items-center justify-center gap-2">
                      <div className="relative w-16 h-22 sm:w-20 sm:h-28 rounded-xl shadow-xl border-2 border-amber-300/80 bg-black/40 flex items-center justify-center overflow-hidden">
                        {currentCard ? (
                          <div
                            key={`user-cnt-${onTableCountState.userCountedIndex}`}
                            className="w-full h-full"
                            style={{
                              animation: 'cardCountFlip 190ms cubic-bezier(0.22, 1, 0.36, 1) forwards'
                            }}
                          >
                            <CardFrontSurface card={currentCard} theme={theme} />
                          </div>
                        ) : (
                          <div className="w-full h-full">
                            <CardBackSurface cardBack={cardBack} />
                          </div>
                        )}

                        {/* Special Point Pop */}
                        {currentCard && currentCard.basePoints > 0 && (
                          <div className="absolute -top-1 -right-1 z-30 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] shadow-lg animate-bounce">
                            +{currentCard.basePoints}P!
                          </div>
                        )}
                      </div>

                      {/* AYIKLANAN SAYILAR TEPSİSİ */}
                      <div className="flex flex-col items-start min-w-[70px] sm:min-w-[90px]">
                        <span className="text-[11px] font-bold text-amber-300 uppercase">
                          Sayılar (+{onTableCountState.userCardPoints}P):
                        </span>
                        <div className="flex items-center -space-x-3 mt-1">
                          {pointCards.length === 0 ? (
                            <span className="text-[11px] text-slate-500 italic">Henüz yok</span>
                          ) : (
                            pointCards.slice(-4).map((pc, idx) => (
                              <div
                                key={`${pc.id}-${idx}`}
                                className="w-7 h-10 sm:w-8 sm:h-12 rounded shadow border border-amber-300/60 overflow-hidden shrink-0"
                              >
                                <CardFrontSurface card={pc} theme={theme} />
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* OPPONENT / OPPONENT TEAM PODIUM */}
              {(() => {
                const oppPistiPts = onTableCountState.oppPistiPoints ?? 0;
                const oppCardPts = onTableCountState.oppCardPoints ?? 0;
                const oppPts =
                  oppCardPts +
                  oppPistiPts +
                  (onTableCountState.isDone && onTableCountState.oppMajority ? 3 : 0);
                const oppPistiCount = Math.floor(oppPistiPts / 10);
                const currentCard = onTableCountState.oppCurrentCard;
                const pointCards = onTableCountState.oppPointCards || [];

                return (
                  <div
                    className={`p-3 rounded-2xl border flex flex-col items-center transition-all ${
                      onTableCountState.isDone && onTableCountState.oppMajority
                        ? 'border-rose-400 bg-rose-950/75 shadow-[0_0_24px_rgba(251,113,133,0.35)]'
                        : 'border-white/15 bg-slate-900/90'
                    }`}
                  >
                    <div className="text-[11px] sm:text-xs text-rose-300 font-bold uppercase tracking-wider">
                      {isFourPlayers ? '🔴 Rakip Takım' : '👤 Rakip Kartları'}
                    </div>

                    {/* BÜYÜK PUAN */}
                    <div className="text-2xl sm:text-4xl font-black text-rose-300 font-cyber my-0.5 tracking-tight drop-shadow-[0_2px_8px_rgba(244,63,94,0.5)]">
                      +{oppPts}{' '}
                      <span className="text-xs sm:text-sm font-black text-rose-400 uppercase tracking-widest font-sans">
                        Puan
                      </span>
                    </div>

                    {/* Altındaki küçük yazı: Kart sayısı ve detaylar */}
                    <div className="text-[10px] sm:text-[11px] text-slate-300 font-medium">
                      <span className="font-bold text-white">
                        {onTableCountState.oppCountedIndex} / {onTableCountState.oppTotal} Kart
                      </span>
                      {oppPistiCount > 0 && (
                        <span className="text-amber-400 ml-1 font-bold">
                          ({oppPistiCount} Pişti)
                        </span>
                      )}
                    </div>

                    {/* LARGE ACTIVE FLIPPING CARD FOR OPPONENT */}
                    <div className="mt-2.5 flex items-center justify-center gap-2">
                      <div className="relative w-16 h-22 sm:w-20 sm:h-28 rounded-xl shadow-xl border-2 border-rose-400/80 bg-black/40 flex items-center justify-center overflow-hidden">
                        {currentCard ? (
                          <div
                            key={`opp-cnt-${onTableCountState.oppCountedIndex}`}
                            className="w-full h-full"
                            style={{
                              animation: 'cardCountFlip 190ms cubic-bezier(0.22, 1, 0.36, 1) forwards'
                            }}
                          >
                            <CardFrontSurface card={currentCard} theme={theme} />
                          </div>
                        ) : (
                          <div className="w-full h-full">
                            <CardBackSurface cardBack={cardBack} />
                          </div>
                        )}

                        {/* Special Point Pop */}
                        {currentCard && currentCard.basePoints > 0 && (
                          <div className="absolute -top-1 -right-1 z-30 px-2 py-0.5 rounded-full bg-rose-400 text-slate-950 font-black text-[11px] shadow-lg animate-bounce">
                            +{currentCard.basePoints}P!
                          </div>
                        )}
                      </div>

                      {/* AYIKLANAN SAYILAR TEPSİSİ */}
                      <div className="flex flex-col items-start min-w-[70px] sm:min-w-[90px]">
                        <span className="text-[11px] font-bold text-rose-300 uppercase">
                          Sayılar (+{onTableCountState.oppCardPoints}P):
                        </span>
                        <div className="flex items-center -space-x-3 mt-1">
                          {pointCards.length === 0 ? (
                            <span className="text-[11px] text-slate-500 italic">Henüz yok</span>
                          ) : (
                            pointCards.slice(-4).map((pc, idx) => (
                              <div
                                key={`${pc.id}-${idx}`}
                                className="w-7 h-10 sm:w-8 sm:h-12 rounded shadow border border-rose-300/60 overflow-hidden shrink-0"
                              >
                                <CardFrontSurface card={pc} theme={theme} />
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Majority Announcement */}
            {onTableCountState.isDone && (
              <div className="my-1.5 px-4 py-1.5 rounded-xl bg-amber-950/90 border border-amber-400/70 text-xs font-black text-amber-300 animate-in fade-in">
                {onTableCountState.userMajority
                  ? `🏆 KART ÇOĞUNLUĞU (+3 PUAN) SİZİN! (${onTableCountState.userTotal} vs ${onTableCountState.oppTotal})`
                  : onTableCountState.oppMajority
                  ? `KART ÇOĞUNLUĞU (+3 PUAN) RAKİPTE (${onTableCountState.oppTotal} vs ${onTableCountState.userTotal})`
                  : 'KART ÇOĞUNLUĞU: EŞİT (26 - 26)'}
              </div>
            )}

            {/* Total match score row */}
            {onTableCountState.isDone && (
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 my-1 text-xs">
                <div className="px-3 py-1 rounded-xl bg-emerald-950/85 border border-emerald-500/50 text-emerald-300 font-bold flex items-center gap-1.5 shadow-md">
                  <span>{isFourPlayers ? '🔵 Bizim Takım' : '👤 Sen'}:</span>
                  <span className="font-cyber font-black text-white text-sm">{players[0]?.score ?? 0}</span>
                  {roundScores?.user && (
                    <span className="text-emerald-400 text-[11px] font-mono font-bold">
                      (+{roundScores.user.totalRoundPoints}P)
                    </span>
                  )}
                </div>
                <div className="px-3 py-1 rounded-xl bg-rose-950/85 border border-rose-500/50 text-rose-300 font-bold flex items-center gap-1.5 shadow-md">
                  <span>{isFourPlayers ? '🔴 Rakip Takım' : `👤 ${players[1]?.name || 'Rakip'}`}:</span>
                  <span className="font-cyber font-black text-white text-sm">{players[1]?.score ?? 0}</span>
                  {roundScores?.opp && (
                    <span className="text-rose-400 text-[11px] font-mono font-bold">
                      (+{roundScores.opp.totalRoundPoints}P)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Action controls directly on the table felt */}
            <div className="flex flex-col items-center gap-2 mt-2">
              {!onTableCountState.isDone ? (
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={onToggleFastCounting}
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/50 hover:bg-amber-500/30 transition-colors cursor-pointer"
                  >
                    {onTableCountState.isFast ? 'Normal Hız' : '2x Hızlandır ⏩'}
                  </button>
                  <button
                    onClick={onSkipCounting}
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/10 text-slate-200 border border-white/20 hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    Anında Say ⏭️
                  </button>
                </div>
              ) : isGameOver ? (
                /* GAME OVER STATE */
                <div className="flex flex-col items-center gap-2.5">
                  <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500/30 via-yellow-500/20 to-amber-500/30 border-2 border-amber-400 text-amber-200 font-black text-sm sm:text-base shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center gap-2 animate-bounce">
                    <span>🏆</span>
                    <span>
                      {gameOverWinner ? `${gameOverWinner.name.toUpperCase()} KAZANDI!` : 'MAÇ TAMAMLANDI!'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {onRestartGame && (
                      <button
                        onClick={onRestartGame}
                        className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg cursor-pointer transition-transform active:scale-95 flex items-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Yeni Maç Başlat</span>
                      </button>
                    )}
                    {onExitToMenu && (
                      <button
                        onClick={onExitToMenu}
                        className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 cursor-pointer transition-all active:scale-95"
                      >
                        Ana Menü
                      </button>
                    )}
                  </div>
                </div>
              ) : isMultiplayer ? (
                /* MULTIPLAYER READY-CHECK SYSTEM */
                <div className="flex flex-col items-center gap-2">
                  {/* Readiness Status Badges of Each Slot */}
                  {slotsReadiness && slotsReadiness.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                      {slotsReadiness.map(slot => (
                        <div
                          key={slot.seatIndex}
                          className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold border flex items-center gap-1.5 transition-all ${
                            slot.isReady
                              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.35)]'
                              : 'bg-slate-900/85 text-slate-400 border-slate-700/60'
                          }`}
                        >
                          <span className="text-xs">{slot.isReady ? '✅' : '⏳'}</span>
                          <span>{slot.name}</span>
                          <span className="text-[11px] opacity-80">{slot.isReady ? 'Hazır' : 'Bekliyor'}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Ready Toggle Button */}
                  <button
                    onClick={onToggleReady}
                    className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-lg ${
                      isReadyForNextRound
                        ? 'bg-emerald-600/90 hover:bg-emerald-500 text-white border border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                        : 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.5)] animate-pulse'
                    }`}
                  >
                    {isReadyForNextRound ? (
                      <>
                        <span>✅ HAZIRSIN</span>
                        <span className="text-emerald-100 font-mono text-xs">
                          ({readySeatsCount}/{totalHumanPlayersCount} Hazır — Bekleniyor...)
                        </span>
                      </>
                    ) : (
                      <>
                        <span>🔥 SONRAKİ EL (HAZIRIM)</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* SINGLEPLAYER NEXT ROUND BUTTON */
                <button
                  onClick={onNextRound}
                  className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <span>Sonraki Eli Başlat</span>
                  <span>→</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-6 sm:gap-12 mx-auto">
            {/* Physical Deck Stack on the Left of the Pot (Exact scale(1) to match shuffle end) */}
            <div className="flex flex-col items-center">
              <div
                ref={el => {
                  tableRefs.current.deckEl = el;
                }}
                className={`relative ${CARD_DIMENSIONS.md.classes} flex items-center justify-center rounded-xl border border-dashed border-white/20 bg-black/25`}
              >
                {isShuffling ? (
                  <div className="flex flex-col items-center justify-center text-amber-300/70 text-[10px] font-bold text-center px-2">
                    <Sparkles className="w-4 h-4 mb-1 animate-spin text-amber-400" />
                    <span>Deste Karılıyor</span>
                  </div>
                ) : deckCount > 0 ? (
                  <div className="relative w-full h-full">
                    {Array.from({ length: Math.min(8, Math.ceil(deckCount / 6)) }).map(
                      (_, layerIdx) => (
                        <div
                          key={layerIdx}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            transform: `translate3d(${layerIdx * -1.2}px, ${
                              layerIdx * -1.5
                            }px, 0)`
                          }}
                          className="rounded-xl shadow-md"
                        >
                          <CardBackSurface cardBack={cardBack} />
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-white/30 font-semibold text-center px-1">
                    Deste
                    <br />
                    Bitti
                  </span>
                )}
              </div>
              <span className="mt-1.5 text-[10px] font-cyber text-slate-200 font-bold bg-slate-950/90 px-2.5 py-0.5 rounded-full border border-white/15 shadow-md">
                Deste: {deckCount}
              </span>
            </div>

            {/* Center Pot Pile (Where cards are dealt & thrown) */}
            <div className="relative flex flex-col items-center justify-center">
              <div
                ref={el => {
                  tableRefs.current.potEl = el;
                }}
                className={`relative ${CARD_DIMENSIONS.md.classes} flex items-center justify-center rounded-2xl border-2 transition-all duration-300 ${
                  isHoveredCardCapturing
                    ? 'border-emerald-400 bg-emerald-500/20 ring-4 ring-emerald-400/50 shadow-[0_0_40px_rgba(16,185,129,0.65)] scale-105'
                    : isSingleCardPistiChance
                    ? 'border-amber-400/80 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.25)]'
                    : 'border-dashed border-white/20 bg-black/20'
                }`}
              >
                {visibleTableCards.length === 0 && tableCards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-white/25 p-2 text-center pointer-events-none">
                    <span className="text-xs font-semibold">ORTA</span>
                  </div>
                ) : (
                  tableCards.slice(-14).map((card, idx) => {
                    const ox = card.tableOffsetX ?? 0;
                    const oy = card.tableOffsetY ?? 0;
                    const rot = card.tableRotation ?? 0;
                    const isHidden = hiddenCardIds?.has(card.id) ?? false;

                    return (
                      <div
                        key={card.id}
                        data-card-id={card.id}
                        ref={el => {
                          if (el) cardDomElements.set(card.id, el);
                          else cardDomElements.delete(card.id);
                        }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          transform: `translate3d(${ox}px, ${oy}px, 0) rotate(${rot}deg)`,
                          zIndex: idx + 1
                        }}
                      >
                        <CardView
                          card={card}
                          isOpponent={!card.faceUp}
                          isHiddenInFlight={isHidden}
                          tiltAngle={0}
                          cardBack={cardBack}
                          theme={theme}
                          size="md"
                        />
                      </div>
                    );
                  })
                )}
              </div>

              {/* Table Card Counter Badge */}
              <div className="mt-1.5 bg-slate-950/90 border border-white/20 text-slate-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-lg">
                Yerde: {visibleTableCards.length} Kart
              </div>

              {/* Instant Game Over Overlay if ended before counting */}
              {isGameOver && !onTableCountState?.isActive && (
                <div className="absolute inset-0 -inset-x-8 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-2xl p-4 shadow-2xl animate-in fade-in duration-300">
                  <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500/30 via-yellow-500/20 to-amber-500/30 border-2 border-amber-400 text-amber-200 font-black text-sm shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center gap-2 mb-3 animate-pulse">
                    <span>🏆</span>
                    <span>
                      {gameOverWinner ? `${gameOverWinner.name.toUpperCase()} KAZANDI!` : 'MAÇ TAMAMLANDI!'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {onRestartGame && (
                      <button
                        onClick={onRestartGame}
                        className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg cursor-pointer transition-transform active:scale-95 flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Yeni Maç</span>
                      </button>
                    )}
                    {onExitToMenu && (
                      <button
                        onClick={onExitToMenu}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/20 cursor-pointer transition-all active:scale-95"
                      >
                        Ana Menü
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Player (Seat 1 - Kurnaz Bot in 4-Player mode) */}
        {isFourPlayers && players[1] ? (
          <div className="flex items-center gap-2 relative">
            {/* Floating Active Emote for Right Player */}
            {activeEmotes
              ?.filter(e => e.playerIdx === 1)
              .map(e => (
                <div
                  key={e.id}
                  style={{ animation: 'emotePop2s 2000ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards' }}
                  className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                >
                  <div className="px-3.5 py-1.5 rounded-2xl bg-slate-900/95 border-2 border-rose-400 text-3xl shadow-[0_10px_35px_rgba(0,0,0,0.9)] flex items-center justify-center animate-bounce">
                    {e.emoji}
                  </div>
                </div>
              ))}
            <div className="hidden sm:flex flex-col gap-3">
              {renderCollectedPile(players[1], 1, 'bottom', true)}
              {renderPistiPile(players[1], 1, 'bottom', true)}
            </div>
            <div className="flex flex-col items-center">
              <span
                className={`text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border mb-1 flex items-center gap-1.5 ${
                  currentTurn === 1 && !isCountingActive
                    ? 'bg-rose-950/90 text-rose-300 border-rose-400/70 shadow-[0_0_12px_rgba(251,113,133,0.4)]'
                    : 'bg-slate-950/80 text-slate-300 border-white/15'
                }`}
              >
                <AvatarBadge
                  avatarId={players[1].avatarId}
                  customAvatarUrl={players[1].customAvatarUrl}
                  fallbackEmoji={players[1].avatar}
                  size="xs"
                  showBorder={false}
                />
                <span>{players[1].name}</span>
                {players[1].customTitle && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-400/30">
                    {players[1].customTitle}
                  </span>
                )}
              </span>
              <div
                ref={el => {
                  tableRefs.current.handEls[1] = el;
                }}
                className="flex flex-col items-center justify-center min-h-[110px] min-w-[68px] -space-y-11"
              >
                {players[1].hand.map((card, idx) => {
                  const isHidden = hiddenCardIds?.has(card.id) ?? false;
                  const tilt = -90 + (idx - (players[1].hand.length - 1) / 2) * 4;
                  return (
                    <div
                      key={card.id}
                      data-card-id={card.id}
                      ref={el => {
                        if (el) cardDomElements.set(card.id, el);
                        else cardDomElements.delete(card.id);
                      }}
                      className="transition-transform duration-200"
                    >
                      <CardView
                        card={devSeeAllHands ? { ...card, faceUp: true, devForceFaceUp: true } : card}
                        isOpponent={true}
                        isHiddenInFlight={isHidden}
                        tiltAngle={tilt}
                        cardBack={cardBack}
                        theme={theme}
                        size="sm"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-4 sm:w-12" />
        )}
      </div>

      {/* =========================================================
          3. BOTTOM HUMAN PLAYER HAND AREA & CONTROLS (Fixed 3-Column Lock)
         ========================================================= */}
      <div className="relative z-10 flex items-center justify-center w-full max-w-4xl mx-auto px-2">
        {/* Left: User Collected Pile (Fixed 100px width so it NEVER shifts!) */}
        <div className="w-24 sm:w-28 flex justify-end shrink-0">
          {renderCollectedPile(user, 0, 'top')}
        </div>

        {/* Center: User Hand with Turn Status (Responsive container) */}
        <div className="max-w-[calc(100vw-20px)] w-full sm:w-[380px] flex flex-col items-center shrink-0 relative">
          {/* Floating Active Emote for User */}
          {activeEmotes
            ?.filter(e => e.playerIdx === 0)
            .map(e => (
              <div
                key={e.id}
                style={{ animation: 'emotePop2s 2000ms cubic-bezier(0.2, 0.9, 0.3, 1) forwards' }}
                className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
              >
                <div className="px-3.5 py-1.5 rounded-2xl bg-slate-900/95 border-2 border-emerald-400 text-3xl shadow-[0_10px_35px_rgba(0,0,0,0.9)] flex items-center justify-center animate-bounce">
                  {e.emoji}
                </div>
              </div>
            ))}

          {/* Turn Status: Timer ONLY appears if isMultiplayer === true! */}
          <div className="mb-1 flex flex-col items-center w-full max-w-xs">
            {isMultiplayer ? (
              <>
                <div className="flex items-center justify-between w-full px-2 mb-0.5 text-[11px]">
                  {isPlayerTurn ? (
                    <span className="font-bold text-emerald-300 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Senin Sıran — Kartını Seç
                    </span>
                  ) : (
                    <span className="text-slate-300 font-medium">
                      {`${players[currentTurn]?.name || 'Rakip'} oynuyor...`}
                    </span>
                  )}

                  {/* Countdown Number in Multiplayer */}
                  <span
                    className={`font-cyber font-bold flex items-center gap-1 ${
                      turnTimeRemaining <= 5 ? 'text-red-400 animate-pulse' : 'text-slate-200'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    {turnTimeRemaining}s
                  </span>
                </div>

                {/* Visual 15s Countdown Progress Bar in Multiplayer */}
                <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/15">
                  <div
                    style={{ width: `${(turnTimeRemaining / 15) * 100}%` }}
                    className={`h-full transition-all duration-300 ${
                      turnTimeRemaining <= 5
                        ? 'bg-gradient-to-r from-red-600 to-amber-500'
                        : isPlayerTurn
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                    }`}
                  />
                </div>
              </>
            ) : (
              /* Singleplayer: Clean Relaxing Indicator (NO Timer, NO Countdown!) */
              <div className="flex items-center justify-center w-full py-0.5">
                {isPlayerTurn ? (
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 px-3.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-400/50 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Senin Sıran — Kartını Seç
                  </span>
                ) : (
                  <span className="text-xs text-slate-300 px-3.5 py-0.5 rounded-full bg-slate-950/80 border border-white/15">
                    {`${players[currentTurn]?.name || 'Rakip'} düşünüyor...`}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Cards Hand with Tactical Auto-Lift & Hover Physics */}
          <div
            ref={el => {
              tableRefs.current.handEls[0] = el;
            }}
            className="flex justify-center items-center min-h-[140px] sm:min-h-[160px] min-w-[240px] -space-x-2.5 sm:-space-x-3.5 pt-5 pb-1"
          >
            {user.hand.map((card, idx) => {
              const baseTilt = (idx - (user.hand.length - 1) / 2) * 5;
              const isHidden = hiddenCardIds?.has(card.id) ?? false;
              const isHovered = hoveredHandCardId === card.id;

              const isPistiMatch = Boolean(
                isPlayerTurn &&
                  !isHidden &&
                  topVisibleTableCard &&
                  visibleTableCards.length === 1 &&
                  card.value === topVisibleTableCard.value
              );
              const isCaptureMatch = Boolean(
                isPlayerTurn &&
                  !isHidden &&
                  topVisibleTableCard &&
                  visibleTableCards.length > 1 &&
                  card.value === topVisibleTableCard.value
              );
              const isJackSweep = Boolean(
                isPlayerTurn &&
                  !isHidden &&
                  topVisibleTableCard &&
                  card.value === 11 &&
                  card.value !== topVisibleTableCard.value
              );

              // Neighbor parting when hovering a card
              let displaceX = 0;
              if (hoveredHandCardId && !isHovered) {
                const hovIdx = user.hand.findIndex(c => c.id === hoveredHandCardId);
                if (hovIdx !== -1) {
                  displaceX = idx < hovIdx ? -12 : 12;
                }
              }

              // Auto-elevation for matching / tactical cards
              let liftY = 0;
              if (isPistiMatch) liftY = -22;
              else if (isCaptureMatch) liftY = -16;
              else if (isJackSweep) liftY = -12;

              const activeTilt = isHovered ? 0 : baseTilt;

              return (
                <div
                  key={card.id}
                  data-card-id={card.id}
                  ref={el => {
                    if (el) cardDomElements.set(card.id, el);
                    else cardDomElements.delete(card.id);
                  }}
                  onMouseEnter={() => setHoveredHandCardId(card.id)}
                  onMouseLeave={() => setHoveredHandCardId(null)}
                  style={{
                    transform: `translate3d(${displaceX}px, ${liftY}px, 0)`,
                    zIndex: isHovered ? 40 : isPistiMatch || isCaptureMatch ? 20 + idx : idx + 1
                  }}
                  className="relative transition-all duration-200 ease-out"
                >
                  <CardView
                    card={card}
                    isPlayable={isPlayerTurn && !isHidden}
                    isHiddenInFlight={isHidden}
                    onClick={e => handleCardClick(card, activeTilt, e)}
                    tiltAngle={activeTilt}
                    cardBack={cardBack}
                    theme={theme}
                    size="md"
                    className={
                      isPistiMatch
                        ? 'ring-2 ring-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.75)]'
                        : isCaptureMatch
                        ? 'ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.65)]'
                        : isJackSweep
                        ? 'ring-2 ring-indigo-400 shadow-[0_0_18px_rgba(99,102,241,0.6)]'
                        : ''
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Pişti Pile & Emote Button (Fixed 100px width so it NEVER shifts!) */}
        <div className="w-24 sm:w-28 flex items-center justify-start gap-2 shrink-0">
          {renderPistiPile(user, 0, 'top')}

          {/* Minimalist Quick Emote Reaction Trigger */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowEmotePicker(prev => !prev)}
              title="Reaksiyon Gönder"
              className="p-2.5 rounded-2xl bg-slate-950/85 hover:bg-slate-900 border border-white/20 hover:border-amber-400/60 text-amber-300 shadow-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            >
              <span className="text-lg">💬</span>
            </button>

            {showEmotePicker && (
              <div className="absolute bottom-12 right-0 z-50 flex items-center gap-1 p-2 rounded-2xl bg-slate-950/95 border border-white/20 shadow-2xl backdrop-blur-md animate-fadeIn">
                {[
                  { emoji: '☕', name: 'Çay Ismarla' },
                  { emoji: '👏', name: 'Alkış' },
                  { emoji: '🔥', name: 'Alev' },
                  { emoji: '😅', name: 'Balına' },
                  { emoji: '🃏', name: 'Vale miydi!' },
                  { emoji: '😎', name: 'Usta İşi' }
                ].map(item => (
                  <button
                    key={item.emoji}
                    type="button"
                    onClick={() => {
                      onSendEmote?.(item.emoji);
                      setShowEmotePicker(false);
                    }}
                    title={item.name}
                    className="w-9 h-9 rounded-xl hover:bg-white/15 flex items-center justify-center text-lg transition-transform hover:scale-125 active:scale-95 cursor-pointer"
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

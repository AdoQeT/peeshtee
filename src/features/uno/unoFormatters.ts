import { UnoCard, UnoColor } from './unoTypes';
import { getLanguage, Language, translations } from '../../utils/i18n';

export function sortUnoCardsByColor(cards: UnoCard[]): UnoCard[] {
  const COLOR_ORDER: Record<UnoColor, number> = {
    red: 0,
    blue: 1,
    green: 2,
    yellow: 3,
    wild: 4
  };
  const VALUE_ORDER: Record<string, number> = {
    '0': 0,
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    skip: 10,
    reverse: 11,
    draw2: 12,
    wild: 13,
    wild_draw4: 14
  };

  return [...cards].sort((a, b) => {
    const colorDiff = (COLOR_ORDER[a.color] ?? 99) - (COLOR_ORDER[b.color] ?? 99);
    if (colorDiff !== 0) return colorDiff;
    return (VALUE_ORDER[a.value] ?? 99) - (VALUE_ORDER[b.value] ?? 99);
  });
}

export function getColorName(color: UnoColor, currentLang: Language = getLanguage()): string {
  const t = translations[currentLang] || translations.tr;
  const map: Record<UnoColor, string> = {
    red: t.renqColorRed,
    blue: t.renqColorBlue,
    green: t.renqColorGreen,
    yellow: t.renqColorYellow,
    wild: t.renqColorWild
  };
  return map[color] || color;
}

export const COLOR_DOT_CLASSES: Record<UnoColor, string> = {
  red: 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]',
  blue: 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.9)]',
  green: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.9)]',
  yellow: 'bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.9)]',
  wild: 'bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.9)]'
};

export const COLOR_THEMES: Record<
  UnoColor,
  {
    glow: string;
    text: string;
    bgRing: string;
    border: string;
    tableAura: string;
    strokeHex: string;
  }
> = {
  red: {
    glow: 'rgba(239, 68, 68, 0.45)',
    text: 'text-red-400',
    bgRing: 'ring-red-500/70',
    border: 'border-red-500/80',
    tableAura: 'from-red-950/45 via-red-900/15 to-transparent',
    strokeHex: '#ef4444'
  },
  blue: {
    glow: 'rgba(59, 130, 246, 0.45)',
    text: 'text-blue-400',
    bgRing: 'ring-blue-500/70',
    border: 'border-blue-500/80',
    tableAura: 'from-blue-950/45 via-blue-900/15 to-transparent',
    strokeHex: '#3b82f6'
  },
  green: {
    glow: 'rgba(16, 185, 129, 0.45)',
    text: 'text-emerald-400',
    bgRing: 'ring-emerald-500/70',
    border: 'border-emerald-500/80',
    tableAura: 'from-emerald-950/45 via-emerald-900/15 to-transparent',
    strokeHex: '#10b981'
  },
  yellow: {
    glow: 'rgba(245, 158, 11, 0.45)',
    text: 'text-amber-400',
    bgRing: 'ring-amber-400/70',
    border: 'border-amber-400/80',
    tableAura: 'from-amber-950/45 via-amber-900/15 to-transparent',
    strokeHex: '#f59e0b'
  },
  wild: {
    glow: 'rgba(168, 85, 247, 0.45)',
    text: 'text-purple-400',
    bgRing: 'ring-purple-500/70',
    border: 'border-purple-500/80',
    tableAura: 'from-purple-950/45 via-purple-900/15 to-transparent',
    strokeHex: '#a855f7'
  }
};

export function formatCardName(card: UnoCard, currentLang: Language = getLanguage()): string {
  const t = translations[currentLang] || translations.tr;
  const colorName = getColorName(card.color, currentLang);
  const valMap: Record<string, string> = {
    skip: `🚫 ${t.renqPassBtn}`,
    reverse: `⇄ ${t.renqDirectionCounter}`,
    draw2: '+2',
    wild: `🌈 ${t.renqColorWild}`,
    wild_draw4: `🌈 +4 ${t.renqColorWild}`
  };
  const v = valMap[card.value] || card.value;
  if (card.color === 'wild') return v;
  return `${colorName} ${v}`;
}

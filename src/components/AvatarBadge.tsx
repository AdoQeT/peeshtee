import React from 'react';
import { getAvatarPreset } from '../features/profile/profileManager';

interface AvatarBadgeProps {
  avatarId?: string;
  customAvatarUrl?: string;
  fallbackEmoji?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBorder?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-xs rounded-full',
  sm: 'w-8 h-8 text-sm rounded-full',
  md: 'w-10 h-10 text-base sm:w-11 sm:h-11 sm:text-lg rounded-full',
  lg: 'w-14 h-14 text-2xl sm:w-16 sm:h-16 sm:text-3xl rounded-2xl',
  xl: 'w-20 h-20 text-4xl sm:w-24 sm:h-24 sm:text-5xl rounded-3xl'
};

export const AvatarBadge: React.FC<AvatarBadgeProps> = ({
  avatarId = 'wolf',
  customAvatarUrl,
  fallbackEmoji,
  size = 'md',
  showBorder = true,
  className = ''
}) => {
  const preset = getAvatarPreset(avatarId);
  const sizeClass = SIZE_CLASSES[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none shadow-md overflow-hidden ${
        customAvatarUrl ? 'bg-slate-800' : `bg-gradient-to-br ${preset.gradient}`
      } ${
        showBorder ? `border-2 ${preset.borderColor}` : ''
      } ${sizeClass} ${className}`}
      title={`${preset.name} — ${preset.title}`}
    >
      {customAvatarUrl ? (
        <img
          src={customAvatarUrl}
          alt="Avatar"
          className="w-full h-full object-cover rounded-[inherit]"
        />
      ) : (
        <span className="transform transition-transform group-hover:scale-110 drop-shadow-md">
          {fallbackEmoji || preset.emoji}
        </span>
      )}
      {/* Subtle top-left gloss glare */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/30 pointer-events-none" />
    </div>
  );
};

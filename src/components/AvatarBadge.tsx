import React from 'react';
import { getAvatarPreset } from '../features/profile/profileManager';

interface AvatarBadgeProps {
  avatarId?: string;
  customAvatarUrl?: string;
  fallbackEmoji?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBorder?: boolean;
  isOwner?: boolean;
  className?: string;
  customTitle?: string;
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
  isOwner = false,
  className = '',
  customTitle
}) => {
  const [imgError, setImgError] = React.useState(false);
  const preset = getAvatarPreset(avatarId);
  const sizeClass = SIZE_CLASSES[size];

  React.useEffect(() => {
    setImgError(false);
  }, [customAvatarUrl]);

  const hasValidCustomImg = Boolean(customAvatarUrl && !imgError);

  const tooltipText = customTitle
    ? `${isOwner ? '👑 [KURUCU] ' : ''}${customTitle}`
    : hasValidCustomImg
    ? `${isOwner ? '👑 [KURUCU] ' : ''}Özel Profil Fotoğrafı`
    : `${isOwner ? '👑 [KURUCU] ' : ''}${preset.name} — ${preset.title}`;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none shadow-md ${
        isOwner ? 'ring-2 ring-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.7)]' : ''
      } ${
        hasValidCustomImg ? 'bg-slate-800' : `bg-gradient-to-br ${preset.gradient}`
      } ${
        showBorder ? (isOwner ? 'border-2 border-yellow-300' : `border-2 ${preset.borderColor}`) : ''
      } ${sizeClass} ${className}`}
      title={tooltipText}
    >
      {/* Floating Gold Crown for Game Owner */}
      {isOwner && (
        <span
          className="absolute -top-1.5 -right-1.5 z-30 pointer-events-none drop-shadow-[0_2px_6px_rgba(245,158,11,0.95)] animate-pulse"
          style={{ fontSize: size === 'xs' ? '10px' : size === 'sm' ? '12px' : '15px' }}
        >
          👑
        </span>
      )}
      {hasValidCustomImg ? (
        <img
          src={customAvatarUrl}
          alt="Avatar"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover rounded-[inherit]"
        />
      ) : (
        <span className="transform transition-transform group-hover:scale-110 drop-shadow-md">
          {fallbackEmoji || preset.emoji}
        </span>
      )}
      {/* Subtle top-left gloss glare */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/30 pointer-events-none rounded-[inherit]" />
    </div>
  );
};

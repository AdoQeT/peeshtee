import React, { useEffect, useRef, useState } from 'react';
import { CardBackSurface } from './CardView';
import { AvatarBadge } from './AvatarBadge';
import { TableTheme } from '../types/game';
import { sound } from '../core/audio/soundEngine';

export interface MatchIntroPlayer {
  name: string;
  avatar: string;
  avatarId?: string;
  customAvatarUrl?: string;
  isMe?: boolean;
  /** 0 = sol takım, 1 = sağ takım. Verilmezse sıraya göre dağıtılır (çift/tek). */
  team?: 0 | 1;
}

interface MatchIntroOverlayProps {
  label: string;
  gameType?: 'pisti' | 'uno';
  players: MatchIntroPlayer[];
  theme?: TableTheme;
  cardBack?: string;
  /** Artık kullanılmıyor: prefers-reduced-motion otomatik algılanır. */
  reducedMotion?: boolean;
  /** Toplam süre (ms). Son 450 ms fade-out; onReveal fade başlarken çağrılır. */
  durationMs?: number;
  onReveal: () => void;
  onDone: () => void;
}

const PISTI_TIPS = [
  'Kartları dikkatle say, Pişti fırsatını kaçırma!',
  'Vale, yerdeki bütün kartları süpürür. Zamanını iyi seç.',
  'Karo 10 üç puan, Sinek 2 iki puandır.',
  'Son eli alan, yerde kalan tüm kartları toplar.',
  'Çoğunluk kartı toplayan 3 puan yazar.',
  'Rakibin son kartını tahmin etmeye çalış.'
];

const UNO_TIPS = [
  'Renk değiştirmeyi doğru zamana sakla.',
  'Son kartından önce RenQ demeyi unutma!',
  'Özel kartları rakibin son kartına yaklaştığında kullan.',
  'Elindeki renk dağılımını rakibe belli etme.'
];

const PALETTES: Record<string, { glow: string; mid: string; edge: string }> = {
  monaco_velvet: { glow: '168,85,247', mid: '#2e1065', edge: '#07030f' },
  melbourne_red: { glow: '239,68,68', mid: '#450a0a', edge: '#0a0303' },
  estoril_blue: { glow: '56,189,248', mid: '#082f49', edge: '#020a14' },
  alpine_white: { glow: '226,232,240', mid: '#1e293b', edge: '#05070b' },
  traditional: { glow: '16,185,129', mid: '#022c22', edge: '#010a07' }
};

// Yelpaze açıları (8 kart). Dönüş merkezi kartın altında olduğu için doğal bir el yelpazesi oluşur.
const FAN = [-31, -22, -13, -4, 4, 13, 22, 31];
const RIFFLE_STEP_MS = 70;
const RIFFLE_MS = 360;
const TAP_START_MS = RIFFLE_STEP_MS * (FAN.length - 1) + RIFFLE_MS + 30; // ~880
const FAN_START_MS = TAP_START_MS + 250; // ~1130

const CSS = `
@keyframes mio-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes mio-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes mio-title { from { opacity: 0; letter-spacing: 0.65em; transform: translateY(-14px); } to { opacity: 1; letter-spacing: 0.16em; transform: translateY(0); } }
@keyframes mio-shimmer { from { background-position: 0% 50%; } to { background-position: 200% 50%; } }
@keyframes mio-riffle-l { from { opacity: 0; transform: translate(-170px, -34px) rotate(-16deg); } 30% { opacity: 1; } to { opacity: 1; transform: translate(0, 0) rotate(0deg); } }
@keyframes mio-riffle-r { from { opacity: 0; transform: translate(170px, -34px) rotate(16deg); } 30% { opacity: 1; } to { opacity: 1; transform: translate(0, 0) rotate(0deg); } }
@keyframes mio-tap { 0% { transform: translateY(0) scale(1); } 45% { transform: translateY(-12px) scale(1.04); } 100% { transform: translateY(0) scale(1); } }
@keyframes mio-fan { from { transform: rotate(0deg); } to { transform: rotate(var(--mio-rot)); } }
@keyframes mio-spin { to { transform: rotate(360deg); } }
@keyframes mio-rise { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 0.85; } 100% { transform: translateY(-105vh); opacity: 0; } }
@keyframes mio-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes mio-ready { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }
@keyframes mio-vs { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }
`;

export const MatchIntroOverlay: React.FC<MatchIntroOverlayProps> = ({
  label,
  gameType = 'pisti',
  players,
  theme = 'traditional',
  cardBack = 'classic_blue',
  durationMs = 2250,
  onReveal,
  onDone
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [tip] = useState(() => {
    const pool = gameType === 'uno' ? UNO_TIPS : PISTI_TIPS;
    return pool[Math.floor(Math.random() * pool.length)];
  });
  const [reduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const onRevealRef = useRef(onReveal);
  const onDoneRef = useRef(onDone);
  onRevealRef.current = onReveal;
  onDoneRef.current = onDone;

  useEffect(() => {
    const revealAt = Math.max(durationMs - 450, 600);

    sound.playSweepGather();
    const fanSound = window.setTimeout(() => sound.playCardDeal(), reduced ? 0 : FAN_START_MS);
    const revealTimer = window.setTimeout(() => {
      setIsFadingOut(true);
      onRevealRef.current?.();
    }, revealAt);
    const doneTimer = window.setTimeout(() => {
      onDoneRef.current?.();
    }, durationMs);

    return () => {
      window.clearTimeout(fanSound);
      window.clearTimeout(revealTimer);
      window.clearTimeout(doneTimer);
    };
    // Süreler yalnızca mount anında okunur; callback'ler ref üzerinden güncel tutulur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pal = PALETTES[theme as string] || PALETTES.traditional;
  const glow = pal.glow;
  const anim = (value: string) => (reduced ? 'none' : value);

  const left = players.filter((p, i) => (p.team !== undefined ? p.team : i % 2) === 0);
  const right = players.filter((p, i) => (p.team !== undefined ? p.team : i % 2) === 1);
  const showTeams = players.length > 2;

  const renderPlayer = (p: MatchIntroPlayer, order: number, align: 'left' | 'right') => {
    const isRight = align === 'right';
    return (
      <div
        key={`${align}-${order}-${p.name}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          flexDirection: isRight ? 'row-reverse' : 'row',
          gap: 10,
          minWidth: 0,
          textAlign: isRight ? 'right' : 'left',
          animation: anim(`mio-fade-up 520ms cubic-bezier(.2,.8,.25,1) ${350 + order * 140}ms both`)
        }}
      >
        <AvatarBadge
          avatarId={p.avatarId}
          customAvatarUrl={p.customAvatarUrl}
          fallbackEmoji={p.avatar}
          size="md"
          className={p.isMe ? 'ring-2 ring-amber-400' : ''}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: '#fff',
              fontWeight: 800,
              fontSize: 'clamp(12px, 3.2vw, 15px)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 'clamp(80px, 24vw, 150px)'
            }}
          >
            {p.name}
            {p.isMe && (
              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, color: '#fbbf24' }}>(Sen)</span>
            )}
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#34d399',
              letterSpacing: '0.06em',
              animation: anim(`mio-ready 380ms ease-out ${950 + order * 230}ms both`)
            }}
          >
            ✓ HAZIR
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      role="status"
      aria-label="Maç hazırlanıyor"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'max(36px, env(safe-area-inset-top)) 20px max(32px, env(safe-area-inset-bottom))',
        userSelect: 'none',
        // Tamamen opak zemin: arkadaki masa görünmez.
        background: `radial-gradient(ellipse at 50% 38%, rgba(${glow},0.28) 0%, ${pal.mid} 38%, ${pal.edge} 100%)`,
        opacity: isFadingOut ? 0 : 1,
        transform: isFadingOut ? 'scale(1.04)' : 'scale(1)',
        transition: 'opacity 450ms ease-in, transform 450ms ease-in',
        pointerEvents: isFadingOut ? 'none' : 'auto',
        // "backwards": sadece başlangıç karesini uygular, bitince inline opacity (fade-out) devreye girer.
        animation: anim('mio-fade-in 320ms ease-out backwards')
      }}
    >
      <style>{CSS}</style>

      {/* Kumaş dokusu + vinyet */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 6px), radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.75) 100%)'
        }}
      />

      {/* Yükselen altın parçacıklar */}
      {!reduced && (
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                bottom: -12,
                left: `${(i * 37 + 11) % 100}%`,
                width: 3 + (i % 3),
                height: 3 + (i % 3),
                borderRadius: '50%',
                background: i % 2 === 0 ? '#fbbf24' : `rgb(${glow})`,
                boxShadow: `0 0 8px rgba(${glow},0.9)`,
                animation: `mio-rise ${5 + (i % 5)}s linear ${(i * 0.37).toFixed(2)}s infinite`
              }}
            />
          ))}
        </div>
      )}

      {/* Üst: mod etiketi + başlık */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-block',
            padding: '5px 14px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.16)',
            color: '#fcd34d',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            animation: anim('mio-fade-up 450ms ease-out 80ms both')
          }}
        >
          {label || (gameType === 'uno' ? 'RenQ Arenası' : 'Pişti Masası')}
        </div>
        <h1
          className="font-arcade"
          style={{
            margin: '12px 0 0',
            fontSize: 'clamp(34px, 9vw, 56px)',
            lineHeight: 1.05,
            fontWeight: 900,
            color: 'transparent',
            backgroundImage: 'linear-gradient(100deg, #fde68a 0%, #fffbeb 25%, #f59e0b 50%, #fde68a 75%, #fffbeb 100%)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 4px 18px rgba(245,158,11,0.35))',
            animation: anim(
              'mio-title 700ms cubic-bezier(.2,.8,.25,1) 150ms both, mio-shimmer 2.4s linear 900ms infinite'
            ),
            letterSpacing: reduced ? '0.16em' : undefined
          }}
        >
          {gameType === 'uno' ? 'RENQ' : 'PİŞTİ'}
        </h1>
      </div>

      {/* Orta: karıştırılan deste → yelpaze */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: 'clamp(190px, 34vh, 260px)'
        }}
      >
        {/* Dönen ışık halkası */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            width: 'clamp(230px, 60vw, 340px)',
            height: 'clamp(230px, 60vw, 340px)',
            borderRadius: '50%',
            background: `conic-gradient(from 0deg, transparent 0deg, rgba(${glow},0.5) 60deg, transparent 140deg, rgba(251,191,36,0.35) 220deg, transparent 300deg)`,
            filter: 'blur(26px)',
            opacity: 0.85,
            animation: anim('mio-spin 5s linear infinite')
          }}
        />
        {/* Masa gölgesi */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            bottom: 10,
            width: 'clamp(160px, 40vw, 240px)',
            height: 26,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)',
            filter: 'blur(14px)'
          }}
        />

        <div
          style={{
            position: 'relative',
            width: 'clamp(84px, 22vw, 112px)',
            aspectRatio: '5 / 7',
            animation: anim(`mio-tap 330ms ease-out ${TAP_START_MS}ms both`)
          }}
        >
          {FAN.map((rot, i) => {
            const fromLeft = i % 2 === 0;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: -i * 1.5,
                  width: '100%',
                  height: '100%',
                  zIndex: i,
                  animation: anim(
                    `${fromLeft ? 'mio-riffle-l' : 'mio-riffle-r'} ${RIFFLE_MS}ms cubic-bezier(.2,.8,.25,1) ${
                      i * RIFFLE_STEP_MS
                    }ms both`
                  )
                }}
              >
                <div
                  style={
                    {
                      width: '100%',
                      height: '100%',
                      transformOrigin: '50% 135%',
                      '--mio-rot': `${rot}deg`,
                      transform: reduced ? `rotate(${rot}deg)` : undefined,
                      animation: anim(`mio-fan 650ms cubic-bezier(.2,.9,.3,1.15) ${FAN_START_MS + i * 35}ms both`)
                    } as React.CSSProperties
                  }
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.22)',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.55)'
                    }}
                  >
                    <CardBackSurface cardBack={cardBack} className="w-full h-full" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alt: oyuncular, ipucu, ilerleme */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: 560,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18
        }}
      >
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '12px 14px',
            borderRadius: 18,
            background: 'rgba(8,12,20,0.62)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, flex: 1 }}>
            {showTeams && (
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', color: '#94a3b8' }}>TAKIM A</span>
            )}
            {left.map((p, i) => renderPlayer(p, i * 2, 'left'))}
          </div>

          <div
            style={{
              flexShrink: 0,
              padding: '5px 11px',
              borderRadius: 12,
              background: 'linear-gradient(90deg, #f59e0b, #ca8a04)',
              color: '#0b1120',
              fontWeight: 900,
              fontSize: 14,
              letterSpacing: '0.08em',
              boxShadow: '0 0 18px rgba(245,158,11,0.55)',
              animation: anim('mio-vs 1.1s ease-in-out 700ms infinite')
            }}
          >
            VS
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 10,
              minWidth: 0,
              flex: 1
            }}
          >
            {showTeams && (
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', color: '#94a3b8' }}>TAKIM B</span>
            )}
            {right.map((p, i) => renderPlayer(p, i * 2 + 1, 'right'))}
          </div>
        </div>

        <p
          style={{
            margin: 0,
            minHeight: 18,
            textAlign: 'center',
            fontSize: 12,
            fontStyle: 'italic',
            color: '#94a3b8',
            animation: anim('mio-fade-up 600ms ease-out 700ms both')
          }}
        >
          “{tip}”
        </p>

        <div
          style={{
            width: '100%',
            height: 6,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.1)',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 999,
              transformOrigin: 'left center',
              background: `linear-gradient(90deg, rgba(${glow},1), #fde68a, #f59e0b)`,
              animation: anim(`mio-progress ${durationMs}ms linear both`)
            }}
          />
        </div>
      </div>
    </div>
  );
};

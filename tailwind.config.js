/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'pisti-slam': 'pistiSlam 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'banner-pop': 'bannerPop 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulseGlow 2s infinite ease-in-out',
        'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        pistiSlam: {
          '0%': { transform: 'scale(2.5) rotate(-15deg)', opacity: '0' },
          '70%': { transform: 'scale(0.9) rotate(5deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        bannerPop: {
          '0%': { transform: 'scale(0.7) translateY(-24px)', opacity: '0' },
          '20%': { transform: 'scale(1.04) translateY(0)', opacity: '1' },
          '75%': { transform: 'scale(1) translateY(0)', opacity: '1' },
          '100%': { transform: 'scale(0.92) translateY(-16px)', opacity: '0' },
        },
        pulseGlow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 15px rgba(234, 179, 8, 0.6))' },
          '50%': { filter: 'drop-shadow(0 0 35px rgba(249, 115, 22, 0.9))' },
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-2px, 0, 0) rotate(-1.5deg)' },
          '20%, 80%': { transform: 'translate3d(4px, 0, 0) rotate(2.5deg)' },
          '30%, 50%, 70%': { transform: 'translate3d(-6px, 0, 0) rotate(-2.5deg)' },
          '40%, 60%': { transform: 'translate3d(6px, 0, 0) rotate(1.5deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [],
}

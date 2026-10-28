/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#070b14',
          800: '#0b1220',
          700: '#0f1a2e',
          600: '#16243f',
          500: '#1e3155',
          400: '#2b4473',
        },
        teal: {
          50: '#effcf9',
          100: '#c7f7ee',
          200: '#90efe1',
          300: '#54e0cd',
          400: '#2cc9b6',
          500: '#16a99a',
          600: '#0d8579',
          700: '#0f6a63',
          800: '#11554f',
          900: '#134743',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        accent: {
          amber: '#f59e0b',
          red: '#ef4444',
          green: '#22c55e',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(44,201,182,0.25), 0 8px 30px rgba(44,201,182,0.12)',
        alert: '0 0 0 2px rgba(239,68,68,0.5), 0 0 60px rgba(239,68,68,0.35)',
      },
      animation: {
        'pulse-ring': 'pulseRing 1.4s ease-out infinite',
        'border-flash': 'borderFlash 1s ease-in-out infinite alternate',
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        pulseRing: {
          '0%': { transform: 'scale(0.95)', opacity: '0.7' },
          '70%': { transform: 'scale(1.25)', opacity: '0' },
          '100%': { transform: 'scale(1.25)', opacity: '0' },
        },
        borderFlash: {
          '0%': { boxShadow: '0 0 0 0 rgba(239,68,68,0.6)' },
          '100%': { boxShadow: '0 0 40px 8px rgba(239,68,68,0.75)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

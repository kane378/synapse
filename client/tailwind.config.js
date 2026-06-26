// FILE: client/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        synapse: {
          bg: '#070b14',
          surface: '#0d1526',
          card: '#111d35',
          border: '#1e3a5f',
          accent: '#00d4ff',
          'accent-dim': '#0099bb',
          green: '#00ff9d',
          'green-dim': '#00cc7d',
          red: '#ff4757',
          yellow: '#ffd32a',
          orange: '#ff6b35',
          text: '#e2e8f0',
          muted: '#64748b',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};

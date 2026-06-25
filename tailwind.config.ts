import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        hone: {
          bg: '#0A0A0F',
          card: '#141418',
          surface: '#1E1E26',
          border: '#2A2A36',
          muted: '#6B6B80',
          text: '#F0F0F0',
          green: '#B8F53C',
          blue: '#3C8BF5',
          purple: '#A03CF5',
          orange: '#F58A3C',
          teal: '#3CF5D1',
          red: '#F5503C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'Courier New', 'monospace'],
      },
      keyframes: {
        'pulse-green': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(184,245,60,0)' },
          '50%': { boxShadow: '0 0 0 8px rgba(184,245,60,0.3)' },
        },
        'flash-correct': {
          '0%': { backgroundColor: 'rgba(184,245,60,0.4)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'flash-wrong': {
          '0%': { backgroundColor: 'rgba(245,80,60,0.4)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'count-in': {
          '0%': { transform: 'scale(1.5)', opacity: '0' },
          '30%': { transform: 'scale(1)', opacity: '1' },
          '70%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.8)', opacity: '0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'number-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'pulse-green': 'pulse-green 1.5s ease-in-out infinite',
        'flash-correct': 'flash-correct 0.3s ease-out forwards',
        'flash-wrong': 'flash-wrong 0.3s ease-out forwards',
        'count-in': 'count-in 0.8s ease-in-out forwards',
        'slide-up': 'slide-up 0.4s ease-out forwards',
        'number-up': 'number-up 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
}
export default config

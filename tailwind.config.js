/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // NexDesk brand palette
        brand: {
          50:  '#eef4ff',
          100: '#d9e6ff',
          200: '#bcd1ff',
          300: '#8eb2ff',
          400: '#5a87ff',
          500: '#3b62f5',
          600: '#2645ea',
          700: '#1f36d6',
          800: '#1f2fad',
          900: '#1e2d88',
          950: '#161d55',
        },
        // Surface tokens (dark mode)
        dark: {
          950: '#060a12',
          900: '#0b1120',
          800: '#101828',
          700: '#162034',
          600: '#1c2940',
          500: '#243352',
        },
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      animation: {
        'pulse-slow':   'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in':      'fadeIn 0.2s ease-out',
        'slide-in-up':  'slideInUp 0.2s ease-out',
        'slide-in-left':'slideInLeft 0.25s ease-out',
      },
      keyframes: {
        fadeIn:      { from: { opacity: '0' },                          to: { opacity: '1' } },
        slideInUp:   { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInLeft: { from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      },
      boxShadow: {
        'card':   '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
        'modal':  '0 20px 60px rgba(0,0,0,0.4)',
        'glow':   '0 0 20px rgba(59,98,245,0.3)',
      },
    },
  },
  plugins: [],
}

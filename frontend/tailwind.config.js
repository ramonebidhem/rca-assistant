/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Core brand
        ink: '#0F1419', // header / footer (deep, slightly cool near-black)
        surface: '#EDF0F3', // page background
        paper: '#FFFFFF',
        // Status + accent (exact brand values)
        ok: { DEFAULT: '#17843F', soft: '#E7F4EC', ring: '#8FCBA5' },
        ng: { DEFAULT: '#C21807', soft: '#FBEAE8', ring: '#E39A92' },
        accent: {
          DEFAULT: '#1450E0',
          hover: '#0E3FBE',
          soft: '#E8EEFD',
          ring: '#9DB6F4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        xl2: '1rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,20,25,0.04), 0 4px 12px rgba(15,20,25,0.06)',
        'card-hover': '0 8px 16px rgba(15,20,25,0.08), 0 18px 40px rgba(15,20,25,0.12)',
        pop: '0 12px 32px rgba(15,20,25,0.16)',
        focus: '0 0 0 4px rgba(20,80,224,0.18)',
      },
      backgroundImage: {
        'grid-fade':
          'radial-gradient(circle at 1px 1px, rgba(15,20,25,0.08) 1px, transparent 0)',
      },
      backgroundSize: {
        grid: '16px 16px',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out',
        'slide-up': 'slide-up 0.2s cubic-bezier(0.16,1,0.3,1)',
        'scale-in': 'scale-in 0.16s cubic-bezier(0.16,1,0.3,1)',
      },
    },
  },
  plugins: [],
};

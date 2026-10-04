/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Core brand — Yazaki-inspired: near-black header/footer, red accent
        ink: '#111316', // header / footer (deep, near-black)
        surface: '#F1F2F4', // page background
        paper: '#FFFFFF',
        // Status (kept distinct from the brand red so OK/NG stays unambiguous)
        ok: { DEFAULT: '#17843F', soft: '#E7F4EC', ring: '#8FCBA5' },
        ng: { DEFAULT: '#B3261E', soft: '#FBEAE8', ring: '#E39A92' },
        // Brand red, sampled from the Yazaki logo
        accent: {
          DEFAULT: '#E60012',
          hover: '#B8000E',
          soft: '#FDE8EA',
          ring: '#F2A3A9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        xl2: '0.625rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(17,19,22,0.05), 0 4px 12px rgba(17,19,22,0.07)',
        'card-hover': '0 8px 16px rgba(17,19,22,0.09), 0 18px 40px rgba(17,19,22,0.14)',
        pop: '0 12px 32px rgba(17,19,22,0.18)',
        focus: '0 0 0 4px rgba(230,0,18,0.16)',
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

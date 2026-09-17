import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0f0f1a',
        panel: 'rgba(255,255,255,0.06)',
        panelEdge: 'rgba(255,255,255,0.10)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(124,58,237,0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
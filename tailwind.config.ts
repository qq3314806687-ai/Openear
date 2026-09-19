import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#202a24',
        // 玻璃拟态：panel 为 15% 透明白填充，panelEdge 为玻璃边缘反光
        panel: 'rgba(255,255,255,0.15)',
        panelEdge: 'rgba(255,255,255,0.28)',
        // 晨雾原野映射：把全站紫/青/红科技主色替换为山野绿金系
        violet: {
          50: '#eef3ea',
          100: '#dbe7d3',
          300: '#8fb093',
          400: '#7ba07d',
          500: '#6f9372',
        },
        cyan: {
          300: '#b3cfc4',
          400: '#9fbeae',
          500: '#8fb3a6',
        },
        rose: {
          300: '#e8a178',
          400: '#e08a5f',
        },
        white: '#eef0ea',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 24px 60px -24px rgba(10,18,14,0.55), 0 8px 28px -18px rgba(111,147,114,0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
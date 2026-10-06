import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 黑胶规范：浅色天空底 + 深墨文字
        ink: '#0b0b0c',
        canvas: '#dbe6ee',
        // 玻璃拟态：浅色玻璃面板 + 墨色描边
        panel: 'rgba(255,255,255,0.55)',
        panelEdge: 'rgba(11,11,12,0.10)',
        // 山野绿金系（情绪地图/交互强调），浅底上依然柔和
        violet: {
          50: '#eef3ea',
          100: '#dbe7d3',
          300: '#8fb093',
          400: '#7ba07d',
          500: '#6f9372',
          600: '#58755b',
        },
        cyan: {
          300: '#b3cfc4',
          400: '#9fbeae',
          500: '#8fb3a6',
          600: '#6f9688',
        },
        rose: {
          300: '#e8a178',
          400: '#e08a5f',
          500: '#d0753f',
        },
        white: '#eef0ea',
      },
      fontFamily: {
        sans: [
          'Instrument Sans',
          'PingFang SC',
          'Noto Sans SC',
          'Microsoft YaHei',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        serif: [
          'Instrument Serif',
          'Noto Serif SC',
          'Songti SC',
          'STSong',
          'SimSun',
          'Georgia',
          'serif',
        ],
      },
      boxShadow: {
        glow: '0 24px 60px -24px rgba(11,11,12,0.28), 0 8px 28px -18px rgba(111,147,114,0.25)',
      },
    },
  },
  plugins: [],
};

export default config;

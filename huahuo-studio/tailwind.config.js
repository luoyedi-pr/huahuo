/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'compact': { max: '767px' },
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'wide': '1280px',
      'xl': '1280px',
      'ultrawide': '1536px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        // 像素字体 - 使用系统等宽字体作为后备
        'pixel': ['Consolas', 'Monaco', 'Courier New', 'monospace'],
        // 等宽字体
        'mono': ['Consolas', 'Monaco', 'Menlo', 'Courier New', 'monospace'],
      },
      colors: {
        // 主色调 - 霓虹粉
        'primary': {
          main: '#FF6B9D',
          light: '#FF9BC1',
          dark: '#CC4A7A',
        },
        // 次色调 - 霓虹青
        'secondary': {
          main: '#00F5D4',
          light: '#5FFBEB',
          dark: '#00C4A7',
        },
        // 强调色
        'accent': {
          yellow: '#FEE440',
          purple: '#9B5DE5',
          orange: '#F15BB5',
          blue: '#00BBF9',
        },
        // 背景色
        'bg': {
          primary: '#0D1117',
          secondary: '#161B22',
          tertiary: '#21262D',
          elevated: '#30363D',
        },
        // 文字色
        'text': {
          primary: '#F0F6FC',
          secondary: '#8B949E',
          muted: '#484F58',
          inverse: '#0D1117',
        },
        // 边框色
        'border': {
          DEFAULT: '#30363D',
          hover: '#8B949E',
          focus: '#FF6B9D',
        },
        // 状态色
        'status': {
          success: '#3FB950',
          warning: '#D29922',
          error: '#F85149',
          info: '#58A6FF',
        },
      },
      boxShadow: {
        'pixel': '4px 4px 0px #000000',
        'pixel-sm': '2px 2px 0px #000000',
        'pixel-hover': '2px 2px 0px #000000',
        'pixel-active': '0px 0px 0px #000000',
        'glow-pink': '0 0 10px #FF6B9D, 0 0 20px #FF6B9D50',
        'glow-cyan': '0 0 10px #00F5D4, 0 0 20px #00F5D450',
      },
      animation: {
        'pixel-bounce': 'pixel-bounce 0.5s ease-in-out infinite',
        'pixel-blink': 'pixel-blink 1s step-end infinite',
        'pixel-glow': 'pixel-glow 2s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        'pixel-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'pixel-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'pixel-glow': {
          '0%, 100%': { boxShadow: '0 0 5px currentColor' },
          '50%': { boxShadow: '0 0 20px currentColor, 0 0 30px currentColor' },
        },
        'indeterminate': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
    },
  },
  plugins: [],
};

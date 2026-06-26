/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    // 与原设计一致的断点：手机 / 平板 / 桌面
    screens: {
      sm: '480px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      colors: {
        ink: '#1b1a17',
        cream: '#fffdf8',
        sugar: {
          yellow: '#f4c84a',
          coral: '#f0613f',
        },
      },
    },
  },
  plugins: [],
};

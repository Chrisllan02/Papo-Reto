/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './contexts/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
    './views/**/*.{ts,tsx}',
  ],
  safelist: [
    {
      pattern: /(border|text)-(yellow|blue|green|red|purple)-(500|600)/,
    },
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        praxeti: '#F5F8FC',
        spring: '#FFDF00',
        midnight: '#002776',
        mantis: '#009C3B',
        picture: '#006B2A',
        nuit: '#1450B8',
        gray: {
          50: '#F5F8FC',
          100: '#EBECE6',
          200: '#E2E8F0',
          800: '#1450B8',
          900: '#0F172A',
          950: '#020617',
        },
        blue: {
          50: '#EEF3FA',
          500: '#1450B8',
          600: '#0F3F99',
          900: '#002776',
        },
        green: {
          400: '#2FBF63',
          500: '#009C3B',
        },
        orange: {
          50: '#FFF0E8',
          500: '#FF6624',
        },
        yellow: {
          500: '#FFDF00',
        },
      },
    },
  },
  plugins: [],
};

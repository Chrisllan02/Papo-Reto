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
        praxeti: '#F6F7ED',
        spring: '#DBE64C',
        midnight: '#001F3F',
        mantis: '#74C365',
        picture: '#00804C',
        nuit: '#1E488F',
        gray: {
          50: '#F6F7ED',
          100: '#EBECE6',
          200: '#DBE64C',
          800: '#1E488F',
          900: '#0F172A',
          950: '#020617',
        },
        blue: {
          50: '#F0F4FF',
          500: '#1E488F',
          600: '#153E7A',
          900: '#001F3F',
        },
        green: {
          400: '#74C365',
          500: '#00804C',
        },
        orange: {
          50: '#FFF0E8',
          500: '#FF6624',
        },
        yellow: {
          500: '#DBE64C',
        },
      },
    },
  },
  plugins: [],
};

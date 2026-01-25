/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
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
          900: '#001F3F',
        },
        blue: {
          50: '#F0F4FF',
          500: '#1E488F',
          600: '#153E7A',
          900: '#001F3F',
        },
        green: {
          500: '#00804C',
          400: '#74C365',
        },
        orange: {
          50: '#FFF0E8',
          500: '#FF6624',
        },
        yellow: {
          500: '#DBE64C',
        }
      }
    }
  },
  plugins: [],
}
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        blue: {
          50: '#fff0f0',
          100: '#ffe3e4',
          200: '#ffcbcf',
          300: '#ffa0a8',
          400: '#ff6a7a',
          500: '#fd4a61',
          600: '#eb133a',
          700: '#c60a30',
          800: '#a60b2f',
          900: '#8e0d2f',
          950: '#4f0214',
        },
      },
    },
  },
  variants: {
    extend: {
      visibility: ['group-hover'],
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

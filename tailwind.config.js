/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    fontSize: {
      sidebar: ['13px', '18px']
    },
    extend: {},
  },
  plugins: [require('@tailwindcss/typography')],
};

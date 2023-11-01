/** @type {import('tailwindcss').Config} */

import brand from './styles/brandStylesConfig'

module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      backgroundColor: {
        'brand-sidebar': brand.sidebarColor,
        'brand-chatBtn': brand.chatBtnColor,
        'brand-submitBtn': brand.submitBtnColor
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

/** @type {import('tailwindcss').Config} */

const colors = require('tailwindcss/colors');

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
        'chat-background-dark': '#343541',
        'chat-button-generate-background-dark': '#343541',
        'chat-button-generate-background-active': '#343541',
        'chat-dropdown-background-dark': '#343541',
        'chat-message-assistant-background-dark': '#444654',
        'chat-message-user-background-dark': '#343541',
        'sidebar-button': colors.neutral[400],
        'sidebar-chatbar-chat-background-highlighted': '#343541',
        'sidebar-folder-background-highlighted': '#343541',
        'sidebar-promptbar-prompt-background-highlighted': '#343541',
        'sidebar-setting-background-highlighted': colors.gray[500],
        'sidebar-target-background-highlighted': '#343541',
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

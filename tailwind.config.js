/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}', // Note the addition of the `app` directory.
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',

    // Or if using `src` directory:
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        xs: '500px',
        tall: { raw: '(min-height: 1200px)' },
      },
      boxShadow: {
        input: '#60a5fa 0px 0px 0px 1.5px',
      },
      colors: {
        gray: {
          750: '#303948',
        },
        brand: {
          50: '#ffe5f1',
          100: '#ffcce4',
          150: '#F7FAFC',
          200: '#ffb3d7',
          300: '#ff99ca',
          400: '#ff80bd',
          500: '#FF5CAA',
          600: '#ff4da3',
          700: '#ff3396',
          800: '#ff1a88',
          900: '#5d1738',
        },
      },
      fontFamily: {
        montserrat: ['var(--font-family-montserrat)'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
      animation: {
        fadeIn: 'fadeIn 100ms ease-in',
      },
    },
  },
  variants: {
    extend: {
      visibility: ['group-hover'],
    },
  },
  plugins: [
    function ({ addVariant }) {
      addVariant('children', '& > *')
    },
    require('@tailwindcss/typography')
  ],
}

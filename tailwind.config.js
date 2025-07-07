/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ececf4',
          100: '#d9d6ef',
          200: '#b7b3e8',
          300: '#6c64d9',
          400: '#625ebb',
          500: '#59589c',
          600: '#51507f',
          700: '#4c4a67',
          800: '#41414b',
          900: '#35382f',
        },
        slate: {
          750: '#293548',
        },
      },
    },
  },
  plugins: [],
};
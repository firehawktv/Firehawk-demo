/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './views/**/*.ejs',
    './public/**/*.html',
  ],
  theme: {
    extend: {
      colors: {
        spindle: {
          50: '#f3f8fb',
          100: '#e4ecf5',
          200: '#cfdfee',
          300: '#a2c3de',
          400: '#87afd3',
          500: '#6a94c7',
          600: '#577eb9',
          700: '#4c6ca9',
          800: '#43598a',
          900: '#394b6f',
          950: '#262f45',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

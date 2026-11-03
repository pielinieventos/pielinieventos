/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './assets/js/main.js'],
  theme: {
    extend: {
      colors: {
        creme: '#F5F2EB',
        pielini: { DEFAULT: '#2C5E4F', dark: '#1F4539', light: '#3E7A67' },
        torra: { DEFAULT: '#1E1610', soft: '#2A1F17', line: '#3A2C21' },
        caramelo: { DEFAULT: '#C88A4B', light: '#DDA971', dark: '#A86D33' },
        offwhite: '#EAE3D5',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      maxWidth: { site: '76rem' },
    },
  },
  plugins: [],
};

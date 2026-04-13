/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#6C63FF',
        'primary-dark': '#5a52d5',
        secondary: '#FF6584',
        magic: '#1A56DB',
        pokemon: '#F59E0B',
        dark: {
          bg: '#0f0f1a',
          card: '#1a1a2e',
          border: '#2a2a4a',
          text: '#e2e8f0',
          muted: '#94a3b8',
        },
      },
    },
  },
  plugins: [],
};

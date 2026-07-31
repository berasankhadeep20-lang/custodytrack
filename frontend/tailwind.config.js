/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0f14',
        panel: '#121820',
        border: '#22303c',
        muted: '#8b98a5',
        accent: '#4fb3ff',
        accent2: '#37d67a',
        warn: '#ffb454',
      },
    },
  },
  plugins: [],
}

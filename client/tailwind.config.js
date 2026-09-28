/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#178A4A',
        dark: '#0F6B38',
        background: '#F7F9F8',
        text: '#17201B'
      }
    },
  },
  plugins: [],
}

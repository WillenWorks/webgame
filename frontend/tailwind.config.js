/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Press Start 2P"', 'system-ui', 'cursive'],
        body: ['"VT323"', 'monospace'],
        mono: ['"Share Tech Mono"', 'monospace'],
      },
      colors: {
        // Mapeando as cores customizadas anteriores para Tailwind colors ou mantendo custom
        primary: '#fbbf24', // amber-400
        secondary: '#22d3ee', // cyan-400
      }
    },
  },
  plugins: [],
}

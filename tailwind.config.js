/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0d0e11',
        'dark-sidebar': '#111318',
        'dark-panel': '#16181d',
        'dark-border': '#2a2d35',
        'dark-hover': '#1e2028',
        'accent-blue': '#4f8ef7',
        'accent-green': '#34d399',
        'accent-yellow': '#fbbf24',
        'accent-red': '#f87171',
        'text-primary': '#e2e8f0',
        'text-secondary': '#8b95a5',
        'text-muted': '#4a5568',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
